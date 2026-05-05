"use client";

// Progress bar — animated fill with hairline tick marks at 25/50/75%.
// At exactly 100% the fill turns pure black with a white ✓.
// Over 100%, the fill clamps and a burgundy striped overflow appears at the right.

interface ProgressBarProps {
  /** Percentage 0..N. May exceed 100. */
  pct: number;
  height?: number;
}

export function ProgressBar({ pct, height = 14 }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  const over = pct > 100 ? Math.min(40, pct - 100) : 0;
  const full = pct >= 100 - 1e-3 && pct <= 100 + 1e-3;

  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Number.isFinite(pct) ? +pct.toFixed(1) : 0}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height }}
    >
      <div
        className={"fill" + (full ? " full" : "")}
        style={{ width: clamped + "%" }}
      />
      {full ? <span className="check">✓</span> : null}
      {over > 0 ? (
        <>
          <div
            className="over"
            style={{ width: Math.min(20, over) + "%", left: "auto", right: 0 }}
          />
          {over >= 4 ? <span className="over-label">OVER</span> : null}
        </>
      ) : null}
      <div className="ticks">
        {[25, 50, 75].map((t) => (
          <span key={t} style={{ left: t + "%" }} />
        ))}
      </div>
    </div>
  );
}
