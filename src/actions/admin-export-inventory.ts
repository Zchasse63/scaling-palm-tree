"use server";

// Admin-only CSV export of the inventory table. Same shape as the orders
// export: build the CSV server-side, hand the string to the client for a
// Blob download. Re-checks admin on every call.

import { requireAdmin } from "@/lib/auth/session";
import { fetchInventoryDashboard } from "@/lib/inventory/query";

export interface ExportInventoryResult {
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}

function csvEscape(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function exportInventoryAsCsvAction(): Promise<ExportInventoryResult> {
  try {
    await requireAdmin();
    const data = await fetchInventoryDashboard(new Date().toISOString());

    const header = [
      "SKU",
      "Description",
      "On Hand",
      "Staged",
      "Open Orders",
      "Available",
      "Inbound",
      "Pallets",
      "Cover (weeks)",
      "Status",
      "Floor",
      "Reorder Qty",
      "Lead Time (days)",
      "Value at Cost",
    ];
    const body = data.rows
      .slice()
      .sort((a, b) => a.sku.localeCompare(b.sku))
      .map((r) =>
        [
          r.sku,
          r.description,
          r.onHand,
          r.staged,
          r.ordersOpen,
          r.available,
          r.inbound,
          r.pallets,
          r.cover === null ? "" : r.cover.toFixed(1),
          r.bucket,
          r.floor,
          r.reorderQty,
          r.leadTimeDays,
          r.valueAtCost === null ? "" : r.valueAtCost.toFixed(2),
        ]
          .map(csvEscape)
          .join(","),
      );

    // Filename dates are MM-DD-YYYY per workspace convention.
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const stamp = `${mm}-${dd}-${now.getFullYear()}`;
    return {
      ok: true,
      csv: [header.join(","), ...body].join("\n"),
      filename: `servous-inventory-${stamp}.csv`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
