// Weekly consumption sparkline: 52x16, 3px bars, 1px gaps, newest at right.
// Receipt weeks carry a 1px warm top tick. Server-rendered, crisp edges.

export function Sparkline({
  weeks,
  receipts,
  label,
}: {
  weeks: number[]; // oldest -> newest
  receipts: boolean[];
  label: string;
}) {
  const W = 52;
  const H = 16;
  const barW = 3;
  const gap = 1;
  const n = Math.min(weeks.length, 13);
  const shown = weeks.slice(-n);
  const shownReceipts = receipts.slice(-n);
  const max = Math.max(1, ...shown);
  const x0 = W - n * (barW + gap);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      style={{ display: "block" }}
    >
      {shown.map((v, i) => {
        const h = v === 0 ? 1 : Math.max(2, Math.round((v / max) * (H - 3)));
        const x = x0 + i * (barW + gap);
        const y = H - h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={v === 0 ? "var(--rule-strong)" : "var(--ink)"}
            />
            {shownReceipts[i] ? (
              <rect x={x} y={Math.max(0, y - 2)} width={barW} height={1} fill="var(--warm)" />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
