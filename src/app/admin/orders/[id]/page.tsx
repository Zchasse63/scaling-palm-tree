// Admin order detail — same OrderDetailView as customer, with admin-only
// controls (status update, internal notes) layered on top.

import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchOrderDetail } from "@/lib/orders/query";
import { OrderDetailView } from "@/components/orders/order-detail-view";
import { PrintButton } from "@/components/orders/print-button";
import {
  AdminOrderStatusForm,
  AdminInternalNotes,
} from "@/components/admin/admin-order-controls";

export const dynamic = "force-dynamic";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const { id } = await params;
  // Layout already gates via requireAdmin(); pass null guard so we see any order.
  const order = await fetchOrderDetail(id, null, true);
  if (!order) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="no-print">
        <Link
          href="/admin/orders"
          className="mono t-cap"
          style={{ color: "var(--mid)", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          ← All orders
        </Link>
      </div>
      <OrderDetailView
        order={order}
        mode="admin"
        headerActions={
          <div className="flex" style={{ gap: 10, alignItems: "center" }}>
            <AdminOrderStatusForm
              orderId={order.id}
              initialStatus={order.status}
            />
            <PrintButton />
          </div>
        }
        belowHeader={
          <AdminInternalNotes
            orderId={order.id}
            initialInternalNotes={order.internalNotes}
          />
        }
      />
    </div>
  );
}
