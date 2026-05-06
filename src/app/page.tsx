// Root page — the smart landing.
//
// Flow:
//   1. requireSession()                            → resolves the authed customer
//   2. fetchCustomerCatalogs(customerId)           → list of catalogs they can order from
//   3. ?c=<slug> in the URL?
//        yes → render builder for that catalog
//        no, single catalog → render builder for the only one
//        no, multiple catalogs → render catalog selector
//        no, zero catalogs → render NoAccessView
//
// The catalog `slug` in the URL is *per-customer-per-vendor*, so it never leaks
// the underlying vendor identity. The customer sees URLs like /, /?c=foil-aluminum,
// /orders, /signin — nothing else.

import { requireSession } from "@/lib/auth/session";
import {
  fetchCatalogForVendor,
  fetchCustomerCatalogs,
  resolveCustomerCatalogAccess,
} from "@/lib/catalog/query";
import { fetchLastOrderPerCatalog } from "@/lib/orders/query";
import { BuilderClient } from "@/components/builder/builder-client";
import { CatalogsView } from "@/components/catalogs/catalogs-view";
import { NoAccessView } from "@/components/catalogs/no-access-view";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams: Promise<{ c?: string }>;
}

export default async function HomePage({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const session = await requireSession();
  const allCatalogs = await fetchCustomerCatalogs(session.customerId);

  if (allCatalogs.length === 0) {
    return <NoAccessView customerName={session.customerName} />;
  }

  // No slug + multi-catalog account → render the procurement dashboard.
  // Single-catalog accounts skip this entirely and auto-resolve to the
  // builder below — preserving the current single-catalog UX exactly.
  if (!sp.c && allCatalogs.length > 1) {
    const lastOrderBySlug = await fetchLastOrderPerCatalog(session.customerId);
    return (
      <CatalogsView
        customerName={session.customerName}
        catalogs={allCatalogs}
        lastOrderBySlug={lastOrderBySlug}
      />
    );
  }

  // Try to resolve the catalog. If the slug is bogus, fall back to the
  // customer's first catalog rather than redirecting — `redirect()` here
  // races with middleware cookie propagation and intermittently nukes the
  // session (BUG-001 from the QA pipeline).
  let access = await resolveCustomerCatalogAccess(
    session.customerId,
    sp.c ?? null,
  );
  if (!access && allCatalogs.length > 0) {
    // Invalid or stale slug — silently land on the first catalog.
    access = await resolveCustomerCatalogAccess(
      session.customerId,
      allCatalogs[0].slug,
    );
  }
  if (!access) {
    return (
      <NoAccessView
        customerName={session.customerName}
        message="That catalog isn't available. Contact your Servous representative if this looks wrong."
      />
    );
  }

  const catalog = await fetchCatalogForVendor(access.vendorId, access);
  if (!catalog) {
    return (
      <NoAccessView
        customerName={session.customerName}
        message="Catalog could not be loaded. Try again in a minute or contact your Servous representative."
      />
    );
  }

  return (
    <BuilderClient
      catalog={catalog}
      customerName={session.customerName}
      otherCatalogs={allCatalogs}
    />
  );
}
