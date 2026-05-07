"use server";

// Server Action: discard the active draft for (customer, vendor).
// Called from the BuilderClient when the customer explicitly clears their cart.

import { requireSession } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";

export interface DiscardDraftResult {
  ok: boolean;
  error?: string;
}

export async function discardDraftAction(
  vendorId: string,
): Promise<DiscardDraftResult> {
  try {
    const session = await requireSession();
    const admin = adminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from("draft_orders")
      .delete()
      .eq("customer_id", session.customerId)
      .eq("vendor_id", vendorId);
    if (error) return { ok: false, error: "Failed to discard draft: " + error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
