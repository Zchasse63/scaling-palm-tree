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
    // Header + lines in one transaction (fn_inbound_create). The function
    // also validates each SKU is an active vendor_products row, so a stale
    // form can't file a container against a delisted SKU.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).rpc("fn_inbound_create", {
      p_vendor_id: input.vendorId,
      p_po_number: input.poNumber,
      p_container_no: input.containerNo,
      p_etd: input.etd,
      p_eta: input.eta,
      p_notes: input.notes,
      p_destination_location_id: destination,
      p_lines: input.lines.map((l) => ({
        vendor_product_id: l.vendorProductId,
        qty_cases: l.qtyCases,
      })),
    });
    if (error) return { ok: false, error: error.message };

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
    const allowed = ["ordered", "in_transit", "arrived", "received"];
    if (!allowed.includes(input.status)) {
      return { ok: false, error: `Invalid status: ${input.status}` };
    }
    const admin = adminClient();
    // Status and received_at must move together: the inbound list partitions
    // on received_at, so "received" without a timestamp would keep counting
    // the container as on-the-water, and un-receiving must clear it.
    const { data: existing, error: readErr } = await admin
      .from("inbound_shipments")
      .select("received_at")
      .eq("id", input.shipmentId)
      .maybeSingle();
    if (readErr) return { ok: false, error: readErr.message };
    if (!existing) return { ok: false, error: "Shipment not found" };
    const receivedAt =
      input.status === "received"
        ? (existing.received_at ?? new Date().toISOString())
        : null;
    const { error } = await admin
      .from("inbound_shipments")
      .update({
        po_number: input.poNumber,
        container_no: input.containerNo,
        etd: input.etd,
        eta: input.eta,
        status: input.status,
        notes: input.notes,
        received_at: receivedAt,
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
      .update({ received_at: new Date().toISOString(), status: "received" })
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).rpc("fn_inbound_delete", {
      p_shipment_id: input.shipmentId,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/inbound");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
