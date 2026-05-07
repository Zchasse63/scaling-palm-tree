// Per-catalog status badges (Phase D).
// Computed server-side from drafts + last-order queries; passed through
// BuilderClient → BuilderHeader → dropdown items.

export interface CatalogStatus {
  /** ISO timestamp of the customer's most recent order on this catalog. */
  lastOrderAt?: string;
  /** Dollar total of that last order. */
  lastOrderTotal?: number;
  /** True if there's an unsubmitted draft for this catalog. */
  hasDraft?: boolean;
  /** Total cases in that draft. */
  draftCases?: number;
}

export type CatalogStatusByVendorId = Record<string, CatalogStatus>;
