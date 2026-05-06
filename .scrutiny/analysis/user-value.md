# User Value Analysis

**Agent:** user-value
**Plan:** Multi-category Container Builder Expansion
**Complexity Class:** SIGNIFICANT

---

## Agent Verdict
**GO (with conditions)** — The architectural decision to mirror the physical manufacturer constraint (one container = one catalog = one cart) is genuinely customer-aligned once explained. However, there is a real risk that customers with 5-10 categories will experience the procurement dashboard as a multi-step friction pile rather than a streamlined workflow. The plan's "submit-and-continue prompt" (Step 4) is the critical UX safeguard for this, and it needs to be more than a simple CTA — it needs to feel like a procurement workflow, not a conversion funnel. The "container = giant commitment" fear is not solved by the architectural decision alone; it's solved by making each container feel small and fast to fill.

---

## Section 1: Does the Architecture Serve the Customer?

### The core claim
The plan claims: customers are overwhelmed because they assume "container" = giant commitment. The solution is to expose one container at a time, per category, with a clear fill indicator.

### Assessment
**This is correct.** The proportional fill model already makes one container feel legible: you can see exactly how full it is, optimize to 100%, and submit. The per-category isolation means a customer can place a foil order on Monday and a plastics order Thursday without the two interfering.

### What the plan doesn't address: the "fear" is not about mixed carts
The customer's fear is that a container order requires a large upfront capital commitment (a full 40HC = tens of thousands of dollars of product). The catalog-per-container architecture doesn't reduce the capital commitment — it reduces the *cognitive complexity* of placing the order. These are different problems. If the actual fear is capital (not complexity), the right solution might be smaller containers (20STD instead of 40HC), more flexible MOQs, or payment terms — none of which are in this plan.

The plan should be clear about which fear it's solving: it solves "I don't understand how to place a multi-category order" but does NOT solve "this costs too much."

---

## Section 2: Multi-Catalog Customer Experience at Scale

### What happens when a customer has 8 catalogs?

The procurement dashboard shows 8 catalog cards. The customer must:
1. Open catalog A → build → submit
2. Return to dashboard → open catalog B → build → submit
3. Repeat 8 times

This is the correct workflow given the physical constraint. But it creates a new cognitive load: "which catalogs have I already ordered this cycle? Which ones are on a 3-week cadence? When did I last order foil?" The plan proposes catalog cards with "last order date" and "active draft status" badges — this is necessary but probably not sufficient.

**Missing UX element: cycle-level ordering context**
The plan mentions "multi-pallet loads on established cadences (every 3 weeks typical)" in the business context. But the UI has no concept of "cadence" or "this cycle." A customer on a 3-week cadence who needs to order 6 categories has to mentally track which catalogs they've hit this cycle. The submit-and-continue prompt helps, but it's reactive (fires after submit) rather than proactive (shows at the start: "You ordered 3 of 6 catalogs this cycle").

This is a Phase 2 concern, but the plan should acknowledge it rather than being silent about the cadence gap.

---

## Section 3: The Submit-and-Continue Prompt

### What the plan says
"Chains next likely category based on customer's order history."

### What "next likely" means in practice
The plan doesn't define the algorithm. Options:
1. **Recency**: suggest the catalog the customer ordered most recently alongside this one
2. **Co-occurrence**: suggest the catalog that is most commonly ordered in the same week as this one
3. **Round-robin**: suggest the catalog not yet ordered this cycle
4. **Manual sequence**: Zach defines a preferred ordering sequence in `customer_catalog_access` (a `sort_order` column)

Option 4 is the safest for a B2B tool with small customer count (say, 5-20 customers). Zach knows his customers' ordering patterns. A `sort_order` column on `customer_catalog_access` lets him configure the suggested next catalog per customer, and the heuristic falls back to recency if not configured. This is cheaper to implement than co-occurrence analysis and more reliable given the data volume.

The plan should specify which algorithm, or it will be ambiguous at implementation time.

---

## Section 4: Single-Catalog Customer UX Preservation

### The plan says
"Single-catalog (today): lands on `/` → auto-resolves to only catalog → builds → submits — unchanged."

### Assessment: this is correct and important
The existing customer ("Servous Internal Test") has one catalog. The auto-resolve behavior (`resolveCustomerCatalogAccess` returns the single row when slug is null and exactly one row exists) must be preserved exactly. The procurement dashboard should never render for a single-catalog customer — they should land directly in the builder with zero extra clicks.

**Risk**: The current `page.tsx` at `/` redirects to `/catalogs`. With the new procurement dashboard at `/`, the routing logic changes. The auto-resolve must now happen in the new `/` page, not in a redirect. This is a code change that touches the routing flow and needs explicit testing.

---

## Section 5: Customer-Facing Language and Vendor Identity

### The plan says
"Customer never sees vendor identity — hidden behind display_name."

### Assessment
This is correctly implemented at the data layer (`display_name` in `customer_catalog_access`). The risk is that draft persistence and order history display the right display_name consistently. If the `draft_orders` table stores `vendor_id` and the UI ever accidentally renders it, vendor identity leaks.

The order history page (`/orders`) should be audited to confirm it displays `display_name` (from the access row) rather than any vendor-identifying strings. The current orders page is not mentioned in the plan's scope — this is a gap.

---

## Section 6: Value Delivery Timeline

### What customers get with each step
| Step | Customer-visible value | Non-visible value |
|---|---|---|
| 1. draft_orders | "My order is saved if I close the browser" | — |
| 2. dashboard | "I can see all my catalogs" | — |
| 3. header dropdown | "Quick access to any catalog" | — |
| 4. submit-and-continue | "The app tells me what to order next" | — |
| 5. provisioning | New catalog available | — |
| 6. per-SKU override | Correct minimum for specific SKUs | — |

**The most customer-visible step is Step 2 (dashboard) + Step 5 (provisioning) — because Step 5 is what gives a customer their second catalog to use.** Without Step 5, Steps 1-4 are infrastructure that benefits a customer who doesn't yet have a second catalog to use. The plan should sequence so that at least one real customer gets catalog #2 before the full dashboard UX is complete — otherwise the feature has no users.

---

## Section 7: Validated vs. Assumed Customer Needs

### Stated assumption in the plan
"Customer pain point is they think containers = giant commitment; the tool is trying to shrink that fear."

### What's validated
- This fear is real (mentioned in the plan as a known customer insight)
- The existing tool already addresses it for single-category orders

### What's assumed but not validated
- Customers will naturally navigate between catalogs via the dashboard
- "Submit and continue" will meaningfully increase the rate of multi-category orders in one session
- Draft persistence is a blocker for repeat customers (vs. customers who complete orders in one session)
- Customers want a procurement dashboard UX vs. direct-to-builder links per category

None of these are obviously wrong, but none have been tested with a real multi-catalog customer because none exist yet. The plan's only customer is "Servous Internal Test." The plan should identify the earliest point at which a real customer can be onboarded on a second catalog to validate the UX before full buildout.

---

## Summary Table

| Finding | Severity | Recommendation |
|---|---|---|
| Architecture solves cognitive complexity, not capital fear — these must not be conflated | MEDIUM | Clarify with customers which fear is operative |
| Submit-and-continue algorithm is undefined | MEDIUM | Specify sort_order column approach |
| Cadence/cycle awareness gap for multi-catalog customers | LOW | Document as Phase 2 scope item |
| Step 5 (provisioning) is a prerequisite for any customer validation | HIGH | Prioritize provisioning a real second catalog early |
| Order history page may display vendor identity — needs audit | MEDIUM | Audit before multi-catalog ships |
| Draft persistence value is unvalidated — customers may be completing orders in one session | LOW | Track session length data from existing customer |
