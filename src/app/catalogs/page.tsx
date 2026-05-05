import { redirect } from "next/navigation";
import { Wordmark } from "@/components/ui/wordmark";
import { Caret } from "@/components/ui/caret";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { CatalogCard } from "@/components/catalogs/catalog-card";
import { requireSession } from "@/lib/auth/session";
import { fetchCustomerCatalogs } from "@/lib/catalog/query";

export const dynamic = "force-dynamic";

export default async function CatalogsPage() {
  const session = await requireSession();
  const catalogs = await fetchCustomerCatalogs(session.customerId);

  // Single-catalog accounts: skip selection and go straight to the builder.
  if (catalogs.length === 1) {
    redirect(`/build?catalog=${catalogs[0].vendorId}`);
  }

  return (
    <div className="paper-bg" style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--rule)" }}>
        <div
          className="flex items-center"
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "20px 32px",
            justifyContent: "space-between",
          }}
        >
          <Wordmark height={32} />
          <div className="flex items-center" style={{ gap: 18 }}>
            <div className="mono t-cap">{session.customerName}</div>
            <SignOutButton
              ariaLabel="Sign out"
              className="flex items-center justify-center"
              style={{
                background: "transparent",
                border: "1px solid var(--rule-strong)",
                height: 32,
                width: 32,
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <Caret />
            </SignOutButton>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 32px 64px" }}>
        <div
          className="flex"
          style={{ alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}
        >
          <div className="flex flex-col" style={{ gap: 6 }}>
            <div className="t-eyebrow">Available Catalogs</div>
            <div className="t-h1">Choose a vendor catalog</div>
            <div className="mono t-cap" style={{ marginTop: 4 }}>
              For {session.customerName}
            </div>
          </div>
          <div className="mono t-cap">
            {catalogs.length} active · refreshed daily
          </div>
        </div>
        {catalogs.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid var(--rule)",
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <div className="t-h2" style={{ marginBottom: 8 }}>No catalogs yet</div>
            <div className="t-cap">
              Your account is provisioned but no vendor catalogs are linked. Contact your Servous representative.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                catalogs.length === 1
                  ? "minmax(0,560px)"
                  : catalogs.length === 2
                  ? "repeat(2, 1fr)"
                  : "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 0,
              borderTop: "1px solid var(--rule)",
              borderLeft: "1px solid var(--rule)",
            }}
          >
            {catalogs.map((cat) => (
              <CatalogCard key={cat.vendorId} catalog={cat} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
