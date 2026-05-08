// Order history types — read-only, used by /orders.

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string | null;
  vendorName: string;
  containerLabel: string;
  status: string;
  quotedAt: string;
  caseCount: number;
  total: number;
  lineCount: number;
}

export interface CustomerOrderLine {
  sku: string | null;
  description: string | null;
  packDisplay: string | null;
  qtyCases: number;
  piecesPerCase: number | null;
  casesPerPallet: number | null;
  sellPricePerCase: number;
  lineTotal: number;
  /** Admin-only: vendor cost per case at time of order. Null for customer view. */
  vendorCostPerCase: number | null;
  /** Admin-only: applied margin pct. Null for customer view. */
  marginPctApplied: number | null;
}

/** Status timestamps from customer_orders for the timeline view. */
export interface OrderStatusTimeline {
  quoted_at: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  invoiced_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  customerName: string;
  customerEmail: string | null;
  catalogSlug: string | null;
  catalogDisplayName: string | null;
  termsLabel: string | null;
  currency: string | null;
  containerCode: string;
  subtotalProduct: number;
  subtotalFreight: number;
  palletCount: number;
  weightKg: number | null;
  volPct: number | null;
  notes: string | null;
  internalNotes: string | null;
  timeline: OrderStatusTimeline;
  lines: CustomerOrderLine[];
}

/** Admin all-orders row — same shape as CustomerOrderSummary plus customer name. */
export interface AdminOrderRow extends CustomerOrderSummary {
  customerName: string;
  customerEmail: string | null;
  catalogDisplayName: string | null;
}

/** Most-recent-order summary attached to each catalog card on the dashboard. */
export interface LastOrderForCatalog {
  id: string;
  orderNumber: string | null;
  status: string;
  quotedAt: string;
  caseCount: number;
  total: number;
}
