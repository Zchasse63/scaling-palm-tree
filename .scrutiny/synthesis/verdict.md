# Verdict: Multi-category Container Builder Expansion

**Final Verdict: MODIFY**

---

## Verdict Rationale

The plan is architecturally correct and the core decision (one container = one catalog = one cart) is well-reasoned and should not change. The expansion will deliver genuine business value. However, the build order is inverted in a way that maximizes infrastructure cost before delivering any customer-facing value, and four specific technical gaps must be resolved before shipping:

1. The `draft_orders` state machine is under-specified — it will silently corrupt data if implemented as described
2. The `UNIQUE (customer_id, vendor_id)` constraint on `customer_catalog_access` forecloses multi-product-line vendor scenarios and should be changed to `UNIQUE (customer_id, slug)` before multi-category ships
3. The `submit-order` Server Action must atomically transition the draft state — missing this leaves orphaned drafts permanently
4. Draft hydration must cross-reference the qty map against the live catalog and warn on stale SKUs — the current `computeTotals()` silently drops them

---

## Verdict by Agent

| Agent | Verdict | Key Finding |
|---|---|---|
| technical-feasibility | MODIFY | draft_orders state machine under-specified; UNIQUE constraint wrong key |
| scope-complexity | MODIFY | Build order inverted — dashboard before draft schema |
| user-value | GO (conditions) | Architecture serves customer; submit-and-continue algorithm undefined |
| cost-benefit | MODIFY | Provisioning (Step 5) is the value-delivery step; buried at position 5 |
| architecture-impact | MODIFY | UNIQUE constraint; BuilderClient needs hydration path; submit-order must be atomic |
| edge-cases | MODIFY | 4 HIGH-severity edge cases unaddressed |
| competitive-context | GO | No direct competitor; architectural simplicity is a competitive asset |

---

## Critical Path to GO

These must be resolved before any real customer is on a second catalog:

1. **Reorder build steps**: Dashboard (Step 2) → Provisioning (Step 5) → Draft persistence (Step 1) → Header (Step 3) → Submit-and-continue (Step 4)
2. **Fix UNIQUE constraint**: Migrate `customer_catalog_access` from `UNIQUE (customer_id, vendor_id)` to `UNIQUE (customer_id, slug)`
3. **Specify draft state machine**: Define all states (active/submitted/expired), transitions, and atomic submit behavior before writing a line of draft code
4. **Add stale-SKU detection**: On draft hydration, validate qty map keys against loaded catalog; warn and drop stale keys
5. **Add cases_per_40hc DB constraint**: `NOT NULL CHECK (cases_per_40hc > 0)` on `vendor_products` to prevent broken catalogs

---

## Assumptions to Validate Before Committing to Draft Persistence

- What fraction of the existing customer's sessions are abandoned mid-build? If >20%, draft persistence is justified. If <5%, defer it.
- Is the "container = giant commitment" fear primarily cognitive (complexity of the tool) or financial (actual capital required)? The tool solves the former, not the latter.
