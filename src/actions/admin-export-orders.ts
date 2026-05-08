"use server";

// Admin-only CSV export of customer_orders matching the supplied filters.

import { requireAdmin } from "@/lib/auth/session";
import {
  fetchAllOrdersForAdmin,
  type AdminOrdersFilters,
} from "@/lib/orders/query";

export interface ExportOrdersResult {
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}

function csvEscape(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  const str = String(s);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function exportOrdersAsCsvAction(
  filters: AdminOrdersFilters,
): Promise<ExportOrdersResult> {
  try {
    await requireAdmin();
    const rows = await fetchAllOrdersForAdmin({ ...filters, limit: 1000 });
    const header = [
      "Order #",
      "Customer",
      "Customer Email",
      "Submitted At",
      "Status",
      "Catalog",
      "Container",
      "Lines",
      "Cases",
      "Total",
    ];
    const body = rows.map((r) =>
      [
        r.orderNumber ?? r.id,
        r.customerName,
        r.customerEmail ?? "",
        r.quotedAt,
        r.status,
        r.catalogDisplayName ?? r.vendorName,
        r.containerLabel,
        r.lineCount,
        r.caseCount,
        r.total.toFixed(2),
      ]
        .map(csvEscape)
        .join(","),
    );
    const csv = [header.join(","), ...body].join("\n");
    const stamp = new Date().toISOString().slice(0, 10);
    return { ok: true, csv, filename: `servous-orders-${stamp}.csv` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return { ok: false, error: msg };
  }
}
