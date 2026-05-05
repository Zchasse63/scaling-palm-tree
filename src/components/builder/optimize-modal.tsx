"use client";

import { useMemo, useState } from "react";
import { SectionBar } from "@/components/ui/section-bar";
import { Button } from "@/components/ui/button";
import { fmt1, fmtMoneyPos } from "@/lib/math/fmt";
import { optimizeFill, type OptimizeMode } from "@/lib/math/optimize";
import type { VendorCatalog, CatalogSku } from "@/lib/catalog/types";
import type { QtyMap } from "@/lib/math/fill";

interface OptimizeModalProps {
  catalog: VendorCatalog;
  qtys: QtyMap;
  onClose: () => void;
  onApply: (projected: QtyMap) => void;
}

const MODE_LABEL: Record<OptimizeMode, string> = {
  top_up: "Top up cart",
  complete_set: "Match items",
  fill_catalog: "Fill from catalog",
};

const MODE_HELP: Record<OptimizeMode, string> = {
  top_up:
    "Add more cases to items already in your cart. Best when you know the mix you want and just need to round it up to a full container.",
  complete_set:
    "Suggest items that pair with what's already in your cart — for example, lids to match pans. Useful when you've added the main items and need to round out the set.",
  fill_catalog:
    "Add any items from the catalog to fill the remaining space, prioritizing the smallest cartons so we land precisely on 100%.",
};

export function OptimizeModal({ catalog, qtys, onClose, onApply }: OptimizeModalProps) {
  const cartHasItems = useMemo(
    () => Object.values(qtys).some((q) => q && q > 0),
    [qtys],
  );

  const [mode, setMode] = useState<OptimizeMode>(
    cartHasItems ? "top_up" : "fill_catalog",
  );

  const result = useMemo(
    () => optimizeFill(catalog, qtys, mode),
    [catalog, qtys, mode],
  );
  const skuById = useMemo(() => {
    const m = new Map<string, CatalogSku>();
    for (const cat of catalog.categories) {
      for (const sku of cat.skus) m.set(sku.vendorProductId, sku);
    }
    return m;
  }, [catalog]);

  const ids = Object.keys(result.suggestions).filter(
    (id) => result.suggestions[id] > 0,
  );

  const statusLine = (() => {
    if (result.status === "exact") return `Suggested fill: ${fmt1(result.finalVolPct)}%`;
    if (result.status === "weight_capped")
      return `Capped at ${fmt1(result.finalWtPct)}% weight`;
    if (result.status === "partial")
      return `Suggested fill: ${fmt1(result.finalVolPct)}%`;
    return "No changes available";
  })();

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
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: 760,
          maxHeight: "85vh",
          background: "var(--paper)",
          border: "1px solid var(--char)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SectionBar regmarks meta={statusLine}>
          <span id="opt-title">Optimize Container Fill</span>
        </SectionBar>

        {/* Mode selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            background: "white",
            borderBottom: "1px solid var(--rule)",
          }}
          role="tablist"
        >
          {(Object.keys(MODE_LABEL) as OptimizeMode[]).map((m) => {
            const active = m === mode;
            const disabled = m === "top_up" && !cartHasItems;
            return (
              <button
                type="button"
                key={m}
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => setMode(m)}
                className={active ? "" : "row-hover"}
                style={{
                  padding: "12px 16px",
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "white" : disabled ? "var(--warm)" : "var(--ink)",
                  border: 0,
                  borderRight: "1px solid var(--rule)",
                  fontFamily: "var(--font-geist), sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {MODE_LABEL[m]}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "14px 22px 12px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
          <div className="t-cap" style={{ lineHeight: 1.6 }}>
            {MODE_HELP[mode]}
          </div>
        </div>

        <div className="scroll" style={{ overflowY: "auto", flex: 1, background: "white" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 88px 80px 90px 110px",
              gap: 16,
              padding: "10px 22px",
              background: "var(--paper-2)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <div className="t-eyebrow">Spec</div>
            <div className="t-eyebrow" style={{ textAlign: "right" }}>Current</div>
            <div className="t-eyebrow" />
            <div className="t-eyebrow" style={{ textAlign: "right" }}>Suggested</div>
            <div className="t-eyebrow" style={{ textAlign: "right" }}>Δ</div>
          </div>
          {ids.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--mid)" }}>
              {result.status === "weight_capped"
                ? "Weight ceiling hit before container could be filled. Reduce heavier SKUs and try a different mode."
                : mode === "top_up" && !cartHasItems
                ? "Add at least one line item, then top-up will be available."
                : mode === "complete_set"
                ? "No complementary pairings found. Try Top up cart or Fill from catalog."
                : "No suggestions — container is already optimal for this mode."}
            </div>
          ) : null}
          {ids.map((id) => {
            const sku = skuById.get(id)!;
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
                  gridTemplateColumns: "minmax(0,1fr) 88px 80px 90px 110px",
                  gap: 16,
                  padding: "12px 22px",
                  borderBottom: "1px solid var(--rule)",
                  alignItems: "center",
                }}
              >
                <div className="flex flex-col" style={{ minWidth: 0, gap: 4 }}>
                  <div
                    className="t-body"
                    style={{
                      fontWeight: 400,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sku.productName}
                  </div>
                  {sku.packMultiple ? (
                    <div className="mono" style={{ fontSize: 10, color: "var(--mid)" }}>
                      Rounded to nearest pack of {sku.packMultiple}
                    </div>
                  ) : null}
                </div>
                <div className="mono" style={{ textAlign: "right", fontSize: 13 }}>{before}</div>
                <div className="mono" style={{ textAlign: "center", color: "var(--mid)" }}>→</div>
                <div className="mono" style={{ textAlign: "right", fontSize: 13, fontWeight: 500 }}>
                  {after}
                </div>
                <div className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--ink)" }}>
                  +{delta}
                  {palletDelta && palletDelta >= 1 ? (
                    <span style={{ color: "var(--mid)" }}>
                      {" "}· {palletDelta.toFixed(palletDelta % 1 === 0 ? 0 : 1)} plt
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            background: "var(--paper)",
            padding: "16px 22px",
            borderTop: "1px solid var(--rule)",
          }}
        >
          <div className="flex" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="t-cap">Δ Subtotal</div>
            <div
              className="mono"
              style={{ fontSize: 18, fontWeight: 500, color: "var(--ink)" }}
            >
              +{fmtMoneyPos(result.deltaSubtotal)}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "16px 22px",
            borderTop: "1px solid var(--rule)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <Button kind="text" onClick={onClose}>Cancel</Button>
          <Button
            kind="primary"
            onClick={() => onApply(result.projected)}
            disabled={ids.length === 0}
          >
            Apply Suggestions
          </Button>
        </div>
      </div>
    </div>
  );
}
