"use server";

// Server Action: build a fresh draft order from a past customer_orders row,
// then return the catalog slug so the client can redirect to the builder.
//
// The builder hydrates draft_orders.qty_map on load (Phase C), so dropping
// the past order's quantities into draft_orders is enough — the customer
// arrives at the builder with the cart pre-filled.
//
// Edge cases handled:
//  - SKUs that have been deactivated since the past order → silently
//    dropped from the new draft. The customer sees them missing and the
//    builder's stale-banner picks up the gap.
//  - Pricing has shifted → that's fine; the builder reads live prices.
//  - The past order belonged to another customer → guarded by customer_id
//    match in the SELECT (returns null → action returns ok:false).
//  - The catalog slug from the past order no longer exists → guarded by
//    verifyCustomerCatalogAccess on the resolved vendor_id.

import { requireSession } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
import { verifyCustomerCatalogAccess } from "@/lib/catalog/query";

export interface ReorderResult {
  ok: boolean;
  /** Slug to redirect to: e.g. /?c=foil-aluminum */
  catalogSlug?: string;
  /** How many of the past order's lines were carried over. */
  linesCarried?: number;
  /** How many were dropped because the SKU is no longer active. */
  linesDropped?: number;
  error?: string;
}

export async function reorderFromPastOrderAction(
  pastOrderId: string,
): Promise<ReorderResult> {
  try {
    const session = await requireSession();
    const admin = adminClient();

    // 1) Pull the past order, scoped to this customer (cross-tenant guard).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderRes = (await (admin as any)
      .from("customer_orders")
      .select("id, customer_id, metadata")
      .eq("id", pastOrderId)
      .eq("customer_id", session.customerId)
      .maybeSingle()) as {
      data: {
        id: string;
        customer_id: string;
        metadata: Record<string, unknown> | null;
      } | null;
      error: { message: string } | null;
    };

    if (orderRes.error) return { ok: false, error: orderRes.error.message };
    if (!orderRes.data)
      return { ok: false, error: "Order not found or not yours." };

    const meta = orderRes.data.metadata ?? {};
    const vendorId = (meta.vendor_id as string | undefined) ?? null;
    const catalogSlug = (meta.catalog_slug as string | undefined) ?? null;
    if (!vendorId || !catalogSlug) {
      return {
        ok: false,
        error: "Past order missing vendor/catalog metadata. Build manually.",
      };
    }

    // 2) Verify the customer still has access to that catalog.
    const access = await verifyCustomerCatalogAccess(session.customerId, vendorId);
    if (!access) {
      return {
        ok: false,
        error: "You no longer have access to that catalog.",
      };
    }

    // 3) Pull the past order's lines.
    const { data: lines } = await admin
      .from("customer_order_lines")
      .select("vendor_product_id, qty_cases")
      .eq("order_id", pastOrderId);

    if (!lines || lines.length === 0) {
      return { ok: false, error: "Past order has no lines to reorder." };
    }

    // 4) Filter against currently-active vendor_products. Any SKU that was
    //    deactivated drops out of the draft.
    const vpIds = Array.from(
      new Set(
        lines
          .map((l) => l.vendor_product_id)
          .filter((x): x is string => Boolean(x)),
      ),
    );
    let activeIds = new Set<string>();
    if (vpIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: vps } = await (admin as any)
        .from("vendor_products")
        .select("id, is_active, deleted_at")
        .in("id", vpIds);
      for (const vp of (vps ?? []) as Array<{
        id: string;
        is_active: boolean;
        deleted_at: string | null;
      }>) {
        if (vp.is_active && !vp.deleted_at) activeIds.add(vp.id);
      }
    }

    const qtyMap: Record<string, number> = {};
    let dropped = 0;
    for (const l of lines) {
      if (!l.vendor_product_id) continue;
      if (activeIds.has(l.vendor_product_id)) {
        qtyMap[l.vendor_product_id] = l.qty_cases;
      } else {
        dropped += 1;
      }
    }

    if (Object.keys(qtyMap).length === 0) {
      return {
        ok: false,
        error:
          "None of the SKUs in that order are still available. Build a new container manually.",
      };
    }

    // 5) Upsert into draft_orders. Replaces any existing draft for this
    //    (customer, vendor) pair — that's intentional: starting a reorder
    //    means committing to the past mix.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertErr } = await (admin as any)
      .from("draft_orders")
      .upsert(
        {
          customer_id: session.customerId,
          vendor_id: vendorId,
          catalog_slug: catalogSlug,
          qty_map: qtyMap,
        },
        { onConflict: "customer_id,vendor_id" },
      );

    if (upsertErr) {
      return { ok: false, error: "Could not create draft: " + upsertErr.message };
    }

    return {
      ok: true,
      catalogSlug,
      linesCarried: Object.keys(qtyMap).length,
      linesDropped: dropped,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
