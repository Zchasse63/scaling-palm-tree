// Order history queries.

import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getContainerSpec } from "@/lib/containers";
import type { CustomerOrderSummary } from "./types";

export async function fetchOrdersForCustomer(
  customerId: string,
): Promise<CustomerOrderSummary[]> {
  const admin = adminClient();
  const { data: orders, error } = await admin
    .from("customer_orders")
    .select(
      "id, order_number, customer_id, status, quoted_at, case_count, total, metadata",
    )
    .eq("customer_id", customerId)
    .order("quoted_at", { ascending: false })
    .limit(50);

  if (error) throw new Error("orders fetch failed: " + error.message);

  const ids = (orders ?? []).map((o) => o.id);
  // Pull line counts and vendor info from line items.
  if (ids.length === 0) return [];

  const { data: lineCounts } = await admin
    .from("customer_order_lines")
    .select("order_id, vendor_product_id")
    .in("order_id", ids);

  const lineCountByOrder = new Map<string, number>();
  const vendorIdByOrder = new Map<string, string>();

  // Resolve vendor_product_id → vendor_id once
  const vendorProductIds = Array.from(
    new Set((lineCounts ?? []).map((l) => l.vendor_product_id).filter(Boolean) as string[]),
  );
  let vendorIdByProduct = new Map<string, string>();
  if (vendorProductIds.length > 0) {
    const { data: vps } = await admin
      .from("vendor_products" as never)
      .select("id, vendor_id")
      .in("id", vendorProductIds);
    if (vps) {
      for (const vp of vps as Array<{ id: string; vendor_id: string }>) {
        vendorIdByProduct.set(vp.id, vp.vendor_id);
      }
    }
  }

  for (const l of lineCounts ?? []) {
    lineCountByOrder.set(l.order_id, (lineCountByOrder.get(l.order_id) ?? 0) + 1);
    if (l.vendor_product_id && !vendorIdByOrder.has(l.order_id)) {
      const vid = vendorIdByProduct.get(l.vendor_product_id);
      if (vid) vendorIdByOrder.set(l.order_id, vid);
    }
  }

  const vendorIds = Array.from(new Set(vendorIdByOrder.values()));
  let vendorNameById = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendors } = await admin
      .from("companies")
      .select("id, name")
      .in("id", vendorIds);
    if (vendors) {
      for (const v of vendors) vendorNameById.set(v.id, v.name);
    }
  }

  return (orders ?? []).map((o) => {
    const vendorId = vendorIdByOrder.get(o.id);
    const vendorName = vendorId ? vendorNameById.get(vendorId) ?? "—" : "—";
    const containerCode =
      ((o.metadata as Record<string, unknown> | null)?.container_code as string | undefined) ??
      "40HC";
    const containerLabel = getContainerSpec(containerCode).label;
    return {
      id: o.id,
      orderNumber: o.order_number,
      vendorName,
      containerLabel,
      status: o.status,
      quotedAt: o.quoted_at,
      caseCount: o.case_count ?? 0,
      total: Number(o.total ?? 0),
      lineCount: lineCountByOrder.get(o.id) ?? 0,
    };
  });
}
