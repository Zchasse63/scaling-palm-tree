// Category rail: quick drill-down with SKU counts and value at cost.
// Server component; rows are links (URL-param filter, composes with tabs).

import Link from "next/link";
import { fmtInt } from "@/lib/math/fmt";
import type { CategoryRollup } from "@/lib/inventory/query";

function money0(v: number): string {
  return "$" + fmtInt(Math.round(v));
}

export function CategorySidebar({
  categories,
  active,
  makeHref,
}: {
  categories: CategoryRollup[];
  active: string | null; // decoded category name, or null = all
  makeHref: (cat: string | null) => string;
}) {
  const total = categories.reduce(
    (t, c) => ({ skus: t.skus + c.skus, value: t.value + c.valueAtCost }),
    { skus: 0, value: 0 },
  );

  const row = (
    label: string,
    skus: number,
    value: number,
    href: string,
    isActive: boolean,
  ) => (
    <Link
      key={label}
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="row-hover"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 10,
        padding: "9px 14px",
        borderBottom: "1px solid var(--rule)",
        textDecoration: "none",
        background: isActive ? "var(--ink)" : "transparent",
        color: isActive ? "white" : "var(--ink)",
      }}
    >
      <span style={{ fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 10,
          whiteSpace: "nowrap",
          color: isActive ? "var(--warm)" : "var(--mid)",
        }}
      >
        {skus} · {money0(value)}
      </span>
    </Link>
  );

  return (
    <nav
      aria-label="Category filter"
      style={{ background: "white", border: "1px solid var(--rule)" }}
    >
      <div
        className="t-eyebrow"
        style={{
          padding: "10px 14px",
          background: "var(--paper-2)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        Categories
      </div>
      {row("All categories", total.skus, total.value, makeHref(null), active === null)}
      {categories.map((c) =>
        row(c.name, c.skus, c.valueAtCost, makeHref(c.name), active === c.name),
      )}
      <div className="t-micro" style={{ padding: "8px 14px", color: "var(--warm)" }}>
        Value at current cost, internal.
      </div>
    </nav>
  );
}
