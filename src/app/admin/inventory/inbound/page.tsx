// /admin/inventory/inbound — containers on the water, manual entry, and the
// lead-time learning log.

import Link from "next/link";
import { fmtInt } from "@/lib/math/fmt";
import { dayDiff, fmtDayShort, fmtEtStamp } from "@/lib/inventory/calc";
import {
  fetchInboundFormOptions,
  fetchInboundShipments,
  fetchInventoryDashboard,
  type InboundShipmentView,
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
  const actNow = dashboard.rows.filter((r) => r.bucket === "act_now").length;

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
            {shipments.received.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 1fr 110px 150px",
                  gap: 14,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--rule)",
                  alignItems: "baseline",
                }}
              >
                <span className="mono" style={{ fontSize: 12 }}>
                  {s.receivedAt ? fmtDayShort(s.receivedAt.slice(0, 10)) : "—"}
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
            ))}
          </div>
        </section>
      ) : null}
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
