// Server-side draft queries.

import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { QtyMap } from "@/lib/math/fill";
import type { DraftOrder } from "./types";
import { DRAFT_MAX_AGE_DAYS } from "./types";

/**
 * Returns the active draft for (customer, vendor) if one exists and is still
 * within the freshness window. Older drafts are ignored at this layer.
 */
export async function fetchDraftForVendor(
  customerId: string,
  vendorId: string,
): Promise<DraftOrder | null> {
  const admin = adminClient();
  const cutoff = new Date(Date.now() - DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("draft_orders")
    .select("id, customer_id, vendor_id, catalog_slug, qty_map, created_at, updated_at")
    .eq("customer_id", customerId)
    .eq("vendor_id", vendorId)
    .gte("updated_at", cutoff)
    .maybeSingle();

  if (error) throw new Error("draft fetch failed: " + error.message);
  if (!data) return null;

  return {
    id: data.id,
    customerId: data.customer_id,
    vendorId: data.vendor_id,
    catalogSlug: data.catalog_slug,
    qtyMap: (data.qty_map ?? {}) as QtyMap,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Returns map of vendor_id -> draft summary for all of a customer's active
 * drafts. Used to badge catalog cards/dropdown with "draft pending" indicators.
 */
export async function fetchAllDraftsForCustomer(
  customerId: string,
): Promise<Map<string, { vendorId: string; caseCount: number; updatedAt: string }>> {
  const admin = adminClient();
  const cutoff = new Date(Date.now() - DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("draft_orders")
    .select("vendor_id, qty_map, updated_at")
    .eq("customer_id", customerId)
    .gte("updated_at", cutoff);

  if (error) throw new Error("drafts fetch failed: " + error.message);

  const out = new Map<string, { vendorId: string; caseCount: number; updatedAt: string }>();
  for (const row of (data ?? []) as Array<{
    vendor_id: string;
    qty_map: Record<string, number> | null;
    updated_at: string;
  }>) {
    const qtys = row.qty_map ?? {};
    let cases = 0;
    for (const v of Object.values(qtys)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) cases += n;
    }
    if (cases > 0) {
      out.set(row.vendor_id, {
        vendorId: row.vendor_id,
        caseCount: cases,
        updatedAt: row.updated_at,
      });
    }
  }
  return out;
}
