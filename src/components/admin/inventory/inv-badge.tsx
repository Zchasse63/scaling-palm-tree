// Status badge: glyph + text label + color, never color alone.
// Glyphs are inline SVGs so rendering never depends on emoji/font fallbacks.

import type { Bucket } from "@/lib/inventory/types";

const GLYPH: Record<string, React.ReactNode> = {
  dot: (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <circle cx="4" cy="4" r="3.2" fill="currentColor" />
    </svg>
  ),
  diamond: (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <path d="M4 0.6 7.4 4 4 7.4 0.6 4Z" fill="currentColor" />
    </svg>
  ),
  triangle: (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <path d="M4 0.8 7.5 7.2H0.5Z" fill="currentColor" />
    </svg>
  ),
  half: (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <circle cx="4" cy="4" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4 0.8A3.2 3.2 0 0 1 4 7.2Z" fill="currentColor" />
    </svg>
  ),
  square: (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <rect x="1" y="1" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <rect x="2.8" y="2.8" width="2.4" height="2.4" fill="currentColor" />
    </svg>
  ),
  ring: (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
      <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  ),
};

const BADGE: Record<
  Exclude<Bucket, "healthy" | "none">,
  { label: string; glyph: React.ReactNode; style: React.CSSProperties }
> = {
  stockout: {
    label: "Stockout",
    glyph: GLYPH.dot,
    style: { background: "var(--burgundy)", borderColor: "var(--burgundy)", color: "white" },
  },
  allocated_out: {
    label: "Alloc out",
    glyph: GLYPH.diamond,
    style: { background: "var(--burgundy)", borderColor: "var(--burgundy)", color: "white" },
  },
  act_now: {
    label: "Act now",
    glyph: GLYPH.triangle,
    style: { background: "white", borderColor: "var(--burgundy)", color: "var(--burgundy)" },
  },
  watch: {
    label: "Watch",
    glyph: GLYPH.half,
    style: { background: "transparent", borderColor: "var(--amber)", color: "var(--amber)" },
  },
  excess: {
    label: "Excess",
    glyph: GLYPH.square,
    style: { background: "white", borderColor: "var(--ink)", color: "var(--ink)" },
  },
  no_movement: {
    label: "No movement",
    glyph: GLYPH.ring,
    style: {
      background: "transparent",
      borderColor: "var(--warm)",
      borderStyle: "dashed",
      color: "var(--mid)",
    },
  },
};

export function InvBadge({ bucket }: { bucket: Bucket }) {
  if (bucket === "healthy" || bucket === "none") return null;
  const b = BADGE[bucket];
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 18,
        padding: "0 7px",
        border: "1px solid",
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...b.style,
      }}
    >
      {b.glyph}
      {b.label}
    </span>
  );
}

/** Reconciliation flag: staged cases with no matching paper. Distinct glyph (delta). */
export function ReconcileFlag({ staged, orders }: { staged: number; orders: number }) {
  return (
    <span
      title={`UNIS staged ${staged} cases but open orders cover ${orders}. See the commitments panel.`}
      style={{ color: "var(--amber)", marginLeft: 5, cursor: "help" }}
      aria-label="Staged does not reconcile with open orders"
    >
      <svg width="9" height="9" viewBox="0 0 9 9" style={{ display: "inline" }} aria-hidden>
        <path d="M4.5 0.9 8.4 8.1H0.6Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </span>
  );
}
