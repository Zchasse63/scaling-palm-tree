// Runway: does stock bridge to the next container? Server-rendered SVG.
// Geometry per UIUX spec section 5: solid through the last known commitment,
// dashed at trailing velocity beyond it, jumps at container ETAs, burgundy
// floor hairline, amber shaded band in the WATCH case.

import { addDays, dayDiff, fmtDayShort } from "@/lib/inventory/calc";
import type { Runway } from "@/lib/inventory/types";

const W = 720;
const H = 180;
const PAD_TOP = 24; // room for arrival labels
const PAD_BOTTOM = 18; // room for date ticks

export function RunwayChart({
  runway,
  floor,
  todayKey,
  band,
  ariaLabel,
}: {
  runway: Runway;
  floor: number | null;
  todayKey: string;
  band: { from: string; to: string } | null;
  ariaLabel: string;
}) {
  const pts = runway.points;
  if (pts.length === 0) return null;

  const horizonDays = Math.max(1, dayDiff(todayKey, pts[pts.length - 1].day));
  const values = pts.map((p) => p.value);
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(...values, floor ?? 0, 1);
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const x = (day: string) => (dayDiff(todayKey, day) / horizonDays) * W;
  const y = (v: number) => PAD_TOP + ((yMax - v) / (yMax - yMin)) * plotH;

  const solid = pts.filter((p) => !p.inferred);
  const inferred = pts.filter((p) => p.inferred);
  // Bridge the two segments so the line is continuous.
  if (solid.length > 0 && inferred.length > 0) inferred.unshift(solid[solid.length - 1]);

  const path = (seg: typeof pts) =>
    seg.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const endDay = pts[pts.length - 1].day;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      style={{ display: "block", background: "white" }}
    >
      {/* WATCH band: floor-crossing date to the earlier of first ETA / lead time */}
      {band ? (
        <rect
          x={x(band.from)}
          y={PAD_TOP}
          width={Math.max(0, x(band.to) - x(band.from))}
          height={plotH}
          fill="var(--amber-bg)"
        />
      ) : null}

      {/* zero line when the projection goes negative */}
      {yMin < 0 ? (
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--rule-strong)" strokeWidth={1} />
      ) : null}

      {/* container arrivals: warm date bars + labels */}
      {runway.arrivals.map((a) => (
        <g key={a.day}>
          <rect x={x(a.day) - 1.5} y={PAD_TOP} width={3} height={plotH} fill="var(--rule-strong)" />
          <text
            x={Math.min(x(a.day) + 5, W - 4)}
            y={14}
            textAnchor={x(a.day) > W - 150 ? "end" : "start"}
            style={{ font: "10px var(--font-geist-mono), monospace", fill: "var(--mid)" }}
          >
            <title>{`${a.containerNo ?? "container"} · ${a.qty.toLocaleString("en-US")} cs · ETA ${fmtDayShort(a.day)}`}</title>
            {a.containerNo ?? "container"} · {a.qty.toLocaleString("en-US")} cs · ETA {fmtDayShort(a.day)}
          </text>
        </g>
      ))}

      {/* floor hairline, labeled inline */}
      {floor !== null ? (
        <g>
          <line x1={0} x2={W} y1={y(floor)} y2={y(floor)} stroke="var(--burgundy)" strokeWidth={1} />
          <text
            x={W - 4}
            y={y(floor) - 4}
            textAnchor="end"
            style={{
              font: "9px var(--font-geist-mono), monospace",
              fill: "var(--burgundy)",
              letterSpacing: "0.08em",
            }}
          >
            FLOOR {floor.toLocaleString("en-US")}
          </text>
        </g>
      ) : null}

      {/* projection: solid = known commitments, dashed = inferred velocity */}
      {solid.length > 1 ? (
        <path d={path(solid)} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
      ) : null}
      {inferred.length > 1 ? (
        <path
          d={path(inferred)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      ) : null}
      {/* open endpoint when the projection stops early (no velocity) */}
      {inferred.length === 0 && dayDiff(todayKey, endDay) < horizonDays ? null : null}
      <circle
        cx={x(endDay)}
        cy={y(pts[pts.length - 1].value)}
        r={2.5}
        fill="white"
        stroke="var(--ink)"
        strokeWidth={1.2}
      />

      {/* baseline + date ticks: today, +8w, end */}
      <line x1={0} x2={W} y1={H - PAD_BOTTOM} y2={H - PAD_BOTTOM} stroke="var(--rule)" strokeWidth={1} />
      {[todayKey, addDays(todayKey, Math.floor(horizonDays / 2)), endDay].map((d, i) => (
        <text
          key={d + i}
          x={i === 0 ? 2 : i === 2 ? W - 2 : x(d)}
          y={H - 5}
          textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          style={{ font: "9px var(--font-geist-mono), monospace", fill: "var(--warm)" }}
        >
          {fmtDayShort(d)}
        </text>
      ))}
    </svg>
  );
}
