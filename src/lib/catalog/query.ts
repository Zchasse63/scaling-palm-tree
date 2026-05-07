// Server-side catalog queries.
//
// All queries go through the admin client (service-role) because we explicitly
// enforce customer access in TypeScript. The catalog_for_customer VIEW does not
// filter by customer; the access table does.
//
// Pattern:
//   1. caller passes (sessionCustomerId, vendorId)
//   2. we verify customer_catalog_access (customer_id, vendor_id, is_active)
//   3. we query catalog_for_customer WHERE vendor_id = ?
//   4. we transform into typed VendorCatalog with categories grouped

import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type {
  CatalogCategory,
  CatalogSku,
  CatalogSummary,
  VendorCatalog,
} from "./types";
import type { ContainerCode } from "@/lib/containers";

/** All vendor catalogs the customer is allowed to access. */
export async function fetchCustomerCatalogs(
  customerId: string,
): Promise<CatalogSummary[]> {
  const admin = adminClient();

  // Step 1: pull active catalog-access rows for this customer.
  const { data: accessRows, error: accessErr } = await admin
    .from("customer_catalog_access")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("vendor_id, container_type, terms_label, currency, display_name, slug" as any)
    .eq("customer_id", customerId)
    .eq("is_active", true);
  if (accessErr) throw new Error("catalog access lookup failed: " + accessErr.message);
  if (!accessRows || accessRows.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = accessRows as Array<any>;

  // Step 2: per-vendor SKU + category stats via the function (one call per
  // vendor; typically <8 catalogs per customer so this stays cheap). The
  // function applies layered margin resolution; we ignore prices here and
  // only use it for the row+category grouping.
  const stats = new Map<string, { skuCount: number; categoryNames: Set<string> }>();
  for (const a of rows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: catRows, error: catErr } = await (admin as any).rpc(
      "fn_catalog_for_customer",
      { p_customer_id: customerId, p_vendor_id: a.vendor_id },
    );
    if (catErr) throw new Error("catalog summary fetch failed: " + catErr.message);
    const s = { skuCount: 0, categoryNames: new Set<string>() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (catRows ?? []) as Array<any>) {
      s.skuCount += 1;
      if (r.category_name) s.categoryNames.add(r.category_name);
    }
    stats.set(a.vendor_id, s);
  }

  return rows.map((a) => {
    const s = stats.get(a.vendor_id) ?? { skuCount: 0, categoryNames: new Set() };
    return {
      vendorId: a.vendor_id,
      slug: a.slug ?? a.vendor_id,
      displayName: a.display_name ?? "Servous Catalog",
      containerCode: a.container_type as ContainerCode,
      termsLabel: a.terms_label,
      currency: a.currency,
      skuCount: s.skuCount,
      categoryNames: Array.from(s.categoryNames),
    };
  });
}

export interface CatalogAccess {
  vendorId: string;
  slug: string;
  containerCode: ContainerCode;
  termsLabel: string;
  currency: string;
  /** Customer-facing display name. Vendor identity stays hidden. */
  displayName: string;
  minCaseQty: number;
  minFillPct: number;
}

const SELECT_ACCESS_FIELDS =
  "vendor_id, container_type, terms_label, currency, display_name, slug, min_case_qty, min_fill_pct";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAccess(row: any): CatalogAccess {
  return {
    vendorId: row.vendor_id,
    slug: row.slug ?? row.vendor_id, // fallback to UUID if slug not yet set
    containerCode: row.container_type as ContainerCode,
    termsLabel: row.terms_label,
    currency: row.currency,
    displayName: row.display_name ?? "Servous Catalog",
    minCaseQty: row.min_case_qty ?? 100,
    minFillPct: Number(row.min_fill_pct ?? 100),
  };
}

/**
 * Resolve the customer's catalog by slug (or the only one they have access to
 * when slug is not specified). Returns null if no match / no access.
 */
export async function resolveCustomerCatalogAccess(
  customerId: string,
  slug: string | null,
): Promise<CatalogAccess | null> {
  const admin = adminClient();
  let query = admin
    .from("customer_catalog_access")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select(SELECT_ACCESS_FIELDS as any)
    .eq("customer_id", customerId)
    .eq("is_active", true);
  if (slug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq("slug", slug);
  }
  const { data, error } = await query;
  if (error) throw new Error("access check failed: " + error.message);
  if (!data || data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = data as any[];
  // No slug specified: only valid if customer has exactly one catalog.
  if (!slug && rows.length > 1) return null;
  return rowToAccess(rows[0]);
}

/** Backwards-compat: vendorId-keyed access lookup, used by submit-order. */
export async function verifyCustomerCatalogAccess(
  customerId: string,
  vendorId: string,
): Promise<CatalogAccess | null> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("customer_catalog_access")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select(SELECT_ACCESS_FIELDS as any)
    .eq("customer_id", customerId)
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error("access check failed: " + error.message);
  if (!data) return null;
  return rowToAccess(data);
}

/**
 * Full catalog payload for the builder page.
 *
 * Caller passes the customer ID + verified access info. The function applies
 * layered margin resolution: per-customer + per-vendor override > customer-wide
 * override > vendor default > 0.20 fallback.
 */
export async function fetchCatalogForVendor(
  customerId: string,
  vendorId: string,
  access: CatalogAccess,
): Promise<VendorCatalog | null> {
  const admin = adminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowsRes = await (admin as any).rpc("fn_catalog_for_customer", {
    p_customer_id: customerId,
    p_vendor_id: vendorId,
  });

  if (rowsRes.error) throw new Error("catalog fetch failed: " + rowsRes.error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (rowsRes.data ?? []) as Array<any>;
  if (rows.length === 0) return null;

  // Group rows into categories. Order: by category_name asc (stable + readable).
  const byCategory = new Map<string, CatalogCategory>();
  for (const r of rows) {
    const key = r.category_id ?? "_uncategorized";
    let bucket = byCategory.get(key);
    if (!bucket) {
      bucket = {
        categoryId: r.category_id,
        name: r.category_name ?? "Uncategorized",
        slug: r.category_slug,
        skus: [],
      };
      byCategory.set(key, bucket);
    }
    const sku: CatalogSku = {
      vendorProductId: r.vendor_product_id,
      canonicalProductId: r.canonical_product_id,
      vendorSku: r.vendor_sku,
      productName: r.product_name,
      description: r.description,
      packDisplay: r.pack_display,
      piecesPerCase: r.pieces_per_case,
      casesPerPallet: r.cases_per_pallet,
      casesPer40hc: r.cases_per_40hc,
      caseWeightLb: r.case_weight_lb !== null ? Number(r.case_weight_lb) : null,
      caseWeightKg: r.case_weight_kg !== null ? Number(r.case_weight_kg) : null,
      caseLengthIn: r.case_length_in !== null ? Number(r.case_length_in) : null,
      caseWidthIn: r.case_width_in !== null ? Number(r.case_width_in) : null,
      caseHeightIn: r.case_height_in !== null ? Number(r.case_height_in) : null,
      dimsVerified: r.dims_verified,
      cbmPerCase: r.cbm_per_case !== null ? Number(r.cbm_per_case) : null,
      packMultiple: r.pack_multiple,
      prePalletized: r.pre_palletized,
      physicalSpecsVerified: r.physical_specs_verified,
      costPerCase: Number(r.cost_per_case),
      sellPricePerCase: Number(r.sell_price_per_case),
      marginPct: r.target_margin_pct !== null ? Number(r.target_margin_pct) : null,
    };
    bucket.skus.push(sku);
  }

  // Sort SKUs within each category by vendor SKU; sort categories by name.
  const categories = Array.from(byCategory.values())
    .map((c) => ({
      ...c,
      skus: c.skus.slice().sort((a, b) => a.vendorSku.localeCompare(b.vendorSku)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    vendorId,
    slug: access.slug,
    displayName: access.displayName,
    containerCode: access.containerCode,
    termsLabel: access.termsLabel,
    currency: access.currency,
    minCaseQty: access.minCaseQty,
    minFillPct: access.minFillPct,
    categories,
    skuCount: rows.length,
  };
}
