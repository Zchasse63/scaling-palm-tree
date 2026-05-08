"use server";

// Admin-only order status + internal-notes update.
// Re-checks admin on every call (defense in depth — the form is rendered
// inside the admin layout but a crafted POST shouldn't bypass).

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/session";

const VALID_STATUSES = [
  "quoted",
  "confirmed",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "invoiced",
  "paid",
  "cancelled",
] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

const TIMESTAMP_BY_STATUS: Partial<Record<OrderStatus, string>> = {
  confirmed: "confirmed_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  invoiced: "invoiced_at",
  paid: "paid_at",
  cancelled: "cancelled_at",
};

export interface UpdateOrderResult {
  ok: boolean;
  error?: string;
}

export async function updateOrderAction(input: {
  orderId: string;
  newStatus?: string;
  internalNotes?: string | null;
}): Promise<UpdateOrderResult> {
  try {
    await requireAdmin();
    const admin = adminClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof input.internalNotes === "string") {
      updates.internal_notes = input.internalNotes;
    }

    if (input.newStatus) {
      if (!VALID_STATUSES.includes(input.newStatus as OrderStatus)) {
        return { ok: false, error: `Invalid status: ${input.newStatus}` };
      }
      updates.status = input.newStatus;
      const tsCol = TIMESTAMP_BY_STATUS[input.newStatus as OrderStatus];
      if (tsCol) updates[tsCol] = new Date().toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from("customer_orders")
      .update(updates)
      .eq("id", input.orderId);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/admin/orders/${input.orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return { ok: false, error: msg };
  }
}
