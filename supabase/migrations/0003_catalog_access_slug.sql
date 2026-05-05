-- 0003_catalog_access_slug.sql
-- Add URL-friendly slug to customer_catalog_access for clean per-customer URLs.
-- Used as ?c=<slug> in the customer-facing app. Must NOT contain vendor identity.

ALTER TABLE public.customer_catalog_access
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_catalog_access_slug
  ON public.customer_catalog_access (customer_id, slug);

COMMENT ON COLUMN public.customer_catalog_access.slug IS
  'URL-friendly slug derived from display_name; used as ?c=<slug> in customer-facing URLs. Must not leak vendor identity.';

-- Backfill the test customer's Whitestone access with a customer-facing slug.
UPDATE public.customer_catalog_access
SET slug = 'foil-aluminum'
WHERE customer_id = '68f5af45-d9b2-4f74-83c0-3275df0d6fa1'
  AND vendor_id = '2c1c07d7-4d90-4b9d-b952-796f2c91285d'
  AND slug IS NULL;
