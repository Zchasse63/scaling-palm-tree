# Edge Cases Analysis

**Agent:** edge-cases
**Plan:** Multi-category Container Builder Expansion
**Complexity Class:** SIGNIFICANT

---

## Agent Verdict
**MODIFY** — The plan's architecture is sound, but at least 6 production-level edge cases are unaddressed and will cause silent incorrect behavior or customer-visible failures. The most dangerous is the draft stale-SKU scenario: a customer loads a saved draft and finds qty assigned to a SKU that no longer exists in the catalog (vendor discontinued a product or Zach deactivated a `vendor_products` row). The current `computeTotals()` function silently skips unknown `vendorProductId` keys in the qty map, meaning the fill percentage will be wrong (lower than expected) with no indication to the customer. Second most dangerous: the submit gate race condition where a customer submits while a draft write is in flight.

---

## Section 1: Draft Persistence Edge Cases

### EC-1: Stale SKU in draft (HIGH risk)
**Scenario**: Customer builds a plastics draft with 500 cases of SKU A. Between sessions, Zach deactivates `vendor_products` row for SKU A (supplier discontinued it). Customer returns, draft is hydrated, SKU A's qty (500) is in the `QtyMap` but SKU A is not in the `VendorCatalog.categories`. `computeTotals()` loops over `catalog.categories` only — it never reads the qty map directly. The 500 cases are silently dropped from the fill calculation.

**Result**: Customer sees fill% lower than their saved draft showed. They think the draft loaded incorrectly. If they don't notice, they submit an order without the discontinued SKU (potentially below 100% fill, which the submit gate catches — but only if the remaining SKUs don't accidentally fill to 100%).

**Fix required**: On draft hydration, cross-reference the `QtyMap` keys against the loaded `VendorCatalog`'s SKU set. Any qty map key not in the catalog = stale SKU. Show a warning banner: "Some items from your saved draft are no longer available and have been removed." Remove the stale keys from the initial qty state.

### EC-2: Submit race condition (HIGH risk)
**Scenario**: Customer clicks Submit while a debounced draft write (`saveDraft`) is in flight. The submit Server Action (`submit-order.ts`) runs. Two things happen in parallel: (a) the draft write upserts the `qty_map` with state N, (b) the submit creates `customer_orders` and `customer_order_lines`. The submit action should then delete/archive the draft — but if the draft write lands AFTER the archive, the draft is resurrected with the submitted state.

**Result**: After submission, the customer sees a ghost draft badge on the dashboard for a catalog they already ordered.

**Fix required**: The submit Server Action must acquire an advisory lock or use a transaction that atomically inserts the order AND sets `draft_orders.status = 'submitted'`. Since Supabase uses Postgres, `SELECT ... FOR UPDATE` on the draft row within the transaction provides this. Alternatively, cancel any in-flight draft writes on submit (clear the debounce timer before triggering the submit action).

### EC-3: Two tabs open for the same catalog (MEDIUM risk)
**Scenario**: Customer opens foil catalog in Tab A and Tab B. Both start with the same draft. Customer adjusts Tab A to 60 cases of item X, Tab B to 80 cases of item X. Both debounce writes land. Last write wins in the DB.

**Result**: Customer submits from Tab A expecting 60 cases of X, but the submitted order has 80 (the Tab B state was written last). Or vice versa.

**Fix required**: Add an `updated_at` column to `draft_orders`. On draft write, use optimistic concurrency: `UPDATE draft_orders SET qty_map = $1, updated_at = now() WHERE customer_id = $2 AND vendor_id = $3 AND updated_at = $4`. If the `updated_at` doesn't match, the write was lost to a concurrent write — show a "Your draft was updated in another tab. Reload?" banner to the stale tab. This is the same pattern used by collaborative document editors.

### EC-4: Draft price staleness (MEDIUM risk)
**Scenario**: Draft is saved with subtotal $45,000. Zach updates vendor costs (new pricing from supplier), which changes the `catalog_for_customer` view's `sell_price_per_case` values. Customer loads draft next day — qty map is the same, but `computeTotals()` will compute a new subtotal using the fresh prices from the freshly-loaded catalog.

**Result**: The subtotal shown after draft hydration differs from what was shown when the draft was saved. This is actually CORRECT behavior (the customer should see current prices), but it may be surprising ("I thought I was getting $45,000, now it shows $48,000").

**Fix required**: No code change needed — the architecture already handles this correctly by always computing prices from the live catalog. But a UX decision is needed: should the app show a "prices have been updated since your last session" notice? For a B2B tool where price changes are rare and manual (Zach updates them), probably yes.

### EC-5: Draft for deactivated catalog (LOW risk)
**Scenario**: A customer has an active draft for a plastics catalog. Zach sets `is_active = false` on that `customer_catalog_access` row (vendor relationship ended). The customer loads the dashboard.

**Result**: The catalog card no longer appears (only `is_active = true` rows are fetched). But `draft_orders` still has an active draft for that vendor. The dashboard doesn't show the draft. The draft is orphaned.

**Fix required**: When fetching the draft dashboard status, join `draft_orders` only for catalogs that are currently `is_active = true`. Alternatively, add a cleanup step: when setting `is_active = false` on a catalog, set `draft_orders.status = 'expired'` for any active drafts for that catalog.

---

## Section 2: Multi-Catalog Routing Edge Cases

### EC-6: Customer with exactly 1 catalog hits `/` — auto-resolve must still work (HIGH risk for regression)
**Scenario**: The existing customer ("Servous Internal Test") has 1 catalog. With the new procurement dashboard at `/`, the routing logic changes. The auto-resolve behavior (`resolveCustomerCatalogAccess` returns the single row when slug is null and exactly one row exists) currently happens in the redirect from `/` to `/catalogs`. With the new dashboard at `/`, the auto-resolve must happen in the new `/` page.

**Result if broken**: Existing single-catalog customer lands on the procurement dashboard instead of going directly to the builder. Extra click added. This is a regression.

**Fix required**: In the new `/` page server component:
```tsx
const catalogs = await fetchCustomerCatalogs(customerId);
if (catalogs.length === 1) {
  redirect(`/build?c=${catalogs[0].slug}`);
}
// else: render dashboard
```
This must be an explicit test case in the Playwright suite.

### EC-7: Customer with 0 active catalogs (MEDIUM risk)
**Scenario**: A new customer is provisioned in `customer_user_profiles` but Zach hasn't added any `customer_catalog_access` rows yet (provisioning is in progress). Customer tries to log in.

**Result**: `fetchCustomerCatalogs()` returns `[]`. The dashboard renders with no cards. The customer sees an empty state with no explanation.

**Fix required**: Explicit empty state UI: "Your catalogs are being set up. Contact Zach at [email]." This is a UX gap the plan doesn't mention.

### EC-8: Slug collision during provisioning (LOW risk)
**Scenario**: Zach provisions Customer A with slug `foil-aluminum`. Later provisions Customer B with slug `foil-aluminum`. This is fine — the UNIQUE is on `(customer_id, slug)`, so different customers can share slug names. But if Zach accidentally gives Customer A a second access row (different vendor, same slug = `foil-aluminum`), the DB constraint fires with an opaque error.

**Fix required**: The provisioning workflow should validate slug uniqueness per customer and suggest alternatives. If the provisioning is manual SQL, document this clearly.

---

## Section 3: Order Submission Edge Cases

### EC-9: Submit while optimization modal is open (MEDIUM risk)
**Scenario**: Customer opens the Optimize Fill modal, sees projected quantities, but doesn't click "Apply" — instead, they somehow trigger submit (keyboard shortcut, form submit via Enter). The submit action uses the current `QtyMap` state, not the projected optimization state.

**Result**: Order submitted with pre-optimization quantities. Customer expected the optimized quantities.

**Fix required**: Verify that the submit button is disabled while the optimize modal is open. Review `builder-client.tsx` to confirm this is the case. If not, add modal-open as a submit-gate condition.

### EC-10: Submit with a stale draft after session timeout (MEDIUM risk)
**Scenario**: Customer loads the builder, builds to 100%, then gets a Supabase session timeout (magic-link sessions have a configurable TTL). They click Submit — the Server Action's `requireSession()` call fails, redirecting to `/signin?next=/build?c=...`. After re-auth, they land on `/build?c=...`, which re-fetches the catalog with a fresh server render. But their QtyMap is gone from React state (full page reload).

**Result**: Customer loses their built order. They have to rebuild from scratch. If draft persistence is in place, the draft would restore their work — but without drafts, this is a silent data loss.

**Fix required**: With draft persistence, this is handled automatically (draft restores on next load). Without drafts, this is a known pain point. This is actually a strong argument for building draft persistence before exposing the tool to real customers.

---

## Section 4: Provisioning Edge Cases

### EC-11: New vendor product loaded with missing `cases_per_40hc` (HIGH risk)
**Scenario**: Zach adds a new vendor (PET cups from a new supplier) and inserts `vendor_products` rows without filling in `cases_per_40hc` (field left NULL). Customer loads the plastics catalog.

**Result**: `computeTotals()` has a guard: `if (sku.casesPer40hc && sku.casesPer40hc > 0) { fillFraction += ... }`. SKUs with null `casesPer40hc` are excluded from the fill calculation entirely. The customer can add 1000 cases of a product and the fill bar doesn't move. The submit gate requires 100% fill, so the order can never be submitted.

**Fix required**: The `catalog_for_customer` view (or the provisioning workflow) should validate that all active `vendor_products` have `cases_per_40hc > 0`. Add a DB check constraint: `CHECK (cases_per_40hc IS NOT NULL AND cases_per_40hc > 0)` on `vendor_products`. Or at minimum, add a provisioning checklist item.

### EC-12: Container type mismatch (MEDIUM risk)
**Scenario**: Zach provisions a plastics catalog with `container_type = '40HC'` but the manufacturer ships PET cups in 40STD containers. The fill math uses `cases_per_40hc` values (which were provided for a 40STD), but the `containerCode` in `VendorCatalog` says `40HC`. The container weight/volume limits used are for 40HC.

**Result**: The fill bar shows correct fill % (because fill is computed as `qty / cases_per_40hc`, which is the same regardless of the label), but the weight ceiling applied is 40HC's 26,500 kg instead of 40STD's 26,700 kg. In practice this is a minor difference. But the container label shown in the UI says "40' High Cube" when the shipment is actually a "40' Standard." Customer notices discrepancy with their freight forwarding paperwork.

**Fix required**: The `cases_per_40hc` field name is misleading for non-40HC catalogs. Consider renaming to `cases_per_container` in the DB (migration), or ensuring that provisioning always matches the `container_type` in `customer_catalog_access` with the correct `cases_per_40hc` values from the manufacturer.

---

## Section 5: Optimize Fill Edge Cases Under Multi-Category

### EC-13: Optimize Fill "fill_catalog" mode with large category (LOW risk)
**Scenario**: A plastics catalog has 80 SKUs (PET cups 8oz-32oz, PP lids, deli containers, etc.). Customer has 3 items in cart. "Fill Catalog" mode runs `optimizeFill()` with `candidates = allCandidates` (80 items). The greedy algorithm adds the largest-step SKUs first. For a catalog with many large-step SKUs, the result may be a valid 100% fill that the customer finds useless (e.g., 500 cases of a SKU they've never ordered).

**Result**: Optimize Fill suggestions are not useful for large catalogs with the "fill_catalog" mode. The algorithm is designed for the 18-SKU foil catalog, not a 80-SKU plastics catalog.

**Fix required**: Consider adding a "priority tier" to SKUs in `vendor_products` metadata (a `fill_priority` flag or score). Optimize Fill "fill_catalog" mode would prefer high-priority SKUs. This is a data quality concern as much as a code concern.

---

## Summary Table

| Edge Case | Severity | Must Fix Before Shipping? |
|---|---|---|
| EC-1: Stale SKU in draft | HIGH | Yes — before draft persistence ships |
| EC-2: Submit race with draft write in flight | HIGH | Yes — before draft + submit ships |
| EC-6: Auto-resolve regression for single-catalog customer | HIGH | Yes — before dashboard ships |
| EC-11: Missing cases_per_40hc blocks submit gate | HIGH | Yes — add DB constraint before new category onboads |
| EC-3: Two-tab draft conflict | MEDIUM | Before multi-catalog goes live with real customers |
| EC-4: Draft price staleness | MEDIUM | UX decision only; no code change required |
| EC-7: Empty state for 0-catalog customer | MEDIUM | Before real customer provisioning |
| EC-9: Submit while optimize modal open | MEDIUM | Audit existing builder before draft ships |
| EC-10: Session timeout loses built order | MEDIUM | Draft persistence resolves this |
| EC-12: Container type mismatch | MEDIUM | Provisioning checklist item |
| EC-5: Draft for deactivated catalog | LOW | Dashboard query handles via is_active filter |
| EC-8: Slug collision in provisioning | LOW | Document in provisioning workflow |
| EC-13: Optimize Fill on large catalogs | LOW | Data quality / future enhancement |
