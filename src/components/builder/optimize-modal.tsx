"use client";

// Optimize Container Fill modal — three strategies, all visible at once.
//
// Earlier version used tabs; testing surfaced that customers don't realize the
// tabs exist or what they do. Now each strategy gets its own panel with its
// own Apply button; you scan all three, pick the one you want.
//
// Strategies:
//   - Top Up Cart      add more cases of items already in your cart
//   - Match Items      pair pans with lids (or whatever pairings the catalog has)
//   - Fill From Catalog  add anything from the catalog to fill remaining space
//
// Selecting a strategy applies only that strategy's suggestions and closes the
// modal. The strategies do not stack; applying one replaces the current state.

import { useMemo } from "react";
import { SectionBar } from "@/components/ui/section-bar";
import { Button } from "@/components/ui/button";
import { fmt1, fmtMoneyPos } from "@/lib/math/fmt";
import { optimizeFill, type OptimizeMode, type OptimizeResult } from "@/lib/math/optimize";
import type { VendorCatalog, CatalogSku } from "@/lib/catalog/types";
import type { QtyMap } from "@/lib/math/fill";

interface OptimizeModalProps {
  catalog: VendorCatalog;
  qtys: QtyMap;
  onClose: () => void;
  onApply: (projected: QtyMap) => void;
}

const STRATEGY_TITLES: Record<OptimizeMode, string> = {
  top_up: "Top Up Cart",
  complete_set: "Match Items",
  fill_catalog: "Fill From Catalog",
};

const STRATEGY_DESCRIPTIONS: Record<OptimizeMode, string> = {
  top_up: "Add more cases of items you've already chosen. Best when you know the mix you want and just need to round it up to a full container.",
  complete_set: "Pair items already in your cart with their natural matches — for example, lids to fit your pans.",
  fill_catalog: "Add any items from the catalog to fill the remaining space, prioritizing the smallest cartons so we land precisely on 100%.",
};

const STRATEGY_EMPTY_REASONS: Record<OptimizeMode, string> = {
  top_up: "Add at least one item to your cart, then this option will become available.",
  complete_set: "No matching pairs found for your current cart. Try Top Up Cart or Fill From Catalog.",
  fill_catalog: "Container is already at capacity.",
};

export function OptimizeModal({ catalog, qtys, onClose, onApply }: OptimizeModalProps) {
  // Compute all three strategies once.
  const results = useMemo(
    () => ({
      top_up: optimizeFill(catalog, qtys, "top_up"),
      complete_set: optimizeFill(catalog, qtys, "complete_set"),
      fill_catalog: optimizeFill(catalog, qtys, "fill_catalog"),
    }),
    [catalog, qtys],
  );

  // Lookup map for SKU details.
  const skuById = useMemo(() => {
    const m = new Map<string, CatalogSku>();
    for (const cat of catalog.categories) {
      for (const sku of cat.skus) m.set(sku.vendorProductId, sku);
    }
    return m;
  }, [catalog]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="opt-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        animation: "fadeIn 200ms ease",
        padding: 24,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: 820,
          maxWidth: "100%",
          maxHeight: "92vh",
          background: "var(--paper)",
          border: "1px solid var(--char)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SectionBar regmarks>
          <span id="opt-title">Three Ways to Fill Your Container</span>
        </SectionBar>

        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--rule)",
            background: "var(--paper-2)",
          }}
        >
          <div className="t-cap" style={{ lineHeight: 1.6 }}>
            Pick the option that matches what you want. Click <strong>Apply</strong> on the
            one you like, or close this and adjust your cart manually.
          </div>
        </div>

        {/* Stacked strategy panels */}
        <div className="scroll" style={{ overflowY: "auto", flex: 1, padding: 18 }}>
          {(Object.keys(STRATEGY_TITLES) as OptimizeMode[]).map((mode, idx) => (
            <StrategyPanel
              key={mode}
              mode={mode}
              result={results[mode]}
              skuById={skuById}
              qtys={qtys}
              onApply={() => onApply(results[mode].projected)}
              first={idx === 0}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--rule)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <Button kind="text" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategy panel — one of three. Renders title, description, suggestions list,
// subtotal delta, and an Apply button.
// ---------------------------------------------------------------------------
function StrategyPanel({
  mode,
  result,
  skuById,
  qtys,
  onApply,
  first,
}: {
  mode: OptimizeMode;
  result: OptimizeResult;
  skuById: Map<string, CatalogSku>;
  qtys: QtyMap;
  onApply: () => void;
  first: boolean;
}) {
  const ids = Object.keys(result.suggestions).filter((id) => result.suggestions[id] > 0);
  const isEmpty = ids.length === 0;
  const finalPct = result.finalVolPct;
  const statusLabel = isEmpty
    ? null
    : result.status === "exact"
      ? `Lands at ${fmt1(finalPct)}%`
      : result.status === "weight_capped"
        ? `Capped by weight at ${fmt1(finalPct)}%`
        : `Brings you to ${fmt1(finalPct)}%`;

  return (
    <section
      style={{
        marginTop: first ? 0 : 14,
        background: "white",
        border: "1px solid var(--rule)",
        opacity: isEmpty ? 0.6 : 1,
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--paper-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-geist), sans-serif",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            {STRATEGY_TITLES[mode]}
            {statusLabel ? (
              <span
                className="mono"
                style={{
                  fontWeight: 400,
                  marginLeft: 12,
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  textTransform: "none",
                  color: "var(--mid)",
                }}
              >
                {statusLabel}
              </span>
            ) : null}
          </div>
          <div className="t-cap" style={{ marginTop: 4, lineHeight: 1.55 }}>
            {STRATEGY_DESCRIPTIONS[mode]}
          </div>
        </div>
        <Button kind="primary" onClick={onApply} disabled={isEmpty}>
          Apply
        </Button>
      </header>

      <div>
        {isEmpty ? (
          <div
            className="t-cap"
            style={{ padding: "16px 20px", color: "var(--mid)", fontStyle: "italic" }}
          >
            {STRATEGY_EMPTY_REASONS[mode]}
          </div>
        ) : (
          <>
            {ids.map((id) => {
              const sku = skuById.get(id);
              if (!sku) return null;
              const before = qtys[id] ?? 0;
              const after = result.projected[id] ?? before;
              const delta = after - before;
              const palletDelta =
                sku.casesPerPallet && sku.casesPerPallet > 0
                  ? delta / sku.casesPerPallet
                  : null;
              return (
                <div
                  key={id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    gap: 14,
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--rule)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="t-body" style={{ fontWeight: 400, lineHeight: 1.35 }}>
                      {sku.productName}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 10, color: "var(--mid)", marginTop: 2 }}
                    >
                      {sku.vendorSku}
                      {sku.packMultiple
                        ? ` · rounds to packs of ${sku.packMultiple}`
                        : ""}
                    </div>
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: "var(--ink)",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {before} → <strong>{after}</strong>
                    <span style={{ color: "var(--ink)" }}> · +{delta}</span>
                    {palletDelta && palletDelta >= 1 ? (
                      <span style={{ color: "var(--mid)" }}>
                        {" "}
                        ({palletDelta.toFixed(palletDelta % 1 === 0 ? 0 : 1)} plt)
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div
              style={{
                padding: "10px 16px",
                background: "var(--paper-2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div className="t-eyebrow">Subtotal change</div>
              <div
                className="mono"
                style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}
              >
                +{fmtMoneyPos(result.deltaSubtotal)}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
