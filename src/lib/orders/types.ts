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
  qtyCases: number;
  sellPricePerCase: number;
  lineTotal: number;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  lines: CustomerOrderLine[];
}
