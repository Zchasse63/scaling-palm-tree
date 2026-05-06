# Architecture Impact Analysis

**Agent:** architecture-impact
**Plan:** Multi-category Container Builder Expansion
**Complexity Class:** SIGNIFICANT

---

## Agent Verdict
**MODIFY** — The one-container-one-catalog-one-cart decision is architecturally correct and well-reasoned. The existing schema supports it cleanly. However, three structural issues will create compounding technical debt if not addressed now: (1) the `catalog_for_customer` view architecture assumes vendor_id = catalog identity, but the plan introduces the possibility of multi-catalog customers sharing a vendor (same vendor, different container types or product lines), which the current UNIQUE(customer_id, vendor_id) constraint forecloses; (2) the `BuilderClient` architecture (single large Client Component owning all qty state) does not support the draft persistence pattern cleanly because it has no mount-time hydration path; and (3) the header component (currently a stateless Server Component) will need to become partially client-side or accept server-fetched catalog status data from a parent layout, and neither path is currently scaffolded.

---

## Section 1: The Catalog-Per-Category Decision

### Assessment: CORRECT
The physical constraint is real: you cannot mix foil containers and PET cups in a 40HC. The `customer_catalog_access` schema correctly models this — each row is a separate procurement lane with its own container_type, MOQ, and fill rules. There is no architectural reason to fight this constraint.

**Why the rejected alternatives fail:**
- "One page, category tabs" would require the fill/optimize math to work across multiple `VendorCatalog` objects simultaneously. `computeTotals()` and `optimizeFill()` both take a single `VendorCatalog`. Extending them to multi-catalog context would require a breaking API change and significant math complexity.
- "One cart, auto-separate at checkout" would require the submit gate to enforce per-catalog fill rules simultaneously, with the customer not understanding why their 40% foil + 60% plastics = not a valid order for either container.

The plan's choice is the only one that keeps the math model clean and the customer mental model correct.

### What breaks at scale: 10 categories per customer
At 10 catalogs, the dashboard approach works — 10 cards, each with its own state. The only architectural pressure at this scale is:
1. **Query fan-out**: `fetchCustomerCatalogs()` does two queries (access rows + catalog stats). At 10 catalogs, the catalog stats query is a `SELECT ... WHERE vendor_id IN (10 UUIDs)`. This is fine.
2. **Header dropdown**: 10 catalogs in a dropdown is borderline UX-manageable. At 20, it's a problem. The plan correctly doesn't address 20+ catalogs.
3. **Order history query time**: if a customer has 10 catalogs and 100 orders, the orders page query is still fast. No architectural concern.

**Scale ceiling for the current architecture: ~15-20 catalogs per customer.** Beyond that, the dashboard card layout and header dropdown need redesign. This is far beyond the near-term horizon.

---

## Section 2: The `catalog_for_customer` View + UNIQUE Constraint Issue

### Current UNIQUE constraint
```sql
CONSTRAINT uq_customer_catalog_access UNIQUE (customer_id, vendor_id)
```

### What this prevents
A single customer cannot have two catalog entries for the same vendor. This is fine if "one vendor = one catalog" is a permanent invariant. But the plan introduces the concept of per-category catalogs, and categories don't map 1:1 to vendors. Specifically:

- **USA Packaging** currently supplies aluminum foil (Whitestone brand). If they also supply PET cups, a second `customer_catalog_access` row for the same `vendor_id` would be needed for the plastics catalog. This is blocked.
- **Servous's own manufacturing** (paper bags): the vendor_id for Servous's paper bags would be Servous's own `companies.id`. If Servous later manufactures both paper bags AND another product line, two access rows for the same vendor are blocked.

**Recommended fix**: Change the unique constraint to `UNIQUE (customer_id, slug)` instead of `UNIQUE (customer_id, vendor_id)`. The `slug` is already the URL discriminator and the customer-facing catalog identity. The `vendor_id` is an internal implementation detail that should not constrain the catalog topology.

This is a schema migration that should happen in the current phase (before multi-category ships in production), not deferred.

---

## Section 3: `BuilderClient` Architecture and Draft Hydration

### Current architecture
`BuilderClient` is a large Client Component that:
- Receives the full `VendorCatalog` as a prop (server-fetched)
- Owns `QtyMap = Record<string, number>` in React state (`useState`)
- Has no mount-time async hydration path

### Draft persistence requires a mount-time hydration pattern
To hydrate from a draft on mount, the component needs to either:

**Option A: Server-fetched draft (recommended)**
The parent server component (`build/page.tsx`) fetches both the catalog AND the active draft in parallel, passes both to `BuilderClient` as props. The client initializes state with the draft qty map if present. No async hydration on the client.

```tsx
// build/page.tsx (server component)
const [catalog, draft] = await Promise.all([
  fetchCatalogForVendor(vendorId, access),
  fetchActiveDraft(customerId, vendorId),
]);
return <BuilderClient catalog={catalog} initialQtys={draft?.qty_map ?? {}} />;
```

This is the cleanest approach and fits the existing Server Component pattern.

**Option B: Client-side fetch on mount**
`useEffect` on mount → fetch draft from a Server Action or API route. This adds a loading flash and increases complexity.

**Recommendation**: Option A. The server already fetches catalog data — adding a draft fetch to the same page.tsx is a minor addition.

### Draft write strategy
On every `setQtys()` call in `BuilderClient`, the component needs to persist the draft. Options:
1. **Debounced Server Action call** (300-500ms debounce): simplest, but requires the Server Action to be callable from a client-side event handler (not inside a `useActionState` form). This is fine with `useTransition`.
2. **localStorage + background sync**: simpler to implement, but loses data if the customer clears browser storage. Not appropriate for a B2B tool where draft preservation is a trust signal.

**Recommendation**: Debounced Server Action call. Implement `saveDraft(customerId, vendorId, qtyMap)` as a Server Action; call it with `startTransition` on every debounced qty change.

The state update pathway is:
```
stepper tap → setQtys (immediate, optimistic) → debounce 300ms → startTransition(saveDraft)
```
On submit:
```
submitOrder → (success) → deleteDraft (atomic in same DB transaction)
```

---

## Section 4: Header Component Architecture

### Current state
`app-header.tsx` is a Server Component with a simple slot pattern (left/center/right). It has no awareness of catalog state.

### What the plan requires
The header dropdown (Step 3) needs to show:
- All catalogs the customer has access to
- Status badges per catalog (draft pending, last order date)

### Problem
The header is rendered inside the root layout (`layout.tsx`). The root layout is a Server Component. But catalog access data is per-authenticated-user, which means the header needs the session to be resolved before it can render catalog data. This is already required for the middleware auth guard — so the session is available in the root layout.

**Architectural options:**

**Option A: Fetch catalogs in root layout, pass to header (Server Component)**
The root layout fetches `fetchCustomerCatalogs(customerId)` and passes the result to the header. The header renders a dropdown server-side. This works but means the catalog list is fetched on every page load (even the build page, which already fetches the catalog separately).

**Option B: Parallel fetch in layout + builder page (accept redundancy)**
The layout fetches a lightweight catalog summary for the header; the build page fetches the full catalog for the builder. Two separate queries but both fast. This is acceptable for a B2B tool with low concurrency.

**Option C: Client Component header with its own fetch**
Convert the header to a Client Component that fetches catalog status via a Server Action on mount. This adds client-side complexity but decouples the header from the layout render.

**Recommendation**: Option A for now. The catalog list query is fast and lightweight. If header latency becomes a concern, optimize to Option B. Avoid Option C unless the catalog list needs real-time updates (it doesn't — it updates only when Zach provisions a new access row).

---

## Section 5: The `catalog_for_customer` View Filter Pattern

### Current pattern
The view does not filter by customer. The server-side loader filters by `vendor_id` after verifying `customer_catalog_access`. This is correct.

### Risk with multi-catalog expansion
With multiple vendors, the loader calls `fetchCatalogForVendor(vendorId, access)` which queries the view filtered by `vendor_id`. This works cleanly. No architectural change needed.

**But**: the view's `JOIN public.pricing_policies pp ON pp.vendor_id = vp.vendor_id` assumes one pricing policy per vendor. If Servous ever has two different pricing policies for the same vendor (e.g., different margin tiers per customer), this join would need to become a customer-scoped join. This is a future architectural concern, not an immediate one, but it should be documented.

---

## Section 6: RLS Policy Audit for New Tables

The existing RLS policies:
- `customer_user_profiles`: user reads own profile only
- `customer_catalog_access`: user reads access rows for their company only

New table `draft_orders` will need:
```sql
ALTER TABLE public.draft_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own drafts"
  ON public.draft_orders FOR SELECT
  USING (
    customer_id = (SELECT company_id FROM customer_user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "user writes own drafts"
  ON public.draft_orders FOR INSERT WITH CHECK (
    customer_id = (SELECT company_id FROM customer_user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "user updates own drafts"
  ON public.draft_orders FOR UPDATE
  USING (
    customer_id = (SELECT company_id FROM customer_user_profiles WHERE user_id = auth.uid())
  );
```

Note: the plan uses admin client for all catalog operations (bypassing RLS). If draft persistence also uses admin client, the RLS policies on `draft_orders` are redundant but still good practice. If draft writes go through the anon client (to avoid service role key exposure), RLS is required.

**Recommendation**: use admin client for draft writes (same pattern as order submission) to keep auth surface consistent. RLS on `draft_orders` is still best practice.

---

## Section 7: Proportional Fill Math Under Multi-Category

### No changes needed
`computeTotals()` and `optimizeFill()` both take `VendorCatalog` as input. Each catalog is a separate invocation. The math is already correct for multi-category because each catalog has its own `cases_per_40hc` values. No change needed.

**Future architectural note**: if cross-catalog optimization is ever requested (fill both containers optimally given a total budget), the math functions would need to be refactored to accept `VendorCatalog[]`. This is not in scope but the function signatures should be kept clean enough that this is a natural extension, not a rewrite.

---

## Summary Table

| Finding | Severity | Recommendation |
|---|---|---|
| UNIQUE(customer_id, vendor_id) forecloses multi-product-line vendors | HIGH | Migrate to UNIQUE(customer_id, slug) before multi-category ships |
| BuilderClient has no mount-time hydration path for drafts | MEDIUM | Use server-fetch pattern: page.tsx fetches catalog + draft in parallel |
| Header needs catalog data — root layout fetch is simplest | MEDIUM | Option A: fetch in layout, pass to header as prop |
| pricing_policies JOIN assumes one policy per vendor | LOW | Document as future architectural constraint |
| RLS on draft_orders needed even with admin client pattern | LOW | Add RLS policies to migration |
| submit-order Server Action must atomically delete/archive draft | HIGH | Add draft transition to existing submit-order action |
