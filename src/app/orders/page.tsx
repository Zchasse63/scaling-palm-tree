import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Caret } from "@/components/ui/caret";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { fmtInt, fmtMoneyPos } from "@/lib/math/fmt";
import { requireSession } from "@/lib/auth/session";
import { fetchOrdersForCustomer } from "@/lib/orders/query";

export const dynamic = "force-dynamic";

interface OrdersPageProps {
  searchParams: Promise<{ filter?: string }>;
}

const FILTER_GROUPS: Record<string, { label: string; statuses: string[] }> = {
  all: { label: "All", statuses: [] },
  active: {
    label: "Active",
    statuses: ["quoted", "confirmed", "in_production", "ready", "shipped"],
  },
  completed: {
    label: "Completed",
    statuses: ["delivered", "invoiced", "paid"],
  },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const sp = await searchParams;
  const filter = sp.filter && FILTER_GROUPS[sp.filter] ? sp.filter : "all";
  const session = await requireSession();
  const allOrders = await fetchOrdersForCustomer(session.customerId);
  const orders =
    filter === "all"
      ? allOrders
      : allOrders.filter((o) =>
          FILTER_GROUPS[filter].statuses.includes(o.status),
        );

  return (
    <div className="paper-bg" style={{ minHeight: "100vh" }}>
      <header
        style={{
          background: "var(--ink)",
          color: "white",
          borderBottom: "1px solid var(--char)",
        }}
      >
        <div
          className="flex items-center"
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "20px 32px",
            justifyContent: "space-between",
          }}
        >
          <Wordmark height={32} />
          <div className="flex items-center" style={{ gap: 18 }}>
            <div className="mono t-cap" style={{ color: "var(--warm)" }}>{session.customerName}</div>
            {session.isAdmin ? (
              <Link
                href="/admin"
                className="mono t-cap"
                style={{
                  color: "var(--warm)",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Admin →
              </Link>
            ) : null}
            <SignOutButton
              ariaLabel="Sign out"
              className="flex items-center justify-center"
              style={{
                background: "transparent",
                border: "1px solid var(--mid)",
                height: 32,
                width: 32,
                color: "white",
                cursor: "pointer",
              }}
            >
              <Caret />
            </SignOutButton>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 32px 64px" }}>
        <div
          className="flex"
          style={{
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div className="flex flex-col" style={{ gap: 6 }}>
            <div className="t-eyebrow">Order History</div>
            <div className="t-h1">Container orders</div>
          </div>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button kind="secondary">Build a Container</Button>
          </Link>
        </div>

        {/* Filter chips */}
        <div
          className="flex"
          style={{
            gap: 8,
            marginBottom: 18,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {Object.entries(FILTER_GROUPS).map(([key, group]) => {
            const count =
              key === "all"
                ? allOrders.length
                : allOrders.filter((o) =>
                    group.statuses.includes(o.status),
                  ).length;
            const active = filter === key;
            return (
              <Link
                key={key}
                href={key === "all" ? "/orders" : `/orders?filter=${key}`}
                className="mono"
                style={{
                  padding: "6px 12px",
                  border: active ? "1px solid var(--ink)" : "1px solid var(--rule-strong)",
                  background: active ? "var(--ink)" : "white",
                  color: active ? "white" : "var(--ink)",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                }}
              >
                {group.label} · {count}
              </Link>
            );
          })}
        </div>

        {orders.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid var(--rule)",
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <div className="t-h2" style={{ marginBottom: 8 }}>
              {filter === "all"
                ? "No container orders yet"
                : `No ${FILTER_GROUPS[filter].label.toLowerCase()} orders`}
            </div>
            <div className="t-cap" style={{ marginBottom: 24 }}>
              {filter === "all"
                ? "Build your first container from any of your active catalogs."
                : "Try a different filter or build a new container."}
            </div>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Button kind="primary">Choose a catalog</Button>
            </Link>
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid var(--rule)" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 110px 1fr 130px 90px 100px 130px 130px",
                gap: 16,
                padding: "12px 22px",
                background: "var(--paper-2)",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              {[
                { label: "Order #", align: "left" },
                { label: "Date", align: "left" },
                { label: "Catalog", align: "left" },
                { label: "Container", align: "left" },
                { label: "Lines", align: "right" },
                { label: "Cases", align: "right" },
                { label: "Total", align: "right" },
                { label: "Status", align: "left" },
              ].map((h) => (
                <div
                  key={h.label}
                  className="t-eyebrow"
                  style={{ textAlign: h.align as "left" | "right" }}
                >
                  {h.label}
                </div>
              ))}
            </div>
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="row-hover"
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 110px 1fr 130px 90px 100px 130px 130px",
                  gap: 16,
                  padding: "14px 22px",
                  borderBottom: "1px solid var(--rule)",
                  alignItems: "center",
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <div className="mono" style={{ fontSize: 12 }}>
                  {o.orderNumber ?? o.id.slice(0, 8)}
                </div>
                <div className="mono" style={{ fontSize: 12, color: "var(--mid)" }}>
                  {formatDate(o.quotedAt)}
                </div>
                <div className="t-body">{o.vendorName}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--mid)" }}>
                  {o.containerLabel}
                </div>
                <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>
                  {o.lineCount}
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
      </main>
    </div>
  );
}
