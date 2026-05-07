// Catalog data shapes consumed by the Container Builder.

import type { ContainerCode } from "@/lib/containers";

export interface CatalogSku {
  vendorProductId: string;
  canonicalProductId: string;
  vendorSku: string;
  productName: string;
  description: string | null;
  packDisplay: string | null;
  piecesPerCase: number | null;
  casesPerPallet: number | null;
  casesPer40hc: number | null;
  caseWeightLb: number | null;
  caseWeightKg: number | null;
  caseLengthIn: number | null;
  caseWidthIn: number | null;
  caseHeightIn: number | null;
  dimsVerified: boolean;
  cbmPerCase: number | null;
  /** Stepper step / order increment (e.g., foil rolls = 200). null = +1. */
  packMultiple: number | null;
  /**
   * Per-SKU minimum case qty floor. Overrides the catalog-wide `minCaseQty`
   * when present. Used for SKUs whose factory MOQ differs from the catalog
   * default — e.g., China-packed foil rolls ship in 50-case pallets so the
   * floor is 50, not the catalog's 100.
   */
  minCaseQtyOverride: number | null;
  prePalletized: boolean;
  physicalSpecsVerified: boolean;
  costPerCase: number;
  sellPricePerCase: number;
  marginPct: number | null;
}

export interface CatalogCategory {
  categoryId: string | null;
  name: string;
  slug: string | null;
  skus: CatalogSku[];
}

export interface VendorCatalog {
  vendorId: string;
  /** URL-friendly slug for this customer's access to this vendor catalog. */
  slug: string;
  /** Customer-facing catalog name. Vendor identity is intentionally hidden. */
  displayName: string;
  containerCode: ContainerCode;
  termsLabel: string;
  currency: string;
  /** Minimum cases per line item with qty > 0. Default 100. */
  minCaseQty: number;
  /** Minimum container volume fill required to submit. Default 100.0. */
  minFillPct: number;
  /**
   * When true, the catalog rows arrive with cost + sell zeroed by the server.
   * The UI renders "—" instead of dollar amounts, shows a banner explaining
   * why, and disables submit. Used for short-window pricing refreshes.
   */
  pricesPending: boolean;
  pricesPendingReason: string | null;
  /** All categories that have at least one SKU. */
  categories: CatalogCategory[];
  /** Total SKU count, for header/breadcrumb labels. */
  skuCount: number;
}

export interface CatalogSummary {
  vendorId: string;
  slug: string;
  displayName: string;
  containerCode: ContainerCode;
  termsLabel: string;
  currency: string;
  skuCount: number;
  categoryNames: string[];
  /** Surface the pricing-refresh window on the catalog dashboard tile. */
  pricesPending: boolean;
}
