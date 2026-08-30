// Inventory module: shared types + constants.
// Data semantics are specified in research/08-27-2026_inventory_dashboard/PLAN_08-27-2026.md
// (section 3, authoritative). calc.ts implements them; query.ts feeds them.

export const DEFAULT_LEAD_TIME_DAYS = 70;
export const VELOCITY_WINDOW_WEEKS_MAX = 13;
export const MIN_HISTORY_DAYS = 21; // below this: "insufficient history"
export const EXCESS_COVER_WEEKS = 26;
export const STALE_AMBER_HOURS = 30; // one missed daily report
export const STALE_RED_HOURS = 54; // two missed daily reports
export const ORDERS_OF_COVER_MIN_LINES = 5;
export const RUNWAY_HORIZON_WEEKS = 16;
// Order statuses that hold stock on paper (confirmed but not shipped).
export const OPEN_ORDER_STATUSES = ["confirmed", "in_production", "ready"];
// Real purchase commitments: everything from confirmation on. Excludes
// po_received/quoted (a portal cart submit is not yet a sale) and cancelled.
// Buyer analytics, cadence, and bought-with all use this set so a submitted
// but never-confirmed cart can't pollute demand history.
export const REAL_ORDER_STATUSES = [
  "confirmed",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "invoiced",
  "paid",
];

export type Bucket =
  | "stockout"
  | "allocated_out"
  | "act_now"
  | "watch"
  | "no_movement"
  | "excess"
  | "healthy"
  | "none"; // no snapshot history yet (first-container SKU)

export type Staleness = "fresh" | "amber" | "red";

export interface SnapshotInput {
  vendorProductId: string;
  countedAt: string; // UTC ISO from the DB
  qtyCases: number; // UNIS "Available" status cases
  qtyPickedCases: number | null; // staged outbound; NULL on the 07-05 baseline rows
  palletsOnHand: number | null;
  notes: string | null;
}

export interface DayPoint {
  day: string; // ET calendar day key YYYY-MM-DD
  countedAt: string;
  available: number;
  staged: number;
  physical: number; // available + staged
  pallets: number | null;
  notes: string | null;
  /**
   * True when this point was synthesized for a report day the SKU was absent
   * from (UNIS omits sold-out SKUs). The zero is real inventory state, but
   * there is no underlying snapshot row.
   */
  tombstone?: boolean;
}

export interface MovementDay extends DayPoint {
  deltaPhysical: number; // vs previous observed day
  consumption: number; // max(0, -deltaPhysical)
  isReceipt: boolean; // physical jumped up
}

export interface Velocity {
  ratePerWeek: number | null; // null when insufficient history
  windowWeeks: number; // actual window used (display: "trailing {n}w")
  reason?: "insufficient_history" | "no_movement";
}

export interface OpenOrderLineInput {
  vendorProductId: string | null;
  qtyCases: number;
  qtyShippedCases: number;
  orderNumber: string | null;
  customerName: string;
  requestedDate: string | null; // YYYY-MM-DD
}

export interface InboundLineInput {
  shipmentId: string;
  vendorProductId: string | null;
  sku: string | null;
  qtyCases: number;
  eta: string | null; // YYYY-MM-DD
  containerNo: string | null;
}

export interface RunwayPoint {
  day: string; // ET day key
  value: number;
  inferred: boolean; // beyond known commitments (dashed)
}

export interface Runway {
  points: RunwayPoint[];
  floorCrossDay: string | null;
  arrivals: Array<{ day: string; qty: number; containerNo: string | null }>;
}
