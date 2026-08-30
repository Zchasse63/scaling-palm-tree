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

/**
 * Median of gap-day values. Even counts average the two middle values —
 * gaps of [7, 21] should read 14, not 21 (the naive upper-middle pick).
 */
export function medianGap(gaps: number[]): number | null {
  if (gaps.length === 0) return null;
  const sorted = gaps.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** P90 of a distribution (order-line cases). Null under `minCount` samples. */
export function p90(values: number[], minCount: number): number | null {
  if (values.length < minCount) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.9) - 1)];
}

// ---------------------------------------------------------------- series

/**
 * Snapshot rows (one SKU) -> daily series, ascending by ET day.
 * One point per day: the max(counted_at) row wins (dedupes the 07-24
 * aging-report double). physical = qty + (picked ?? 0) (07-05 baseline
 * rows carry NULL picked).
 *
 * When `reportDays` (every ET day with a system report, any SKU) is given,
 * report days after the SKU's first appearance where the SKU is absent get an
 * explicit tombstone zero. UNIS omits sold-out SKUs, so without these points
 * a sell-to-zero never shows in movement and velocity misses the final draw.
 */
export function buildDailySeries(
  snapshots: SnapshotInput[],
  reportDays?: string[],
): DayPoint[] {
  const byDay = new Map<string, SnapshotInput>();
  for (const s of snapshots) {
    const day = etDayKey(s.countedAt);
    const prev = byDay.get(day);
    if (!prev || s.countedAt > prev.countedAt) byDay.set(day, s);
  }
  const points: DayPoint[] = Array.from(byDay.entries()).map(([day, s]) => {
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
  if (reportDays && byDay.size > 0) {
    const firstDay = Array.from(byDay.keys()).sort()[0];
    for (const day of reportDays) {
      if (day > firstDay && !byDay.has(day)) {
        points.push({
          day,
          countedAt: day + "T23:59:59Z", // synthetic; ordering only
          available: 0,
          staged: 0,
          physical: 0,
          pallets: 0,
          notes: null,
          tombstone: true,
        });
      }
    }
  }
  return points.sort((a, b) => (a.day < b.day ? -1 : 1));
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

// ---------------------------------------------------------------- item stats

export interface ConsumptionStats {
  totalConsumed: number;
  peakDraw: { day: string; cases: number } | null;
  firstObservedDay: string | null;
  lastMovementDay: string | null; // last day with any consumption
  daysSinceMovement: number | null;
}

/** Lifetime consumption statistics for the item profile. Pure. */
export function consumptionStats(
  movement: MovementDay[],
  todayKey: string,
): ConsumptionStats {
  let totalConsumed = 0;
  let peakDraw: ConsumptionStats["peakDraw"] = null;
  let lastMovementDay: string | null = null;
  for (const m of movement) {
    totalConsumed += m.consumption;
    if (m.consumption > 0) {
      // movement is chronological; the latest hit wins
      lastMovementDay = m.day;
      if (!peakDraw || m.consumption > peakDraw.cases) {
        peakDraw = { day: m.day, cases: m.consumption };
      }
    }
  }
  return {
    totalConsumed,
    peakDraw,
    firstObservedDay: movement.length > 0 ? movement[0].day : null,
    lastMovementDay,
    daysSinceMovement: lastMovementDay ? dayDiff(lastMovementDay, todayKey) : null,
  };
}

// ---------------------------------------------------------------- cadence

export interface CustomerCadence {
  customerName: string;
  orderCount: number;
  lastOrderDay: string;
  typicalGapDays: number | null; // median gap; needs 3+ distinct order days
  /** negative = overdue by that many days; null when no cadence yet */
  dueInDays: number | null;
  usualSkus: string[]; // top by cases
}

/**
 * Expected-order engine: per-customer reorder cadence from real order days.
 * Median gap needs 3+ distinct order days; due = lastOrder + gap − today.
 * No statistical forecasting — this is the operator's reorder calendar,
 * exactly the lumpy-demand doctrine from the research.
 */
export function customerCadences(
  orders: Array<{ customerName: string; day: string; sku: string; cases: number }>,
  todayKey: string,
): CustomerCadence[] {
  const byCustomer = new Map<
    string,
    { days: Set<string>; skuCases: Map<string, number> }
  >();
  for (const o of orders) {
    const e =
      byCustomer.get(o.customerName) ?? { days: new Set(), skuCases: new Map() };
    e.days.add(o.day);
    e.skuCases.set(o.sku, (e.skuCases.get(o.sku) ?? 0) + o.cases);
    byCustomer.set(o.customerName, e);
  }
  const out: CustomerCadence[] = [];
  for (const [customerName, e] of byCustomer) {
    const days = Array.from(e.days).sort();
    const last = days[days.length - 1];
    const typicalGapDays =
      days.length >= 3
        ? medianGap(days.slice(1).map((d, i) => dayDiff(days[i], d)))
        : null;
    const dueInDays =
      typicalGapDays !== null
        ? typicalGapDays - dayDiff(last, todayKey)
        : null;
    out.push({
      customerName,
      orderCount: days.length,
      lastOrderDay: last,
      typicalGapDays,
      dueInDays,
      usualSkus: Array.from(e.skuCases.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([sku]) => sku),
    });
  }
  // Most overdue first; customers without a cadence yet sink to the bottom.
  return out.sort((a, b) => (a.dueInDays ?? 9e9) - (b.dueInDays ?? 9e9));
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
  inbound: InboundLineInput[];
  floor: number | null;
  horizonWeeks?: number;
}

/**
 * Canonical projection — the ONE forward math shared by the runway chart and
 * the ACT NOW bucket test (computeBucket's positionAtLeadTime is this
 * function evaluated at today + lead time, so the chart and the badge can
 * never disagree).
 *
 * Start at Available-to-promise. Open commitments are already netted out of
 * ATP, so they are NOT re-played as steps (the previous version re-added
 * them and stepped them back down, which showed an inflated starting
 * position). The line declines at trailing velocity from today and jumps up
 * at container ETAs. All future points are velocity-inferred (dashed); with
 * no velocity the line holds flat so the operator sees "no demand signal",
 * not a guess.
 *
 * Deliberate conservative bias, documented in PLAN section 3: trailing
 * velocity includes the demand behind today's open orders, which ATP has
 * also subtracted. Until real per-customer forecasting exists, over-warning
 * beats under-warning.
 */
export function projectRunway(a: RunwayArgs): Runway {
  const horizonDays = (a.horizonWeeks ?? RUNWAY_HORIZON_WEEKS) * 7;
  const rate = a.velocity.ratePerWeek;
  const dailyRate = rate !== null && rate > 0 ? rate / 7 : 0;

  const arrivalsByDay = new Map<string, { qty: number; labels: string[] }>();
  for (const l of a.inbound) {
    if (!l.eta || l.qtyCases <= 0) continue;
    const e = arrivalsByDay.get(l.eta) ?? { qty: 0, labels: [] };
    e.qty += l.qtyCases;
    if (l.containerNo && !e.labels.includes(l.containerNo)) e.labels.push(l.containerNo);
    arrivalsByDay.set(l.eta, e);
  }

  let value = a.available;
  const points = [];
  const arrivals: Runway["arrivals"] = [];
  let floorCrossDay: string | null = null;

  for (let i = 0; i <= horizonDays; i++) {
    const day = addDays(a.todayKey, i);
    if (i > 0) value -= dailyRate;
    const arrival = arrivalsByDay.get(day);
    if (arrival) {
      value += arrival.qty;
      arrivals.push({
        day,
        qty: arrival.qty,
        containerNo: arrival.labels.length > 0 ? arrival.labels.join(" / ") : null,
      });
    }
    const v = finiteOrNull(value) ?? 0;
    points.push({ day, value: Math.round(v * 100) / 100, inferred: i > 0 });
    if (floorCrossDay === null && a.floor !== null && v < a.floor) {
      floorCrossDay = day;
    }
  }
  return { points, floorCrossDay, arrivals };
}
