"use server";

// Submit a container order: writes to customer_orders + customer_order_lines.
//
// Server-side this:
//   1. Resolves the authed session and the customer profile (re-checked, never trust client)
//   2. Re-fetches the catalog to validate the submitted qtys against current pricing
//   3. Refuses to submit if volume != 100% (within 0.05pp) or weight > 100%
//   4. Generates a sequential order_number SVS-XXXXXX
//   5. Inserts the order header + lines in one transaction (best-effort via separate calls + cleanup)

import { adminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth/session";
import {
  fetchCatalogForVendor,
  verifyCustomerCatalogAccess,
} from "@/lib/catalog/query";
import { computeTotals, type QtyMap } from "@/lib/math/fill";
import { sendOrderConfirmation } from "@/lib/email/order-confirmation";
import { getContainerSpec } from "@/lib/containers";

export interface SubmitOrderInput {
  vendorId: string;
  qtys: QtyMap;
}

export interface SubmitOrderResult {
  ok: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

const NEXT_ORDER_NUMBER_FALLBACK_BASE = 2419;

async function nextOrderNumber(): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("customer_orders")
    .select("order_number")
    .not("order_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("nextOrderNumber failed: " + error.message);

  const rows = (data ?? []) as Array<{ order_number: string | null }>;
  let max = NEXT_ORDER_NUMBER_FALLBACK_BASE - 1;
  for (const row of rows) {
    const m = row.order_number?.match(/^SVS-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `SVS-${String(max + 1).padStart(6, "0")}`;
}

export async function submitOrderAction(
  input: SubmitOrderInput,
): Promise<SubmitOrderResult> {
  try {
    const session = await requireSession();

    // Verify catalog access.
    const access = await verifyCustomerCatalogAccess(session.customerId, input.vendorId);
    if (!access) {
      return { ok: false, error: "You do not have access to this catalog." };
    }

    // Hard gate: this catalog is in a pricing-refresh window. The UI also
    // disables submit, but we re-check here so a crafted POST cannot bypass.
    if (access.pricesPending) {
      return {
        ok: false,
        error:
          "Pricing refresh in progress for this catalog. Submit will re-open once updated rates publish.",
      };
    }

    // Re-fetch catalog server-side to lock in real prices and verify totals.
    // Pass the customer's verified access info so container/terms + the
    // customer's effective margin come from THIS customer's row.
    const catalog = await fetchCatalogForVendor(session.customerId, input.vendorId, access);
    if (!catalog) {
      return { ok: false, error: "Catalog could not be loaded." };
    }

    // Recompute totals from server-side catalog data + submitted qtys.
    const totals = computeTotals(catalog, input.qtys);
    if (totals.cases <= 0) {
      return { ok: false, error: "No items in order." };
    }
    if (totals.belowMinLines > 0) {
      return {
        ok: false,
        error: `${totals.belowMinLines} line item${
          totals.belowMinLines === 1 ? "" : "s"
        } below the ${catalog.minCaseQty}-case minimum.`,
      };
    }
    if (totals.volPct < catalog.minFillPct - 0.05) {
      return {
        ok: false,
        error: `Container fill is ${totals.volPct.toFixed(1)}%; minimum to submit is ${catalog.minFillPct.toFixed(0)}%.`,
      };
    }
    if (totals.volPct > 100 + 0.05) {
      return {
        ok: false,
        error: `Container is over capacity (${totals.volPct.toFixed(1)}%).`,
      };
    }
    if (totals.wtPct > 100 + 1e-3) {
      return { ok: false, error: "Container exceeds weight maximum." };
    }

    // Pricing policy id (vendor-scoped) for audit on the order header.
    const admin = adminClient();
    const { data: policyRow } = await admin
      .from("pricing_policies")
      .select("id")
      .eq("scope", "vendor")
      .eq("scope_id", input.vendorId)
      .limit(1)
      .maybeSingle();

    // Build line inserts.
    const skuByVpId = new Map<string, (typeof catalog.categories)[number]["skus"][number]>();
    for (const cat of catalog.categories) {
      for (const sku of cat.skus) skuByVpId.set(sku.vendorProductId, sku);
    }

    const lines: Array<{
      vendor_product_id: string;
      canonical_product_id: string;
      sku: string;
      description: string;
      pack_size: string | null;
      cases_per_pallet: number | null;
      qty_cases: number;
      vendor_cost_per_case: number;
      margin_pct_applied: number;
      freight_per_case: number;
      sell_price_per_case: number;
    }> = [];
    for (const [vpId, qty] of Object.entries(input.qtys)) {
      if (!qty || qty <= 0) continue;
      const sku = skuByVpId.get(vpId);
      if (!sku) {
        return { ok: false, error: `Unknown SKU in submission: ${vpId}` };
      }
      lines.push({
        vendor_product_id: sku.vendorProductId,
        canonical_product_id: sku.canonicalProductId,
        sku: sku.vendorSku,
        description: sku.productName,
        pack_size: sku.packDisplay,
        cases_per_pallet: sku.casesPerPallet,
        qty_cases: qty,
        vendor_cost_per_case: sku.costPerCase,
        margin_pct_applied: sku.marginPct ?? 0.18,
        freight_per_case: 0,
        sell_price_per_case: sku.sellPricePerCase,
      });
    }

    if (lines.length === 0) {
      return { ok: false, error: "Order has no line items." };
    }

    const orderNumber = await nextOrderNumber();

    const { data: orderRow, error: orderErr } = await admin
      .from("customer_orders")
      .insert({
        order_number: orderNumber,
        customer_id: session.customerId,
        status: "quoted",
        pricing_policy_id: policyRow?.id ?? null,
        subtotal_product: Number(totals.subtotal.toFixed(2)),
        subtotal_freight: 0,
        total: Number(totals.subtotal.toFixed(2)),
        case_count: totals.cases,
        pallet_count: Math.round(totals.palletEq),
        metadata: {
          source: "container_builder",
          vendor_id: input.vendorId,
          // Catalog slug is the customer-facing catalog identity; needed to
          // attribute orders back to the right access row when a customer has
          // multiple catalogs from the same vendor.
          catalog_slug: catalog.slug,
          catalog_display_name: catalog.displayName,
          container_code: catalog.containerCode,
          terms_label: catalog.termsLabel,
          currency: catalog.currency,
          volume_pct: Number(totals.volPct.toFixed(2)),
          weight_kg: Number(totals.kg.toFixed(2)),
          submitted_by_user_id: session.userId,
          submitted_by_email: session.email,
        },
      })
      .select("id, order_number")
      .single();

    if (orderErr || !orderRow) {
      return {
        ok: false,
        error: "Failed to create order: " + (orderErr?.message ?? "unknown"),
      };
    }

    const lineInserts = lines.map((l, idx) => ({
      order_id: orderRow.id,
      line_number: idx + 1,
      ...l,
    }));

    const { error: linesErr } = await admin
      .from("customer_order_lines")
      .insert(lineInserts);

    if (linesErr) {
      // Best-effort cleanup of the orphaned header.
      await admin.from("customer_orders").delete().eq("id", orderRow.id);
      return { ok: false, error: "Failed to write order lines: " + linesErr.message };
    }

    // Successful submit — discard the draft so reload gives a fresh cart.
    // Best-effort: a failure here doesn't roll back the order; worst case the
    // customer sees their just-submitted cart still in the builder on reload,
    // which is mildly confusing but not unsafe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from("draft_orders")
      .delete()
      .eq("customer_id", session.customerId)
      .eq("vendor_id", input.vendorId)
      .then(() => null, () => null);

    // Send confirmation emails to the customer and to Zach. Best-effort:
    // failures log a warning but never roll back the order or block the
    // success response. If RESEND_API_KEY isn't configured, the email
    // module returns ok=false and the caller logs that fact.
    try {
      const containerSpec = getContainerSpec(catalog.containerCode);
      await sendOrderConfirmation({
        orderNumber: orderRow.order_number ?? orderNumber,
        orderId: orderRow.id,
        customerName: session.customerName,
        customerEmail: session.email,
        catalogDisplayName: catalog.displayName,
        containerLabel: containerSpec.label,
        termsLabel: catalog.termsLabel,
        currency: catalog.currency,
        submittedAt: new Date().toISOString(),
        lines: lines.map((l) => {
          const sku = skuByVpId.get(l.vendor_product_id);
          return {
            sku: l.sku,
            description: l.description,
            packDisplay: l.pack_size,
            qtyCases: l.qty_cases,
            sellPricePerCase: l.sell_price_per_case,
            piecesPerCase: sku?.piecesPerCase ?? null,
          };
        }),
        totals: {
          subtotal: totals.subtotal,
          cases: totals.cases,
          palletEq: totals.palletEq,
          weightKg: totals.kg,
          volPct: totals.volPct,
        },
      });
    } catch (e) {
      // Never let an email-send error mask a successful order. Log only.
      console.warn(
        "[submit-order] sendOrderConfirmation threw: " +
          (e instanceof Error ? e.message : "unknown"),
      );
    }

    return {
      ok: true,
      orderId: orderRow.id,
      orderNumber: orderRow.order_number ?? orderNumber,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return { ok: false, error: msg };
  }
}
