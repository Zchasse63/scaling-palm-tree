# Servous Container Builder

Customer-facing web app where authenticated B2B procurement buyers configure full ocean-container orders from a vendor catalog.

- Stack: Next.js 16 + React 19 + Tailwind v4 + Supabase Auth/DB + Netlify
- Auth: Supabase magic link (no self-signup; manually provisioned via Supabase Admin)
- Data: shares the Servous Supabase project (`bxoggqfqdwizimsltztq`)
- Architecture blueprint: see `ARCHITECTURE.md`

## Local dev

```bash
cp .env.example .env.local   # fill in real Supabase keys
npm install
npm run dev                  # http://localhost:3000
```

When testing magic-link sign-in locally, ensure `http://localhost:3000/auth/callback`
is added to Supabase Dashboard → Auth → URL Configuration → Redirect URLs.

## Provisioning a customer (manual, no self-signup)

1. Supabase Dashboard → Authentication → Users → Invite user (enter email)
2. Insert a row in `customer_user_profiles` linking that `auth.users.id` to a `companies.id`
3. Insert one or more rows in `customer_catalog_access` granting that customer access to vendor catalogs
4. The customer signs in via magic link and lands on `/catalogs`

See `ARCHITECTURE.md` for the SQL templates.
