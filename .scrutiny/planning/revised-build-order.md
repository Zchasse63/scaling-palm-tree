# Revised Build Order

## Original Order (Proposed)
1. draft_orders table + persistence
2. Procurement dashboard
3. Header dropdown enrichment
4. Submit-and-continue prompt
5. Per-category catalog provisioning
6. (Deferred) per-SKU MOQ override

## Revised Order (Recommended)

### Phase A: Validate multi-catalog UX (1-2 weeks)
**Step 1**: Fix UNIQUE constraint migration (`customer_catalog_access`: change to `UNIQUE(customer_id, slug)`)
**Step 2**: Procurement dashboard at `/` — read-only, shows catalog cards with last-order date (add last-order JOIN to `fetchCustomerCatalogs()`), draft status badge (mocked/null for now), empty state for 0-catalog customers
**Step 3**: Preserve auto-resolve: single-catalog customer redirects directly to builder (explicit test case)

### Phase B: Get a real second catalog live (1 week)
**Step 4**: Per-category catalog provisioning — new vendor + vendor_products + access row per existing customer. Ship with provisioning checklist (includes `cases_per_40hc` validation + DB constraint). Test with one real customer on catalog #2 before any further development.

### Phase C: Draft persistence (1-2 weeks)
**Step 5**: `draft_orders` table with fully specified state machine (active/submitted/expired). Server-fetch pattern in `build/page.tsx` (catalog + draft in parallel). Debounced Server Action for draft writes. Stale-SKU detection on hydration. Atomic draft archive in `submit-order` Server Action.

### Phase D: Polish (1 week)
**Step 6**: Header dropdown enrichment — catalog list with live draft/last-order status badges
**Step 7**: Submit-and-continue prompt — with `sort_order` column on `customer_catalog_access` for configurable "next catalog" suggestion
**Step 8**: Test suite expansion — multi-catalog dashboard, draft lifecycle, auto-resolve regression, empty state

### Deferred (Phase 2)
- per-SKU MOQ override (`min_case_qty_override`)
- Order history multi-catalog filtering
- Cadence/cycle awareness on dashboard
- Cross-catalog optimize fill
- Provisioning admin UI (trigger: >5 customers × >3 catalogs)
