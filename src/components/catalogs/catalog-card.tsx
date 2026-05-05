// Catalog card — clickable tile on /catalogs.

import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { CONTAINERS } from "@/lib/containers";
import type { CatalogSummary } from "@/lib/catalog/types";

export function CatalogCard({ catalog }: { catalog: CatalogSummary }) {
  const containerLabel = CONTAINERS[catalog.containerCode]?.label ?? catalog.containerCode;
  const termsBadge = catalog.termsLabel.startsWith("DDP")
    ? "DDP"
    : catalog.termsLabel.startsWith("FOB")
    ? "FOB"
    : "Delivered";

  return (
    <Link
      href={{ pathname: "/build", query: { catalog: catalog.vendorId } }}
      className="row-hover"
      style={{
        cursor: "pointer",
        padding: "24px 26px",
        background: "white",
        borderRight: "1px solid var(--rule)",
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 240,
        position: "relative",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span className="regmark" style={{ position: "absolute", top: 8, left: 8 }}>+</span>
      <span className="regmark" style={{ position: "absolute", top: 8, right: 8 }}>+</span>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div className="flex" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="t-eyebrow">Catalog</div>
          <Chip variant="warm">{termsBadge}</Chip>
        </div>
        <div className="t-h2" style={{ marginTop: 2, lineHeight: 1.2 }}>
          {catalog.displayName}
        </div>
        <div className="mono t-cap" style={{ lineHeight: 1.7, color: "var(--mid)" }}>
          {catalog.categoryNames.slice(0, 4).join(" · ")}
          {catalog.categoryNames.length > 4 ? (
            <span style={{ color: "var(--warm)" }}>
              {" "}
              +{catalog.categoryNames.length - 4} more
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-end", marginTop: 24 }}>
        <div className="flex flex-col" style={{ gap: 2 }}>
          <div className="t-eyebrow">Default Container</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>{containerLabel}</div>
        </div>
        <div className="flex flex-col" style={{ gap: 2, alignItems: "flex-end" }}>
          <div className="t-eyebrow">SKUs</div>
          <div className="mono" style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
            {catalog.skuCount}
          </div>
        </div>
      </div>
    </Link>
  );
}
