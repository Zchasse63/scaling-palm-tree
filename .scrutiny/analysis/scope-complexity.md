# Scope & Complexity Analysis

**Agent:** scope-complexity
**Plan:** Multi-category Container Builder Expansion
**Complexity Class:** SIGNIFICANT

---

## Agent Verdict
**MODIFY** — The plan's build order front-loads the gnarliest infrastructure (draft persistence with an implicit state machine) before building the UI surfaces that would reveal whether that infrastructure is even the right shape. The correct sequence is: build the procurement dashboard first (to validate the multi-catalog UX), then add draft persistence, then enrich the header. Additionally, Step 6 (per-SKU MOQ override) being listed as "deferred" is correct in principle but the plan should explicitly document what triggers the undeferral, or it will never ship.

---

## Section 1: Scope Sizing

### What's actually in scope
A count of new surfaces / new artifacts:

| Item | New? | Complexity Estimate |
|---|---|---|
| `draft_orders` table + migration | New | Low schema, HIGH state machine logic |
| Draft persistence in `BuilderClient` | New | MEDIUM (hydrate on mount, debounce writes, stale detection) |
| Procurement dashboard page `/` | New | LOW-MEDIUM (render existing `fetchCustomerCatalogs` output) |
| Catalog cards with draft/last-order status | New | MEDIUM (needs draft status join + order history join) |
| Header dropdown enrichment | Modified | LOW-MEDIUM (currently stateless header; now needs catalog list with status) |
| Submit-and-continue prompt | New | LOW (UI overlay + order-history-based category suggestion) |
| Per-category provisioning workflow | New | LOW (data entry; maybe a CLI or admin page) |
| Playwright test expansion | New | MEDIUM-HIGH (entirely new scenarios; multi-catalog, draft lifecycle) |
| Schema audit + view column gap fix | Existing fix | LOW |

### Hidden scope items the plan doesn't mention
1. **Draft write debouncing**: Every qty change fires a state update. Without debouncing, each stepper tap = a Supabase write. A 40HC foil container might see 500+ qty adjustments in one session. Needs a debounce (300-500ms) + optimistic local state strategy.
2. **Draft conflict resolution (two tabs)**: The plan doesn't mention what happens when the same customer opens the same catalog in two browser tabs. Last-write-wins on the `qty_map` jsonb column. This is probably acceptable (it's a B2B procurement tool, not a shopping cart race condition), but it should be a stated decision, not an oversight.
3. **"Last order" data for catalog cards**: The dashboard cards need `last order date + $ value` per catalog. This requires a JOIN from `customer_catalog_access` to `customer_orders`. The existing `fetchCustomerCatalogs()` query doesn't include this. New query needed.
4. **Empty state for procurement dashboard**: When a customer has 0 active catalogs (or is newly provisioned with 1), what does the dashboard show? Plan specifies auto-resolve to the single catalog — but what about a customer with `is_active = false` on all rows? Need an empty state + "contact Servous" CTA.
5. **Draft expiry policy**: How long does a draft live? 30 days? Indefinitely? If a customer abandons a plastics draft for 6 months and prices have changed, loading the draft with old quantities = wrong subtotal display. Need either TTL or a "prices may have changed" warning on hydration.

---

## Section 2: Build Order Analysis

### Proposed order: 1 → 2 → 3 → 4 → 5 → 6
```
draft_orders → dashboard → header dropdown → submit-and-continue → provisioning → per-SKU override (deferred)
```

### Problem with this order
Step 1 (draft persistence) is listed first, but the draft schema and state machine are only meaningful once you've validated what the procurement dashboard needs to display. Building the table before building the UI risks designing a schema that doesn't fit the display requirements.

**Better order:**
```
2 → 1 → 3 → 4 → 5
```
- **Step 2 first** (procurement dashboard, read-only): Build and validate the multi-catalog card UI with mocked draft status. This reveals what data the dashboard actually needs (last order date, draft qty count, draft age) before you commit to a schema.
- **Step 1 second** (draft_orders table + persistence): Now you know the exact fields needed. Add debouncing. Wire up real draft status to the dashboard cards from Step 2.
- **Step 3 third** (header dropdown): Straightforward once you have catalog list + draft status data from Step 2/1.
- **Step 4 fourth** (submit-and-continue): Requires at least one non-test order to validate the "next likely category" suggestion.
- **Step 5 fifth** (per-category provisioning): Can happen in parallel with any of the above; it's a data entry workflow.

### Why the plan's order creates risk
If Step 1 ships first and the `draft_orders` schema bakes in the wrong fields (e.g., no `updated_at`, no `stale_at`, no item count for card badges), Step 2's cards will either be incomplete or require a schema migration that cascades to Step 1's persistence logic.

---

## Section 3: Expansion Factor Analysis

### Where scope will grow unexpectedly

**Draft persistence (Step 1) — HIGH expansion risk**
The plan describes this as "qty map per customer-per-vendor, survives session reload." The reality:
- Hydration on mount: must handle race between server render (no draft) and client hydration (draft loaded). React 19 `useActionState` + server action for draft fetch? Or a client-side `useEffect` on mount? The choice affects how the builder page works.
- Stale SKU detection: if a vendor product is removed from the catalog between when the draft was saved and when it's loaded, the stale product's ID is in the `qty_map` but not in the catalog. Must silently drop or warn.
- Price-change warning: if a SKU's price has changed since the draft was saved, the subtotal shown is wrong. Should this show a "prices updated" banner? This is a UX decision that adds scope.
- Write strategy: optimistic local + async write? Or blocking write? Blocking write with debounce is simpler but introduces a loading state on every qty change.

**Per-category provisioning (Step 5) — MEDIUM expansion risk**
Currently "provisioning" is: Zach manually inserts rows via Supabase Admin UI. For 5+ categories × N customers, this becomes error-prone. The plan defers a provisioning UI, but if Servous onboards even 3 real customers with 3 catalogs each, the manual approach breaks fast. The plan should either (a) accept manual provisioning as the constraint for Phase 1, or (b) budget a lightweight admin provisioning page as part of Step 5.

**Optimize Fill with multi-category (Step 2 UX side) — LOW-MEDIUM expansion risk**
Today, Optimize Fill operates on a single `VendorCatalog`. With multiple catalogs, a customer might want to "fill catalog" across both their plastics and foil orders to minimize waste. The plan correctly defers cross-catalog optimization — but when it ships, it will require refactoring `optimizeFill()` to accept a multi-catalog context. The current function signature (`catalog: VendorCatalog`) assumes one catalog. This is not in scope now but should be documented as a future breaking change.

---

## Section 4: Complexity Hotspots

### 1. Draft lifecycle state machine (confirmed gnarly)
States needed (minimum):
```
active → submitted (on order submit, atomic with order insert)
active → expired (TTL, or price-stale trigger)
active → abandoned (no transition, just TTL)
```
Missing state: what happens to the draft when the customer submits an order and then immediately starts a new order for the same catalog? Should the submitted draft be archived or deleted? Archive = audit trail. Delete = simpler. The plan says nothing.

### 2. "Last order" + "draft pending" signals on catalog cards
This requires two separate queries (orders + drafts) joined to the catalog access list. The existing `fetchCustomerCatalogs()` only fetches access rows + SKU counts. For the dashboard cards, you need:
```sql
SELECT
  cca.*,
  co.created_at AS last_order_date,
  co.total_amount AS last_order_total,
  do.updated_at AS draft_updated_at,
  jsonb_array_length(do.qty_map::jsonb) AS draft_item_count
FROM customer_catalog_access cca
LEFT JOIN customer_orders co ON co.customer_id = cca.customer_id
  AND co.vendor_id = cca.vendor_id
  AND co.id = (SELECT id FROM customer_orders WHERE customer_id = cca.customer_id
               AND vendor_id = cca.vendor_id ORDER BY created_at DESC LIMIT 1)
LEFT JOIN draft_orders do ON do.customer_id = cca.customer_id
  AND do.vendor_id = cca.vendor_id AND do.status = 'active'
WHERE cca.customer_id = $1 AND cca.is_active = true
```
This is a non-trivial query. The plan doesn't mention it.

### 3. Header dropdown with live draft badges
The header (`app-header.tsx`) is currently a Server Component. If it needs to show draft status badges (e.g., "2 items in draft"), it needs either:
- A server component re-render on every page load (fine, but adds latency)
- Or a client component with its own draft state fetch

The current architecture has BuilderClient owning all qty state — the header would need to either subscribe to a shared store or re-fetch from Supabase. This is the first place in the codebase where shared cross-page state would be needed.

---

## Section 5: Missing Items for Category #2 Shipping

These are gaps that become obvious the moment a second category is live:

1. **Test coverage for multi-catalog auto-resolve edge case**: When a customer with 2 catalogs hits `/` with no `?c=` param, what happens? Currently: auto-resolve to single catalog. With 2 catalogs: must land on dashboard, not auto-resolve. This logic must be tested explicitly.

2. **Slug uniqueness across customers**: The migration adds UNIQUE on `(customer_id, slug)`. But are slugs customer-specific or global? If two customers both have a `foil-aluminum` slug, that's fine (scoped to customer). But if Zach provisions a customer with a slug collision (same customer, same slug, different vendor), the DB constraint catches it. The provisioning workflow needs to either auto-generate slugs or validate them.

3. **Email notification copy**: When a customer submits a multi-catalog order, the confirmation email (if one exists) should reference the specific catalog. If the email template says "Your Foil & Aluminum container order has been submitted" but the customer just submitted plastics, that's wrong. (Note: no email notification system is mentioned in the plan — this is a gap to flag.)

4. **Order history page multi-catalog filtering**: The current orders page (`/orders`) shows all orders. With multiple catalogs, customers will want to filter by catalog/category. No mention of this in the plan.

---

## Summary Table

| Finding | Severity | Recommendation |
|---|---|---|
| Build order is inverted — dashboard before draft schema | HIGH | Swap: build Step 2 first to inform Step 1's schema |
| Draft debouncing not mentioned | MEDIUM | Explicit design decision required |
| "Last order" data not in existing fetchCustomerCatalogs() | MEDIUM | New query needed before dashboard ships |
| Draft stale price / stale SKU handling not specified | MEDIUM | Define policy before Step 1 ships |
| Per-category provisioning will outgrow manual SQL quickly | MEDIUM | Budget a lightweight admin provisioning page in Step 5 |
| Orders page doesn't support multi-catalog filtering | LOW | Add to backlog before second category ships |
| No email notification system mentioned | LOW | Flag as obvious missing feature for multi-catalog |
