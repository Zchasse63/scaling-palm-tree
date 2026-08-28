// The one dense table: 46 SKUs, one screen, worst first. Server component.
// Sticky header pins against body scroll (no overflow wrapper, no frozen
// column — the 10 columns fit the 1440 shell; see UIUX spec section 4).

import Link from "next/link";
import { fmtInt } from "@/lib/math/fmt";
import { DEFAULT_LEAD_TIME_DAYS } from "@/lib/inventory/types";
import type { InventoryRow } from "@/lib/inventory/query";
import { InvBadge, ReconcileFlag } from "./inv-badge";
import { Sparkline } from "./sparkline";

export const GRID = "132px minmax(170px,1fr) 72px 64px 64px 76px 68px 90px 60px 84px 110px";

export type SortKey =
  | "sku"
  | "on_hand"
  | "staged"
  | "orders"
  | "avail"
  | "inbound"
  | "cover"
  | "value";

const HEADERS: Array<{
  key: SortKey | null;
  label: string;
  align: "left" | "right";
  cls: string;
}> = [
  { key: "sku", label: "SKU", align: "left", cls: "inv-c-sku" },
  { key: null, label: "Description", align: "left", cls: "inv-c-desc" },
  { key: "on_hand", label: "On hand", align: "right", cls: "inv-c-onhand" },
  { key: "staged", label: "Staged", align: "right", cls: "inv-c-staged" },
  { key: "orders", label: "Orders", align: "right", cls: "inv-c-orders" },
  { key: "avail", label: "Avail", align: "right", cls: "inv-c-avail" },
  { key: "inbound", label: "Inbound", align: "right", cls: "inv-c-inbound" },
  { key: "cover", label: "Cover", align: "right", cls: "inv-c-cover" },
  { key: null, label: "Trend", align: "right", cls: "inv-hide-mobile" },
  { key: "value", label: "Value", align: "right", cls: "inv-c-value" },
  { key: null, label: "Status", align: "left", cls: "inv-c-status" },
];

export function coverLabel(row: InventoryRow): { text: string; amber: boolean } {
  if (!row.hasHistory) return { text: "—", amber: false };
  if (row.velocity.reason === "insufficient_history") {
    return { text: `insufficient (${row.velocity.windowWeeks}w)`, amber: false };
  }
  if (row.velocity.reason === "no_movement") return { text: "no movement", amber: false };
  if (row.cover === null) return { text: "—", amber: false };
  const leadWeeks = (row.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS) / 7;
  const rounded = row.cover >= 10 ? Math.round(row.cover) : Math.round(row.cover * 10) / 10;
  return { text: `${rounded}w`, amber: row.cover < leadWeeks };
}

function numCell(v: number, opts?: { bold?: boolean; negative?: boolean }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: opts?.bold ? 13 : 12,
        fontWeight: opts?.bold ? 600 : 400,
        color: opts?.negative ? "var(--burgundy)" : undefined,
      }}
    >
      {fmtInt(v)}
    </span>
  );
}

export function InventoryTable({
  rows,
  sort,
  dir,
  makeSortHref,
  trendLabel,
}: {
  rows: InventoryRow[];
  sort: SortKey | null;
  dir: "asc" | "desc";
  makeSortHref: (key: SortKey) => string;
  trendLabel: string; // e.g. "7w"
}) {
  const totals = rows.reduce(
    (t, r) => ({
      onHand: t.onHand + r.onHand,
      staged: t.staged + r.staged,
      orders: t.orders + r.ordersOpen,
      avail: t.avail + r.available,
      inbound: t.inbound + r.inbound,
      value: t.value + (r.valueAtCost ?? 0),
    }),
    { onHand: 0, staged: 0, orders: 0, avail: 0, inbound: 0, value: 0 },
  );

  return (
    <section style={{ background: "white", border: "1px solid var(--rule)" }}>
      {/* header */}
      <div
        className="admin-inventory-row-headers"
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 12,
          padding: "10px 18px",
          background: "var(--paper-2)",
          borderBottom: "1px solid var(--rule)",
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}
      >
        {HEADERS.map((h) => {
          const label = h.label === "Trend" ? `${trendLabel}` : h.label;
          const active = h.key !== null && h.key === sort;
          const arrow = active ? (dir === "asc" ? " ↑" : " ↓") : "";
          const title =
            h.label === "Cover"
              ? `Weeks of cover: available / trailing ${trendLabel} velocity, stockout-corrected`
              : undefined;
          return (
            <div
              key={h.label}
              className="t-eyebrow"
              style={{ textAlign: h.align, fontSize: 10 }}
              title={title}
            >
              {h.key ? (
                <Link
                  href={makeSortHref(h.key)}
                  style={{ color: active ? "var(--ink)" : "inherit", textDecoration: "none" }}
                >
                  {label}
                  {arrow}
                </Link>
              ) : (
                label
              )}
            </div>
          );
        })}
      </div>

      {/* rows */}
      {rows.map((r) => {
        const cover = coverLabel(r);
        const detail = `/admin/inventory/${r.vendorProductId}`;
        return (
          <div
            key={r.vendorProductId}
            className="row-hover admin-inventory-row"
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              gap: 12,
              padding: "12px 18px",
              borderBottom: "1px solid var(--rule)",
              alignItems: "center",
              minHeight: 44,
            }}
          >
            <div className="inv-c-sku">
              <Link
                href={detail}
                className="mono"
                style={{ fontSize: 12, color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}
              >
                {r.sku}
              </Link>
            </div>
            <div
              className="t-body inv-c-desc"
              title={r.description}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.description}
              {r.inactive ? (
                <span className="chip chip-warm" style={{ marginLeft: 8 }}>
                  inactive
                </span>
              ) : null}
            </div>
            <div className="inv-c-onhand" style={{ textAlign: "right" }}>
              <span className="inv-label t-eyebrow">On hand</span>
              {r.hasHistory ? numCell(r.onHand) : <span className="t-micro">—</span>}
            </div>
            <div className="inv-c-staged" style={{ textAlign: "right" }}>
              <span className="inv-label t-eyebrow">Staged</span>
              {r.hasHistory ? (
                <Link href={`${detail}#commitments`} style={{ textDecoration: "none", color: "inherit" }}>
                  {numCell(r.staged)}
                  {r.reconcile ? <ReconcileFlag staged={r.staged} orders={r.ordersOpen} /> : null}
                </Link>
              ) : (
                <span className="t-micro">—</span>
              )}
            </div>
            <div className="inv-c-orders" style={{ textAlign: "right" }}>
              <span className="inv-label t-eyebrow">Orders</span>
              <Link href={`${detail}#commitments`} style={{ textDecoration: "none", color: "inherit" }}>
                {numCell(r.ordersOpen)}
              </Link>
            </div>
            <div className="inv-c-avail" style={{ textAlign: "right" }}>
              <span className="inv-label t-eyebrow">Avail</span>
              {r.hasHistory ? (
                numCell(r.available, { bold: true, negative: r.available < 0 })
              ) : (
                <span className="t-micro" style={{ color: "var(--warm)" }}>
                  not yet received
                </span>
              )}
            </div>
            <div className="inv-c-inbound" style={{ textAlign: "right" }}>
              <span className="inv-label t-eyebrow">Inbound</span>
              {r.inbound > 0 ? (
                <Link
                  href={`/admin/inventory/inbound#sku-${r.sku}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {numCell(r.inbound)}
                </Link>
              ) : (
                numCell(0)
              )}
            </div>
            <div className="inv-c-cover" style={{ textAlign: "right" }}>
              <span className="inv-label t-eyebrow">Cover</span>
              <span
                className="mono"
                style={{ fontSize: 12, color: cover.amber ? "var(--amber)" : undefined }}
              >
                {cover.text}
              </span>
            </div>
            <div className="inv-hide-mobile" style={{ display: "flex", justifyContent: "flex-end" }}>
              <Sparkline
                weeks={r.weeklyConsumption}
                receipts={r.weeklyReceipts}
                label={`Weekly consumption, trailing ${trendLabel}`}
              />
            </div>
            <div className="inv-c-value" style={{ textAlign: "right" }}>
              <span className="inv-label t-eyebrow">Value</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--mid)" }}>
                {r.valueAtCost === null ? "—" : "$" + fmtInt(Math.round(r.valueAtCost))}
              </span>
            </div>
            <div className="inv-c-status">
              <span className="inv-label t-eyebrow">Status</span>
              <InvBadge bucket={r.bucket} />
              {r.bucket === "healthy" ? (
                <span className="t-micro" style={{ color: "var(--warm)" }}>
                  OK
                </span>
              ) : null}
              {r.bucket === "none" ? (
                <span className="t-micro" style={{ color: "var(--warm)" }}>
                  inbound only
                </span>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* totals: equals the raw snapshot sums (verified in tests) */}
      <div
        className="admin-inventory-row-headers"
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 12,
          padding: "10px 18px",
          borderTop: "1px solid var(--rule-strong)",
          background: "var(--paper-2)",
          alignItems: "center",
        }}
      >
        <div className="t-eyebrow">Total</div>
        <div className="t-micro">{rows.length} SKUs</div>
        <div style={{ textAlign: "right" }}>{numCell(totals.onHand)}</div>
        <div style={{ textAlign: "right" }}>{numCell(totals.staged)}</div>
        <div style={{ textAlign: "right" }}>{numCell(totals.orders)}</div>
        <div style={{ textAlign: "right" }}>{numCell(totals.avail, { bold: true })}</div>
        <div style={{ textAlign: "right" }}>{numCell(totals.inbound)}</div>
        <div />
        <div />
        <div style={{ textAlign: "right" }}>
          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
            {"$" + fmtInt(Math.round(totals.value))}
          </span>
        </div>
        <div />
      </div>
    </section>
  );
}
