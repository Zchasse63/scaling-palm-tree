// /admin/inventory/inbound — containers on the water, manual entry, and the
// lead-time learning log.

import Link from "next/link";
import { fmtInt } from "@/lib/math/fmt";
import { dayDiff, etDayKey, fmtDayShort } from "@/lib/inventory/calc";
import {
  fetchInboundFormOptions,
  fetchInboundShipments,
  fetchInventoryDashboard,
  fetchReceiptChecks,
  type InboundShipmentView,
  type ReceiptCheck,
} from "@/lib/inventory/query";
import { FeedStamp } from "@/components/admin/inventory/feed-stamp";
import {
  NewShipmentForm,
  ShipmentActions,
} from "@/components/admin/inventory/inbound-form";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ordered: "Ordered",
  in_transit: "In transit",
  arrived: "Arrived",
  received: "Received",
};

export default async function InboundPage() {
  const [dashboard, shipments, options] = await Promise.all([
    fetchInventoryDashboard(new Date().toISOString()),
    fetchInboundShipments(),
    fetchInboundFormOptions(),
  ]);
  const receiptChecks = await fetchReceiptChecks(shipments.received);
  const actNow = dashboard.rows.filter((r) => r.bucket === "act_now").length;

  // Actual-vs-planned lead time by vendor (learning log rollup).
  const byVendor = new Map<string, { actual: number[]; planned: number[] }>();
  for (const s of shipments.received) {
    if (s.actualLeadDays === null) continue;
    const key = s.vendorName ?? "Unknown vendor";
    const e = byVendor.get(key) ?? { actual: [], planned: [] };
    e.actual.push(s.actualLeadDays);
    if (s.plannedLeadDays !== null) e.planned.push(s.plannedLeadDays);
    byVendor.set(key, e);
  }
  const vendorLeadTimes = Array.from(byVendor.entries()).map(([vendor, e]) => ({
    vendor,
    n: e.actual.length,
    avgActual: Math.round(e.actual.reduce((a, b) => a + b, 0) / e.actual.length),
    avgPlanned:
      e.planned.length > 0
        ? Math.round(e.planned.reduce((a, b) => a + b, 0) / e.planned.length)
        : null,
  }));

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
        <div className="t-h1">Inbound containers</div>
        <FeedStamp feed={dashboard.feed} variant="compact" />
      </div>

      {/* header strip */}
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
          <span className="t-eyebrow">Next arrival </span>
          <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
            {dashboard.nextArrival
              ? `${fmtDayShort(dashboard.nextArrival.eta)} · ${dayDiff(dashboard.todayKey, dashboard.nextArrival.eta)}d out`
              : "none scheduled"}
          </span>
        </div>
        <div>
          <span className="t-eyebrow">On the water </span>
          <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
            {fmtInt(dashboard.inboundTotalCases)} cases
          </span>
        </div>
        <Link
          href="/admin/inventory/plan"
          className="mono t-cap"
          style={{ marginLeft: "auto", color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Plan next container →
        </Link>
      </div>

      {shipments.open.length === 0 ? (
        <section
          style={{
            background: "white",
            border: "1px solid var(--rule)",
            padding: "36px 24px",
            textAlign: "center",
          }}
        >
          <div className="mono t-cap">No containers on the water.</div>
          {actNow > 0 ? (
            <div className="t-micro" style={{ marginTop: 8, color: "var(--amber)" }}>
              {actNow} SKU{actNow === 1 ? "" : "s"} project below floor within lead time; a
              container should be planned.
            </div>
          ) : null}
        </section>
      ) : (
        shipments.open.map((s) => <ShipmentCard key={s.id} s={s} todayKey={dashboard.todayKey} />)
      )}

      <NewShipmentForm vendors={options.vendors} skus={options.skus} />

      {shipments.received.length > 0 ? (
        <section style={{ background: "white", border: "1px solid var(--rule)" }}>
          <div
            style={{
              padding: "12px 22px",
              background: "var(--paper-2)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div className="t-eyebrow">
              Received · actual vs planned lead time
            </div>
          </div>
          <div style={{ padding: "8px 22px 14px" }}>
            {vendorLeadTimes.length > 0 ? (
              <div
                className="t-micro"
                style={{ padding: "4px 0 8px", color: "var(--mid)", borderBottom: "1px solid var(--rule)" }}
              >
                {vendorLeadTimes
                  .map(
                    (v) =>
                      `${v.vendor}: avg ${v.avgActual}d actual` +
                      (v.avgPlanned !== null ? ` vs ${v.avgPlanned}d planned` : "") +
                      ` (${v.n})`,
                  )
                  .join(" · ")}
              </div>
            ) : null}
            {shipments.received.map((s) => (
              <div key={s.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 1fr 110px 150px",
                    gap: 14,
                    padding: "6px 0",
                    alignItems: "baseline",
                  }}
                >
                  <span className="mono" style={{ fontSize: 12 }}>
                    {s.receivedAt ? fmtDayShort(etDayKey(s.receivedAt)) : "—"}
                  </span>
                  <span className="mono" style={{ fontSize: 12 }}>
                    {s.containerNo ?? s.poNumber ?? "shipment"}
                    {s.vendorName ? ` · ${s.vendorName}` : ""}
                  </span>
                  <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
                    {fmtInt(s.lines.reduce((t, l) => t + l.qtyCases, 0))} cs
                  </span>
                  <span className="t-micro" style={{ textAlign: "right" }}>
                    {s.actualLeadDays !== null
                      ? `${s.actualLeadDays}d actual${s.plannedLeadDays !== null ? ` / ${s.plannedLeadDays}d planned` : ""}`
                      : ""}
                  </span>
                </div>
                <ReceiptCheckLine s={s} checks={receiptChecks} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/**
 * Receipt-to-PO verification line: planned vs the observed snapshot jump.
 * Silent when every line verified clean; shortages and overages get called
 * out per SKU so a vendor claim can go out while the container is fresh.
 */
function ReceiptCheckLine({
  s,
  checks,
}: {
  s: InboundShipmentView;
  checks: Map<string, ReceiptCheck>;
}) {
  const problems = s.lines
    .map((l) => ({ l, c: checks.get(l.id) }))
    .filter(
      (x): x is { l: (typeof s.lines)[number]; c: ReceiptCheck } =>
        x.c !== undefined && (x.c.verdict === "short" || x.c.verdict === "over"),
    );
  const verified = s.lines.filter((l) => checks.get(l.id)?.verdict === "ok").length;
  if (problems.length === 0) {
    return verified > 0 ? (
      <div className="t-micro" style={{ padding: "0 0 6px", color: "var(--warm)" }}>
        receipt verified against UNIS ({verified}/{s.lines.length} line
        {s.lines.length === 1 ? "" : "s"})
      </div>
    ) : null;
  }
  return (
    <div className="t-micro" style={{ padding: "0 0 6px", color: "var(--amber)" }}>
      {problems
        .map(
          ({ l, c }) =>
            `${l.sku ?? "line"}: ${c.verdict === "short" ? "short" : "over"} ` +
            `(planned ${fmtInt(l.qtyCases)}, observed +${fmtInt(c.deltaCases ?? 0)})`,
        )
        .join(" · ")}{" "}
      — check the UNIS receipt paperwork.
    </div>
  );
}

function ShipmentCard({ s, todayKey }: { s: InboundShipmentView; todayKey: string }) {
  const cases = s.lines.reduce((t, l) => t + l.qtyCases, 0);
  return (
    <section style={{ background: "white", border: "1px solid var(--rule)" }}>
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <div className="flex" style={{ gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
            {s.containerNo ?? "container TBD"}
          </span>
          {s.vendorName ? <span className="t-cap">{s.vendorName}</span> : null}
          {s.poNumber ? (
            <span className="mono t-cap">PO {s.poNumber}</span>
          ) : null}
          <span className="chip chip-ink">{STATUS_LABEL[s.status] ?? s.status}</span>
        </div>
        <div className="mono" style={{ fontSize: 12 }}>
          {s.etd ? `ETD ${fmtDayShort(s.etd)}` : ""}
          {s.etd && s.eta ? " → " : ""}
          {s.eta
            ? `ETA ${fmtDayShort(s.eta)} · ${dayDiff(todayKey, s.eta)}d out`
            : "no ETA"}
        </div>
      </div>
      <div style={{ padding: "10px 18px" }}>
        {s.lines.map((l) => (
          <div
            key={l.id}
            id={l.sku ? `sku-${l.sku}` : undefined}
            style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr 90px",
              gap: 14,
              padding: "5px 0",
              borderBottom: "1px solid var(--rule)",
              alignItems: "baseline",
            }}
          >
            <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
              {l.sku ?? "—"}
            </span>
            <span className="t-micro">{l.description ?? ""}</span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
              {fmtInt(l.qtyCases)} cs
            </span>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 8,
            gap: 14,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
            {fmtInt(cases)} cases total
          </span>
          {s.notes ? <span className="t-micro">{s.notes}</span> : null}
          <ShipmentActions
            shipmentId={s.id}
            poNumber={s.poNumber}
            containerNo={s.containerNo}
            etd={s.etd}
            eta={s.eta}
            status={s.status}
            notes={s.notes}
          />
        </div>
      </div>
    </section>
  );
}
