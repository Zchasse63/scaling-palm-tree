# SCRUTINY SUMMARY: Multi-category Container Builder Expansion

**Verdict: MODIFY**
**Complexity Class:** SIGNIFICANT
**Mode:** Deep (7 agents)
**Date:** 2026-05-04

---

## Verdict Summary

The architecture is correct. One container = one catalog = one cart is the right call and should not change. The expansion will deliver genuine competitive advantage. However, the build order is inverted (burying value delivery behind infrastructure), and four specific technical gaps will cause silent data corruption or user-visible failures if not fixed before shipping.

---

## Highest-Risk Item in the Build Order

**Step 1 (draft_orders) is the highest-risk item — and it should not be built first.**

The plan front-loads draft persistence as the foundation for everything else. But the `draft_orders` state machine is under-specified: the plan does not define the states (active / submitted / expired), transitions, or the critical atomic requirement that `submit-order` must transition the draft in the same database transaction as the order insert. If this is not designed explicitly before writing code:

- Submitted orders will leave orphaned active drafts. The dashboard will show "draft pending" badges for completed orders indefinitely.
- Draft writes and submit actions can race (two async operations, no concurrency control), producing last-write-wins drift in the worst case.
- Stale SKUs in a loaded draft are silently dropped by `computeTotals()` — the fill % shown to the customer will be wrong with no warning.

**Recommended fix**: Define the full state machine specification before writing a line of draft code. Move draft persistence to Step 3 (after the dashboard and provisioning are validated with a real customer).

---

## Architectural Assumption That Breaks at Scale

**`UNIQUE (customer_id, vendor_id)` on `customer_catalog_access` is the wrong unique key.**

The current constraint assumes one vendor = one catalog per customer, forever. This breaks the moment any vendor supplies products across two categories (e.g., USA Packaging sells both aluminum foil and PET cups, or Servous's own manufacturing expands to two product lines). You'd need a second access row for the same `vendor_id`, and the constraint fires with an opaque DB error.

The constraint should be `UNIQUE (customer_id, slug)` instead — the slug is already the customer-facing catalog discriminator and the URL key. This migration is non-breaking (just a constraint change + new unique index) and should be done before multi-category ships, not discovered later when a provisioning attempt fails.

---

## What's Clearly Missing for Category #2

Four things are obviously needed the moment a second catalog goes live that the plan doesn't address:

1. **Stale-SKU detection on draft hydration.** When a customer loads a saved draft and a SKU has been deactivated since the draft was saved, `computeTotals()` silently drops it. The fill % shown is wrong. Add cross-reference on hydration: compare qty map keys against the loaded catalog; strip and warn on missing keys.

2. **cases_per_40hc DB constraint.** If a new vendor's products are loaded with NULL `cases_per_40hc`, the submit gate is permanently blocked for any customer who adds those products (fill % never changes). Add `CHECK (cases_per_40hc IS NOT NULL AND cases_per_40hc > 0)` to `vendor_products` now, before provisioning any new category.

3. **Empty state for 0-catalog customers.** A newly-provisioned customer with no active access rows yet will see a blank dashboard with no explanation. Add an explicit "Your catalogs are being set up — contact Zach at zchasse@atyourservous.com" state.

4. **Auto-resolve regression test.** When `/` becomes the procurement dashboard, the single-catalog auto-resolve logic (which currently redirects single-catalog customers directly to the builder) must be explicitly preserved and Playwright-tested. This is a silent regression risk on the existing customer.

---

## Specific Revisions Recommended

### Change to Build Order
**Current:** draft_orders (1) → dashboard (2) → header (3) → submit-continue (4) → provisioning (5)

**Revised:**
- Phase A: Fix UNIQUE constraint migration + build dashboard (read-only, with last-order data) + add auto-resolve test
- Phase B: Provision one real second catalog for a real customer (validate the UX before investing in infrastructure)
- Phase C: Build draft_orders with fully-specified state machine, stale-SKU detection, atomic submit transition, debounced writes
- Phase D: Header dropdown + submit-and-continue prompt + test suite expansion

This pulls value delivery forward by 3-4 weeks.

### Schema Fixes Required
1. `ALTER TABLE customer_catalog_access DROP CONSTRAINT uq_customer_catalog_access; CREATE UNIQUE INDEX uq_customer_catalog_access ON customer_catalog_access (customer_id, slug);`
2. `ALTER TABLE vendor_products ALTER COLUMN cases_per_40hc SET NOT NULL; ALTER TABLE vendor_products ADD CHECK (cases_per_40hc > 0);`
3. Draft state machine schema (when Phase C begins): `draft_orders` with `status text CHECK (status IN ('active', 'submitted', 'expired'))`, `updated_at timestamptz`, UNIQUE on `(customer_id, vendor_id)`

### submit-order Server Action
Must atomically: insert `customer_orders` + `customer_order_lines` AND `UPDATE draft_orders SET status = 'submitted' WHERE customer_id = $1 AND vendor_id = $2 AND status = 'active'` — in the same Postgres transaction or RPC call.

### Validate Before Building Draft Persistence
Before investing in the draft state machine, answer: what fraction of the existing customer's sessions are abandoned mid-build without submitting? If sessions are typically completed in under 20 minutes (likely, given the optimized builder UX), draft persistence may serve <5% of sessions. If so, defer it to Phase 2 and ship Steps 2+5 first.

---

## What's Correct and Should Not Change

- The catalog-per-category architectural decision is correct and well-reasoned. Do not revisit.
- The proportional fill math (`qty / cases_per_40hc`) requires no changes for multi-category — each catalog is an independent invocation.
- The `?c=<slug>` URL pattern and `resolveCustomerCatalogAccess` function handle multi-catalog cleanly today.
- The monochrome design system needs no changes — `display_name` and `category_name` section bars already provide visual differentiation without color coding.
- Deferring per-SKU MOQ override, mixed carts, cross-catalog optimization, and multi-user approval is correct.

---

## Full Analysis Files

- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/analysis/technical-feasibility.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/analysis/scope-complexity.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/analysis/user-value.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/analysis/cost-benefit.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/analysis/architecture-impact.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/analysis/edge-cases.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/analysis/competitive-context.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/synthesis/verdict.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/planning/revised-build-order.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/planning/assumptions.md`
- `/Users/zach/Desktop/Servous/apps/container-builder/.scrutiny/planning/risk-register.md`
