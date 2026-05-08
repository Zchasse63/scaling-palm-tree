// Admin orders queue — every customer's orders, with filters and CSV export.

import Link from "next/link";
import { fmtInt, fmtMoneyPos } from "@/lib/math/fmt";
import {
  fetchAllOrdersForAdmin,
  fetchAllCustomerCompanies,
} from "@/lib/orders/query";
import { StatusPill } from "@/components/ui/status-pill";
import { OrdersFilterBar } from "@/components/admin/orders-filter-bar";
import { OrdersExportButton } from "@/components/admin/orders-export-button";

export const dynamic = "force-dynamic";

interface AdminOrdersPageProps {
  searchParams: Promise<{
    status?: string | string[];
    customer?: string;
    from?: string;
    to?: string;
  }>;
}

const ALL_STATUSES = [
  "quoted",
  "confirmed",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "invoiced",
  "paid",
  "cancelled",
];

function normalizeStatuses(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : raw.split(",");
  return arr.filter((s) => ALL_STATUSES.includes(s));
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const sp = await searchParams;
  const statuses = normalizeStatuses(sp.status);
  const customerId = sp.customer ?? null;
  const fromDate = sp.from ?? null;
  const toDate = sp.to ?? null;

  const [orders, customers] = await Promise.all([
    fetchAllOrdersForAdmin({
      statuses: statuses.length > 0 ? statuses : undefined,
      customerId,
      fromDate,
      toDate,
      limit: 500,
    }),
    fetchAllCustomerCompanies(),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        className="flex"
        style={{ alignItems: "flex-end", justifyContent: "space-between" }}
      >
        <div className="flex flex-col" style={{ gap: 6 }}>
          <div className="t-eyebrow">Admin · Orders</div>
          <div className="t-h1">All container orders</div>
        </div>
        <OrdersExportButton
          statuses={statuses}
          customerId={customerId}
          fromDate={fromDate}
          toDate={toDate}
        />
      </div>

      <OrdersFilterBar
        customers={customers}
        statuses={statuses}
        customerId={customerId}
        fromDate={fromDate}
        toDate={toDate}
      />

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
            No orders match
          </div>
          <div className="t-cap">
            Adjust filters or clear them to see every order.
          </div>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid var(--rule)" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "120px minmax(0,1fr) 110px 130px 80px 90px 130px 130px",
              gap: 16,
              padding: "12px 22px",
              background: "var(--paper-2)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            {[
              { label: "Order #", a: "left" },
              { label: "Customer", a: "left" },
              { label: "Date", a: "left" },
              { label: "Catalog", a: "left" },
              { label: "Lines", a: "right" },
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
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="row-hover"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "120px minmax(0,1fr) 110px 130px 80px 90px 130px 130px",
                gap: 16,
                padding: "14px 22px",
                borderBottom: "1px solid var(--rule)",
                alignItems: "center",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div className="mono" style={{ fontSize: 12 }}>
                {o.orderNumber ?? o.id.slice(0, 8)}
              </div>
              <div className="t-body" style={{ minWidth: 0 }}>
                {o.customerName}
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--mid)" }}>
                {new Date(o.quotedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--mid)" }}>
                {o.catalogDisplayName ?? o.vendorName}
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
    </div>
  );
}
