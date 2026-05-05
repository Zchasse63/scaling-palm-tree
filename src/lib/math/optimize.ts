// Optimize Fill — three modes for proportional + weight-aware container building.
//
// Modes:
//   - "top_up"        Add more cases of items already in cart (priority: maintain
//                     the customer's existing mix; smallest-CBM SKUs first to land precisely).
//   - "complete_set"  Suggest complementary items (pair pans with lids etc.) for
//                     SKUs already in cart that have no matching counterpart yet.
//   - "fill_catalog"  Add anything from the catalog to fill remaining space — broadest
//                     option, matches the prior single-mode behavior.
//
// All modes respect:
//   - cases_per_40hc proportional fill: target = 1.0
//   - weight ceiling: total kg ≤ container.weight_max_kg
//   - line minimums: max(packMultiple, minCaseQty), rounded up to pack
//   - SKUs without caseWeightKg are weight-unaudited and skipped (shipping safety)

import type { CatalogSku, VendorCatalog } from "@/lib/catalog/types";
import { computeTotals, type QtyMap } from "./fill";
import { getContainerSpec } from "@/lib/containers";

export type OptimizeMode = "top_up" | "complete_set" | "fill_catalog";

export interface OptimizeResult {
  mode: OptimizeMode;
  /** New qty map = qtys + suggested deltas. */
  projected: QtyMap;
  /** Per-SKU additional cases. Only includes SKUs with non-zero delta. */
  suggestions: Record<string, number>;
  /** Subtotal change in dollars. Always >= 0. */
  deltaSubtotal: number;
  /** Final fill % after applying suggestions. */
  finalVolPct: number;
  /** Final weight % after applying suggestions. */
  finalWtPct: number;
  /**
   * Status:
   *  - "exact"          — volume hits 100% within epsilon
   *  - "weight_capped"  — weight max blocked further filling
   *  - "no_change"      — already at capacity or no candidates available for this mode
   *  - "partial"        — improved fill but didn't reach 100% (mode-specific limits)
   */
  status: "exact" | "weight_capped" | "no_change" | "partial";
}

const EPSILON = 0.0005; // 0.05 percentage points

interface Candidate {
  sku: CatalogSku;
  /** Effective minimum step (max of packMultiple and 1). */
  step: number;
  /** Floor for first-time addition: max(packMultiple, minCaseQty). */
  firstAddMin: number;
  stepFill: number;
  stepKg: number;
  /** True when caseWeightKg is missing — these are weight-unaudited and skipped. */
  weightUnknown: boolean;
}

function buildCandidates(catalog: VendorCatalog): Candidate[] {
  const out: Candidate[] = [];
  for (const cat of catalog.categories) {
    for (const sku of cat.skus) {
      if (!sku.casesPer40hc || sku.casesPer40hc <= 0) continue;
      const step = sku.packMultiple && sku.packMultiple > 0 ? sku.packMultiple : 1;
      const firstAddMin =
        Math.ceil(Math.max(catalog.minCaseQty, step) / step) * step;
      const stepFill = step / sku.casesPer40hc;
      const weightUnknown = sku.caseWeightKg === null || sku.caseWeightKg === undefined;
      const stepKg = weightUnknown ? 0 : (sku.caseWeightKg as number) * step;
      out.push({ sku, step, firstAddMin, stepFill, stepKg, weightUnknown });
    }
  }
  out.sort((a, b) => a.stepFill - b.stepFill);
  return out;
}

/** Map SKU vendor_product_id → canonical product name for pairing logic. */
function nameOf(c: Candidate): string {
  return c.sku.productName.toLowerCase();
}

/**
 * Heuristic: does candidate `b` look like a complement to SKU `a`?
 * Uses canonical-product-name pattern matching for foil categories:
 *   - Pan ↔ Lid pairs: both share "7"" / "9"" / "half steam" / "full steam".
 *   - Combos already include lids — no pairing.
 *   - Foil rolls / pop-ups have no complements.
 */
function isComplement(a: CatalogSku, b: CatalogSku): boolean {
  const an = a.productName.toLowerCase();
  const bn = b.productName.toLowerCase();
  if (an.includes("combo") || bn.includes("combo")) return false;
  if (an.includes("foil roll") || bn.includes("foil roll")) return false;
  if (an.includes("pop-up") || bn.includes("pop-up")) return false;

  const aIsContainer = an.includes("container") && !an.includes("lid");
  const bIsLid = bn.includes("lid");
  const aIsLid = an.includes("lid");
  const bIsContainer = bn.includes("container") && !bn.includes("lid");
  // Only pair container ↔ lid (in either direction).
  if (!((aIsContainer && bIsLid) || (aIsLid && bIsContainer))) return false;

  // Size-token match: "7\"", "9\"", "half steam", "full steam".
  const tokens = ['7"', '9"', "half steam", "full steam"];
  for (const t of tokens) {
    if (an.includes(t) && bn.includes(t)) return true;
  }
  return false;
}

function emptyResult(mode: OptimizeMode, totals: ReturnType<typeof computeTotals>): OptimizeResult {
  return {
    mode,
    projected: {},
    suggestions: {},
    deltaSubtotal: 0,
    finalVolPct: totals.volPct,
    finalWtPct: totals.wtPct,
    status: "no_change",
  };
}

export function optimizeFill(
  catalog: VendorCatalog,
  qtys: QtyMap,
  mode: OptimizeMode = "top_up",
): OptimizeResult {
  const container = getContainerSpec(catalog.containerCode);
  const startTotals = computeTotals(catalog, qtys);

  let remainingFill = 1.0 - startTotals.fillFraction;
  let remainingKg = container.weight_max_kg - startTotals.kg;

  if (remainingFill <= EPSILON) {
    return { ...emptyResult(mode, startTotals), projected: { ...qtys } };
  }

  const allCandidates = buildCandidates(catalog);
  if (allCandidates.length === 0) {
    return { ...emptyResult(mode, startTotals), projected: { ...qtys } };
  }

  // Filter candidate set by mode.
  let candidates: Candidate[];
  if (mode === "top_up") {
    // Only SKUs already in cart with qty > 0.
    candidates = allCandidates.filter((c) => (qtys[c.sku.vendorProductId] ?? 0) > 0);
  } else if (mode === "complete_set") {
    // Anything that complements something already in cart, but isn't yet there.
    const inCart = allCandidates.filter((c) => (qtys[c.sku.vendorProductId] ?? 0) > 0);
    if (inCart.length === 0) {
      candidates = []; // nothing to complement
    } else {
      candidates = allCandidates.filter((c) => {
        if ((qtys[c.sku.vendorProductId] ?? 0) > 0) return false; // already in cart
        return inCart.some((existing) => isComplement(existing.sku, c.sku));
      });
    }
  } else {
    // fill_catalog: anything in the catalog
    candidates = allCandidates;
  }

  if (candidates.length === 0) {
    return { ...emptyResult(mode, startTotals), projected: { ...qtys } };
  }

  const projected: QtyMap = { ...qtys };
  const suggestions: Record<string, number> = {};
  let deltaSubtotal = 0;

  // Helper: how many cases to add for one candidate, respecting first-add min if zero.
  function addToCandidate(c: Candidate, casesToAdd: number) {
    if (casesToAdd <= 0) return 0;
    const before = projected[c.sku.vendorProductId] ?? 0;
    let cases = casesToAdd;
    if (before === 0) {
      // First add must clear firstAddMin.
      cases = Math.max(cases, c.firstAddMin);
      // And land on a pack multiple.
      cases = Math.ceil(cases / c.step) * c.step;
    } else {
      cases = Math.ceil(cases / c.step) * c.step;
    }
    // Don't exceed weight or volume.
    const wouldFill = (cases / (c.sku.casesPer40hc as number));
    const wouldKg = c.weightUnknown ? 0 : (c.sku.caseWeightKg as number) * cases;
    if (wouldFill > remainingFill + EPSILON) {
      const maxByVol = Math.floor(remainingFill / c.stepFill) * c.step;
      cases = Math.min(cases, maxByVol);
    }
    if (!c.weightUnknown && wouldKg > remainingKg) {
      const maxByWt = Math.floor(remainingKg / c.stepKg) * c.step;
      cases = Math.min(cases, maxByWt);
    }
    if (cases <= 0) return 0;
    if (before === 0 && cases < c.firstAddMin) return 0;
    suggestions[c.sku.vendorProductId] =
      (suggestions[c.sku.vendorProductId] ?? 0) + cases;
    projected[c.sku.vendorProductId] = before + cases;
    remainingFill -= cases / (c.sku.casesPer40hc as number);
    remainingKg -= c.weightUnknown ? 0 : (c.sku.caseWeightKg as number) * cases;
    deltaSubtotal += cases * c.sku.sellPricePerCase;
    return cases;
  }

  // For complete_set mode: prefer matching the qty of the existing complementary item.
  if (mode === "complete_set") {
    const inCart = allCandidates.filter((c) => (qtys[c.sku.vendorProductId] ?? 0) > 0);
    for (const c of candidates) {
      if (remainingFill <= EPSILON) break;
      if (c.weightUnknown) continue;
      // Find the matching existing item — use its qty as the suggestion target.
      const match = inCart.find((existing) => isComplement(existing.sku, c.sku));
      if (!match) continue;
      const matchQty = qtys[match.sku.vendorProductId] ?? 0;
      addToCandidate(c, matchQty);
    }
  } else {
    // top_up + fill_catalog: bulk fill from largest step down (most efficient).
    for (const c of candidates.slice().reverse()) {
      if (remainingFill <= EPSILON) break;
      if (c.weightUnknown) continue;
      const fitsByVolume = Math.floor(remainingFill / c.stepFill);
      if (fitsByVolume <= 0) continue;
      const fitsByWeight = c.stepKg > 0 ? Math.floor(remainingKg / c.stepKg) : Infinity;
      const stepsToTake = Math.max(0, Math.min(fitsByVolume, fitsByWeight));
      if (stepsToTake <= 0) continue;
      addToCandidate(c, stepsToTake * c.step);
    }
    // Fine-tune pass with smallest-step SKUs to land on exactly 100.0%.
    for (const c of candidates) {
      if (remainingFill <= EPSILON) break;
      if (c.step !== 1) continue;
      if (c.weightUnknown) continue;
      const fitsByVolume = Math.floor(remainingFill / c.stepFill);
      if (fitsByVolume <= 0) continue;
      const fitsByWeight = c.stepKg > 0 ? Math.floor(remainingKg / c.stepKg) : Infinity;
      const stepsToTake = Math.max(0, Math.min(fitsByVolume, fitsByWeight));
      if (stepsToTake <= 0) continue;
      addToCandidate(c, stepsToTake);
    }
  }

  const endTotals = computeTotals(catalog, projected);

  let status: OptimizeResult["status"];
  if (Math.abs(endTotals.fillFraction - 1.0) < EPSILON) {
    status = "exact";
  } else if (endTotals.kg >= container.weight_max_kg - 0.5) {
    status = "weight_capped";
  } else if (Object.keys(suggestions).length === 0) {
    status = "no_change";
  } else {
    status = "partial";
  }

  return {
    mode,
    projected,
    suggestions,
    deltaSubtotal,
    finalVolPct: endTotals.volPct,
    finalWtPct: endTotals.wtPct,
    status,
  };
}

// Re-export for tests / module clarity.
export { isComplement };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ignoredNameOf = nameOf;
