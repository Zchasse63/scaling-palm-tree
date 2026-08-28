"use server";

// Admin-only per-SKU inventory settings (reorder floor, reorder qty, lead time).
// Re-checks admin on every call (defense in depth — the layout gate does not
// protect Server Actions).

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/session";
import { fetchSavannahLocationId } from "@/lib/inventory/query";

const FIELDS = ["reorder_point_cases", "reorder_qty_cases", "lead_time_days"] as const;
type SettingsField = (typeof FIELDS)[number];

export interface UpdateSettingsResult {
  ok: boolean;
  error?: string;
}

export async function updateInventorySettingsAction(input: {
  vendorProductId: string;
  field: string;
  value: number | null; // null clears the setting
}): Promise<UpdateSettingsResult> {
  try {
    await requireAdmin();
    if (!FIELDS.includes(input.field as SettingsField)) {
      return { ok: false, error: `Invalid field: ${input.field}` };
    }
    if (input.value !== null && (!Number.isInteger(input.value) || input.value < 0)) {
      return { ok: false, error: "Value must be a whole number of at least 0" };
    }

    const locationId = await fetchSavannahLocationId();
    if (!locationId) {
      return { ok: false, error: "No Savannah snapshot location found" };
    }

    const admin = adminClient();
    const { data: existing, error: findErr } = await admin
      .from("vendor_product_warehouses")
      .select("id")
      .eq("vendor_product_id", input.vendorProductId)
      .eq("location_id", locationId)
      .maybeSingle();
    if (findErr) return { ok: false, error: findErr.message };

    const patch: {
      reorder_point_cases?: number | null;
      reorder_qty_cases?: number | null;
      lead_time_days?: number | null;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (input.field === "reorder_point_cases") patch.reorder_point_cases = input.value;
    else if (input.field === "reorder_qty_cases") patch.reorder_qty_cases = input.value;
    else patch.lead_time_days = input.value;

    if (existing) {
      const { error } = await admin
        .from("vendor_product_warehouses")
        .update(patch)
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await admin.from("vendor_product_warehouses").insert({
        vendor_product_id: input.vendorProductId,
        location_id: locationId,
        is_primary: false,
        ...patch,
      });
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${input.vendorProductId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
