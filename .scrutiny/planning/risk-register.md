# Risk Register

## Plan: Multi-category Container Builder Expansion

---

| ID | Risk | Probability | Impact | Severity | Mitigation |
|---|---|---|---|---|---|
| R1 | Draft state machine implemented incorrectly — orphaned drafts, wrong dashboard badges, or submitted orders with phantom active drafts | HIGH (complex state machine, not yet specified) | HIGH (customer-facing incorrect data) | CRITICAL | Specify all states and transitions in a design doc before writing code |
| R2 | UNIQUE(customer_id, vendor_id) constraint blocks legitimate future catalog topology | MEDIUM (likely when same vendor offers multiple product lines) | MEDIUM (silent provisioning failure) | HIGH | Migrate to UNIQUE(customer_id, slug) before multi-category ships |
| R3 | submit-order Server Action doesn't atomically transition draft → submitted | HIGH (draft table doesn't exist yet; easy to forget when wiring up) | MEDIUM (orphaned active drafts, confusing dashboard state) | HIGH | Add draft transition to submit-order migration task explicitly |
| R4 | Stale SKU in draft silently drops fill % with no customer warning | MEDIUM (vendor products can be deactivated at any time) | HIGH (customer submits wrong order or can't submit) | HIGH | Add stale-SKU detection on draft hydration before draft persistence ships |
| R5 | cases_per_40hc missing for new vendor products — submit gate permanently blocked | MEDIUM (data entry error during provisioning) | HIGH (customer can never submit) | HIGH | Add DB CHECK constraint: cases_per_40hc NOT NULL AND > 0 |
| R6 | Auto-resolve regression: single-catalog customer lands on dashboard instead of builder | HIGH (routing logic changes when `/` becomes the dashboard) | MEDIUM (extra click, customer confusion) | HIGH | Explicit Playwright test: single-catalog customer → redirect to builder |
| R7 | Build order prioritizes infrastructure (draft) before value delivery (provisioning) | CERTAIN (per the plan) | MEDIUM (delayed ROI, low utilization during development) | MEDIUM | Reorder: provision second catalog before building draft persistence |
| R8 | Draft write debouncing not implemented — 500+ Supabase writes per session | MEDIUM (easy to forget) | MEDIUM (Supabase rate limits, billing, degraded UX) | MEDIUM | Implement debounce (300ms) + optimistic local state from day one |
| R9 | "Last order" data missing from fetchCustomerCatalogs() — dashboard cards render incomplete | CERTAIN (query doesn't include this today) | LOW (cosmetic but promised UX) | MEDIUM | Add LEFT JOIN to customer_orders in the catalog summary query |
| R10 | Session timeout mid-build loses customer work | MEDIUM (magic-link sessions have TTL) | MEDIUM (customer frustration, rebuild effort) | MEDIUM | Draft persistence (Phase C) resolves this — but ship it before real customers hit timeout |
| R11 | Test suite covers zero multi-catalog scenarios — regressions undetected | CERTAIN (no multi-catalog tests exist) | MEDIUM (bugs discovered in production) | MEDIUM | Budget test expansion as first-class deliverable in each phase |
| R12 | Optimize Fill "complete_set" mode uses foil-specific complement logic for non-foil categories | MEDIUM (the isComplement() function is hard-coded to pan/lid/container naming patterns) | LOW (wrong suggestions, not data corruption) | LOW | Document and test per-category before new category ships |
| R13 | provisioning at scale (>10 customers × >3 catalogs) outgrows manual SQL | LOW (currently 1 customer) | MEDIUM (operational bottleneck) | LOW | Set explicit trigger: build provisioning script/tool at 5+ customers |
