"use client";

// BuilderClient — the orchestrator.
//
// Owns:
//  - quantity map (Record<vendor_product_id, number>) — hydrated from a server-side draft on mount
//  - optimize modal open/close
//  - submission pending + result
//  - autosave to draft_orders on debounced qty change (Phase C)
//
// Children:
//  - BuilderHeader (sticky)
//  - ProductTable (left column)
//  - SummaryPanel (sticky right column)
//  - OptimizeModal (overlay)
//  - OrderConfirmation (replaces the body on success — proposes a follow-up
//    catalog if the customer has another one to build, Phase D)

import { useEffect, useRef, useState, useTransition } from "react";
import { BuilderHeader } from "./builder-header";
import { ProductTable } from "./product-table";
import { SummaryPanel } from "./summary-panel";
import { OptimizeModal } from "./optimize-modal";
import { OrderConfirmation } from "./order-confirmation";
import { submitOrderAction } from "@/actions/submit-order";
import { saveDraftAction } from "@/actions/save-draft";
import { computeTotals, type QtyMap } from "@/lib/math/fill";
import type { CatalogSummary, VendorCatalog } from "@/lib/catalog/types";
import type { CatalogStatusByVendorId } from "@/lib/catalog/status";

interface BuilderClientProps {
  catalog: VendorCatalog;
  customerName: string;
  otherCatalogs: CatalogSummary[];
  /** Per-catalog status badges for the header dropdown + submit-and-continue. */
  otherCatalogStatus?: CatalogStatusByVendorId;
  /** Initial qty map (from a hydrated draft, or empty). */
  initialQtys?: QtyMap;
  /** True if any keys were pruned during draft hydration. Surface via banner. */
  draftHadStaleSkus?: boolean;
  /** Last saved-at timestamp for the hydrated draft. */
  draftUpdatedAt?: string | null;
}

const AUTOSAVE_DEBOUNCE_MS = 1000;

export function BuilderClient({
  catalog,
  customerName,
  otherCatalogs,
  otherCatalogStatus = {},
  initialQtys = {},
  draftHadStaleSkus = false,
  draftUpdatedAt = null,
}: BuilderClientProps) {
  const [qtys, setQtys] = useState<QtyMap>(initialQtys);
  const [showOptimize, setShowOptimize] = useState(false);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);
  const [showStaleBanner, setShowStaleBanner] = useState<boolean>(draftHadStaleSkus);
  const [savedAt, setSavedAt] = useState<string | null>(draftUpdatedAt);
  // Customer-facing note attached to the order on submit. Optional. Capped
  // at 2000 chars by the server; we soft-cap at the same number client-side
  // so the customer doesn't waste typing.
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Autosave — fires only when qtys change after mount, debounced 1s.
  //
  // Suppressed during and after submit. A late autosave between submit-order's
  // start and the React state update would resurrect the cart in draft_orders
  // *after* submit-order already deleted it, and the customer would see their
  // just-submitted cart on reload.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (submitting || submittedOrderNumber) return; // freeze during + after submit
    const t = setTimeout(() => {
      saveDraftAction({
        vendorId: catalog.vendorId,
        catalogSlug: catalog.slug,
        qtyMap: qtys,
      })
        .then((res) => {
          if (res.ok && res.updatedAt) setSavedAt(res.updatedAt);
        })
        .catch(() => {
          // Silent — autosave failures shouldn't disrupt the user.
        });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [qtys, catalog.vendorId, catalog.slug, submitting, submittedOrderNumber]);

  const totals = computeTotals(catalog, qtys);

  const onApplyOptimize = (projected: QtyMap) => {
    setQtys(projected);
    setShowOptimize(false);
  };

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitOrderAction({
        vendorId: catalog.vendorId,
        qtys,
        notes: orderNotes,
      });
      if (!res.ok) {
        setError(res.error ?? "Submission failed.");
        return;
      }
      setSubmittedOrderNumber(res.orderNumber ?? "—");
    });
  };

  if (submittedOrderNumber) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <BuilderHeader
          catalog={catalog}
          customerName={customerName}
          otherCatalogs={otherCatalogs}
          otherCatalogStatus={otherCatalogStatus}
        />
        <OrderConfirmation
          catalog={catalog}
          totals={totals}
          qtys={qtys}
          orderNumber={submittedOrderNumber}
          otherCatalogs={otherCatalogs}
          otherCatalogStatus={otherCatalogStatus}
          onBack={() => {
            setQtys({});
            setSubmittedOrderNumber(null);
            setSavedAt(null);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <BuilderHeader
        catalog={catalog}
        customerName={customerName}
        otherCatalogs={otherCatalogs}
        otherCatalogStatus={otherCatalogStatus}
      />
      <main
        className="builder-grid"
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "24px 32px 48px",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 388px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {showStaleBanner ? (
            <div
              role="status"
              style={{
                marginBottom: 14,
                padding: "10px 14px",
                background: "var(--burgundy-bg)",
                border: "1px solid var(--burgundy)",
                color: "var(--burgundy)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.04em",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span>
                ITEMS REMOVED FROM YOUR DRAFT — one or more SKUs are no longer
                available. Review your cart before submitting.
              </span>
              <button
                type="button"
                onClick={() => setShowStaleBanner(false)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--burgundy)",
                  fontFamily: "inherit",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: 4,
                }}
                aria-label="Dismiss notice"
              >
                ✕
              </button>
            </div>
          ) : null}

          {catalog.pricesPending ? (
            <div
              role="status"
              style={{
                marginBottom: 14,
                padding: "12px 16px",
                background: "var(--paper-2)",
                border: "1px solid var(--char)",
                color: "var(--ink)",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.06em",
                lineHeight: 1.7,
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <span
                aria-hidden
                style={{
                  color: "var(--warm)",
                  fontSize: 14,
                  lineHeight: 1,
                  marginTop: 1,
                }}
              >
                +
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    marginBottom: 4,
                  }}
                >
                  Pricing Pending
                </div>
                <div style={{ color: "var(--mid)", textTransform: "none", letterSpacing: 0 }}>
                  {catalog.pricesPendingReason ??
                    "Prices are being refreshed by your representative."}{" "}
                  Browse the catalog while you wait — submit will re-open once
                  the new rates publish.
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="flex"
            style={{ marginBottom: 14, alignItems: "baseline", justifyContent: "space-between" }}
          >
            <div className="flex flex-col" style={{ gap: 4 }}>
              <div className="t-eyebrow">Catalog</div>
              <div className="t-h2">{catalog.displayName}</div>
            </div>
            <div className="flex" style={{ gap: 14, alignItems: "baseline" }}>
              {savedAt ? (
                <div
                  className="mono t-cap"
                  style={{ color: "var(--mid)" }}
                  title={`Last saved ${new Date(savedAt).toLocaleString()}`}
                >
                  Cart auto-saved
                </div>
              ) : null}
              <div className="mono t-cap">
                Min {catalog.minCaseQty} cases/line · {catalog.categories.length} categor{catalog.categories.length === 1 ? "y" : "ies"} · {catalog.skuCount} SKU{catalog.skuCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid var(--rule)" }}>
            <ProductTable catalog={catalog} qtys={qtys} setQtys={setQtys} />
          </div>

          <div
            className="flex"
            style={{
              marginTop: 32,
              paddingTop: 18,
              borderTop: "1px solid var(--rule)",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div className="mono t-cap">
              Pricing in {catalog.currency} · Container {totals.container.label}
            </div>
            <div className="mono t-cap" style={{ textAlign: "right" }}>
              Servous · Foodservice Packaging
            </div>
          </div>
        </div>

        <SummaryPanel
          totals={totals}
          termsLabel={catalog.termsLabel}
          minFillPct={catalog.minFillPct}
          onOptimize={() => setShowOptimize(true)}
          onSubmit={onSubmit}
          pending={submitting}
          errored={error}
          pricesPending={catalog.pricesPending}
          notes={orderNotes}
          onNotesChange={setOrderNotes}
        />
      </main>

      {showOptimize ? (
        <OptimizeModal
          catalog={catalog}
          qtys={qtys}
          onClose={() => setShowOptimize(false)}
          onApply={onApplyOptimize}
        />
      ) : null}
    </div>
  );
}
