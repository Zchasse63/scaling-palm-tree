// Draft order types — persistent shopping carts.

import type { QtyMap } from "@/lib/math/fill";

export interface DraftOrder {
  id: string;
  customerId: string;
  vendorId: string;
  catalogSlug: string;
  qtyMap: QtyMap;
  createdAt: string;
  updatedAt: string;
}

/** Result of hydrating a draft against the live catalog. */
export interface DraftHydrationResult {
  /** Active qty map after pruning stale SKUs. Empty if no draft existed. */
  qtyMap: QtyMap;
  /** True if any keys were dropped during pruning. UI should surface a banner. */
  hadStaleSkus: boolean;
  /** Original draft updated_at — useful for "saved 5 minutes ago" affordance. */
  draftUpdatedAt: string | null;
}

/**
 * Drafts older than this are considered abandoned and ignored at hydration.
 * Keep them in the DB for now (no auto-delete) so we have data for retrospective
 * if/when we want session-abandonment metrics.
 */
export const DRAFT_MAX_AGE_DAYS = 30;
