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
  /** Customer-facing catalog name. Vendor identity is intentionally hidden. */
  displayName: string;
  containerCode: ContainerCode;
  termsLabel: string;
  currency: string;
  /** Minimum cases per line item with qty > 0. Default 100. */
  minCaseQty: number;
  /** Minimum container volume fill required to submit. Default 100.0. */
  minFillPct: number;
  /** All categories that have at least one SKU. */
  categories: CatalogCategory[];
  /** Total SKU count, for header/breadcrumb labels. */
  skuCount: number;
}

export interface CatalogSummary {
  vendorId: string;
  displayName: string;
  containerCode: ContainerCode;
  termsLabel: string;
  currency: string;
  skuCount: number;
  categoryNames: string[];
}
