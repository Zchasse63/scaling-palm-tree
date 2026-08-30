// /admin/inventory/plan — container-planning worksheet across ALL SKUs.
// Order-up-to logic per SKU: target = floor + velocity x (lead time + 3w
// review buffer); suggested = gap to target, rounded UP to whole pallets.
// The footer sums suggested cases into 40HC fill so a container can be
// composed at a glance. A worksheet, not an order: numbers to argue with.

import Link from "next/link";
import { fmtInt } from "@/lib/math/fmt";
import { adminClient } from "@/lib/supabase/admin";
import {
  fetchInventoryDashboard,
  type InventoryRow,
} from "@/lib/inventory/query";
import { DEFAULT_LEAD_TIME_DAYS } from "@/lib/inventory/types";
import { FeedStamp } from "@/components/admin/inventory/feed-stamp";

export const dynamic = "force-dynamic";

const REVIEW_BUFFER_DAYS = 21;

interface PlanRow {
  row: InventoryRow;
  casesPerPallet: number | null;
  casesPer40hc: number | null;
  target: number;
  position: number; // available + inbound
  suggested: number; // pallet-rounded
  suggestedPallets: number | null;
  fillPct: number | null; // of a 40HC
}

export default async function PlanPage() {
  const data = await fetchInventoryDashboard(new Date().toISOString());
  const admin = adminClient();
  const ids = data.rows.map((r) => r.vendorProductId);
  const { data: packRows, error } = ids.length
    ? await admin
        .from("vendor_products")
        .select("id, cases_per_pallet, cases_per_40hc")
        .in("id", ids)
    : { data: [], error: null };
  if (error) throw new Error("pack data fetch failed: " + error.message);
  const packById = new Map(
    ((packRows ?? []) as Array<{
      id: string;
      cases_per_pallet: number | null;
      cases_per_40hc: number | null;
    }>).map((p) => [p.id, p]),
  );

  const plans: PlanRow[] = data.rows
    .filter((r) => r.hasHistory || r.inbound > 0)
    .map((r) => {
      const pack = packById.get(r.vendorProductId);
      const casesPerPallet = pack?.cases_per_pallet ?? null;
      const casesPer40hc = pack?.cases_per_40hc ?? null;
      const lt = r.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
      const rate = r.velocity.ratePerWeek ?? 0;
      const demand = rate * ((lt + REVIEW_BUFFER_DAYS) / 7);
      const target = Math.round((r.floor ?? 0) + demand);
      const position = r.available + r.inbound;
      const rawGap = Math.max(0, target - position);
      let suggested = rawGap;
      if (suggested > 0 && r.reorderQty !== null && r.reorderQty > suggested) {
        suggested = r.reorderQty;
      }
      if (suggested > 0 && casesPerPallet && casesPerPallet > 0) {
        suggested = Math.ceil(suggested / casesPerPallet) * casesPerPallet;
      }
      return {
        row: r,
        casesPerPallet,
        casesPer40hc,
        target,
        position,
        suggested,
        suggestedPallets:
          suggested > 0 && casesPerPallet ? suggested / casesPerPallet : null,
        fillPct:
          suggested > 0 && casesPer40hc && casesPer40hc > 0
            ? (suggested / casesPer40hc) * 100
            : null,
      };
    })
    .sort((a, b) => b.suggested - a.suggested || a.row.sku.localeCompare(b.row.sku));

  const withSuggestion = plans.filter((p) => p.suggested > 0);
  const totalCases = withSuggestion.reduce((s, p) => s + p.suggested, 0);
  const totalFill = withSuggestion.reduce((s, p) => s + (p.fillPct ?? 0), 0);
  const missingFill = withSuggestion.filter((p) => p.fillPct === null).length;

  const GRID = "132px minmax(160px,1fr) 70px 70px 70px 70px 80px 70px 70px";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-col" style={{ gap: 8 }}>
        <Link
          href="/admin/inventory"
          className="mono t-cap"
          style={{ color: "var(--mid)", textDecoration: "none" }}
        >
          ← Inventory
        </Link>
        <div className="t-h1">Container planning worksheet</div>
        <FeedStamp feed={data.feed} variant="compact" />
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid var(--rule)",
          padding: "12px 18px",
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <div>
          <span className="t-eyebrow">Suggested total </span>
          <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
            {fmtInt(totalCases)} cases · {withSuggestion.length} SKUs
          </span>
        </div>
        <div>
          <span className="t-eyebrow">40HC fill </span>
          <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
            {totalFill.toFixed(0)}%
            {missingFill > 0 ? ` (+${missingFill} SKUs without pack data)` : ""}
          </span>
        </div>
      </div>

      <section style={{ background: "white", border: "1px solid var(--rule)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            gap: 12,
            padding: "10px 18px",
            background: "var(--paper-2)",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          {["SKU", "Description", "Avail", "Inbound", "Vel/wk", "Target", "Suggest", "Pallets", "%40HC"].map(
            (h, i) => (
              <div key={h} className="t-eyebrow" style={{ fontSize: 10, textAlign: i < 2 ? "left" : "right" }}>
                {h}
              </div>
            ),
          )}
        </div>
        {plans.map((p) => (
          <div
            key={p.row.vendorProductId}
            className="row-hover"
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              gap: 12,
              padding: "9px 18px",
              borderBottom: "1px solid var(--rule)",
              alignItems: "baseline",
              color: p.suggested === 0 ? "var(--warm)" : undefined,
            }}
          >
            <Link
              href={`/admin/inventory/${p.row.vendorProductId}`}
              className="mono"
              style={{ fontSize: 12, fontWeight: 500, color: "inherit", textDecoration: "none" }}
            >
              {p.row.sku}
            </Link>
            <span
              className="t-micro"
              style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={p.row.description}
            >
              {p.row.description}
            </span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              {fmtInt(p.row.available)}
            </span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              {fmtInt(p.row.inbound)}
            </span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              {p.row.velocity.ratePerWeek === null
                ? "—"
                : Math.round(p.row.velocity.ratePerWeek)}
            </span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              {fmtInt(p.target)}
            </span>
            <span
              className="mono"
              style={{ fontSize: 12, fontWeight: p.suggested > 0 ? 600 : 400, textAlign: "right" }}
            >
              {p.suggested > 0 ? fmtInt(p.suggested) : "·"}
            </span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              {p.suggestedPallets !== null ? p.suggestedPallets : "·"}
            </span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              {p.fillPct !== null ? p.fillPct.toFixed(1) : "·"}
            </span>
          </div>
        ))}
      </section>

      <div className="t-micro" style={{ color: "var(--warm)" }}>
        Target = floor + trailing velocity x (lead time + {REVIEW_BUFFER_DAYS}d buffer);
        suggested = gap to target vs available + inbound, rounded up to whole pallets
        (respects the reorder-qty setting). SKUs with no velocity plan from their floor
        alone. A worksheet, not a commitment.
      </div>
    </div>
  );
}
