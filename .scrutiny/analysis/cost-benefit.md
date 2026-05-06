# Cost-Benefit Analysis

**Agent:** cost-benefit
**Plan:** Multi-category Container Builder Expansion
**Complexity Class:** SIGNIFICANT

---

## Agent Verdict
**MODIFY** — The expansion delivers clear business value, but the benefit realization depends entirely on Step 5 (per-category provisioning) shipping early enough to put a real customer on catalog #2. Steps 1-4 are all infrastructure with zero customer-facing benefit until Step 5 ships. The plan's build order buries the value-delivery step at position 5. Reorder: move provisioning to position 2 (right after the dashboard), so Zach can validate the multi-catalog UX with a real customer while the remaining infrastructure ships in parallel.

---

## Section 1: Business Value of the Expansion

### Revenue impact
The Container Builder is a procurement tool, not a checkout funnel — it doesn't generate revenue directly. It reduces friction for existing customers to place reorder orders and potentially expands wallet share (customer uses Servous for plastics AND foil instead of buying plastics elsewhere).

**Wallet share expansion is the primary value driver.** If a customer currently orders foil from Servous and plastics from a competitor, adding a plastics catalog to the Container Builder reduces the switching cost to consolidate on Servous. This is high-value in a commodity B2B business where switching costs are the primary retention mechanism.

**Quantifiable value proxy**: each additional catalog a customer actively uses = an incremental container order every ~3 weeks. A 40HC container of PET cups at 18% margin (Servous target) = significant gross profit per order. The plan doesn't quantify this, but the directional case is strong.

### Operational efficiency impact
Currently, multi-category procurement requires Zach to manually coordinate separate orders across categories. If each category gets its own Container Builder catalog, customers self-serve more of their ordering workflow. This reduces Zach's sales coordination time per order.

**Risk to this assumption**: if customers still call/email to discuss orders even after the tool ships, the operational efficiency gain is lower than modeled. The existing single-catalog customer behavior hasn't been observed at scale.

---

## Section 2: Cost of the Build

### Effort estimate by step
| Step | Estimated effort | Confidence |
|---|---|---|
| 1. draft_orders table + persistence | 3-5 days (state machine is gnarly) | MEDIUM |
| 2. Procurement dashboard | 2-3 days | HIGH |
| 3. Header dropdown enrichment | 1-2 days | HIGH |
| 4. Submit-and-continue prompt | 1 day | HIGH |
| 5. Per-category provisioning | 1-2 days (data entry + DB ops) | HIGH |
| 6. per-SKU MOQ override (deferred) | — | — |
| Test suite expansion | 3-5 days (multi-catalog scenarios) | MEDIUM |
| Schema audit + view column gap fix | 0.5 day | HIGH |
| **Total** | **~12-18 days** | — |

**Draft persistence (Step 1) has the highest variance** — 3 days if the state machine is simple (no stale detection, no price-change warnings), 5+ days if stale detection and price-change UX are included. The plan is silent on these, which suggests scope will expand during implementation.

---

## Section 3: Cost of NOT Building This

### What breaks if only foil ships indefinitely
- Customers who want plastics, fiber, paper bags cannot use the Container Builder for those categories. They either (a) order via phone/email, or (b) go to a competitor with a multi-category tool.
- Servous cannot scale to 10+ customers without a self-service procurement layer for all categories. Manual coordination doesn't scale.
- The existing single-catalog tool becomes a one-trick demo rather than a core operational system.

**The cost of not building is real and grows with each new customer or category added.**

### What happens if Steps 1-4 ship but Step 5 doesn't
- Customers have a dashboard with one catalog and elaborate draft persistence infrastructure.
- No new value delivered.
- Infrastructure cost paid, benefit not realized.

This is the key risk: the plan's build order means Step 5 (the value-delivery step) is last. If the project stalls after Step 3, the investment in Steps 1-3 has low ROI.

---

## Section 4: ROI Curve by Step Completion

The benefit realization curve under the proposed build order:
```
Step 1 (draft): +0 customer-facing value (infrastructure only)
Step 2 (dashboard): +low value (prettier single-catalog view for existing 1-catalog customer)
Step 3 (header): +low value (easier catalog navigation when there's only 1 catalog)
Step 4 (submit-continue): +0 value (no second catalog to chain to)
Step 5 (provisioning): +HIGH value (first multi-catalog customer, full system utility)
```

Under the **recommended reorder** (dashboard → provisioning → draft → header → submit-continue):
```
Step 2 (dashboard): +low value (validates UX with existing customer)
Step 5 (provisioning): +HIGH value EARLY
Step 1 (draft): +medium value (now visible: customer can use draft on their new plastics catalog)
Step 3 (header): +medium value (3+ catalogs now visible)
Step 4 (submit-continue): +medium value (meaningful now that multi-catalog is in use)
```

The recommended order pulls value forward by 3-4 weeks.

---

## Section 5: Infrastructure vs. Feature Cost Balance

### The draft persistence cost question
Draft persistence is a convenience feature, not a correctness feature. The current system works without drafts: customers build a container order in one session and submit it. The question is: what fraction of sessions are interrupted before submission?

**Stated assumption**: "customers feel overwhelmed by container orders" — this implies sessions may be interrupted (customer starts building, gets distracted, returns later, finds their work gone).

**Risk**: if customers typically complete orders in a single 15-minute session (the builder UX is designed for this), draft persistence may have low utilization. Building a full state machine for a feature that's rarely triggered is over-engineering.

**Recommendation**: instrument the existing single-catalog customer's session patterns before investing in draft persistence. If >20% of sessions are abandoned mid-build, draft persistence is justified. If sessions are typically completed in one go, defer draft to Phase 2 and ship Steps 2 and 5 first.

---

## Section 6: Provisioning Cost at Scale

### Current approach: manual SQL inserts
For 1 customer × 1 category, this is fine. For the realistic Phase 1 target (3-5 real customers × 3-5 categories each = 9-25 access rows), manual inserts become error-prone. Zach would need to:
1. Create `vendor_products` rows for each new category's SKUs
2. Create a `customer_catalog_access` row per customer
3. Set `slug`, `display_name`, `container_type`, `min_case_qty`, `min_fill_pct` correctly per row
4. Verify the customer can see the new catalog

A lightweight provisioning script (not a full UI — just a CLI Python script or SQL template) would dramatically reduce the per-customer-per-category provisioning cost. The plan doesn't include this, but it should.

---

## Summary Table

| Finding | Severity | Recommendation |
|---|---|---|
| Build order buries value-delivery step (provisioning) at position 5 | HIGH | Move provisioning to position 2 |
| Draft persistence value is unvalidated — may be over-engineering | MEDIUM | Instrument session data before building |
| No provisioning tooling beyond manual SQL | MEDIUM | Build a lightweight provisioning script/template as part of Step 5 |
| Test suite cost (~3-5 days) should be explicitly budgeted | MEDIUM | Not optional; treat as a line item |
| Benefit realization requires real second-catalog customer | HIGH | Prioritize onboarding one real customer on category #2 early |
