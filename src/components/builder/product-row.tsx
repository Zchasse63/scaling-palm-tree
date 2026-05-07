"use client";

// One product row in the catalog table.
// Renders spec text + caption, per-case price, qty stepper, line subtotal.
// Stepper rules driven by sku data: pack-multiple, pre-palletized, etc.

import { Stepper } from "@/components/ui/stepper";
import { Chip } from "@/components/ui/chip";
import { fmtMoneyPos } from "@/lib/math/fmt";
import type { CatalogSku } from "@/lib/catalog/types";

interface ProductRowProps {
  sku: CatalogSku;
  qty: number;
  onQty: (n: number) => void;
  /** Catalog-wide minimum cases per line. */
  minCaseQty: number;
  /**
   * When true, the catalog is in a pricing-refresh window — prices are
   * zeroed at the server. Render "—" instead of dollar amounts.
   */
  pricesPending?: boolean;
}

export function ProductRow({ sku, qty, onQty, minCaseQty, pricesPending }: ProductRowProps) {
  const dimsStr =
    sku.caseLengthIn !== null && sku.caseWidthIn !== null && sku.caseHeightIn !== null
      ? `${sku.caseLengthIn}″ × ${sku.caseWidthIn}″ × ${sku.caseHeightIn}″`
      : null;
  const palletQty =
    sku.casesPerPallet && sku.casesPerPallet > 0
      ? Math.floor(qty / sku.casesPerPallet)
      : 0;
  const showPallet = palletQty > 0;
  const subtotal = qty * sku.sellPricePerCase;
  const wtKgStr =
    sku.caseWeightKg !== null
      ? `${sku.caseWeightKg.toFixed(sku.caseWeightKg < 10 ? 2 : 1)} kg/case`
      : null;

  // Effective minimum = max(pack_multiple, per-SKU override ?? catalog min).
  // The per-SKU override (e.g. China-packed foil rolls = 50) beats the
  // catalog-wide floor when present.
  const pack = sku.packMultiple && sku.packMultiple > 0 ? sku.packMultiple : 1;
  const moqFloor = sku.minCaseQtyOverride ?? minCaseQty;
  const effectiveMin = Math.ceil(Math.max(moqFloor, pack) / pack) * pack;
  const belowMin = qty > 0 && qty < effectiveMin;

  return (
    <div
      className="row-hover"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 110px 140px 130px",
        gap: 24,
        alignItems: "center",
        padding: "16px 18px",
        borderBottom: "1px solid var(--rule)",
        position: "relative",
        background: belowMin ? "rgba(124,26,26,0.04)" : undefined,
      }}
    >
      <div className="flex flex-col" style={{ gap: 6, minWidth: 0 }}>
        <div
          className="flex"
          style={{ gap: 8, alignItems: "baseline", flexWrap: "wrap" }}
        >
          <div className="t-body" style={{ fontWeight: 400, lineHeight: 1.35 }}>
            {sku.productName}
          </div>
          {sku.prePalletized ? <Chip>Pre-palletized</Chip> : null}
          {sku.packMultiple ? <Chip>Pack × {sku.packMultiple}</Chip> : null}
          <Chip>Min {effectiveMin}</Chip>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--mid)" }}>
          {sku.prePalletized ? (
            <>
              Pre-palletized · {sku.casesPerPallet ?? 0} units/pallet
              {wtKgStr ? <> · {wtKgStr}</> : null}
            </>
          ) : (
            <>
              {sku.piecesPerCase ?? 0} pcs/case
              {dimsStr ? <> · Carton {dimsStr}</> : null}
              {wtKgStr ? <> · {wtKgStr}</> : null}
            </>
          )}
          <span style={{ color: "var(--warm)" }}> · {sku.vendorSku}</span>
        </div>
        {belowMin ? (
          <div
            className="mono"
            style={{ fontSize: 10, color: "var(--burgundy)" }}
          >
            Below minimum — submit blocked. Increase to {effectiveMin}+ or clear.
          </div>
        ) : null}
      </div>
      <div className="mono" style={{ textAlign: "right", fontSize: 13 }}>
        {pricesPending ? (
          <span style={{ color: "var(--warm)" }}>—</span>
        ) : (
          <>
            {fmtMoneyPos(sku.sellPricePerCase)}
            <span style={{ color: "var(--mid)" }}>/case</span>
          </>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div className="flex flex-col" style={{ alignItems: "flex-end", gap: 4 }}>
          <Stepper
            value={qty}
            onChange={onQty}
            packMultiple={sku.packMultiple}
            minCaseQty={moqFloor}
            ariaLabel={"Quantity for " + sku.productName}
          />
          {showPallet ? (
            <div className="mono" style={{ fontSize: 10, color: "var(--mid)" }}>
              {palletQty} pallet{palletQty === 1 ? "" : "s"}
              {sku.casesPerPallet && qty % sku.casesPerPallet
                ? ` · ${qty % sku.casesPerPallet} cases`
                : ""}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className="mono"
        style={{
          textAlign: "right",
          fontSize: 14,
          fontWeight: 500,
          color: qty > 0 && !pricesPending ? "var(--ink)" : "var(--warm)",
        }}
      >
        {pricesPending ? "—" : fmtMoneyPos(subtotal)}
      </div>
    </div>
  );
}
