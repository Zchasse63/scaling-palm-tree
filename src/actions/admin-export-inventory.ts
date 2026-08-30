"use server";

// Admin-only CSV export of the inventory table. Same shape as the orders
// export: build the CSV server-side, hand the string to the client for a
// Blob download. Re-checks admin on every call.

import { requireAdmin } from "@/lib/auth/session";
import { etDayKey } from "@/lib/inventory/calc";
import { fetchInventoryDashboard } from "@/lib/inventory/query";

export interface ExportInventoryResult {
  ok: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}

function csvEscape(v: string | number | null): string {
  if (v === null) return "";
  let s = String(v);
  // Spreadsheet formula-injection guard: a text cell starting with =, +, -, @,
  // tab, or CR would execute as a formula when opened in Excel. Prefix with a
  // quote to force literal text. Numeric values skip this so negatives stay
  // numbers.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
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

    // Filename dates are MM-DD-YYYY per workspace convention, on the
    // America/New_York calendar (the server runs in UTC).
    const [yyyy, mm, dd] = etDayKey(new Date().toISOString()).split("-");
    const stamp = `${mm}-${dd}-${yyyy}`;
    return {
      ok: true,
      csv: [header.join(","), ...body].join("\n"),
      filename: `servous-inventory-${stamp}.csv`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
