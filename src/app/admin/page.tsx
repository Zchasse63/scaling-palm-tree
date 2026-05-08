// Admin dashboard home — at-a-glance stats + recent orders.

import Link from "next/link";
import { fmtInt, fmtMoneyPos } from "@/lib/math/fmt";
import { fetchAllOrdersForAdmin } from "@/lib/orders/query";
import { StatusPill } from "@/components/ui/status-pill";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const orders = await fetchAllOrdersForAdmin({ limit: 1000 });

  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const submittedThisWeek = orders.filter(
    (o) => now - new Date(o.quotedAt).getTime() <= oneWeekMs,
  ).length;

  const awaitingConfirmation = orders.filter((o) => o.status === "quoted").length;
  const inFlight = orders.filter((o) =>
    ["confirmed", "in_production", "ready", "shipped"].includes(o.status),
  ).length;

  const revenueLast30 = orders
    .filter((o) => now - new Date(o.quotedAt).getTime() <= thirtyDaysMs)
    .reduce((sum, o) => sum + o.total, 0);

  const recent = orders.slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <div className="t-eyebrow">Admin · Overview</div>
        <div className="t-h1">Container orders, all customers</div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <Stat
          label="Awaiting confirmation"
          value={String(awaitingConfirmation)}
          accent={awaitingConfirmation > 0 ? "ink" : undefined}
          href={awaitingConfirmation > 0 ? "/admin/orders?status=quoted" : undefined}
        />
        <Stat label="In flight" value={String(inFlight)} />
        <Stat label="Submitted this week" value={String(submittedThisWeek)} />
        <Stat
          label="Revenue · last 30 days"
          value={fmtMoneyPos(revenueLast30)}
        />
      </div>

      {/* Recent orders */}
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
          <div className="t-eyebrow">Recent orders · {recent.length}</div>
          <Link
            href="/admin/orders"
            className="mono t-cap"
            style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div
            style={{
              padding: "36px 22px",
              textAlign: "center",
              color: "var(--mid)",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 12,
            }}
          >
            No orders yet. The first one will appear here when a customer submits.
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "120px minmax(0,1fr) 110px 130px 90px 130px 130px",
                gap: 16,
                padding: "10px 22px",
                background: "var(--paper-2)",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              {[
                { label: "Order #", a: "left" },
                { label: "Customer", a: "left" },
                { label: "Date", a: "left" },
                { label: "Catalog", a: "left" },
                { label: "Cases", a: "right" },
                { label: "Total", a: "right" },
                { label: "Status", a: "left" },
              ].map((h) => (
                <div
                  key={h.label}
                  className="t-eyebrow"
                  style={{ textAlign: h.a as "left" | "right", fontSize: 10 }}
                >
                  {h.label}
                </div>
              ))}
            </div>
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="row-hover"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "120px minmax(0,1fr) 110px 130px 90px 130px 130px",
                  gap: 16,
                  padding: "12px 22px",
                  borderBottom: "1px solid var(--rule)",
                  alignItems: "center",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="mono" style={{ fontSize: 12 }}>
                  {o.orderNumber ?? o.id.slice(0, 8)}
                </div>
                <div className="t-body">{o.customerName}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--mid)" }}>
                  {new Date(o.quotedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 12, color: "var(--mid)" }}
                >
                  {o.catalogDisplayName ?? o.vendorName}
                </div>
                <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>
                  {fmtInt(o.caseCount)}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 13, textAlign: "right", fontWeight: 500 }}
                >
                  {fmtMoneyPos(o.total)}
                </div>
                <div>
                  <StatusPill status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: string;
  accent?: "ink";
  href?: string;
}) {
  const inner = (
    <div
      style={{
        background: accent === "ink" ? "var(--ink)" : "white",
        color: accent === "ink" ? "white" : "var(--ink)",
        border:
          accent === "ink" ? "1px solid var(--ink)" : "1px solid var(--rule)",
        padding: "16px 20px",
      }}
    >
      <div
        className="t-eyebrow"
        style={{ color: accent === "ink" ? "var(--warm)" : undefined }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
