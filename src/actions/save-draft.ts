"use server";

// Server Action: upsert a draft order for the authed customer.
// Called from the BuilderClient on debounced qty changes (1s throttle).
// Idempotent: writes the entire qty_map each time (small, fits in one column).

import { requireSession } from "@/lib/auth/session";
import { verifyCustomerCatalogAccess } from "@/lib/catalog/query";
import { adminClient } from "@/lib/supabase/admin";
import type { QtyMap } from "@/lib/math/fill";

export interface SaveDraftInput {
  vendorId: string;
  catalogSlug: string;
  qtyMap: QtyMap;
}

export interface SaveDraftResult {
  ok: boolean;
  error?: string;
  /** ISO timestamp of the persisted updated_at — UI uses for "saved at X". */
  updatedAt?: string;
}

export async function saveDraftAction(
  input: SaveDraftInput,
): Promise<SaveDraftResult> {
  try {
    const session = await requireSession();

    // Cheap server-side authorization: customer must have access to the vendor.
    const access = await verifyCustomerCatalogAccess(session.customerId, input.vendorId);
    if (!access) return { ok: false, error: "No access to that catalog." };

    // Strip non-positive qtys to keep the qty_map clean.
    const cleanMap: QtyMap = {};
    for (const [k, v] of Object.entries(input.qtyMap)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) cleanMap[k] = Math.floor(n);
    }

    const admin = adminClient();
    // Upsert via INSERT ... ON CONFLICT.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("draft_orders")
      .upsert(
        {
          customer_id: session.customerId,
          vendor_id: input.vendorId,
          catalog_slug: input.catalogSlug,
          qty_map: cleanMap,
        },
        { onConflict: "customer_id,vendor_id" },
      )
      .select("updated_at")
      .single();

    if (error) return { ok: false, error: "Failed to save draft: " + error.message };
    return { ok: true, updatedAt: data?.updated_at };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
