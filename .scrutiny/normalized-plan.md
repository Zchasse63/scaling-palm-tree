# Normalized Plan: Multi-category Container Builder Expansion

## Plan Summary
Expand the Servous Container Builder web app from a single-category (foil/aluminum) procurement tool to a multi-category B2B procurement platform. The core architectural decision is: one container = one catalog = one cart = one submit. No mixed-category shopping carts.

## Problem Being Solved
- Customers using the Container Builder today see only one product category (Whitestone foil/aluminum, 18 SKUs).
- Manufacturers ship single-category containers (cannot mix foil and PET cups in the same 40HC).
- Customers feel overwhelmed by "container" orders, assuming it = a giant commitment.
- Goal: make multi-category procurement simple as more categories come online, without hiding the per-container fill constraint until it's punishing.

## Proposed Solution
A multi-catalog procurement dashboard where each product category has its own catalog, cart, and submit flow. The data model mirrors the physical constraint: each `customer_catalog_access` row is keyed by customer + vendor and carries container_type, MOQ, fill requirements, and a customer-facing slug. Each order is scoped to one catalog.

## Build Order (Proposed)
1. `draft_orders` table + persistence (qty map per customer-per-vendor, survives session reload)
2. Procurement dashboard at `/` for multi-catalog customers — catalog cards with last-order, active-draft status, reorder CTA
3. Header dropdown enrichment — all catalogs with status badges (current / draft pending / last order date)
4. Submit-and-continue prompt at order confirmation — chains next likely category based on order history
5. Per-category catalog provisioning — onboarding data flow for new vendor + vendor_products + access row per existing customer (category-appropriate MOQ + container_type)
6. (Deferred) `min_case_qty_override` per SKU

## Rejected Alternatives
- "One page, category tabs" — confuses submit/optimize-fill semantics
- "One cart, auto-separate at checkout" — hides per-container 100% fill rule until punitively late

## Customer Flows
- **Multi-catalog**: `/` → procurement dashboard → picks catalog → builds → submits → optionally chains
- **Single-catalog (today)**: `/` → auto-resolves to only catalog → builds → submits (unchanged)

## Deliberate Out-of-Scope
- Mixed-category shopping carts
- Cross-catalog auto-partitioning
- Per-category visual differentiation (color coding)
- Marketplace / multi-vendor shopping
- Subscription / standing orders
- Multi-user customer accounts with approval workflow

## Existing System Context

### Tech Stack
- **Framework**: Next.js 16.2.4, React 19.2.4, TypeScript strict
- **Styling**: Tailwind v4 via `@tailwindcss/postcss`, monochrome industrial-editorial design tokens
- **Backend**: Supabase Postgres 17 (project `bxoggqfqdwizimsltztq`) with `@supabase/ssr`
- **Auth**: Magic-link via Supabase Auth; `customer_user_profiles` maps auth.users → companies
- **Deploy**: Netlify with `@netlify/plugin-nextjs`
- **Testing**: 41-test Playwright e2e suite covering single-catalog flow (7 spec files); Vitest for unit tests

### Database Schema (Relevant Tables)
- `customer_catalog_access`: per-customer-per-vendor access rows; columns include `vendor_id`, `customer_id`, `slug`, `display_name`, `container_type` (40HC/40STD/20STD), `terms_label`, `currency`, `min_case_qty`, `min_fill_pct`, `is_active`. UNIQUE on `(customer_id, vendor_id)`.
- `customer_user_profiles`: maps `auth.users.id` → `companies.id`
- `customer_orders` + `customer_order_lines`: full lifecycle workflow (exists)
- `vendor_products`: carries `cases_per_40hc`, `case_weight_lb`, `pack_multiple` in metadata, `pre_palletized` flag
- `catalog_for_customer` view: joins vendor_products + costs + pricing_policies, returns computed sell prices; filtered by `vendor_id` in the loader (not the view itself)

### Architecture Patterns
- Server Components for all data fetching (admin client); Client Components for state
- `BuilderClient` owns `QtyMap = Record<string, number>` (all quantity state)
- Math model: proportional fill (`qty / cases_per_40hc`); total fill target = 1.0 (100%)
- Submit gate: requires exactly 100% volume + ≤100% weight + no below-min lines
- Optimize Fill: 3 modes (top_up / complete_set / fill_catalog)
- URL param: `?c=<slug>` carries active catalog slug
- Server Actions for mutations (submit-order, send-magic-link, sign-out)
- No API routes

### Current State
- One customer ("Servous Internal Test") with one catalog access (Whitestone foil/aluminum, slug `foil-aluminum`)
- `customer_orders` + `customer_order_lines` exist
- No `draft_orders` table yet
- No procurement dashboard (currently `/` redirects to single catalog auto-resolve)
- No multi-catalog UI tested in production

### Key Constraints to Preserve
- Submit gate: exactly 100% volume + ≤100% weight + no below-min lines
- Optimize Fill: 3 modes must continue working per-catalog
- Customer never sees vendor identity (hidden behind `display_name`)
- Per-customer-per-vendor slug for URL-friendliness

### Complexity Signals
- Schema changes: new `draft_orders` table, migration needed
- Multiple new UI surfaces: procurement dashboard, header dropdown, submit-and-continue prompt
- State machine considerations: draft lifecycle (created → modified → submitted → stale)
- Test suite must be extended: existing 41 tests are single-catalog only
- No multi-catalog scenarios in wild yet (zero real customer data to validate against)
- Provisioning workflow: new per-category onboarding flow with different MOQs per category

## Classification Signals
- Touches 5+ new/modified files
- Schema changes (new table)
- New UI surfaces (3 distinct screens/components)
- State machine complexity (draft persistence)
- Existing test coverage is single-catalog only
- Architectural decision with long-term consequences (catalog-per-container constraint)
- Zero real multi-catalog customers in production

**Complexity Class: SIGNIFICANT**
