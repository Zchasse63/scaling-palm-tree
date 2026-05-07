"use client";

// Product table — categories + rows. Pure presentational; quantity state lives in BuilderClient.

import { SectionBar } from "@/components/ui/section-bar";
import { ProductRow } from "./product-row";
import type { VendorCatalog } from "@/lib/catalog/types";
import type { QtyMap } from "@/lib/math/fill";

interface ProductTableProps {
  catalog: VendorCatalog;
  qtys: QtyMap;
  setQtys: (next: QtyMap | ((prev: QtyMap) => QtyMap)) => void;
}

export function ProductTable({ catalog, qtys, setQtys }: ProductTableProps) {
  return (
    <div>
      {catalog.categories.map((cat) => {
        const totalCases = cat.skus.reduce(
          (sum, s) => sum + (qtys[s.vendorProductId] ?? 0),
          0,
        );
        return (
          <section key={cat.categoryId ?? cat.name} id={`cat-${cat.slug ?? cat.name}`}>
            <SectionBar
              count={cat.skus.length}
              meta={totalCases > 0 ? `${totalCases} cases in cart` : undefined}
            >
              {cat.name}
            </SectionBar>
            <div style={{ background: "white" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) 110px 140px 130px",
                  gap: 24,
                  padding: "10px 18px",
                  borderBottom: "1px solid var(--rule)",
                  background: "var(--paper-2)",
                }}
              >
                <div className="t-eyebrow">Item</div>
                <div className="t-eyebrow" style={{ textAlign: "right" }}>Price</div>
                <div className="t-eyebrow" style={{ textAlign: "right" }}>Cases</div>
                <div className="t-eyebrow" style={{ textAlign: "right" }}>Subtotal</div>
              </div>
              {cat.skus.map((sku) => (
                <ProductRow
                  key={sku.vendorProductId}
                  sku={sku}
                  qty={qtys[sku.vendorProductId] ?? 0}
                  minCaseQty={catalog.minCaseQty}
                  onQty={(v) =>
                    setQtys((prev) => ({ ...prev, [sku.vendorProductId]: v }))
                  }
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
