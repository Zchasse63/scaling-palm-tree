// Shared full-order view used by both /orders/[id] (customer) and
// /admin/orders/[id] (admin). The two views differ only in:
//   - the chrome around them (customer chrome vs admin chrome)
//   - whether admin-only fields are rendered (vendor cost, margin %, internal
//     notes, status update controls — all toggled by `mode === "admin"`)
//   - the status update controls, which the parent slots in via children
//
// Server component, pure presentation. Renders well when the parent invokes
// window.print() — no fixed-position chrome, sensible page-break hints.

import { StatusPill } from "@/components/ui/status-pill";
import { fmtInt, fmtMoneyPos } from "@/lib/math/fmt";
import type {
  CustomerOrderDetail,
  OrderStatusTimeline,
} from "@/lib/orders/types";
import type { ReactNode } from "react";

interface OrderDetailViewProps {
  order: CustomerOrderDetail;
  mode: "customer" | "admin";
  /**
   * Optional admin-only slot rendered to the right of the order header — used
   * for the status update form and the "Print" button. Customer view shows
   * just a Print button via this slot.
   */
  headerActions?: ReactNode;
  /**
   * Optional slot below the order header (above the line items) — admin
   * surfaces the internal notes editor here.
   */
  belowHeader?: ReactNode;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const TIMELINE_STAGES: Array<{
  key: keyof OrderStatusTimeline;
  label: string;
}> = [
  { key: "quoted_at", label: "Submitted" },
  { key: "confirmed_at", label: "Confirmed" },
  { key: "shipped_at", label: "Shipped" },
  { key: "delivered_at", label: "Delivered" },
  { key: "invoiced_at", label: "Invoiced" },
  { key: "paid_at", label: "Paid" },
];

function StatusTimeline({
  timeline,
  status,
}: {
  timeline: OrderStatusTimeline;
  status: string;
}) {
  if (status === "cancelled" && timeline.cancelled_at) {
    return (
      <div
        className="mono"
        style={{
          padding: "12px 14px",
          background: "var(--burgundy-bg)",
          color: "var(--burgundy)",
          border: "1px solid var(--burgundy)",
          fontSize: 12,
          letterSpacing: "0.04em",
        }}
      >
        CANCELLED · {formatDate(timeline.cancelled_at)}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      {TIMELINE_STAGES.map((s, idx) => {
        const ts = timeline[s.key];
        const reached = !!ts;
        const isCurrent =
          (s.key === "quoted_at" && status === "quoted") ||
          (s.key === "confirmed_at" &&
            (status === "confirmed" || status === "in_production" || status === "ready")) ||
          (s.key === "shipped_at" && status === "shipped") ||
          (s.key === "delivered_at" && status === "delivered") ||
          (s.key === "invoiced_at" && status === "invoiced") ||
          (s.key === "paid_at" && status === "paid");
        return (
          <div
            key={s.key}
            style={{
              flex: 1,
              minWidth: 110,
              padding: "10px 12px",
              border: "1px solid var(--rule)",
              borderLeft: reached
                ? "3px solid var(--ink)"
                : "3px solid var(--rule-strong)",
              background: isCurrent ? "var(--paper-2)" : "white",
              opacity: reached || isCurrent ? 1 : 0.5,
            }}
          >
            <div
              className="t-eyebrow"
              style={{ marginBottom: 4, fontSize: 9 }}
            >
              {String(idx + 1).padStart(2, "0")} · {s.label}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: reached ? "var(--ink)" : "var(--warm)",
              }}
            >
              {reached ? formatDate(ts) : "Pending"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrderDetailView({
  order,
  mode,
  headerActions,
  belowHeader,
}: OrderDetailViewProps) {
  const isAdmin = mode === "admin";

  return (
    <div className="order-detail" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* HEADER CARD */}
      <section
        style={{
          background: "white",
          border: "1px solid var(--rule)",
          padding: "22px 26px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div className="flex flex-col" style={{ gap: 6, minWidth: 260 }}>
            <div className="t-eyebrow">Order</div>
            <div
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {order.orderNumber ?? order.id.slice(0, 8)}
            </div>
            <div
              className="mono t-cap"
              style={{ marginTop: 4, color: "var(--mid)" }}
            >
              Submitted {formatDate(order.quotedAt)}
            </div>
          </div>
          <div
            className="flex flex-col"
            style={{ gap: 8, alignItems: "flex-end", minWidth: 200 }}
          >
            <StatusPill status={order.status} />
            {headerActions ? (
              <div className="no-print" style={{ marginTop: 8 }}>
                {headerActions}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid var(--rule)",
          }}
        >
          <KV label="Customer" value={order.customerName} />
          <KV label="Catalog" value={order.catalogDisplayName ?? order.vendorName} />
          <KV label="Container" value={order.containerLabel} />
          <KV label="Terms" value={order.termsLabel ?? "—"} />
          {isAdmin && order.customerEmail ? (
            <KV label="Submitted by" value={order.customerEmail} />
          ) : null}
        </div>
      </section>

      {/* STATUS TIMELINE */}
      <section
        className="no-print"
        style={{
          background: "white",
          border: "1px solid var(--rule)",
          padding: "18px 22px",
        }}
      >
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>
          Status Timeline
        </div>
        <StatusTimeline timeline={order.timeline} status={order.status} />
      </section>

      {belowHeader ? <div className="no-print">{belowHeader}</div> : null}

      {/* LINE ITEMS */}
      <section style={{ background: "white", border: "1px solid var(--rule)" }}>
        <div
          style={{
            padding: "12px 22px",
            background: "var(--paper-2)",
            borderBottom: "1px solid var(--rule)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div className="t-eyebrow">Order Lines · {order.lines.length}</div>
          <div className="mono t-cap" style={{ color: "var(--mid)" }}>
            Pricing in {order.currency ?? "USD"}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: "var(--paper-2)" }}>
                <Th align="left">SKU</Th>
                <Th align="left">Description</Th>
                <Th align="right">Cases</Th>
                <Th align="right">Pcs/case</Th>
                <Th align="right">$/case</Th>
                {isAdmin ? <Th align="right">Cost/case</Th> : null}
                {isAdmin ? <Th align="right">Margin</Th> : null}
                <Th align="right">Subtotal</Th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => {
                const isRoll =
                  (l.sku ?? "").startsWith("RL") ||
                  /\broll\b/i.test(l.description ?? "");
                const showPerRoll = isRoll && (l.piecesPerCase ?? 1) > 1;
                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--rule)",
                      verticalAlign: "top",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 16px",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontSize: 11,
                      }}
                    >
                      {l.sku ?? "—"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ lineHeight: 1.35 }}>{l.description}</div>
                      {l.packDisplay ? (
                        <div
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: "var(--mid)",
                            marginTop: 2,
                          }}
                        >
                          {l.packDisplay}
                        </div>
                      ) : null}
                    </td>
                    <td className="mono" style={{ padding: "10px 16px", textAlign: "right" }}>
                      {fmtInt(l.qtyCases)}
                      {showPerRoll && l.piecesPerCase ? (
                        <div
                          style={{ fontSize: 10, color: "var(--mid)", marginTop: 2 }}
                        >
                          {fmtInt(l.qtyCases * l.piecesPerCase)} rolls
                        </div>
                      ) : null}
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        color: "var(--mid)",
                      }}
                    >
                      {l.piecesPerCase ?? "—"}
                    </td>
                    <td className="mono" style={{ padding: "10px 16px", textAlign: "right" }}>
                      {fmtMoneyPos(l.sellPricePerCase)}
                      {showPerRoll && l.piecesPerCase ? (
                        <div style={{ fontSize: 10, color: "var(--mid)", marginTop: 2 }}>
                          {fmtMoneyPos(l.sellPricePerCase / l.piecesPerCase)}/roll
                        </div>
                      ) : null}
                    </td>
                    {isAdmin ? (
                      <td
                        className="mono"
                        style={{
                          padding: "10px 16px",
                          textAlign: "right",
                          color: "var(--mid)",
                        }}
                      >
                        {l.vendorCostPerCase !== null
                          ? fmtMoneyPos(l.vendorCostPerCase)
                          : "—"}
                      </td>
                    ) : null}
                    {isAdmin ? (
                      <td
                        className="mono"
                        style={{
                          padding: "10px 16px",
                          textAlign: "right",
                          color: "var(--mid)",
                        }}
                      >
                        {l.marginPctApplied !== null
                          ? `${(l.marginPctApplied * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    ) : null}
                    <td
                      className="mono"
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      {fmtMoneyPos(l.lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* TOTALS */}
      <section
        style={{
          background: "white",
          border: "1px solid var(--rule)",
          padding: "20px 26px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 14,
          }}
        >
          <KV label="Total cases" value={fmtInt(order.caseCount)} mono />
          <KV
            label="Pallet-equivalents"
            value={fmtInt(order.palletCount)}
            mono
          />
          {order.weightKg !== null ? (
            <KV label="Weight" value={`${fmtInt(order.weightKg)} kg`} mono />
          ) : null}
          {order.volPct !== null ? (
            <KV
              label="Container fill"
              value={`${order.volPct.toFixed(1)}%`}
              mono
            />
          ) : null}
        </div>
        <div className="flex flex-col" style={{ alignItems: "flex-end", gap: 4 }}>
          <div className="t-eyebrow">Total</div>
          <div
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {fmtMoneyPos(order.total)}
          </div>
          {order.subtotalFreight > 0 ? (
            <div className="mono t-cap" style={{ color: "var(--mid)", marginTop: 4 }}>
              Product {fmtMoneyPos(order.subtotalProduct)} · Freight{" "}
              {fmtMoneyPos(order.subtotalFreight)}
            </div>
          ) : null}
        </div>
      </section>

      {/* @media print: hide nav, simplify chrome */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .paper-bg { background: white !important; }
          .order-detail section { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 2 }}>
      <div className="t-eyebrow" style={{ fontSize: 10 }}>
        {label}
      </div>
      <div
        className={mono ? "mono" : ""}
        style={{ fontSize: mono ? 14 : 13, fontWeight: 500 }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align: "left" | "right";
}) {
  return (
    <th
      className="t-eyebrow"
      style={{
        textAlign: align,
        padding: "10px 16px",
        borderBottom: "1px solid var(--rule)",
        fontSize: 10,
      }}
    >
      {children}
    </th>
  );
}
