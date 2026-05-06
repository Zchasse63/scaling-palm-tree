// Proportional fill model.
//
// fill_contribution_i = qty_i / cases_per_40hc_i
// total_fill = sum(fill_contribution_i)
//
// Container is exactly full at total_fill = 1.0 (100.0%).
// Weight max comes from the container spec; 1.0 weight_pct = limit.
//
// Why proportional and not CBM-based: many SKUs (foil rolls, combos) lack carton
// dims. cases_per_40hc is provided by the manufacturer for every SKU and already
// encodes their packing assumption. Self-consistent and works for the whole catalog.

import type { CatalogSku, VendorCatalog } from "@/lib/catalog/types";
import { getContainerSpec, type ContainerSpec } from "@/lib/containers";

export type QtyMap = Record<string, number>;

export interface BuilderTotals {
  /** Sum of qty across all line items. */
  cases: number;
  /** Number of distinct line items with qty > 0. */
  lines: number;
  /** Sum(qty * sellPrice) — what the customer pays. */
  subtotal: number;
  /** Sum(qty * caseWeightKg). 0 if any SKU is missing kg (rare). */
  kg: number;
  /** Sum of fill contributions = qty / cases_per_40hc per SKU. */
  fillFraction: number;
  /** fillFraction * 100, for display. */
  volPct: number;
  /** kg / weight_max_kg * 100. */
  wtPct: number;
  /** Approximate CBM used = container.cbm * fillFraction. Display only. */
  approxCbm: number;
  /** Pallet-equivalents — sum of qty/cases_per_pallet where defined. */
  palletEq: number;
  /** Lines with 0 < qty < line minimum — submit must be blocked while > 0. */
  belowMinLines: number;
  container: ContainerSpec;
}

export function computeTotals(catalog: VendorCatalog, qtys: QtyMap): BuilderTotals {
  const container = getContainerSpec(catalog.containerCode);
  let cases = 0;
  let lines = 0;
  let subtotal = 0;
  let kg = 0;
  let fillFraction = 0;
  let palletEq = 0;
  let belowMinLines = 0;

  for (const cat of catalog.categories) {
    for (const sku of cat.skus) {
      const q = qtys[sku.vendorProductId] || 0;
      if (q <= 0) continue;
      lines += 1;
      cases += q;
      subtotal += q * sku.sellPricePerCase;
      if (sku.caseWeightKg !== null) kg += q * sku.caseWeightKg;
      if (sku.casesPer40hc && sku.casesPer40hc > 0) {
        fillFraction += q / sku.casesPer40hc;
      }
      if (sku.casesPerPallet && sku.casesPerPallet > 0) {
        palletEq += q / sku.casesPerPallet;
      }
      // Line-minimum check: max(packMultiple, minCaseQty), rounded up.
      const pack = sku.packMultiple && sku.packMultiple > 0 ? sku.packMultiple : 1;
      const effMin =
        Math.ceil(Math.max(catalog.minCaseQty, pack) / pack) * pack;
      if (q < effMin) belowMinLines += 1;
    }
  }

  const volPct = fillFraction * 100;
  const wtPct = container.weight_max_kg > 0 ? (kg / container.weight_max_kg) * 100 : 0;
  const approxCbm = container.cbm * fillFraction;

  return {
    cases,
    lines,
    subtotal,
    kg,
    fillFraction,
    volPct,
    wtPct,
    approxCbm,
    palletEq,
    belowMinLines,
    container,
  };
}

/** Per-SKU fill contribution as a percentage point — handy for the row hover hint. */
export function fillContribPct(sku: CatalogSku, qty: number): number {
  if (!sku.casesPer40hc || sku.casesPer40hc <= 0 || qty <= 0) return 0;
  return (qty / sku.casesPer40hc) * 100;
}

/** Number of cases that fill the container exactly with this SKU only. */
export function maxCasesForSku(sku: CatalogSku): number | null {
  if (!sku.casesPer40hc || sku.casesPer40hc <= 0) return null;
  return sku.casesPer40hc;
}

/**
 * Returns vendor_product_ids present in the qty map but NOT in the catalog.
 * Use this on hydration (e.g., loading a saved draft) to detect SKUs that
 * have been deactivated since the qty map was written. The caller should
 * strip those keys and show the customer a banner explaining what happened.
 *
 * Without this defense, a stale SKU silently contributes 0 to fill percent —
 * the cart looks under-filled, the customer doesn't know why, and the missing
 * items disappear without explanation.
 */
export function getStaleSkus(catalog: VendorCatalog, qtys: QtyMap): string[] {
  const live = new Set<string>();
  for (const cat of catalog.categories) {
    for (const sku of cat.skus) live.add(sku.vendorProductId);
  }
  const stale: string[] = [];
  for (const [id, qty] of Object.entries(qtys)) {
    if (qty > 0 && !live.has(id)) stale.push(id);
  }
  return stale;
}

/** Returns a new qty map with stale keys removed. Pure; doesn't mutate input. */
export function pruneStaleSkus(catalog: VendorCatalog, qtys: QtyMap): QtyMap {
  const stale = new Set(getStaleSkus(catalog, qtys));
  if (stale.size === 0) return qtys;
  const out: QtyMap = {};
  for (const [id, qty] of Object.entries(qtys)) {
    if (!stale.has(id)) out[id] = qty;
  }
  return out;
}
