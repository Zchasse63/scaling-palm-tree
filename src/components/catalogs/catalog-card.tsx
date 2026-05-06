// Catalog card — clickable tile rendered on the procurement dashboard.
// Shows: catalog identity, terms badge, category list, default container,
// SKU count, and (when present) a "last container" recap so the customer
// can see what they last ordered for this catalog.

import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { CONTAINERS } from "@/lib/containers";
import type { CatalogSummary } from "@/lib/catalog/types";
import type { LastOrderForCatalog } from "@/lib/orders/types";
import { fmtMoneyPos, fmtInt } from "@/lib/math/fmt";

interface CatalogCardProps {
  catalog: CatalogSummary;
  /** Most recent order for this catalog, if any. */
  lastOrder?: LastOrderForCatalog | null;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const days = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function CatalogCard({ catalog, lastOrder }: CatalogCardProps) {
  const containerLabel = CONTAINERS[catalog.containerCode]?.label ?? catalog.containerCode;
  const termsBadge = catalog.termsLabel.startsWith("DDP")
    ? "DDP"
    : catalog.termsLabel.startsWith("FOB")
    ? "FOB"
    : "Delivered";

  return (
    <Link
      href={{ pathname: "/", query: { c: catalog.slug } }}
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
        minHeight: 280,
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

      {/* Order history strip — only when the customer has ordered this catalog before. */}
      {lastOrder ? (
        <div
          style={{
            margin: "20px 0 0",
            padding: "12px 14px",
            background: "var(--paper-2)",
            borderLeft: "2px solid var(--ink)",
          }}
        >
          <div className="t-eyebrow" style={{ marginBottom: 4 }}>Last Container</div>
          <div
            className="mono"
            style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.6 }}
          >
            {fmtInt(lastOrder.caseCount)} cases · {fmtMoneyPos(lastOrder.total)}
          </div>
          <div className="mono t-cap" style={{ marginTop: 2 }}>
            {lastOrder.orderNumber ?? lastOrder.id.slice(0, 8)} · {formatRelativeDate(lastOrder.quotedAt)}
          </div>
        </div>
      ) : null}

      <div
        className="flex"
        style={{
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: lastOrder ? 16 : 24,
        }}
      >
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
