// Pure inventory math. No I/O, no Date.now() — callers pass "now"/"today" in,
// which keeps every rule below unit-testable and deterministic.
// Semantics: PLAN_08-27-2026.md section 3 (authoritative).

import {
  DEFAULT_LEAD_TIME_DAYS,
  EXCESS_COVER_WEEKS,
  MIN_HISTORY_DAYS,
  RUNWAY_HORIZON_WEEKS,
  STALE_AMBER_HOURS,
  STALE_RED_HOURS,
  VELOCITY_WINDOW_WEEKS_MAX,
  type Bucket,
  type DayPoint,
  type InboundLineInput,
  type MovementDay,
  type OpenOrderLineInput,
  type Runway,
  type SnapshotInput,
  type Staleness,
  type Velocity,
} from "./types";

const ET = "America/New_York";

// ---------------------------------------------------------------- time

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: ET,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** UTC instant -> ET calendar day key (YYYY-MM-DD). */
export function etDayKey(iso: string): string {
  return dayKeyFmt.format(new Date(iso));
}

const stampFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: ET,
  weekday: "short",
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Wed, 08/27/2026, 4:00 PM" -> "Wed 08-27-2026 4:00 PM ET" (MM-DD-YYYY rule). */
export function fmtEtStamp(iso: string): string {
  const s = stampFmt.format(new Date(iso));
  return s.replaceAll(",", "").replaceAll("/", "-") + " ET";
}

/** Day key -> short display "08-27". */
export function fmtDayShort(dayKey: string): string {
  const [, m, d] = dayKey.split("-");
  return `${m}-${d}`;
}

/** Add n calendar days to a YYYY-MM-DD key (keys are TZ-free at this point). */
export function addDays(dayKey: string, n: number): string {
  const d = new Date(dayKey + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayDiff(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) /
      86_400_000,
  );
}

// ---------------------------------------------------------------- guards

/** Non-finite math must surface as a data-quality state, never as NaN. */
export function finiteOrNull(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- series

/**
 * Snapshot rows (one SKU) -> daily series, ascending by ET day.
 * One point per day: the max(counted_at) row wins (dedupes the 07-24
 * aging-report double). physical = qty + (picked ?? 0) (07-05 baseline
 * rows carry NULL picked).
 */
export function buildDailySeries(snapshots: SnapshotInput[]): DayPoint[] {
  const byDay = new Map<string, SnapshotInput>();
  for (const s of snapshots) {
    const day = etDayKey(s.countedAt);
    const prev = byDay.get(day);
    if (!prev || s.countedAt > prev.countedAt) byDay.set(day, s);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, s]) => {
      const staged = s.qtyPickedCases ?? 0;
      return {
        day,
        countedAt: s.countedAt,
        available: s.qtyCases,
        staged,
        physical: s.qtyCases + staged,
        pallets: s.palletsOnHand,
        notes: s.notes,
      };
    });
}

/** Day-over-day movement; a physical increase is a receipt, never negative consumption. */
export function buildMovement(series: DayPoint[]): MovementDay[] {
  return series.map((p, i) => {
    const prev = i > 0 ? series[i - 1] : null;
    const delta = prev ? p.physical - prev.physical : 0;
    return {
      ...p,
      deltaPhysical: delta,
      consumption: Math.max(0, -delta),
      isReceipt: delta > 0,
    };
  });
}

/**
 * Trailing velocity in cases/week. Window = min(13w, full observed history),
 * stockout-corrected: intervals where the SKU sat at physical 0 on both ends
 * are excluded from the denominator. Under MIN_HISTORY_DAYS of observed
 * history the rate is null ("insufficient history").
 */
export function computeVelocity(series: DayPoint[], todayKey: string): Velocity {
  if (series.length === 0) {
    return { ratePerWeek: null, windowWeeks: 0, reason: "insufficient_history" };
  }
  const firstDay = series[0].day;
  const historyDays = dayDiff(firstDay, todayKey);
  if (historyDays < MIN_HISTORY_DAYS) {
    return {
      ratePerWeek: null,
      windowWeeks: Math.max(1, Math.floor(historyDays / 7)),
      reason: "insufficient_history",
    };
  }
  const windowWeeks = Math.min(
    VELOCITY_WINDOW_WEEKS_MAX,
    Math.max(1, Math.floor(historyDays / 7)),
  );
  const windowStart = addDays(todayKey, -windowWeeks * 7);
  const inWindow = series.filter((p) => p.day >= windowStart);
  if (inWindow.length < 2) {
    return { ratePerWeek: null, windowWeeks, reason: "insufficient_history" };
  }

  let consumption = 0;
  let activeDays = 0;
  for (let i = 1; i < inWindow.length; i++) {
    const a = inWindow[i - 1];
    const b = inWindow[i];
    const span = dayDiff(a.day, b.day);
    const stockedOut = a.physical === 0 && b.physical === 0;
    if (!stockedOut) {
      activeDays += span;
      consumption += Math.max(0, a.physical - b.physical);
    }
  }
  if (activeDays <= 0) {
    return { ratePerWeek: 0, windowWeeks, reason: "no_movement" };
  }
  const rate = consumption / (activeDays / 7);
  if (consumption === 0) {
    return { ratePerWeek: 0, windowWeeks, reason: "no_movement" };
  }
  return { ratePerWeek: finiteOrNull(rate), windowWeeks };
}

// ---------------------------------------------------------------- quantities

/** Open (unshipped) paper cases for one SKU. Caller has already excluded METRO-% orders. */
export function computeOrdersOpen(lines: OpenOrderLineInput[]): number {
  return lines.reduce(
    (sum, l) => sum + Math.max(0, l.qtyCases - l.qtyShippedCases),
    0,
  );
}

/**
 * ATP: warehouse-available minus paper commitments UNIS has not staged yet.
 * Staged cases are (part of) the open orders already picked; subtracting both
 * would double-count. Negative is a real signal and is never clamped.
 */
export function computeAvailable(
  qtyCases: number,
  staged: number,
  ordersOpen: number,
): number {
  return qtyCases - Math.max(0, ordersOpen - staged);
}

/** Physical picks with no matching paper: the reconciliation anomaly. */
export function reconcileFlag(staged: number, ordersOpen: number): boolean {
  return staged > ordersOpen;
}

export function computeInbound(lines: InboundLineInput[]): number {
  return lines.reduce((sum, l) => sum + l.qtyCases, 0);
}

export function coverWeeks(
  available: number,
  velocity: Velocity,
): number | null {
  if (velocity.ratePerWeek === null || velocity.ratePerWeek <= 0) return null;
  return finiteOrNull(available / velocity.ratePerWeek);
}

// ---------------------------------------------------------------- buckets

export interface BucketArgs {
  hasHistory: boolean;
  physical: number;
  available: number;
  inboundTotal: number;
  /** inbound cases with ETA on or before today + lead time */
  inboundWithinLeadTime: number;
  velocity: Velocity;
  cover: number | null;
  floor: number | null; // reorder_point_cases
  leadTimeDays: number | null;
}

/**
 * Strict precedence: STOCKOUT > ALLOCATED OUT > ACT NOW > WATCH >
 * NO MOVEMENT > EXCESS > HEALTHY. SKUs with no snapshot history are "none".
 */
export function computeBucket(a: BucketArgs): Bucket {
  if (!a.hasHistory) return "none";
  const lt = a.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
  const ltWeeks = lt / 7;
  if (a.physical <= 0) return "stockout";
  if (a.available <= 0) return "allocated_out";
  const rate = a.velocity.ratePerWeek ?? 0;
  if (a.floor !== null) {
    const positionAtLeadTime = a.available - rate * ltWeeks + a.inboundWithinLeadTime;
    if (positionAtLeadTime < a.floor) return "act_now";
    if (a.available < a.floor && a.available + a.inboundTotal >= a.floor) {
      return "watch";
    }
  }
  if (a.cover !== null && a.cover < ltWeeks) return "watch";
  if (a.velocity.reason === "no_movement") return "no_movement";
  if (a.cover !== null && a.cover > EXCESS_COVER_WEEKS) return "excess";
  return "healthy";
}

// ---------------------------------------------------------------- freshness

export function computeStaleness(nowIso: string, latestCountedAt: string | null): {
  state: Staleness;
  hoursOld: number | null;
} {
  if (!latestCountedAt) return { state: "red", hoursOld: null };
  const hours =
    (new Date(nowIso).getTime() - new Date(latestCountedAt).getTime()) / 3_600_000;
  if (hours > STALE_RED_HOURS) return { state: "red", hoursOld: hours };
  if (hours > STALE_AMBER_HOURS) return { state: "amber", hoursOld: hours };
  return { state: "fresh", hoursOld: hours };
}

/** Missing ET report days among the trailing `count` expected daily reports. */
export function missingReportDays(
  reportDays: string[], // ET day keys that DO have a system report
  todayKey: string,
  count = 14,
): string[] {
  const have = new Set(reportDays);
  const missing: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = addDays(todayKey, -i);
    if (!have.has(d)) missing.push(d);
  }
  return missing.reverse();
}

// ---------------------------------------------------------------- runway

export interface RunwayArgs {
  todayKey: string;
  available: number;
  velocity: Velocity;
  openOrders: OpenOrderLineInput[];
  inbound: InboundLineInput[];
  floor: number | null;
  horizonWeeks?: number;
}

/**
 * Projection semantics (UIUX spec section 5): start at Available; step down by
 * each open order at its requested date (undated orders step today); the
 * segment through the last known commitment is "known" (solid); beyond it the
 * line declines at trailing velocity ("inferred", dashed) — velocity is NOT
 * applied on top of known commitments, which would double-count. Containers
 * jump the line up at their ETA in both phases.
 */
export function projectRunway(a: RunwayArgs): Runway {
  const horizonDays = (a.horizonWeeks ?? RUNWAY_HORIZON_WEEKS) * 7;
  const rate = a.velocity.ratePerWeek;
  const dailyRate = rate !== null && rate > 0 ? rate / 7 : 0;

  const ordersByDay = new Map<string, number>();
  let lastCommitmentDay = a.todayKey;
  for (const o of a.openOrders) {
    const open = Math.max(0, o.qtyCases - o.qtyShippedCases);
    if (open === 0) continue;
    let day = o.requestedDate ?? a.todayKey;
    if (day < a.todayKey) day = a.todayKey;
    if (day > lastCommitmentDay) lastCommitmentDay = day;
    ordersByDay.set(day, (ordersByDay.get(day) ?? 0) + open);
  }

  const arrivalsByDay = new Map<string, { qty: number; containerNo: string | null }>();
  for (const l of a.inbound) {
    if (!l.eta || l.qtyCases <= 0) continue;
    const prev = arrivalsByDay.get(l.eta);
    arrivalsByDay.set(l.eta, {
      qty: (prev?.qty ?? 0) + l.qtyCases,
      containerNo: prev?.containerNo ?? l.containerNo,
    });
  }

  // ATP already subtracts open orders; the projection re-plays them on their
  // dates, so start from the pre-commitment figure to avoid double-counting.
  const totalOpen = Array.from(ordersByDay.values()).reduce((s, q) => s + q, 0);
  let value = a.available + totalOpen;

  const points = [];
  const arrivals: Runway["arrivals"] = [];
  let floorCrossDay: string | null = null;
  const noVelocity = rate === null;

  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(a.todayKey, i);
    const inferred = day > lastCommitmentDay;
    if (i > 0 && inferred && !noVelocity) value -= dailyRate;
    const orderDrop = ordersByDay.get(day);
    if (orderDrop) value -= orderDrop;
    const arrival = arrivalsByDay.get(day);
    if (arrival) {
      value += arrival.qty;
      arrivals.push({ day, qty: arrival.qty, containerNo: arrival.containerNo });
    }
    if (noVelocity && inferred && day > addDays(lastCommitmentDay, 0)) {
      // No velocity: the projection ends at the last known commitment.
      if (points.length > 0 && points[points.length - 1].day === lastCommitmentDay) {
        break;
      }
    }
    const v = finiteOrNull(value) ?? 0;
    points.push({ day, value: Math.round(v * 100) / 100, inferred });
    if (floorCrossDay === null && a.floor !== null && v < a.floor) {
      floorCrossDay = day;
    }
  }
  return { points, floorCrossDay, arrivals };
}
