# Servous Container Builder — Architecture Blueprint


## Patterns and Conventions Found

**From the dashboard (`/Users/zach/Desktop/Servous/dashboard/`):**
- Next.js 16.2.4, React 19.2.4, TypeScript strict, Tailwind v4 via `@tailwindcss/postcss`
- `@supabase/ssr` with `createBrowserClient` / `createServerClient` split — cookies pattern at `src/lib/supabase/server.ts:9-33`
- Admin client constructed fresh per-call with `server-only` guard — `src/lib/supabase/admin.ts:18`
- Middleware uses a `PUBLIC_PATHS` Set, redirects unauthenticated HTML to `/signin?next=`, returns 401 for API routes — `src/middleware.ts:33-69`
- Tailwind v4 tokens via `@theme {}` block in `globals.css` — no `tailwind.config.ts` needed for color tokens
- Font loading via `next/font/google` with CSS variable binding — `src/app/layout.tsx:5-21`
- `@netlify/plugin-nextjs` in `netlify.toml` with no `publish` dir, `NODE_VERSION=20`
- Vitest + Playwright, scripts: `test`, `test:watch`, `test:e2e`, `test:e2e:ui`, `typecheck`
- `export const dynamic = "force-dynamic"` required on all layouts reading live data (lesson from `dashboard/CLAUDE.md` §Past lessons #5)
- Server-only files must not be re-exported from barrels that client components import (lesson #6)

**From the design package (`/Users/zach/Desktop/Servous/_inbox/servous_calc_design/`):**
- Token system: monochrome industrial-editorial. `--ink:#0A0A0A`, `--char:#1F1F1F`, `--mid:#6E6E6E`, `--warm:#A0A0A0`, `--rule:#E8E8E8`, `--rule-strong:#D4D4D2`, `--paper:#F5F4F1`, `--paper-2:#FAF9F6`, `--white:#FFFFFF`, `--burgundy:#7C1A1A` for over-capacity only
- Fonts: Geist (sans) + Geist Mono — NOT Fraunces/Inter/JetBrains (those are the dashboard's fonts)
- All buttons, chips, section bars are border-radius:0 — deliberately squared
- `computeTotals()` is CBM-based today (`cbm / container.cbm`) — must be replaced with proportional model
- `optimizeFill()` is CBM-based greedy — must be replaced with proportional+weight-aware version
- Five app screens: Sign In, Catalogs, Builder, Order Confirmation, Order History
- Three responsive layouts: desktop (3-col grid), tablet (2-col, summary bottom drawer), mobile (deferred to Phase 2)
- Wordmark component is currently an inline SVG placeholder — replace with `<Image>` using user's PNGs
- Catalog card auto-redirects when customer has exactly one accessible catalog

**From the Supabase DB (project `bxoggqfqdwizimsltztq`):**
- Relevant tables: `companies`, `canonical_products`, `vendor_products`, `vendor_costs_current` (view), `pricing_policies`, `product_categories`, `customer_orders`, `customer_order_lines`
- `servous_sell_price(cost, vendor_id)` function applies the margin formula
- Whitestone vendor_id: `2c1c07d7-4d90-4b9d-b952-796f2c91285d`
- `vendor_products` rows carry: `cases_per_40hc`, `case_weight_lb`, `carton_length_in/width_in/height_in`, `metadata` jsonb (pack_multiple for foil rolls, pre_palletized flag, kg weight)
- `pricing_policies` row `0aa0ee00-...` = 18% target margin, vendor-scoped
- RLS is currently disabled on Servous tables — new tables for this app will use RLS enabled

---

## Architecture Decision

**Single-page catalog query with server-side RLS enforcement.** The catalog data is fetched entirely server-side in a Server Component, serialized as a typed prop, and passed to a single large Client Component (`BuilderClient`) that owns all quantity state. Mutations (submit order, send magic link) go through Server Actions. No API routes needed.

This approach is chosen over: (a) client-side fetching — would expose pricing data in network tab to unauthenticated eyeballs before the anon key can be locked down; (b) route-handler-per-action — unnecessary overhead when Server Actions exist; (c) SWR/React Query — overkill for data that doesn't change mid-session.

**Auth model:** Magic-link via Supabase Auth. A new `customer_user_profiles` table maps `auth.users.id` → `companies.id` (the customer's company row). A second new table `customer_catalog_access` maps customer `companies.id` → vendor `companies.id`. Both tables have RLS enabled. Middleware refreshes the Supabase session and redirects unauthenticated users. Zach manually provisions access: he creates the user via Supabase Admin UI, sets their email, then inserts a `customer_user_profiles` row and one or more `customer_catalog_access` rows. No self-signup.

**Math model:** Proportional fill. `fill_i = qty_i / cases_per_40hc_i`. `total_fill = sum(fill_i)`. Target = 1.000. CBM is derived for display only: `display_cbm ≈ container_cbm_m3 × total_fill`. This works for all SKU types including foil rolls that lack carton dims.

**Pricing:** Compute sell prices in SQL via a Postgres view (`catalog_for_customer`) that joins vendor_products to vendor_costs_current to pricing_policies and applies `servous_sell_price()` per row. The client receives pre-computed prices. No pricing logic in TypeScript.

**State management:** Quantity map (`Record<string, number>`) lives in React state inside `BuilderClient`. URL search params carry the active catalog slug (`?catalog=whitestone-cambodia`) so browser back-button and sharing work. Optimize state (modal open/close, projected qtys) is ephemeral React state. Order submission goes through a Server Action using `useActionState` (React 19).

---

## Database Changes

### New Table: `customer_user_profiles`

```sql
CREATE TABLE public.customer_user_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  display_name     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_user_profiles_user UNIQUE (user_id)
);

-- RLS: each user can only read their own row.
ALTER TABLE public.customer_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own profile"
  ON public.customer_user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for admin inserts.
```

### New Table: `customer_catalog_access`

```sql
CREATE TABLE public.customer_catalog_access (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  container_type   text NOT NULL DEFAULT '40HC', -- '40HC' | '40STD' | '20STD'
  terms_label      text NOT NULL DEFAULT 'DDP to your door',
  currency         text NOT NULL DEFAULT 'USD',
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_customer_catalog_access UNIQUE (customer_id, vendor_id)
);

-- RLS: a user can read access rows for their company only.
ALTER TABLE public.customer_catalog_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own catalog access"
  ON public.customer_catalog_access
  FOR SELECT
  USING (
    customer_id = (
      SELECT company_id FROM public.customer_user_profiles
      WHERE user_id = auth.uid()
    )
  );
```

### New Postgres View: `catalog_for_customer`

This view is the catalog query. It joins everything needed to render the full product table with computed sell prices. The application calls it with a `vendor_id` filter (enforced by the RLS on `customer_catalog_access` — the middleware confirms the customer has access before the query runs).

```sql
CREATE VIEW public.catalog_for_customer AS
SELECT
  vp.id                              AS vendor_product_id,
  vp.vendor_id,
  cp.id                              AS canonical_product_id,
  pc.name                            AS category_name,
  pc.sort_order                      AS category_sort,
  pc.id                              AS category_id,
  cp.name                            AS product_name,
  vp.vendor_sku,
  vp.pack_description,
  vp.pieces_per_case,
  vp.cases_per_40hc,
  vp.case_weight_lb,
  ROUND((vp.case_weight_lb * 0.453592)::numeric, 2) AS case_weight_kg,
  vp.carton_length_in,
  vp.carton_width_in,
  vp.carton_height_in,
  -- dims verified flag: true only if all three dims are non-null
  (vp.carton_length_in IS NOT NULL AND vp.carton_width_in IS NOT NULL AND vp.carton_height_in IS NOT NULL)
                                     AS dims_verified,
  COALESCE(
    ROUND(((vp.carton_length_in * vp.carton_width_in * vp.carton_height_in) * 0.0000163871)::numeric, 4),
    NULL
  )                                  AS cbm_per_case,
  -- Pack multiple for foil rolls (stored in metadata)
  (vp.metadata->>'pack_multiple')::int AS pack_multiple,
  -- Pre-palletized flag
  (vp.metadata->>'pre_palletized')::boolean AS pre_palletized,
  vcc.cost_per_case,
  servous_sell_price(vcc.cost_per_case, vp.vendor_id) AS sell_price_per_case,
  pp.target_margin_pct,
  vp.sort_order                      AS sku_sort
FROM public.vendor_products vp
JOIN public.canonical_products cp ON cp.id = vp.canonical_product_id
JOIN public.product_categories pc  ON pc.id = cp.category_id
JOIN public.vendor_costs_current vcc ON vcc.vendor_product_id = vp.id
JOIN public.pricing_policies pp ON pp.vendor_id = vp.vendor_id
WHERE vp.is_active = true
ORDER BY pc.sort_order, vp.sort_order;
```

**Note:** The view does not filter by customer — that enforcement happens in the server-side loader by first verifying `customer_catalog_access` for the authenticated user's `company_id`, then querying the view with a `vendor_id =` filter. This keeps the view simple and the RLS logic centralized in the access table.

### Container constants (seed data, not a table)

Container specs are stored as a constant in the application rather than a DB table — they are physical shipping standards that never change per customer. The three containers are:

```ts
export const CONTAINERS = {
  "40HC":  { label: "40' High Cube", cbm: 76.0, weight_max_kg: 26500 },
  "40STD": { label: "40' Standard",  cbm: 67.0, weight_max_kg: 26700 },
  "20STD": { label: "20' Standard",  cbm: 33.0, weight_max_kg: 21800 },
} as const;
```

Note: The design package's `weight_max` for 40HC was listed as 12700 kg which appears to be a data error (a 40HC payload is ~26.5 tonnes). The blueprint uses 26500 kg. Zach should confirm before go-live.

---

## Project Scaffolding

### Directory Tree

```
apps/container-builder/
├── .env.example
├── .gitignore
├── ARCHITECTURE.md             ← this file
├── README.md
├── netlify.toml
├── next.config.ts
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── public/
│   ├── brand/
│   │   ├── servous-mark.png    ← hex cube with S (for header chrome)
│   │   └── servous-banner.png  ← SERVOUS™ Foodservice Packaging (sign-in hero)
│   └── favicon.ico
├── supabase/
│   └── migrations/
│       └── 0001_container_builder_tables.sql   ← DDL above
└── src/
    ├── app/
    │   ├── layout.tsx              ← root layout, Geist fonts, globals.css
    │   ├── globals.css             ← Tailwind v4 @import + @theme design tokens
    │   ├── page.tsx                ← redirect to /catalogs
    │   ├── auth/
    │   │   └── callback/
    │   │       └── route.ts        ← Supabase magic-link exchange handler
    │   ├── signin/
    │   │   └── page.tsx            ← SignInPage, sendMagicLink server action
    │   ├── signout/
    │   │   └── route.ts            ← GET handler clears session, redirects /signin
    │   ├── catalogs/
    │   │   └── page.tsx            ← CatalogsPage — server component, fetches access list
    │   ├── build/
    │   │   └── page.tsx            ← BuilderPage — server component, fetches catalog data
    │   └── orders/
    │       └── page.tsx            ← OrdersPage — server component, fetches order history
    ├── components/
    │   ├── ui/                     ← pure presentational primitives (all server unless noted)
    │   │   ├── wordmark.tsx        ← <Image> with servous-mark.png + SERVOUS text (server)
    │   │   ├── wordmark-banner.tsx ← <Image> with servous-banner.png (server)
    │   │   ├── section-bar.tsx     ← black 44px bar, regmarks, meta slot (server)
    │   │   ├── progress-bar.tsx    ← "use client" — animated fill, ticks, over-stripe
    │   │   ├── ticker.tsx          ← "use client" — cross-fade numeric display
    │   │   ├── stepper.tsx         ← "use client" — ±/input, pack-multiple enforcement
    │   │   ├── button.tsx          ← server (static variants)
    │   │   ├── chip.tsx            ← server
    │   │   ├── status-pill.tsx     ← server
    │   │   ├── corner-marks.tsx    ← server
    │   │   └── caret.tsx           ← server
    │   ├── layout/
    │   │   ├── app-header.tsx      ← server, slot for left/center/right
    │   │   └── skeleton-table.tsx  ← "use client" shimmer skeleton
    │   ├── builder/
    │   │   ├── builder-client.tsx  ← "use client" — owns qty state, orchestrates sub-components
    │   │   ├── product-table.tsx   ← receives catalog prop, iterates categories (server)
    │   │   ├── product-row.tsx     ← "use client" — calls setQtys via prop
    │   │   ├── category-jump.tsx   ← "use client" — IntersectionObserver active-link tracking
    │   │   ├── summary-panel.tsx   ← "use client" — receives totals prop from builder-client
    │   │   └── optimize-modal.tsx  ← "use client" — modal UI + algorithm call
    │   ├── catalogs/
    │   │   ├── catalogs-page.tsx   ← server, renders catalog cards
    │   │   └── catalog-card.tsx    ← server
    │   ├── orders/
    │   │   └── orders-page.tsx     ← server, renders order table
    │   └── auth/
    │       └── sign-in-form.tsx    ← "use client" — useActionState wrapping sendMagicLink
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts           ← createBrowserClient (identical pattern to dashboard)
    │   │   ├── server.ts           ← createServerClient with cookies() (identical pattern)
    │   │   ├── admin.ts            ← service-role client, server-only guard
    │   │   └── database.types.ts   ← generated via supabase gen types
    │   ├── auth/
    │   │   └── session.ts          ← getSession(), requireSession() helpers
    │   ├── catalog/
    │   │   ├── query.ts            ← fetchCatalogForVendor(), fetchCustomerCatalogs()
    │   │   └── types.ts            ← CatalogRow, CatalogCategory, CatalogSku TypeScript types
    │   ├── orders/
    │   │   ├── query.ts            ← fetchOrdersForCustomer()
    │   │   └── types.ts            ← CustomerOrder, OrderLine types
    │   ├── math/
    │   │   ├── fill.ts             ← computeTotals(), proportional model
    │   │   └── optimize.ts         ← optimizeFill(), proportional + weight-aware
    │   └── containers.ts           ← CONTAINERS constant
    ├── actions/
    │   ├── send-magic-link.ts      ← "use server" — calls supabase.auth.signInWithOtp
    │   ├── submit-order.ts         ← "use server" — inserts customer_orders + lines
    │   └── sign-out.ts             ← "use server" — supabase.auth.signOut
    └── middleware.ts               ← Supabase session refresh + route guard
```

---

## Package.json

```json
{
  "name": "container-builder",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.105.1",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "@netlify/plugin-nextjs": "^5.15.10",
    "@playwright/test": "^1.59.1",
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.5"
  }
}
```

Exact version pinning matches the dashboard's `package.json` to avoid split-ecosystem issues when sharing the Supabase project.

---

## Config Files

### `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // No remote patterns needed — brand assets are in /public
  },
  experimental: {
    // typedRoutes: true — enable when Next.js 16 stable has this
  },
};

export default nextConfig;
```

### `postcss.config.mjs`

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `netlify.toml`

```toml
# Servous Container Builder — Netlify config
# Deploy target: containers.atyourservous.com
#
# Required env vars (Netlify Dashboard → Site settings → Environment):
#
#   Browser-safe:
#     NEXT_PUBLIC_SUPABASE_URL        = https://bxoggqfqdwizimsltztq.supabase.co
#     NEXT_PUBLIC_SUPABASE_ANON_KEY   = sb_publishable_...
#
#   Server-only:
#     SUPABASE_SERVICE_ROLE_KEY       = eyJ... (admin writes)
#
# Auth note: Supabase magic-link redirect URL must be set to
# https://containers.atyourservous.com/auth/callback in
# Supabase Dashboard → Auth → URL Configuration → Redirect URLs.
#
# In local dev, add http://localhost:3000/auth/callback to the same list.

[build]
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data: https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
```

### `.env.example`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bxoggqfqdwizimsltztq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Route Map

| Route | Type | Auth Required | Data Loaded Server-Side | Notes |
|---|---|---|---|---|
| `/` | Server | No | — | Redirect to `/catalogs` |
| `/signin` | Server | No | — | Renders sign-in form |
| `/auth/callback` | Route Handler | No | — | Exchanges magic-link code for session |
| `/signout` | Route Handler | Yes | — | Signs out, redirects `/signin` |
| `/catalogs` | Server | Yes | Customer's accessible vendor list | Auto-redirects to `/build?catalog=<slug>` if exactly one |
| `/build` | Server | Yes | Full catalog for `?catalog=<vendor_id>` | 404 if customer lacks access to requested vendor |
| `/orders` | Server | Yes | Past orders for customer's company | Phase 2 can add pagination |

**Redirect logic for `/catalogs`:** If the customer's `customer_catalog_access` has exactly one active row, the page skips the catalog-selection UI and immediately redirects to `/build?catalog=<vendor_id>`. This matches the design's "single-catalog account auto-redirects" behavior.

**URL param design for `/build`:** Uses `?catalog=<vendor_id>` (UUID, not slug) to avoid exposing vendor names in URLs (proprietary vendor names must not appear in customer-facing artifacts per CLAUDE.md). The header displays the catalog's display name from the DB.

---

## Component Tree

### TypeScript Types (`src/lib/catalog/types.ts`)

```ts
export interface ContainerSpec {
  label: string;
  cbm: number;
  weight_max_kg: number;
}

export interface CatalogSku {
  id: string;             // vendor_product_id (uuid)
  name: string;           // product_name + pack_description
  pieces_per_case: number;
  cases_per_40hc: number;
  case_weight_kg: number;
  dims_verified: boolean;
  carton_length_in: number | null;
  carton_width_in: number | null;
  carton_height_in: number | null;
  cbm_per_case: number | null;  // null for pre-palletized/combo SKUs
  pack_multiple: number | null;
  pre_palletized: boolean;
  sell_price_per_case: number;  // server-computed
}

export interface CatalogCategory {
  id: string;
  name: string;
  sort_order: number;
  skus: CatalogSku[];
}

export interface Catalog {
  vendor_id: string;
  vendor_name: string;       // display name only
  container_type: keyof typeof CONTAINERS;
  terms_label: string;
  currency: string;
  categories: CatalogCategory[];
}

export interface ContainerTotals {
  fill_pct: number;       // sum(qty_i / cases_per_40hc_i) * 100
  weight_kg: number;      // sum(qty_i * case_weight_kg_i)
  display_cbm: number;    // container.cbm * fill_pct / 100 (for display only)
  cases: number;
  lines: number;
  pallet_equivalents: number;
  subtotal: number;
}
```

### Server Components

**`src/app/build/page.tsx`** — Server Component
- Reads `?catalog` search param (vendor_id UUID)
- Calls `requireSession()` to get `{ user_id, company_id }`
- Calls `verifyCustomerCatalogAccess(company_id, vendor_id)` — returns `CatalogAccess | null`; if null, returns Next.js `notFound()`
- Calls `fetchCatalogForVendor(vendor_id)` — returns `Catalog`
- Calls `fetchOrdersForCustomer(company_id, { limit: 6 })` — returns recent orders for header badge
- Calls `fetchCustomerCatalogs(company_id)` — returns all accessible catalogs (for catalog switcher dropdown)
- Renders `<BuilderClient>` with fully-typed props: `catalog`, `allCatalogs`, `containerSpec`, `customerName`
- Applies `export const dynamic = "force-dynamic"` (reads live pricing)

**`src/app/catalogs/page.tsx`** — Server Component
- Calls `requireSession()`
- Calls `fetchCustomerCatalogs(company_id)` — returns `CatalogSummary[]`
- If `catalogs.length === 1`, redirect to `/build?catalog=${catalogs[0].vendor_id}`
- Renders `<CatalogsPage catalogs={catalogs} customerName={...} />`
- Applies `export const dynamic = "force-dynamic"`

**`src/app/orders/page.tsx`** — Server Component
- Calls `requireSession()`
- Calls `fetchOrdersForCustomer(company_id)` with full pagination
- Renders `<OrdersPage orders={...} customerName={...} />`
- Applies `export const dynamic = "force-dynamic"`

**`src/app/signin/page.tsx`** — Server Component (no auth check)
- Renders static frame + `<SignInForm>` (client)
- Uses `<WordmarkBanner>` for hero image
- If session already exists, redirect to `/catalogs`

### Client Components

**`src/components/builder/builder-client.tsx`** — "use client", the largest component
- Props: `catalog: Catalog`, `allCatalogs: CatalogSummary[]`, `containerSpec: ContainerSpec`, `customerName: string`
- State: `qtys: Record<string, number>` initialized to `{}`
- State: `showOptimize: boolean`
- State: `submitState` via `useActionState(submitOrderAction, null)`
- Derives `totals: ContainerTotals` via `computeTotals(catalog, qtys)` on every render (cheap, no useEffect needed)
- Renders: `<AppHeader>` (with catalog switcher logic), `<CategoryJump>` (conditional on cats >= 6), `<ProductTable>`, `<SummaryPanel>`, `<OptimizeModal>` (conditional)
- Passes `setQtys` down as a prop to `ProductTable` → `ProductRow`
- Catalog switching: navigates via `router.push('/build?catalog=<vendor_id>')` — the Server Component refetches

**`src/components/builder/product-row.tsx`** — "use client"
- Props: `sku: CatalogSku`, `qty: number`, `onQty: (v: number) => void`
- Renders `<Stepper>` with `packMultiple={sku.pack_multiple ?? undefined}`
- Shows pallet count sub-label when `qty >= sku.cases_per_40hc` (one full container slot)
- Shows "Est." chip when `!sku.dims_verified`
- Shows "Pre-palletized" chip and "Pack × N" chip as in design

**`src/components/builder/summary-panel.tsx`** — "use client"
- Props: `catalog: Catalog`, `containerSpec: ContainerSpec`, `totals: ContainerTotals`, `onOptimize: () => void`, `onSubmit: () => void`, `submitPending: boolean`, `submitErrored: boolean`
- Submit is enabled when `Math.abs(totals.fill_pct - 100) < 0.05 && totals.weight_kg <= containerSpec.weight_max_kg`
- Uses `<Ticker>` for animated volume percentage
- Shows burgundy error strip when `submitErrored`
- Volume display: `fill_pct.toFixed(1)%` (the proportional value). CBM shown as `display_cbm.toFixed(2) / containerSpec.cbm.toFixed(1) CBM` — labeled "approx." to signal it's derived

**`src/components/builder/optimize-modal.tsx`** — "use client"
- Props: `catalog: Catalog`, `containerSpec: ContainerSpec`, `qtys: Record<string, number>`, `onClose: () => void`, `onApply: (projected: Record<string, number>) => void`
- Runs `optimizeFill(catalog, containerSpec, qtys)` via `useMemo`
- Same diff-table UI as design

**`src/components/builder/category-jump.tsx`** — "use client"
- Uses `IntersectionObserver` to track which `section#cat-<id>` is currently in view, updating the active link
- Only rendered when `catalog.categories.length >= 6`

**`src/components/auth/sign-in-form.tsx`** — "use client"
- Uses `useActionState(sendMagicLinkAction, null)` 
- Two states: email-input form / "check your inbox" confirmation

**`src/components/ui/stepper.tsx`** — "use client"
- Exact port of design's `Stepper` component
- `packMultiple` enforcement: on blur, rounds to nearest multiple and shows 2-second tooltip

**`src/components/ui/progress-bar.tsx`** — "use client"
- Exact port of design's `ProgressBar`
- Burgundy diagonal-stripe overflow indicator

**`src/components/ui/ticker.tsx`** — "use client"
- Cross-fade animation on value change

### Pure Server Components (no interactivity)

- `wordmark.tsx` — Next.js `<Image src="/brand/servous-mark.png">` + "SERVOUS" text in Geist 600 weight, `letter-spacing: 0.18em`
- `wordmark-banner.tsx` — Next.js `<Image src="/brand/servous-banner.png">` for sign-in hero
- `section-bar.tsx` — 44px black bar with slot for title, count, meta
- `button.tsx` — static className switcher, no onClick (passed as prop)
- `chip.tsx`, `status-pill.tsx`, `corner-marks.tsx`, `caret.tsx` — direct ports

---

## Data Flow

### Sign-In Flow
```
User loads /signin
  → Server Component renders static page + <SignInForm> (client)
  → User types email, clicks "Send magic link"
  → useActionState fires sendMagicLinkAction("email@co.com")
  → sendMagicLinkAction: supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: "https://containers.atyourservous.com/auth/callback" }})
  → Supabase sends email; action returns { sent: true }
  → SignInForm renders "check your inbox" state
  → User clicks link in email → /auth/callback?code=...
  → /auth/callback route handler: supabase.auth.exchangeCodeForSession(code)
  → redirect("/catalogs")
```

### Catalog Load Flow
```
/catalogs (Server Component)
  → requireSession() → { user_id, company_id }
  → fetchCustomerCatalogs(company_id):
      SELECT cca.vendor_id, c.name AS vendor_name, cca.container_type,
             cca.terms_label, cca.currency,
             COUNT(vp.id) AS sku_count,
             (SELECT json_agg(DISTINCT pc.name) FROM vendor_products vp2
              JOIN canonical_products cp2 ON cp2.id = vp2.canonical_product_id
              JOIN product_categories pc ON pc.id = cp2.category_id
              WHERE vp2.vendor_id = cca.vendor_id AND vp2.is_active = true) AS category_names
      FROM customer_catalog_access cca
      JOIN companies c ON c.id = cca.vendor_id
      WHERE cca.customer_id = $company_id AND cca.is_active = true
  → if length === 1: redirect(`/build?catalog=${catalogs[0].vendor_id}`)
  → else: render <CatalogsPage>
```

### Builder Load Flow
```
/build?catalog=<vendor_id> (Server Component)
  → requireSession() → { user_id, company_id }
  → verifyCustomerCatalogAccess(company_id, vendor_id) → access row or notFound()
  → fetchCatalogForVendor(vendor_id):
      SELECT * FROM catalog_for_customer WHERE vendor_id = $vendor_id
      ORDER BY category_sort, sku_sort
    Assembled into Catalog { categories: [...] } with CatalogSku[] per category
  → fetchCustomerCatalogs(company_id) → for catalog switcher
  → fetchCustomerDisplayName(company_id) → company name for header
  → render <BuilderClient catalog={...} allCatalogs={...} containerSpec={CONTAINERS[access.container_type]} customerName={...} />
```

### Order Submit Flow
```
User clicks "Submit Container Order" (BuilderClient)
  → form.action = submitOrderAction (Server Action)
  → submitOrderAction receives: FormData containing JSON.stringify(qtys) + catalog vendor_id
  → Server Action:
      1. requireSession() → { user_id, company_id }
      2. verifyCustomerCatalogAccess(company_id, vendor_id) — re-verify server-side
      3. Fetch current sell prices from catalog_for_customer for all vendor_product_ids in qtys
         (never trust client-sent prices)
      4. Validate totals server-side: fill_pct must be 95–105% (5% tolerance for floating point)
      5. INSERT INTO customer_orders (customer_id, vendor_id, container_type, status, submitted_at)
         VALUES ($company_id, $vendor_id, $container_type, 'submitted', now())
         RETURNING id
      6. INSERT INTO customer_order_lines (order_id, vendor_product_id, qty_cases, unit_price)
         ... (one row per SKU with qty > 0)
      7. Return { success: true, order_id: "SVS-XXXXXX", ... }
  → BuilderClient's useActionState receives result
  → If success: render OrderConfirmation view inline (no route change needed)
  → If error: show burgundy error strip in SummaryPanel
```

The order ID format `SVS-XXXXXX` should be generated as a formatted sequence: store `customer_orders` with an auto-increment integer, then display as `SVS-` + zero-padded 6-digit number. Add a `order_display_id` generated column or compute it on read.

---

## Math Model — Proportional Fill

### `src/lib/math/fill.ts`

```ts
import type { Catalog, ContainerSpec, ContainerTotals } from "@/lib/catalog/types";

export function computeTotals(
  catalog: Catalog,
  containerSpec: ContainerSpec,
  qtys: Record<string, number>,
): ContainerTotals {
  let fill = 0;
  let weight_kg = 0;
  let cases = 0;
  let subtotal = 0;
  let pallet_equivalents = 0;
  let lines = 0;

  for (const cat of catalog.categories) {
    for (const sku of cat.skus) {
      const q = qtys[sku.id] ?? 0;
      if (q > 0) lines++;
      cases += q;
      // Proportional fill: each case contributes 1/cases_per_40hc of the container
      fill += q / sku.cases_per_40hc;
      weight_kg += q * sku.case_weight_kg;
      subtotal += q * sku.sell_price_per_case;
      pallet_equivalents += q / sku.cases_per_40hc;  // pallets ≈ fill fraction × 1 container
    }
  }

  const fill_pct = fill * 100;
  const display_cbm = containerSpec.cbm * fill;  // approximate only

  return { fill_pct, weight_kg, display_cbm, cases, lines, pallet_equivalents, subtotal };
}
```

Key: `fill_pct` is the canonical utilization metric throughout the UI. `display_cbm` is labeled "approx." in the UI to make clear it is derived from the proportional calculation, not measured from carton dims.

Submit threshold: `Math.abs(fill_pct - 100) < 0.5` (0.5% tolerance replaces the design's 0.05, because proportional arithmetic is less precise than CBM arithmetic and foil-roll rounding at 200-unit increments can leave small gaps).

---

## Optimize Fill Algorithm

### `src/lib/math/optimize.ts`

**Pseudocode:**

```
function optimizeFill(catalog, containerSpec, qtys):
  totals = computeTotals(catalog, containerSpec, qtys)
  remaining_fill = 1.0 - (totals.fill_pct / 100)
  remaining_weight = containerSpec.weight_max_kg - totals.weight_kg

  if remaining_fill <= 0: return { suggestions: {}, projected: qtys, deltaSubtotal: 0 }

  // Build candidate list of all SKUs
  candidates = all skus from catalog.categories (flattened)

  // Sort by fill_per_case ascending (smallest fill contribution first = finest granularity)
  // fill_per_case = 1 / cases_per_40hc
  candidates.sort by (1 / cases_per_40hc) ascending

  suggestions = {}

  for sku in candidates:
    if remaining_fill <= epsilon (0.001): break

    step = sku.pack_multiple ?? 1
    fill_per_step = step / sku.cases_per_40hc
    weight_per_step = step * sku.case_weight_kg

    if fill_per_step <= 0: continue

    // How many steps fit by volume?
    steps_by_volume = floor(remaining_fill / fill_per_step)
    // How many steps fit by weight?
    steps_by_weight = floor(remaining_weight / weight_per_step) if weight_per_step > 0 else Infinity

    steps = min(steps_by_volume, steps_by_weight)
    if steps < 1: continue

    add_cases = steps * step
    suggestions[sku.id] = (suggestions[sku.id] ?? 0) + add_cases
    remaining_fill -= add_cases / sku.cases_per_40hc
    remaining_weight -= add_cases * sku.case_weight_kg

  // Fine-tune: if remaining_fill > epsilon and no pack_multiple constraint on smallest sku
  fine_sku = candidates.find(s => !s.pack_multiple)  // smallest fill_per_case without step constraint
  if fine_sku and remaining_fill > 0.001:
    extra = ceil(remaining_fill * fine_sku.cases_per_40hc)
    // Clamp by weight
    extra = min(extra, floor(remaining_weight / fine_sku.case_weight_kg))
    if extra > 0:
      suggestions[fine_sku.id] = (suggestions[fine_sku.id] ?? 0) + extra

  // Build projected qtys
  projected = { ...qtys }
  for [id, add] of Object.entries(suggestions):
    projected[id] = (projected[id] ?? 0) + add

  deltaSubtotal = sum over all skus: (projected[id] - qtys[id]) * sku.sell_price_per_case

  return { suggestions, projected, deltaSubtotal }
```

**Edge cases:**

- **Foil rolls hit weight before volume.** Heavy-gauge 18" rolls at 22.6 kg/case on a 40HC (weight_max 26500 kg) can pack ~1172 cases by weight but ~1000 cases by volume. The algorithm's `steps_by_weight` check handles this — it will stop adding roll cases and pivot to lighter SKUs (lids, pop-ups).
- **All SKUs have pack_multiple.** The fine-tune step `find(s => !s.pack_multiple)` returns null. The remaining gap (< one step) stays unfilled and the submit threshold of 0.5% tolerates it.
- **Customer has only pre-palletized foil rolls.** The algorithm rounds every suggestion to `pack_multiple` (200, 100, or 300), and the fill may not reach 100% precisely. The 0.5% threshold handles this. Document in the UI: "Quantities rounded to pallet increments. Container may not reach exact 100%."
- **Catalog has no SKUs with qty > 0.** `remaining_fill = 1.0`. The algorithm suggests filling the entire container from scratch. This is correct — show the modal with all suggestions highlighted.

---

## Auth Flow and Middleware

### `src/middleware.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/signin", "/auth/callback"]);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)" ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through Next internals and brand assets
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refreshes expired session tokens automatically
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const signinUrl = new URL("/signin", req.url);
    if (pathname !== "/signin") {
      signinUrl.searchParams.set("next", pathname + req.nextUrl.search);
    }
    return NextResponse.redirect(signinUrl);
  }

  return response;
}
```

### `src/lib/auth/session.ts`

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export interface Session {
  user_id: string;
  email: string;
  company_id: string;
  company_name: string;
}

export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/signin");
  }

  // Look up company_id from customer_user_profiles
  const { data: profile } = await adminClient()
    .from("customer_user_profiles")
    .select("company_id, companies(name)")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    // User exists in auth.users but has no profile — provisioning error
    redirect("/signin?error=no_profile");
  }

  return {
    user_id: user.id,
    email: user.email!,
    company_id: profile.company_id,
    company_name: (profile.companies as { name: string }).name,
  };
}
```

The `requireSession` function uses the admin client to read `customer_user_profiles` because RLS on that table is scoped to `auth.uid() = user_id`. The server client (anon key) would also work since the policy allows the user to read their own row, but using admin client avoids the complexity of ensuring the session cookie is forwarded correctly in every Server Action context.

---

## Server Actions

### `src/actions/send-magic-link.ts`

```ts
"use server";
import { createClient } from "@/lib/supabase/server";

type MagicLinkState = { sent: boolean; error?: string } | null;

export async function sendMagicLinkAction(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = (formData.get("email") as string | null)?.trim();
  if (!email || !email.includes("@")) {
    return { sent: false, error: "Enter a valid work email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      shouldCreateUser: false,  // no self-signup; Zach must pre-provision users
    },
  });

  if (error) {
    // Don't expose error details. Generic message.
    return { sent: false, error: "Could not send magic link. Contact your Servous representative." };
  }

  return { sent: true };
}
```

`shouldCreateUser: false` is the key decision. Supabase will still return success even if the email doesn't exist (to prevent user enumeration), but no session will be created. This enforces the "Zach manually invites" model.

### `src/actions/submit-order.ts`

```ts
"use server";
import "server-only";
import { requireSession } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
import { computeTotals } from "@/lib/math/fill";
import { CONTAINERS } from "@/lib/containers";

type OrderState = {
  success: boolean;
  order_id?: string;
  error?: string;
  totals?: { fill_pct: number; weight_kg: number; subtotal: number; cases: number; lines: number };
} | null;

export async function submitOrderAction(
  _prev: OrderState,
  formData: FormData,
): Promise<OrderState> {
  const session = await requireSession();
  const vendor_id = formData.get("vendor_id") as string;
  const qtys_json = formData.get("qtys") as string;

  let qtys: Record<string, number>;
  try {
    qtys = JSON.parse(qtys_json);
  } catch {
    return { success: false, error: "Invalid order data." };
  }

  const admin = adminClient();

  // Re-verify access server-side
  const { data: access } = await admin
    .from("customer_catalog_access")
    .select("container_type")
    .eq("customer_id", session.company_id)
    .eq("vendor_id", vendor_id)
    .eq("is_active", true)
    .single();

  if (!access) return { success: false, error: "Catalog access denied." };

  // Fetch current server-side prices (never trust client)
  const { data: skuRows } = await admin
    .from("catalog_for_customer")
    .select("vendor_product_id, cases_per_40hc, case_weight_kg, sell_price_per_case")
    .eq("vendor_id", vendor_id);

  if (!skuRows) return { success: false, error: "Catalog data unavailable." };

  // Build a minimal Catalog shape for computeTotals
  const skuMap = Object.fromEntries(skuRows.map((r) => [r.vendor_product_id, r]));
  const activeQtys = Object.fromEntries(
    Object.entries(qtys).filter(([id, q]) => q > 0 && skuMap[id])
  );

  // Compute totals with server-authoritative prices
  let fill = 0, weight_kg = 0, subtotal = 0, cases = 0, lines = 0;
  for (const [id, qty] of Object.entries(activeQtys)) {
    const sku = skuMap[id];
    fill += qty / sku.cases_per_40hc;
    weight_kg += qty * sku.case_weight_kg;
    subtotal += qty * sku.sell_price_per_case;
    cases += qty;
    lines++;
  }
  const fill_pct = fill * 100;

  // Validate
  if (Math.abs(fill_pct - 100) > 5) {
    return { success: false, error: `Container fill is ${fill_pct.toFixed(1)}%. Must be 95–105%.` };
  }
  const container = CONTAINERS[access.container_type as keyof typeof CONTAINERS];
  if (weight_kg > container.weight_max_kg) {
    return { success: false, error: `Order exceeds weight limit (${Math.round(weight_kg)} kg > ${container.weight_max_kg} kg).` };
  }

  // Insert order
  const { data: order, error: orderErr } = await admin
    .from("customer_orders")
    .insert({
      customer_id: session.company_id,
      vendor_id,
      container_type: access.container_type,
      status: "submitted",
      total_cases: cases,
      total_amount: subtotal,
      submitted_at: new Date().toISOString(),
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return { success: false, error: "Order submission failed. Please retry." };
  }

  // Insert lines
  const lines_data = Object.entries(activeQtys).map(([id, qty]) => ({
    order_id: order.id,
    vendor_product_id: id,
    qty_cases: qty,
    unit_price: skuMap[id].sell_price_per_case,
    line_total: qty * skuMap[id].sell_price_per_case,
  }));

  await admin.from("customer_order_lines").insert(lines_data);

  return {
    success: true,
    order_id: `SVS-${String(order.order_number).padStart(6, "0")}`,
    totals: { fill_pct, weight_kg, subtotal, cases, lines },
  };
}
```

### `src/app/auth/callback/route.ts`

```ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/catalogs";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, req.url));
}
```

---

## Logo and Brand Asset Plan

**Files to copy:**
- `/Users/zach/Desktop/Servous/_inbox/servous_calc_design/uploads/Servous Logo.png` → `/public/brand/servous-mark.png`
- `/Users/zach/Desktop/Servous/_inbox/servous_calc_design/uploads/Servous Banner.png` → `/public/brand/servous-banner.png`

**Usage:**

`servous-mark.png` (hex/cube mark with stylized S):
- `<AppHeader>` left slot — height 28px, auto width
- Sign-in page — centered above the sign-in card, height 40px

`servous-banner.png` (SERVOUS™ Foodservice Packaging, black background):
- Sign-in page hero — full-width banner above the card, `max-width: 420px`, decorative only
- The banner has a dark background; the rest of the sign-in page is `--paper` (#F5F4F1). Set banner with slight rounding or leave flush.

**`src/components/ui/wordmark.tsx`:**
```tsx
import Image from "next/image";

export function Wordmark({ height = 28 }: { height?: number }) {
  const width = Math.round(height * 1.0);  // square mark
  return (
    <Image
      src="/brand/servous-mark.png"
      alt="Servous"
      width={width}
      height={height}
      priority
    />
  );
}
```

The design's inline SVG wordmark (hexagon outline + "SERVOUS" text) is replaced entirely by the real PNG mark. The text "SERVOUS" can appear next to it in the header as a `<span>` if desired, but since the banner PNG already includes the full wordmark, use `servous-mark.png` (mark only) in the header chrome.

**Font loading (`src/app/layout.tsx`):**
```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});
```

**`src/app/globals.css` — design token block:**
```css
@import "tailwindcss";

@theme {
  /* Builder design tokens — industrial-editorial monochrome */
  --color-ink:          #0A0A0A;
  --color-char:         #1F1F1F;
  --color-mid:          #6E6E6E;
  --color-warm:         #A0A0A0;
  --color-rule:         #E8E8E8;
  --color-rule-strong:  #D4D4D2;
  --color-paper:        #F5F4F1;
  --color-paper-2:      #FAF9F6;
  --color-hover:        #FAFAFA;
  --color-press:        #EFEEEB;
  --color-burgundy:     #7C1A1A;
  --color-burgundy-bg:  #F4E5E5;
  --color-white:        #FFFFFF;

  --font-sans: var(--font-geist), "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace;

  --tracking-caps: 0.12em;
}

/* CSS utility classes from design package — kept in CSS not Tailwind */
.t-eyebrow { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-mid); font-weight: 500; }
.t-micro   { font-size: 11px; color: var(--color-mid); }
.t-cap     { font-size: 12px; color: var(--color-mid); }
.t-body    { font-size: 14px; color: var(--color-ink); }
.t-sub     { font-size: 16px; font-weight: 500; color: var(--color-ink); }
.t-h2      { font-size: 22px; font-weight: 500; color: var(--color-ink); letter-spacing: -0.005em; }
.t-h1      { font-size: 28px; font-weight: 500; color: var(--color-ink); letter-spacing: -0.01em; }
.t-stat    { font-family: var(--font-mono); font-size: 56px; font-weight: 400; color: var(--color-ink); letter-spacing: -0.02em; line-height: 1; }
.t-stat-md { font-family: var(--font-mono); font-size: 28px; font-weight: 500; color: var(--color-ink); letter-spacing: -0.01em; }
.mono      { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.caps      { text-transform: uppercase; letter-spacing: var(--tracking-caps); }
.paper-bg  { background-color: var(--color-paper); }
.row-hover:hover { background: var(--color-hover); }
.regmark   { font-family: var(--font-mono); font-weight: 300; color: var(--color-warm); font-size: 14px; line-height: 1; user-select: none; }
```

The CSS utility classes from the design package's `tokens.css` are kept as plain CSS utility classes rather than being expressed as Tailwind utilities. This avoids a large Tailwind theme extension and keeps 1:1 fidelity with the design.

---

## Migration from Design JSX to Next.js Files

| Design file | Target Next.js file(s) | Notes |
|---|---|---|
| `styles/tokens.css` | `src/app/globals.css` | @theme block + CSS utilities |
| `data.js` | DB via `catalog_for_customer` view + `src/lib/containers.ts` | No static data in app |
| `components/ui.jsx` — Ticker | `src/components/ui/ticker.tsx` | "use client" |
| `components/ui.jsx` — SectionBar | `src/components/ui/section-bar.tsx` | Server |
| `components/ui.jsx` — Stepper | `src/components/ui/stepper.tsx` | "use client" |
| `components/ui.jsx` — ProgressBar | `src/components/ui/progress-bar.tsx` | "use client" |
| `components/ui.jsx` — Chip | `src/components/ui/chip.tsx` | Server |
| `components/ui.jsx` — Wordmark | `src/components/ui/wordmark.tsx` | Replace SVG with `<Image>` |
| `components/ui.jsx` — Button | `src/components/ui/button.tsx` | Server (onClick via prop) |
| `components/ui.jsx` — StatusPill | `src/components/ui/status-pill.tsx` | Server |
| `components/ui.jsx` — CornerMarks | `src/components/ui/corner-marks.tsx` | Server |
| `components/ui.jsx` — Caret | `src/components/ui/caret.tsx` | Server |
| `components/ui.jsx` — fmtMoney, fmtInt | `src/lib/math/fmt.ts` | Pure functions |
| `components/builder-header.jsx` | `src/components/builder/builder-client.tsx` (header inline) | Header owns catalog switcher state |
| `components/product-table.jsx` — ProductTable | `src/components/builder/product-table.tsx` | Server wrapper |
| `components/product-table.jsx` — ProductRow | `src/components/builder/product-row.tsx` | "use client" |
| `components/product-table.jsx` — CategoryJump | `src/components/builder/category-jump.tsx` | "use client" + IntersectionObserver |
| `components/summary-panel.jsx` — SummaryPanel | `src/components/builder/summary-panel.tsx` | "use client" |
| `components/summary-panel.jsx` — computeTotals | `src/lib/math/fill.ts` | Rewritten to proportional model |
| `components/optimize-modal.jsx` — OptimizeModal | `src/components/builder/optimize-modal.tsx` | "use client" |
| `components/optimize-modal.jsx` — optimizeFill | `src/lib/math/optimize.ts` | Rewritten to proportional+weight |
| `components/builder-page.jsx` — BuilderPage | `src/components/builder/builder-client.tsx` | "use client", owns qty state |
| `components/builder-page.jsx` — OrderConfirmation | Inline within `builder-client.tsx` state machine | Shown after successful submitOrderAction |
| `components/builder-page.jsx` — SkeletonTable | `src/components/layout/skeleton-table.tsx` | "use client" shimmer |
| `components/aux-pages.jsx` — SignInPage | `src/app/signin/page.tsx` + `src/components/auth/sign-in-form.tsx` | Split server/client |
| `components/aux-pages.jsx` — CatalogsPage | `src/app/catalogs/page.tsx` + `src/components/catalogs/catalogs-page.tsx` | Server |
| `components/aux-pages.jsx` — CatalogCard | `src/components/catalogs/catalog-card.tsx` | Server |
| `components/aux-pages.jsx` — OrdersPage | `src/app/orders/page.tsx` + `src/components/orders/orders-page.tsx` | Server |
| `app.jsx` — App | Eliminated — replaced by App Router routing | |
| Tablet drawer layout | `src/components/builder/builder-client.tsx` (media query branch) | Phase 1 |
| `components/design-system.jsx` | Not ported — reference-only during development | |
| `tweaks-panel.jsx`, `design-canvas.jsx` | Not ported — prototype tooling only | |

---

## Test Plan

### Vitest Unit Tests

File: `src/tests/unit/math.test.ts`

1. `computeTotals` with zero qtys returns all zeros and fill_pct = 0
2. `computeTotals` with one SKU at exactly `cases_per_40hc` returns fill_pct = 100
3. `computeTotals` with two SKUs each at half capacity returns fill_pct = 100
4. `computeTotals` over-capacity returns fill_pct > 100
5. `optimizeFill` on an empty container suggests filling to ~100%
6. `optimizeFill` on a half-full container returns suggestions summing to ~remaining fill
7. `optimizeFill` respects `pack_multiple` — all suggestions for a SKU with pack_multiple=200 are divisible by 200
8. `optimizeFill` weight constraint: does not suggest cases that would push weight over `weight_max_kg`
9. `optimizeFill` fine-tune: when remaining < one step of all constrained SKUs, still fills to within 0.5%
10. `computeTotals` `display_cbm` is proportional to fill (container.cbm * fill)

File: `src/tests/unit/stepper.test.ts`

1. Stepper calls `onChange` with value rounded to nearest packMultiple on blur
2. Stepper shows tooltip when rounding occurs
3. Stepper clamps to 0 on negative input
4. Arrow-up increments by step; shift+arrow-up increments by packMultiple if set

### Playwright E2E Tests

File: `src/tests/e2e/auth.spec.ts`

1. Unauthenticated GET to `/catalogs` redirects to `/signin?next=/catalogs`
2. Unauthenticated GET to `/build?catalog=<uuid>` redirects to `/signin`
3. Sign-in form: empty email shows validation error; valid email shows "check your inbox" state
4. `/auth/callback` with invalid code redirects to `/signin`

File: `src/tests/e2e/builder.spec.ts` (requires test user pre-provisioned)

1. After auth: `/catalogs` shows catalog cards for test user's access
2. Selecting a catalog navigates to `/build?catalog=<vendor_id>`
3. Builder loads with all categories and SKUs from DB
4. Incrementing a SKU's qty updates Volume fill % in SummaryPanel
5. Volume fill % is proportional (not CBM-based) — assert via known `cases_per_40hc`
6. "Optimize Fill" button disabled when fill = 0; enabled when fill > 0 and < 100
7. Optimize modal shows suggestions; clicking "Apply" updates qtys and closes modal
8. Submit button disabled when fill < 99.5% or > 100.5%
9. Submit button enabled at exactly 100% fill (after optimize)
10. Submit order: successful submission shows OrderConfirmation with SVS-XXXXXX ID
11. "View Past Orders" link from confirmation navigates to `/orders`
12. Orders page shows submitted order in table with status "submitted"

---

## Deployment

### Netlify Site Setup

1. Create new site at Netlify: link to the `apps/container-builder/` subdirectory of the monorepo (or a separate Git repo — see note below)
2. Set base directory: `apps/container-builder`
3. Build command: `npm run build`
4. Set env vars in Netlify Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://bxoggqfqdwizimsltztq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = service role key
   - `NEXT_PUBLIC_SITE_URL` = `https://containers.atyourservous.com`
5. Custom domain: add `containers.atyourservous.com` in Netlify → Domain settings; add CNAME to DNS

### Supabase Auth URL Configuration

In Supabase Dashboard → Auth → URL Configuration:
- **Site URL:** `https://containers.atyourservous.com`
- **Redirect URLs:** Add both:
  - `https://containers.atyourservous.com/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev)

### Monorepo Note

The `Servous/` workspace is not yet a monorepo with shared tooling. The simplest path: keep `apps/container-builder/` as a fully self-contained Next.js app with its own `package.json` and `node_modules`. Netlify's base directory setting handles the build scoping. If you add a third app later, evaluate a Turborepo or pnpm workspace setup — premature for now.

---

## Implementation Phases

### Phase 1 — Foundation + Auth (MVP blocker)

- [ ] Create directory `apps/container-builder/`
- [ ] Copy logo assets to `public/brand/`
- [ ] Initialize `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `netlify.toml`, `.env.example`, `.gitignore`
- [ ] Write `src/app/globals.css` with design tokens
- [ ] Write `src/app/layout.tsx` with Geist font loading
- [ ] Write `src/lib/supabase/client.ts`, `server.ts`, `admin.ts` (mirror dashboard pattern)
- [ ] Write `src/middleware.ts` with Supabase session refresh + redirect
- [ ] Write `src/lib/auth/session.ts` — `requireSession()`
- [ ] Write `src/app/auth/callback/route.ts`
- [ ] Write `src/app/signin/page.tsx` + `src/components/auth/sign-in-form.tsx`
- [ ] Write `src/actions/send-magic-link.ts`
- [ ] Run `supabase/migrations/0001_container_builder_tables.sql` against Supabase project
- [ ] Provision test customer user manually (Supabase Admin → Auth → Users → Invite user)
- [ ] Insert `customer_user_profiles` row for test user
- [ ] Insert `customer_catalog_access` row linking test user → Whitestone vendor

### Phase 2 — Catalog Query + Catalogs Page

- [ ] Write `CREATE VIEW catalog_for_customer` migration (run against Supabase)
- [ ] Write `src/lib/catalog/types.ts`
- [ ] Write `src/lib/containers.ts`
- [ ] Write `src/lib/catalog/query.ts` — `fetchCustomerCatalogs()`, `fetchCatalogForVendor()`, `verifyCustomerCatalogAccess()`
- [ ] Write `src/components/catalogs/catalog-card.tsx`, `catalogs-page.tsx`
- [ ] Write `src/app/catalogs/page.tsx`
- [ ] Verify: authenticated user sees Whitestone catalog card; unauthenticated redirected to /signin

### Phase 3 — UI Primitives

- [ ] Port all primitives from design `components/ui.jsx`:
  - `ticker.tsx`, `section-bar.tsx`, `stepper.tsx`, `progress-bar.tsx`, `button.tsx`, `chip.tsx`, `status-pill.tsx`, `corner-marks.tsx`, `caret.tsx`
- [ ] Write `wordmark.tsx` using `<Image src="/brand/servous-mark.png">`
- [ ] Write `skeleton-table.tsx`
- [ ] Vitest unit tests for `stepper.tsx` behavior

### Phase 4 — Math Layer

- [ ] Write `src/lib/math/fmt.ts` — `fmtMoney`, `fmtInt`, `fmt1`
- [ ] Write `src/lib/math/fill.ts` — `computeTotals()` proportional model
- [ ] Write `src/lib/math/optimize.ts` — `optimizeFill()` proportional+weight-aware
- [ ] Vitest unit tests covering all edge cases documented above

### Phase 5 — Builder Components

- [ ] Write `src/components/builder/product-row.tsx`
- [ ] Write `src/components/builder/product-table.tsx`
- [ ] Write `src/components/builder/category-jump.tsx`
- [ ] Write `src/components/builder/summary-panel.tsx`
- [ ] Write `src/components/builder/optimize-modal.tsx`
- [ ] Write `src/components/builder/builder-client.tsx` — wires everything together
- [ ] Write `src/app/build/page.tsx` — server component fetching catalog + rendering BuilderClient

### Phase 6 — Order Submission

- [ ] Confirm `customer_orders` and `customer_order_lines` schema meets requirements (check existing columns; may need `order_number` sequence column and `submitted_at` timestamp)
- [ ] Write `src/actions/submit-order.ts`
- [ ] Wire `useActionState(submitOrderAction)` into `builder-client.tsx`
- [ ] Render `OrderConfirmation` component on `success: true` state
- [ ] Write `src/actions/sign-out.ts`
- [ ] Add sign-out menu item to header account dropdown

### Phase 7 — Order History

- [ ] Write `src/lib/orders/query.ts` — `fetchOrdersForCustomer()`
- [ ] Write `src/components/orders/orders-page.tsx`
- [ ] Write `src/app/orders/page.tsx`
- [ ] Link "View Past Orders" from OrderConfirmation

### Phase 8 — Testing + Deploy

- [ ] Run all Vitest unit tests; fix failures
- [ ] Write and run Playwright E2E tests (auth flow + builder flow + order submission)
- [ ] `npm run build` — fix any TypeScript or build errors
- [ ] Deploy to Netlify preview URL; smoke-test end-to-end
- [ ] Add custom domain `containers.atyourservous.com` and verify SSL

### Phase 2 Deferrals

- Mobile layout (single-column, bottom sheet for summary) — tablet (1024px) layout ships in Phase 1; mobile below 768px is deferred
- Customer-facing order detail page (`/orders/<id>`) — shows line-item breakdown of a past order
- Order CSV export button in `/orders`
- Email notification to Zach when an order is submitted (can be a Supabase trigger → pg_net POST to a webhook or email service)
- Multi-company admin view — if a single user manages multiple companies
- Pricing override per-customer-per-SKU — currently all customers see the vendor-level policy price
- Container type selector in builder UI — currently container type is fixed by `customer_catalog_access.container_type`; could allow the customer to choose 40HC vs 40STD

---

## Open Questions (Genuine Decisions)

**1. Anon key access to `catalog_for_customer` view.**
The view joins `pricing_policies` which contains target margin percentages. With RLS disabled on most tables, a motivated customer with the anon key and knowledge of the view name could query it directly from the browser and see other vendors' catalogs. Recommendation: enable RLS on `vendor_products` scoped to the customer's `customer_catalog_access` rows. This is the cleanest fix. Alternatively, re-point all catalog queries through the service-role key (already done via `adminClient` in the server layer — the anon key never queries the view directly in this architecture). Confirm: the blueprint already routes all catalog queries through `adminClient` in `src/lib/catalog/query.ts`, so the anon key never touches the view. The risk is zero if that pattern is followed.

**2. `customer_orders.order_number` sequence.**
The display ID `SVS-XXXXXX` requires a monotonically increasing number. The simplest approach: add a `BIGSERIAL` column `order_number` to `customer_orders` with a Postgres sequence starting at 2000 (to make SVS-002000 the first). Alternatively, use the existing `id` UUID truncated to an integer (non-sequential, ugly). Decision: use a BIGSERIAL starting at 2419 (one above the highest shown in the design's mock data `SVS-002418`).

**3. 40HC weight_max_kg.**
The design package's `data.js` lists `weight_max: 12700` for the 40HC, which appears to be an error (40HC structural limit is ~30,800 kg, commercial payload typically ~26,500 kg). Blueprint uses 26500 kg as the default in `CONTAINERS`. Zach should confirm the actual contractual payload limit with the manufacturer/freight forwarder before go-live — some 40HC contracts cap at 20000 kg for road weight restrictions.

**4. `shouldCreateUser: false` on magic-link.**
Supabase's `signInWithOtp` with `shouldCreateUser: false` silently accepts the request even for unknown emails (to prevent enumeration). This means a non-provisioned email gets a magic link email that silently does nothing when clicked. Consider: add a pre-check against `auth.users` (admin lookup) before calling `signInWithOtp`, and return a specific error if not found — but this reveals whether an email is registered. The current design errs toward security (don't reveal). Confirm this is acceptable UX.

**5. Whitestone vendor display name.**
The database has `companies` rows for vendors; the `is_proprietary` flag determines whether the vendor name appears in customer-facing artifacts. Whitestone/Cambodia: confirm whether "Whitestone" is the display name to show customers, or whether this should be a sanitized label like "Aluminum Foil & Containers Catalog." The blueprint uses whatever is in `companies.name` for the vendor row — update that name in the DB to control what customers see.

**6. Serving the container builder and the dashboard on different subdomains of `atyourservous.com`.**
The dashboard is at `servous-dashboard.netlify.app`. If it moves to `dashboard.atyourservous.com`, the Supabase auth redirect URLs and CORS settings need updating. The container builder at `containers.atyourservous.com` shares the same Supabase project but different auth sessions. Confirm: both apps use the same `auth.users` table. A Whitestone customer who also happens to be a dashboard user would have one `auth.users` entry but separate app contexts. This is fine — no conflict.

---

## Critical Implementation Notes

**Force-dynamic on all authenticated layouts.** Per dashboard lesson #5: any route reading live Supabase data must export `export const dynamic = "force-dynamic"`. Apply to `src/app/catalogs/page.tsx`, `src/app/build/page.tsx`, `src/app/orders/page.tsx`. The sign-in page is static and does not need this.

**Never import `admin.ts` from a Client Component barrel.** Per dashboard lesson #6: `server-only` in `admin.ts` catches this at build time. Keep `src/lib/supabase/admin.ts` in its own module, never re-exported from an `index.ts` that might be imported by client components.

**Do not shell SUPABASE env vars in the dev process.** The dashboard's `CLAUDE.md` documents that Claude Code sets `ANTHROPIC_API_KEY=` in the shell, shadowing `.env.local`. The same concern applies to any env var — if Zach's shell has stale vars, they shadow `.env.local`. Run `npm run dev` in a fresh shell or use `dotenv -e .env.local` prefix.

**`computeTotals` is pure and should be called on every render.** Do not wrap in `useEffect` or `useMemo`. The calculation is O(n) where n is SKU count (≤50); it completes in <1ms. `useMemo` would add complexity without benefit.

**Tablet layout (1024px) is Phase 1.** The design's tablet artboard (sticky bottom drawer for summary) is straightforward CSS: at `@media (max-width: 1024px)`, change the main grid from 3-column to single-column, position the summary panel as `position: fixed; bottom: 0; left: 0; right: 0` with a fixed height. No separate component needed — CSS media query branch inside `builder-client.tsx`.

**The Optimize Fill modal must run the algorithm in the same thread as the UI.** Do not defer to a Web Worker. The algorithm is O(n²) worst case but n ≤ 50 SKUs; it completes in <10ms. Web Worker complexity is not justified.

---

This blueprint is complete. A developer can implement from this document without re-reading any source files. The implementation sequence is Phases 1–8 in order; do not start Phase 5 before Phase 4's math tests pass.

Sources:
- [Next.js Server Actions and Mutations](https://nextjs.org/docs/13/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js Server Actions Complete Guide](https://makerkit.dev/blog/tutorials/nextjs-server-actions)