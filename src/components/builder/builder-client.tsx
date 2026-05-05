"use client";

// BuilderClient — the orchestrator.
//
// Owns:
//  - quantity map (Record<vendor_product_id, number>)
//  - optimize modal open/close
//  - submission pending + result
//
// Children:
//  - BuilderHeader (sticky)
//  - ProductTable (left column)
//  - SummaryPanel (sticky right column)
//  - OptimizeModal (overlay)
//  - OrderConfirmation (replaces the body on success)

import { useState, useTransition } from "react";
import { BuilderHeader } from "./builder-header";
import { ProductTable } from "./product-table";
import { SummaryPanel } from "./summary-panel";
import { OptimizeModal } from "./optimize-modal";
import { OrderConfirmation } from "./order-confirmation";
import { submitOrderAction } from "@/actions/submit-order";
import { computeTotals, type QtyMap } from "@/lib/math/fill";
import type { CatalogSummary, VendorCatalog } from "@/lib/catalog/types";

interface BuilderClientProps {
  catalog: VendorCatalog;
  customerName: string;
  otherCatalogs: CatalogSummary[];
}

export function BuilderClient({
  catalog,
  customerName,
  otherCatalogs,
}: BuilderClientProps) {
  const [qtys, setQtys] = useState<QtyMap>({});
  const [showOptimize, setShowOptimize] = useState(false);
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);

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
        />
        <OrderConfirmation
          catalog={catalog}
          totals={totals}
          qtys={qtys}
          orderNumber={submittedOrderNumber}
          onBack={() => {
            setQtys({});
            setSubmittedOrderNumber(null);
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
      />
      <main
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
          <div
            className="flex"
            style={{ marginBottom: 14, alignItems: "baseline", justifyContent: "space-between" }}
          >
            <div className="flex flex-col" style={{ gap: 4 }}>
              <div className="t-eyebrow">Catalog</div>
              <div className="t-h2">{catalog.displayName}</div>
            </div>
            <div className="flex" style={{ gap: 14, alignItems: "baseline" }}>
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
