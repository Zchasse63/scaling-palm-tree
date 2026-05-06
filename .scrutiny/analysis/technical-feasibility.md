# Technical Feasibility Analysis

**Agent:** technical-feasibility
**Plan:** Multi-category Container Builder Expansion
**Complexity Class:** SIGNIFICANT

---

## Agent Verdict
**MODIFY** — The architecture is technically sound and the stack supports the expansion cleanly, but two specific technical risks require resolution before shipping: (1) the `draft_orders` state machine is under-specified and will create silent data corruption in edge cases, and (2) the `customer_catalog_access` UNIQUE constraint on `(customer_id, vendor_id)` prevents the legitimate multi-catalog case where one customer has two access rows for the same vendor (different container types for different regions or product lines). A third risk — the `catalog_for_customer` view does not carry `min_case_qty` or `min_fill_pct` — means draft hydration will silently use wrong submit gates unless the loader re-fetches access row data alongside the draft.

---

## Section 1: Stack Compatibility

### What's true
- Next.js 16 Server Actions + Server Components pattern is a clean fit for the expansion. New dashboard page at `/` can be a Server Component fetching all catalog summaries in one query — existing `fetchCustomerCatalogs()` already returns exactly this.
- Supabase `@supabase/ssr` session pattern is already in place. Draft persistence is a simple new table with RLS; no new auth surface needed.
- The `QtyMap = Record<string, number>` structure in `BuilderClient` is already per-vendor-product-id keyed and is naturally per-catalog. Swapping which catalog is loaded is a prop-swap.
- Tailwind v4 design tokens are catalog-agnostic. The `display_name` and `category_name` section bars already drive visual differentiation without code changes.
- Netlify deployment: no changes needed to `netlify.toml`. The `?c=<slug>` URL pattern is already implemented (migration 0003 added slug column; `resolveCustomerCatalogAccess` already handles slug-based lookup).

### Risks
**Risk T1 (HIGH): `draft_orders` state machine under-specification**
The plan mentions "qty map per customer-per-vendor, survives session reload" but does not define the draft lifecycle states. At minimum the states are: `active` (being edited), `submitted` (order placed, draft should be cleared or archived), `stale` (draft's vendor_products have changed — prices/SKUs updated since draft was saved), `expired` (timeout). Without explicit state columns and transition logic:
- A customer loads a stale draft, submits it, gets wrong prices.
- A submitted order leaves its draft `active`, confusing the dashboard status badge.
- Two browser tabs for the same catalog will produce last-write-wins drift.

The existing `submit-order.ts` Server Action inserts into `customer_orders` + `customer_order_lines` but does nothing to drafts (they don't exist yet). When drafts ship, submit-order must atomically: insert the order AND transition the draft to `submitted` (or delete it). Missing this = orphaned drafts forever.

**Risk T2 (MEDIUM): UNIQUE constraint blocks legitimate multi-vendor-product scenario**
`customer_catalog_access` has `UNIQUE (customer_id, vendor_id)`. This works for today (one foil catalog per customer). But the plan introduces plastics (different vendor), fiber/bagasse (different vendor), paper bags (Servous's own manufacturing). Each is a different `vendor_id` so the constraint is not violated.

However: the plan says "Per-category catalog provisioning — new vendor + vendor_products + access row per existing customer." If any future category is sourced from an existing vendor (e.g., Whitestone also sells plastic containers), the second access row is blocked by the unique constraint. The plan doesn't mention this, but it's a silent future blocker that should be documented or relaxed now (change to UNIQUE on `(customer_id, slug)` instead, since slug is the true customer-facing discriminator).

**Risk T3 (LOW-MEDIUM): Draft hydration will silently use stale submit-gate parameters**
`fetchCatalogForVendor()` takes a `CatalogAccess` object (which carries `minCaseQty`, `minFillPct`) and uses it to configure the `VendorCatalog` returned. The draft persistence will store a `QtyMap`. When the draft is rehydrated on next session load, the loader must re-fetch the `CatalogAccess` row to get current `minCaseQty` — it cannot rely on stored values in the draft, as those may have changed (e.g., MOQ adjusted from 100 to 200 for a plastics catalog). This is correct behavior already if the loader always re-fetches access on hydration, but it needs to be an explicit design decision, not an accident.

**Risk T4 (LOW): `catalog_for_customer` view missing fields referenced in `query.ts`**
`query.ts` references `r.description`, `r.pack_display`, `r.cases_per_pallet`, `r.category_slug`, `r.physical_specs_verified` — but the view DDL in ARCHITECTURE.md does not include these columns. Either the view has been extended since the architecture doc was written (likely, since migrations 0002 and 0003 exist), or `query.ts` is accessing null columns silently. This needs a schema audit before adding new categories, as missing fields produce silent `null` fallbacks that affect the builder UI (e.g., null `packDisplay` = blank pack description row).

---

## Section 2: Schema Feasibility

The proposed `draft_orders` table is not yet defined. A minimum viable schema:

```sql
CREATE TABLE public.draft_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  qty_map         jsonb NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'submitted', 'expired')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_draft_orders_customer_vendor UNIQUE (customer_id, vendor_id)
);
```

One draft per (customer, vendor) at a time. The UNIQUE constraint ensures no duplicate drafts. Status transitions: `active → submitted` (on order submit, atomically), `active → expired` (cron or on-load TTL check). The `submit-order` Server Action must transition the draft atomically in the same transaction.

RLS: customer reads/writes only their own drafts. Admin bypasses for Zach's provisioning.

---

## Section 3: Build Order Feasibility Assessment

| Step | Feasibility | Notes |
|---|---|---|
| 1. draft_orders table + persistence | Feasible but under-specified | State machine must be defined first |
| 2. Procurement dashboard at `/` | Highly feasible | `fetchCustomerCatalogs()` already returns the data; it's a render question |
| 3. Header dropdown enrichment | Feasible | Needs draft status join; adds query complexity to header (currently stateless) |
| 4. Submit-and-continue prompt | Feasible | Requires order history query for "next likely category" heuristic — query complexity low |
| 5. Per-category catalog provisioning | Feasible | Primarily a data entry workflow; no new code surface except possibly a Zach-admin UI |
| 6. min_case_qty_override per SKU | Deferred — correct | The `pack_multiple` + `min_case_qty` at catalog level handles 95% of cases |

**Highest-risk step:** Step 1 (draft_orders). It is the foundation for Steps 2 and 3. If the state machine is wrong here, the dashboard will show incorrect draft status badges and the header dropdown will display stale state.

---

## Section 4: What the Existing Tests Don't Cover

The 41-test Playwright suite covers: auth, happy-path builder (single catalog), optimize (single catalog), orders (single catalog), stepper, submit-gate, sign-out. Zero tests exist for:
- Multi-catalog dashboard rendering
- Draft persistence (create, reload, modify, submit → clears draft)
- Draft stale detection
- Header dropdown with 2+ catalogs
- Auto-resolve behavior with exactly 1 catalog (must remain unchanged per plan)
- Submit-and-continue chaining

The test gap is large but manageable. The plan should budget for test suite expansion as a first-class deliverable alongside each feature, not after.

---

## Summary Table

| Finding | Severity | Blocking? |
|---|---|---|
| draft_orders state machine under-specified | HIGH | Yes — must define before implementing |
| UNIQUE (customer_id, vendor_id) limits future multi-catalog flexibility | MEDIUM | Not immediately, but should be documented |
| Draft hydration must re-fetch access row for correct submit gate | MEDIUM | No, if loader always re-fetches (explicit requirement) |
| catalog_for_customer view column gaps vs query.ts references | LOW-MEDIUM | Needs audit before new category onboarding |
| Test suite covers zero multi-catalog scenarios | MEDIUM | Not blocking ship but is a quality risk |
