"use client";

// Inline order-confirmation view rendered by BuilderClient on success.
// Replaces the builder UI in place (no navigation) so the customer keeps
// scroll position and can decide whether to build another container.

import Link from "next/link";
import { SectionBar } from "@/components/ui/section-bar";
import { Button } from "@/components/ui/button";
import { fmtInt, fmtMoneyPos, fmt1 } from "@/lib/math/fmt";
import type { CatalogSummary, VendorCatalog } from "@/lib/catalog/types";
import type { BuilderTotals, QtyMap } from "@/lib/math/fill";
import type { CatalogStatusByVendorId } from "@/lib/catalog/status";

interface OrderConfirmationProps {
  catalog: VendorCatalog;
  totals: BuilderTotals;
  qtys: QtyMap;
  orderNumber: string;
  onBack: () => void;
  /** All catalogs the customer can build, including the just-submitted one. */
  otherCatalogs?: CatalogSummary[];
  /** Status badges per OTHER catalog — drives the submit-and-continue choice. */
  otherCatalogStatus?: CatalogStatusByVendorId;
}

/**
 * Pick the most likely "next" catalog to build:
 *   1. A catalog with an active draft (resume that)
 *   2. The catalog with the OLDEST last-order (most overdue)
 *   3. Any catalog with no order history yet
 *   4. None — return null and skip the prompt
 */
function pickNextCatalog(
  currentVendorId: string,
  others: CatalogSummary[],
  status: CatalogStatusByVendorId,
): { catalog: CatalogSummary; reason: "draft" | "overdue" | "untouched" } | null {
  const candidates = others.filter((c) => c.vendorId !== currentVendorId);
  if (candidates.length === 0) return null;

  const withDraft = candidates.find((c) => status[c.vendorId]?.hasDraft);
  if (withDraft) return { catalog: withDraft, reason: "draft" };

  const untouched = candidates.find((c) => !status[c.vendorId]?.lastOrderAt);
  if (untouched) return { catalog: untouched, reason: "untouched" };

  // All candidates have an order history — pick the oldest.
  let oldest: CatalogSummary | null = null;
  let oldestTime = Infinity;
  for (const c of candidates) {
    const t = new Date(status[c.vendorId]?.lastOrderAt ?? 0).getTime();
    if (t < oldestTime) {
      oldestTime = t;
      oldest = c;
    }
  }
  return oldest ? { catalog: oldest, reason: "overdue" } : null;
}

export function OrderConfirmation({
  catalog,
  totals,
  qtys,
  orderNumber,
  onBack,
  otherCatalogs = [],
  otherCatalogStatus = {},
}: OrderConfirmationProps) {
  const next = pickNextCatalog(catalog.vendorId, otherCatalogs, otherCatalogStatus);
  const nextLabel = next
    ? next.reason === "draft"
      ? "Resume your "
      : next.reason === "untouched"
        ? "Try a "
        : "Build a "
    : null;
  const lines = catalog.categories
    .flatMap((cat) =>
      cat.skus.map((sku) => ({ sku, q: qtys[sku.vendorProductId] ?? 0 })),
    )
    .filter((x) => x.q > 0);

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "48px 32px 64px" }}>
      <div className="flex flex-col items-center" style={{ gap: 18, marginBottom: 32 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="14" stroke="var(--char)" strokeWidth="1.4" fill="none" />
          <path d="M10 16 L14.5 20.5 L23 12" stroke="var(--char)" strokeWidth="1.6" fill="none" />
        </svg>
      </div>
      <div style={{ background: "white", border: "1px solid var(--rule)" }}>
        <SectionBar regmarks meta={orderNumber}>Container Order Submitted</SectionBar>
        <div style={{ padding: 28, borderBottom: "1px solid var(--rule)" }}>
          <div className="flex" style={{ alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div className="t-eyebrow">Catalog</div>
              <div className="t-h2" style={{ marginTop: 4 }}>{catalog.displayName}</div>
            </div>
            <div className="flex flex-col" style={{ alignItems: "flex-end", gap: 4 }}>
              <div className="t-eyebrow">Total</div>
              <div className="t-stat-md">{fmtMoneyPos(totals.subtotal)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
            <Meta label="Container" value={totals.container.label} />
            <Meta label="Volume" value={`${fmt1(totals.volPct)}%`} />
            <Meta label="Weight" value={`${fmtInt(totals.kg)} kg`} />
            <Meta label="Cases" value={fmtInt(totals.cases)} />
          </div>
        </div>
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 80px 110px 110px",
              gap: 16,
              padding: "10px 22px",
              background: "var(--paper-2)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div className="t-eyebrow">Spec</div>
            <div className="t-eyebrow" style={{ textAlign: "right" }}>Cases</div>
            <div className="t-eyebrow" style={{ textAlign: "right" }}>Unit</div>
            <div className="t-eyebrow" style={{ textAlign: "right" }}>Subtotal</div>
          </div>
          {lines.map(({ sku, q }) => (
            <div
              key={sku.vendorProductId}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 80px 110px 110px",
                gap: 16,
                padding: "12px 22px",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <div className="t-body">{sku.productName}</div>
              <div className="mono" style={{ textAlign: "right" }}>{q}</div>
              <div className="mono" style={{ textAlign: "right", color: "var(--mid)" }}>
                {fmtMoneyPos(sku.sellPricePerCase)}
              </div>
              <div className="mono" style={{ textAlign: "right", fontWeight: 500 }}>
                {fmtMoneyPos(q * sku.sellPricePerCase)}
              </div>
            </div>
          ))}
        </div>
        <div className="mono t-cap" style={{ padding: 22 }}>
          Your Servous representative will confirm the shipping window within 1 business day.
        </div>
      </div>
      <div className="flex" style={{ gap: 12, marginTop: 24, flexWrap: "wrap" }}>
        {next ? (
          <Link
            href={{ pathname: "/", query: { c: next.catalog.slug } }}
            style={{ textDecoration: "none" }}
          >
            <Button kind="primary">
              {nextLabel}
              {next.catalog.displayName}
              {" "}→
            </Button>
          </Link>
        ) : null}
        <Button kind={next ? "secondary" : "primary"} onClick={onBack}>
          Build Another {catalog.displayName}
        </Button>
        <Link href="/orders" style={{ textDecoration: "none" }}>
          <Button kind="secondary">View Past Orders</Button>
        </Link>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col" style={{ gap: 4 }}>
      <div className="t-eyebrow">{label}</div>
      <div className="mono" style={{ fontSize: 14, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
