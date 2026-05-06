# Assumptions Register

## Plan: Multi-category Container Builder Expansion

---

## High-Priority Assumptions (Validate Before Building)

| # | Assumption | Risk if Wrong | How to Validate |
|---|---|---|---|
| A1 | The "container = giant commitment" fear is cognitive (complexity), not financial (capital) | Tool solves wrong problem | Ask the test customer directly: "What's the scariest part of a container order?" |
| A2 | Customers abandon sessions mid-build frequently enough to justify draft persistence | Over-engineering a rarely-used feature | Instrument existing customer session data (start vs. submit rate) |
| A3 | Single-catalog auto-resolve behavior will remain correct with new `/` dashboard routing | Regression for existing customer | Write explicit Playwright test before dashboard ships |
| A4 | One vendor = one category is a stable mapping (no vendor supplies multiple categories) | UNIQUE(customer_id, vendor_id) constraint blocks legitimate multi-product-line access rows | Fix constraint to UNIQUE(customer_id, slug) regardless |

## Medium-Priority Assumptions (Monitor During Build)

| # | Assumption | Risk if Wrong | Mitigation |
|---|---|---|---|
| A5 | Customers will use the procurement dashboard to navigate between catalogs (vs. bookmarked direct URLs) | Dashboard investment is low-utility | Track dashboard page visits vs. direct `/build?c=` hits |
| A6 | "Submit and continue" will meaningfully increase multi-category orders per session | Step 4 has low ROI | Measure % of sessions where submit-and-continue is followed |
| A7 | Per-category MOQs (foil 100, plastics 200) are stable and known before provisioning | MOQ changes require schema updates | Accept as an operational constraint; Zach owns MOQ configuration |
| A8 | The `isComplement()` foil-specific logic in `optimizeFill()` will not apply to other categories | Optimize Fill "complete_set" mode is useless or wrong for plastics/fiber | Document category-specific pairing logic before new category ships; may need per-category complement rules |

## Low-Priority Assumptions (Accept Unless Disproven)

| # | Assumption | Risk if Wrong | Mitigation |
|---|---|---|---|
| A9 | Supabase magic-link session TTL is long enough for typical ordering sessions | Session expires mid-build, customer loses work | Draft persistence (Phase C) mitigates this |
| A10 | Netlify deployment handles the new dashboard page with no config changes | Build fails on deploy | Verify in preview deploy before production push |
| A11 | The 40HC weight ceiling (26,500 kg) in `CONTAINERS` constant is correct | Wrong weight gate blocks valid orders | Zach should confirm with freight forwarding partner |
