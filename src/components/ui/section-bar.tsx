// Section bar — full-width 44px ink-black header used to label every block
// (category headers in the table, panel titles, modal titles, etc.).
// Pure presentational. Server component.

import type { ReactNode } from "react";

interface SectionBarProps {
  children: ReactNode;
  meta?: ReactNode;
  count?: number;
  /** Render the corner register-mark `+` glyphs. Default true. */
  regmarks?: boolean;
  /** Render as <h2>, <h3>, etc. Default <h2>. */
  as?: "h1" | "h2" | "h3" | "div";
}

export function SectionBar({
  children,
  meta,
  count,
  regmarks = true,
  as: As = "h2",
}: SectionBarProps) {
  return (
    <As className="section-bar" style={{ margin: 0 }}>
      <span className="label">
        {regmarks ? <span className="reg" aria-hidden>+</span> : null}
        <span>{children}</span>
        {typeof count !== "undefined" ? (
          <span className="meta" style={{ marginLeft: 6 }}>
            · {count} SKU{count === 1 ? "" : "s"}
          </span>
        ) : null}
      </span>
      <span className="label" style={{ gap: 14 }}>
        {meta ? <span className="meta">{meta}</span> : null}
        {regmarks ? <span className="reg" aria-hidden>+</span> : null}
      </span>
    </As>
  );
}
