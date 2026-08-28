// Status buckets as navigation (URL-param filters). Worst-first order; zero
// counts still render. Server component: tabs are plain links.

import Link from "next/link";

export interface BucketCounts {
  stockout: number; // includes allocated_out (same severity tier)
  act_now: number;
  watch: number;
  excess: number;
  no_movement: number;
  all: number;
}

const TABS: Array<{ key: keyof BucketCounts; label: string }> = [
  { key: "stockout", label: "Stockout" },
  { key: "act_now", label: "Act now" },
  { key: "watch", label: "Watch" },
  { key: "excess", label: "Excess" },
  { key: "no_movement", label: "No movement" },
  { key: "all", label: "All" },
];

export function BucketTabs({
  counts,
  active,
  makeHref,
}: {
  counts: BucketCounts;
  active: keyof BucketCounts;
  makeHref: (bucket: keyof BucketCounts) => string;
}) {
  return (
    <nav className="flex" style={{ gap: 8, flexWrap: "wrap" }} aria-label="Status filter">
      {TABS.map((t) => {
        const isActive = t.key === active;
        const count = counts[t.key];
        const alarm = (t.key === "stockout" || t.key === "act_now") && count > 0;
        return (
          <Link
            key={t.key}
            href={makeHref(t.key)}
            aria-current={isActive ? "page" : undefined}
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              height: 28,
              padding: "0 12px",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
              border: "1px solid",
              borderColor: isActive ? "var(--ink)" : alarm ? "var(--burgundy)" : "var(--rule-strong)",
              background: isActive ? "var(--ink)" : "white",
              color: isActive ? "white" : alarm ? "var(--burgundy)" : "var(--mid)",
            }}
          >
            {t.label}
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                color: isActive ? "var(--warm)" : alarm ? "var(--burgundy)" : "var(--warm)",
              }}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
