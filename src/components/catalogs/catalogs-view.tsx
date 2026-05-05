// Catalog selector — rendered inside `/` when the customer has 2+ catalogs and
// hasn't picked one via `?c=<slug>` yet. Single-catalog accounts skip this view
// entirely and land on the builder.

import { Wordmark } from "@/components/ui/wordmark";
import { Caret } from "@/components/ui/caret";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { CatalogCard } from "@/components/catalogs/catalog-card";
import type { CatalogSummary } from "@/lib/catalog/types";

interface CatalogsViewProps {
  customerName: string;
  catalogs: CatalogSummary[];
}

export function CatalogsView({ customerName, catalogs }: CatalogsViewProps) {
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
            <div className="mono t-cap">{customerName}</div>
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
            <div className="t-h1">Choose a catalog</div>
            <div className="mono t-cap" style={{ marginTop: 4 }}>For {customerName}</div>
          </div>
          <div className="mono t-cap">
            {catalogs.length} active · refreshed daily
          </div>
        </div>
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
      </main>
    </div>
  );
}
