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

export default async function OrdersPage() {
  const session = await requireSession();
  const orders = await fetchOrdersForCustomer(session.customerId);

  return (
    <div className="paper-bg" style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--rule)" }}>
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
            <div className="mono t-cap">{session.customerName}</div>
            <SignOutButton
              ariaLabel="Sign out"
              className="flex items-center justify-center"
              style={{
                background: "transparent",
                border: "1px solid var(--rule-strong)",
                height: 32,
                width: 32,
                color: "var(--ink)",
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
          <Link href="/catalogs" style={{ textDecoration: "none" }}>
            <Button kind="secondary">Build a Container</Button>
          </Link>
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
            <div className="t-h2" style={{ marginBottom: 8 }}>No container orders yet</div>
            <div className="t-cap" style={{ marginBottom: 24 }}>
              Build your first container from any of your active catalogs.
            </div>
            <Link href="/catalogs" style={{ textDecoration: "none" }}>
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
              <div
                key={o.id}
                className="row-hover"
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 110px 1fr 130px 90px 100px 130px 130px",
                  gap: 16,
                  padding: "14px 22px",
                  borderBottom: "1px solid var(--rule)",
                  alignItems: "center",
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
