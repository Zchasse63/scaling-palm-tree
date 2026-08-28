"use server";

// Admin-only inbound shipment CRUD (manual container entry).
// Every action re-checks admin (the layout gate does not protect actions).

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/session";
import { fetchSavannahLocationId } from "@/lib/inventory/query";

export interface InboundActionResult {
  ok: boolean;
  error?: string;
  /** mark-received only: was a matching receipt jump visible in the snapshot? */
  receiptDetected?: boolean;
}

export interface InboundLineDraft {
  vendorProductId: string;
  qtyCases: number;
}

function validateLines(lines: InboundLineDraft[]): string | null {
  if (lines.length === 0) return "At least one line is required";
  for (const l of lines) {
    if (!l.vendorProductId) return "Every line needs a SKU";
    if (!Number.isInteger(l.qtyCases) || l.qtyCases <= 0) {
      return "Case quantities must be whole numbers above 0";
    }
  }
  return null;
}

function validateDates(etd: string | null, eta: string | null): string | null {
  if (etd && eta && eta <= etd) return "ETA must be after ETD";
  return null;
}

export async function createInboundShipmentAction(input: {
  vendorId: string | null;
  poNumber: string | null;
  containerNo: string | null;
  etd: string | null;
  eta: string | null;
  notes: string | null;
  lines: InboundLineDraft[];
}): Promise<InboundActionResult> {
  try {
    await requireAdmin();
    const lineErr = validateLines(input.lines);
    if (lineErr) return { ok: false, error: lineErr };
    const dateErr = validateDates(input.etd, input.eta);
    if (dateErr) return { ok: false, error: dateErr };

    const admin = adminClient();
    const destination = await fetchSavannahLocationId();
    const { data: shipment, error } = await admin
      .from("inbound_shipments")
      .insert({
        vendor_id: input.vendorId,
        po_number: input.poNumber,
        container_no: input.containerNo,
        etd: input.etd,
        eta: input.eta,
        notes: input.notes,
        status: "ordered",
        destination_location_id: destination,
      })
      .select("id")
      .single();
    if (error || !shipment) return { ok: false, error: error?.message ?? "insert failed" };

    const { data: skus } = await admin
      .from("vendor_products" as never)
      .select("id, sku")
      .in(
        "id",
        input.lines.map((l) => l.vendorProductId),
      );
    const skuById = new Map(
      ((skus ?? []) as Array<{ id: string; sku: string }>).map((s) => [s.id, s.sku]),
    );

    const { error: lineInsertErr } = await admin.from("inbound_shipment_lines").insert(
      input.lines.map((l) => ({
        shipment_id: shipment.id,
        vendor_product_id: l.vendorProductId,
        sku: skuById.get(l.vendorProductId) ?? null,
        qty_cases: l.qtyCases,
      })),
    );
    if (lineInsertErr) {
      await admin.from("inbound_shipments").delete().eq("id", shipment.id);
      return { ok: false, error: lineInsertErr.message };
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/inbound");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export async function updateInboundShipmentAction(input: {
  shipmentId: string;
  poNumber: string | null;
  containerNo: string | null;
  etd: string | null;
  eta: string | null;
  status: string;
  notes: string | null;
}): Promise<InboundActionResult> {
  try {
    await requireAdmin();
    const dateErr = validateDates(input.etd, input.eta);
    if (dateErr) return { ok: false, error: dateErr };
    const allowed = ["ordered", "on_water", "arrived"];
    if (!allowed.includes(input.status)) {
      return { ok: false, error: `Invalid status: ${input.status}` };
    }
    const admin = adminClient();
    const { error } = await admin
      .from("inbound_shipments")
      .update({
        po_number: input.poNumber,
        container_no: input.containerNo,
        etd: input.etd,
        eta: input.eta,
        status: input.status,
        notes: input.notes,
      })
      .eq("id", input.shipmentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/inbound");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export async function markInboundReceivedAction(input: {
  shipmentId: string;
}): Promise<InboundActionResult> {
  try {
    await requireAdmin();
    const admin = adminClient();

    const { error } = await admin
      .from("inbound_shipments")
      .update({ received_at: new Date().toISOString(), status: "arrived" })
      .eq("id", input.shipmentId);
    if (error) return { ok: false, error: error.message };

    // Best-effort receipt confirmation: did any of this shipment's SKUs jump
    // up between the two most recent snapshot days? Never blocks the action.
    let receiptDetected = false;
    const { data: lines } = await admin
      .from("inbound_shipment_lines")
      .select("vendor_product_id")
      .eq("shipment_id", input.shipmentId);
    const vpIds = (lines ?? [])
      .map((l) => l.vendor_product_id)
      .filter((x): x is string => x !== null);
    for (const vpId of vpIds) {
      const { data: last2 } = await admin
        .from("inventory_snapshots")
        .select("qty_cases, qty_picked_cases")
        .eq("vendor_product_id", vpId)
        .eq("count_method", "system")
        .order("counted_at", { ascending: false })
        .limit(2);
      if (last2 && last2.length === 2) {
        const physical = (r: { qty_cases: number; qty_picked_cases: number | null }) =>
          r.qty_cases + (r.qty_picked_cases ?? 0);
        if (physical(last2[0]) > physical(last2[1])) {
          receiptDetected = true;
          break;
        }
      }
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/inbound");
    return { ok: true, receiptDetected };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export async function deleteInboundShipmentAction(input: {
  shipmentId: string;
}): Promise<InboundActionResult> {
  try {
    await requireAdmin();
    const admin = adminClient();
    const { error: lineErr } = await admin
      .from("inbound_shipment_lines")
      .delete()
      .eq("shipment_id", input.shipmentId);
    if (lineErr) return { ok: false, error: lineErr.message };
    const { error } = await admin
      .from("inbound_shipments")
      .delete()
      .eq("id", input.shipmentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/inbound");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
