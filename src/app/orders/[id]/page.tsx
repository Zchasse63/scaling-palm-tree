// Customer-facing order detail. Filters by customer_id so a customer can't
// view another customer's order via URL guessing.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/ui/wordmark";
import { Caret } from "@/components/ui/caret";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { OrderDetailView } from "@/components/orders/order-detail-view";
import { PrintButton } from "@/components/orders/print-button";
import { ReorderButton } from "@/components/orders/reorder-button";
import { requireSession } from "@/lib/auth/session";
import { fetchOrderDetail } from "@/lib/orders/query";

export const dynamic = "force-dynamic";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const session = await requireSession();
  const order = await fetchOrderDetail(id, session.customerId, false);
  if (!order) notFound();

  return (
    <div className="paper-bg" style={{ minHeight: "100vh" }}>
      <header
        className="no-print"
        style={{
          background: "var(--ink)",
          color: "white",
          borderBottom: "1px solid var(--char)",
        }}
      >
        <div
          className="flex items-center"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "20px 32px",
            justifyContent: "space-between",
          }}
        >
          <Wordmark height={32} />
          <div className="flex items-center" style={{ gap: 18 }}>
            <div className="mono t-cap" style={{ color: "var(--warm)" }}>
              {session.customerName}
            </div>
            {session.isAdmin ? (
              <Link
                href={`/admin/orders/${order.id}`}
                className="mono t-cap"
                style={{
                  color: "var(--warm)",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                View as admin →
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
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 64px" }}>
        <div className="no-print" style={{ marginBottom: 16 }}>
          <Link
            href="/orders"
            className="mono t-cap"
            style={{ color: "var(--mid)", textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            ← All orders
          </Link>
        </div>
        <OrderDetailView
          order={order}
          mode="customer"
          headerActions={
            <div
              className="flex"
              style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
            >
              <ReorderButton orderId={order.id} />
              <PrintButton />
            </div>
          }
        />
      </main>
    </div>
  );
}
