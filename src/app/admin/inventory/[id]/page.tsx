// /admin/inventory/[id] — SKU detail: runway, commitments, movement, buyers,
// and the three settings edited in place.

import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtInt, fmtMoneyPos } from "@/lib/math/fmt";
import {
  addDays,
  fmtDayShort,
  projectRunway,
} from "@/lib/inventory/calc";
import { fetchSkuDetail } from "@/lib/inventory/query";
import { DEFAULT_LEAD_TIME_DAYS } from "@/lib/inventory/types";
import { SectionBar } from "@/components/ui/section-bar";
import { FeedStamp } from "@/components/admin/inventory/feed-stamp";
import { InvBadge } from "@/components/admin/inventory/inv-badge";
import { RunwayChart } from "@/components/admin/inventory/runway-chart";
import { EditableCell } from "@/components/admin/inventory/editable-cell";
import { coverLabel } from "@/components/admin/inventory/inventory-table";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SkuDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await fetchSkuDetail(id, new Date().toISOString());
  if (!detail) notFound();

  const { row, feed, todayKey } = detail;
  const leadDays = row.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
  const cover = coverLabel(row);

  // Canonical projection: same math as the ACT NOW test in computeBucket.
  // Open commitments are already netted out of Available, so they are not
  // re-played as steps.
  const runway = projectRunway({
    todayKey,
    available: row.available,
    velocity: row.velocity,
    inbound: detail.inboundLines,
    floor: row.floor,
  });

  const firstEta = runway.arrivals[0]?.day ?? null;
  const band =
    row.bucket === "watch" && runway.floorCrossDay
      ? {
          from: runway.floorCrossDay,
          to:
            firstEta && firstEta < addDays(todayKey, leadDays)
              ? firstEta
              : addDays(todayKey, leadDays),
        }
      : null;

  const showChart =
    row.hasHistory &&
    (row.velocity.ratePerWeek !== null || detail.openOrderLines.length > 0);

  const basisWindow =
    row.velocity.reason === "insufficient_history"
      ? "insufficient history"
      : `trailing ${row.velocity.windowWeeks}w velocity (stockout-corrected)`;

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
        <div className="flex" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <div className="t-h2">
            <span className="mono" style={{ fontWeight: 600 }}>
              {row.sku}
            </span>
            <span style={{ color: "var(--mid)" }}> · </span>
            {row.description}
          </div>
          <InvBadge bucket={row.bucket} />
        </div>
        <div className="t-micro">
          {[
            detail.packDisplay ? `Pack ${detail.packDisplay}` : null,
            detail.casesPerPallet ? `${detail.casesPerPallet} cs/pallet` : null,
            detail.caseWeightLb ? `${detail.caseWeightLb} lb gross` : null,
            detail.costPerCase !== null ? `${fmtMoneyPos(detail.costPerCase)}/cs cost` : null,
            row.valueAtCost !== null ? `Available value ${fmtMoneyPos(row.valueAtCost)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <FeedStamp feed={feed} variant="compact" />
      </div>

      {/* position strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 14,
        }}
      >
        {(
          [
            ["On hand", row.onHand, false],
            ["Staged", row.staged, false],
            ["Orders", row.ordersOpen, false],
            ["Available", row.available, true],
            ["Inbound", row.inbound, false],
            ["Position", row.available + row.inbound, false],
          ] as Array<[string, number, boolean]>
        ).map(([label, v, bold]) => (
          <div
            key={label}
            style={{ background: "white", border: "1px solid var(--rule)", padding: "12px 16px" }}
          >
            <div className="t-eyebrow">{label}</div>
            <div
              className="mono"
              style={{
                fontSize: 22,
                fontWeight: bold ? 600 : 500,
                marginTop: 4,
                color: v < 0 ? "var(--burgundy)" : undefined,
              }}
            >
              {row.hasHistory || label === "Orders" || label === "Inbound" ? fmtInt(v) : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* lifetime stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
        }}
      >
        {(
          [
            ["First received", detail.stats.firstObservedDay ? fmtDayShort(detail.stats.firstObservedDay) : "—"],
            ["Total shipped", `${fmtInt(detail.stats.totalConsumed)} cs`],
            [
              "Peak draw",
              detail.stats.peakDraw
                ? `${fmtInt(detail.stats.peakDraw.cases)} cs · ${fmtDayShort(detail.stats.peakDraw.day)}`
                : "—",
            ],
            [
              "Last movement",
              detail.stats.daysSinceMovement === null
                ? "none yet"
                : detail.stats.daysSinceMovement === 0
                  ? "today"
                  : `${detail.stats.daysSinceMovement}d ago`,
            ],
          ] as Array<[string, string]>
        ).map(([label, v]) => (
          <div
            key={label}
            style={{ background: "white", border: "1px solid var(--rule)", padding: "10px 14px" }}
          >
            <div className="t-eyebrow">{label}</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 500, marginTop: 3 }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* runway */}
      <section style={{ background: "white", border: "1px solid var(--rule)" }}>
        <SectionBar as="h2" meta={cover.text !== "—" ? `cover ${cover.text}` : undefined}>
          Runway · next 16 weeks
        </SectionBar>
        <div style={{ padding: "16px 18px", overflowX: "auto" }}>
          {showChart ? (
            <>
              <RunwayChart
                runway={runway}
                floor={row.floor}
                todayKey={todayKey}
                band={band}
                ariaLabel={`Runway: available ${fmtInt(row.available)} cases${row.floor !== null ? `, floor ${fmtInt(row.floor)}` : ""}${runway.arrivals[0] ? `, container arriving ${fmtDayShort(runway.arrivals[0].day)} with ${fmtInt(runway.arrivals[0].qty)}` : ""}`}
              />
              <div className="t-micro" style={{ marginTop: 8, color: "var(--warm)" }}>
                Projection: available minus open orders, then {basisWindow}. Containers at
                ETA. Not a forecast of customer orders.
                {row.velocity.ratePerWeek === null
                  ? " Projection ends at the last known commitment (insufficient history)."
                  : ""}
              </div>
            </>
          ) : (
            <div className="mono t-cap" style={{ padding: "24px 0", color: "var(--mid)" }}>
              {row.hasHistory
                ? "No velocity and no open commitments: nothing to project yet."
                : "Not yet received. This SKU appears once its first container lands."}
            </div>
          )}
        </div>
      </section>

      {/* two columns */}
      <div
        className="builder-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* commitments: permanent drill target */}
          <section id="commitments" style={{ background: "white", border: "1px solid var(--rule)" }}>
            <SectionBar as="h2">Commitments</SectionBar>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {row.reconcile ? (
                <div className="banner-amber">
                  UNIS staged {fmtInt(row.staged)} · open orders {fmtInt(row.ordersOpen)} ·
                  gap {fmtInt(row.staged - row.ordersOpen)}. Staged cases without matching
                  paper; check the order pipeline.
                </div>
              ) : null}
              {detail.openOrderLines.length === 0 && row.staged === 0 ? (
                <div className="t-micro">No open commitments.</div>
              ) : (
                <>
                  {row.staged > 0 ? (
                    <div className="mono" style={{ fontSize: 12 }}>
                      UNIS staged for pickup: {fmtInt(row.staged)} cases
                    </div>
                  ) : null}
                  {detail.openOrderLines.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        gap: 14,
                        borderBottom: "1px solid var(--rule)",
                        paddingBottom: 6,
                      }}
                    >
                      <span className="t-body">{l.customerName}</span>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {l.orderNumber ?? "order"}
                      </span>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                        {fmtInt(l.qtyOpen)} cs
                        {l.requestedDate ? ` · ${fmtDayShort(l.requestedDate)}` : ""}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>

          {/* movement */}
          <section style={{ background: "white", border: "1px solid var(--rule)" }}>
            <SectionBar as="h2" meta={`${detail.movement.length} days`}>
              Movement · last 60 days
            </SectionBar>
            <div style={{ padding: "8px 18px 14px" }}>
              {detail.movement.length === 0 ? (
                <div className="t-micro" style={{ paddingTop: 8 }}>
                  No snapshot history yet.
                </div>
              ) : (
                detail.movement.map((m) => (
                  <div
                    key={m.day}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 90px 90px 1fr",
                      gap: 14,
                      padding: "5px 0 5px 8px",
                      borderBottom: "1px solid var(--rule)",
                      borderLeft: m.isReceipt ? "2px solid var(--warm)" : "2px solid transparent",
                      alignItems: "baseline",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 12 }}>
                      {fmtDayShort(m.day)}
                    </span>
                    <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
                      {fmtInt(m.physical)}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 12,
                        textAlign: "right",
                        color:
                          m.deltaPhysical > 0
                            ? "var(--mid)"
                            : m.deltaPhysical < 0
                              ? "var(--ink)"
                              : "var(--warm)",
                      }}
                    >
                      {m.deltaPhysical > 0 ? "+" : ""}
                      {fmtInt(m.deltaPhysical)}
                    </span>
                    <span
                      className="t-micro"
                      style={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <span>{m.isReceipt ? "receipt" : m.notes ?? ""}</span>
                      {(m.notes?.match(/DN-\d+/g) ?? []).map((dn) => {
                        const ref = detail.dnRefs[dn];
                        if (!ref) return null;
                        return (
                          <span key={dn} style={{ color: "var(--char)" }}>
                            {dn} · {ref.customer ?? `"${ref.subject}"`} (email{" "}
                            {fmtDayShort(ref.day)})
                          </span>
                        );
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* buyers: live orders ONLY, by decision 08-27-2026 */}
          <section style={{ background: "white", border: "1px solid var(--rule)" }}>
            <SectionBar as="h2">Buyers</SectionBar>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {detail.buyers.length === 0 ? (
                <div className="t-micro">
                  No Servous order history yet. Buyers appear as orders ship.
                </div>
              ) : (
                detail.buyers.map((b) => (
                  <div
                    key={b.customerName}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 14,
                      borderBottom: "1px solid var(--rule)",
                      paddingBottom: 6,
                    }}
                  >
                    <div>
                      <div className="t-body">{b.customerName}</div>
                      <div className="t-micro">
                        last order {b.lastOrderDay ? fmtDayShort(b.lastOrderDay) : "—"}
                        {b.typicalGapDays !== null ? ` · typical gap ${b.typicalGapDays}d` : ""}
                        {b.overdueDays !== null ? (
                          <span className="chip chip-amber" style={{ marginLeft: 8 }}>
                            Overdue +{b.overdueDays}d
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                      {fmtInt(b.cases26w)} cs / 26w
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* bought with: order-line co-occurrence, real orders only */}
          <section style={{ background: "white", border: "1px solid var(--rule)" }}>
            <SectionBar as="h2">Usually bought with</SectionBar>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {detail.boughtWith.length === 0 ? (
                <div className="t-micro">
                  Appears as order history accumulates: items that ship on the same
                  orders as this SKU.
                </div>
              ) : (
                detail.boughtWith.map((b) => (
                  <div
                    key={b.sku}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "130px 1fr auto",
                      gap: 12,
                      borderBottom: "1px solid var(--rule)",
                      paddingBottom: 6,
                      alignItems: "baseline",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                      {b.sku}
                    </span>
                    <span className="t-micro">{b.description ?? ""}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--mid)" }}>
                      {b.orders} order{b.orders === 1 ? "" : "s"} · {fmtInt(b.cases)} cs
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* settings in place */}
          <section style={{ background: "white", border: "1px solid var(--rule)" }}>
            <SectionBar as="h2">Replenishment settings</SectionBar>
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {(
                [
                  ["Floor (reorder point, cases)", "reorder_point_cases", row.floor, "not set"],
                  ["Reorder quantity (cases)", "reorder_qty_cases", row.reorderQty, "not set"],
                  ["Lead time (days)", "lead_time_days", row.leadTimeDays, `${DEFAULT_LEAD_TIME_DAYS} (default)`],
                ] as Array<[string, "reorder_point_cases" | "reorder_qty_cases" | "lead_time_days", number | null, string]>
              ).map(([label, field, value, placeholder]) => (
                <div
                  key={field}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}
                >
                  <span className="t-cap">{label}</span>
                  <EditableCell
                    vendorProductId={row.vendorProductId}
                    field={field}
                    value={value}
                    placeholder={placeholder}
                    ariaLabel={label}
                  />
                </div>
              ))}
              <div className="t-micro" style={{ color: "var(--warm)" }}>
                Click a value to edit. Enter saves, Esc cancels. These drive the Act now
                and Watch statuses.
              </div>
            </div>
          </section>

          {/* cost history (internal) */}
          <section style={{ background: "white", border: "1px solid var(--rule)" }}>
            <SectionBar as="h2" meta="internal">
              Cost history
            </SectionBar>
            <div style={{ padding: "10px 18px 14px" }}>
              {detail.costHistory.length === 0 ? (
                <div className="t-micro" style={{ paddingTop: 6 }}>
                  No cost records for this SKU.
                </div>
              ) : (
                detail.costHistory.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: 12,
                      padding: "6px 0",
                      borderBottom: "1px solid var(--rule)",
                      alignItems: "baseline",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 12 }}>
                      {fmtDayShort(c.effectiveFrom.slice(0, 10))}
                      {" → "}
                      {c.effectiveTo ? fmtDayShort(c.effectiveTo.slice(0, 10)) : "current"}
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 12, fontWeight: c.effectiveTo === null ? 600 : 400, textAlign: "right" }}
                    >
                      {fmtMoneyPos(c.costPerCase)}/cs
                    </span>
                    <span className="t-micro" style={{ textAlign: "right" }}>
                      {c.source ?? ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
