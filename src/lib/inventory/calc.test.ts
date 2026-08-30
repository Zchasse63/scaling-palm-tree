import { describe, expect, it } from "vitest";
import {
  addDays,
  buildDailySeries,
  buildMovement,
  computeAvailable,
  computeBucket,
  computeInbound,
  computeOrdersOpen,
  computeStaleness,
  computeVelocity,
  consumptionStats,
  coverWeeks,
  customerCadences,
  etDayKey,
  finiteOrNull,
  fmtEtStamp,
  medianGap,
  missingReportDays,
  p90,
  projectRunway,
  reconcileFlag,
} from "./calc";
import type { SnapshotInput, Velocity } from "./types";

function snap(
  day: string,
  qty: number,
  picked: number | null = 0,
  countedAtIso?: string,
): SnapshotInput {
  return {
    vendorProductId: "vp-1",
    countedAt: countedAtIso ?? day + "T16:00:00Z", // midday ET, unambiguous
    qtyCases: qty,
    qtyPickedCases: picked,
    palletsOnHand: null,
    notes: null,
  };
}

const vel = (ratePerWeek: number | null, reason?: Velocity["reason"]): Velocity => ({
  ratePerWeek,
  windowWeeks: 13,
  ...(reason ? { reason } : {}),
});

describe("timezone handling", () => {
  it("buckets a 4pm ET (20:00 UTC) report into the ET calendar day", () => {
    expect(etDayKey("2026-08-27T20:00:00Z")).toBe("2026-08-27");
  });
  it("buckets a late-evening ET report into the ET day, not the UTC day", () => {
    // 02:00 UTC on 08-28 is 22:00 ET on 08-27
    expect(etDayKey("2026-08-28T02:00:00Z")).toBe("2026-08-27");
  });
  it("renders the ET stamp in MM-DD-YYYY with ET time", () => {
    const s = fmtEtStamp("2026-08-27T20:00:00Z");
    expect(s).toContain("08-27-2026");
    expect(s).toContain("4:00 PM ET");
  });
});

describe("buildDailySeries", () => {
  it("treats NULL picked as 0 (07-05 baseline rows) without NaN", () => {
    const [p] = buildDailySeries([snap("2026-07-05", 100, null)]);
    expect(p.physical).toBe(100);
    expect(p.staged).toBe(0);
    expect(Number.isFinite(p.physical)).toBe(true);
  });
  it("dedupes same-ET-day rows to the latest counted_at (aging-report double)", () => {
    const series = buildDailySeries([
      snap("2026-07-24", 999, 0, "2026-07-24T12:00:00Z"),
      snap("2026-07-24", 204, 0, "2026-07-24T20:00:00Z"),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].available).toBe(204);
  });
  it("computes physical = available + staged", () => {
    const [p] = buildDailySeries([snap("2026-08-27", 874, 84)]);
    expect(p.physical).toBe(958);
  });
  it("materializes tombstone zeros on report days the SKU is absent from", () => {
    const reportDays = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"];
    const series = buildDailySeries(
      [snap("2026-08-02", 40), snap("2026-08-03", 10)],
      reportDays,
    );
    // no tombstone before the SKU first appears (08-01), one after (08-04)
    expect(series.map((p) => p.day)).toEqual([
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
    ]);
    const tomb = series[2];
    expect(tomb.physical).toBe(0);
    expect(tomb.tombstone).toBe(true);
    // the sell-to-zero now shows as consumption in movement
    const m = buildMovement(series);
    expect(m[2].consumption).toBe(10);
  });
});

describe("medianGap / p90", () => {
  it("averages the two middle gaps on even counts", () => {
    expect(medianGap([7, 21])).toBe(14);
    expect(medianGap([7, 14, 21])).toBe(14);
    expect(medianGap([])).toBeNull();
  });
  it("p90 needs the minimum sample count and picks the 90th percentile", () => {
    expect(p90([10, 20], 5)).toBeNull();
    expect(p90([10, 10, 10, 10, 100], 5)).toBe(100);
    expect(p90(Array.from({ length: 10 }, (_, i) => (i + 1) * 10), 5)).toBe(90);
  });
});

describe("buildMovement", () => {
  it("flags receipts and never emits negative consumption", () => {
    const m = buildMovement(
      buildDailySeries([
        snap("2026-08-01", 500),
        snap("2026-08-02", 450),
        snap("2026-08-03", 4450), // container lands
      ]),
    );
    expect(m[1].consumption).toBe(50);
    expect(m[1].isReceipt).toBe(false);
    expect(m[2].consumption).toBe(0);
    expect(m[2].isReceipt).toBe(true);
    expect(m[2].deltaPhysical).toBe(4000);
  });
});

describe("computeVelocity", () => {
  it("returns insufficient history under 21 observed days", () => {
    const v = computeVelocity(
      buildDailySeries([snap("2026-08-15", 100), snap("2026-08-20", 80)]),
      "2026-08-27",
    );
    expect(v.ratePerWeek).toBeNull();
    expect(v.reason).toBe("insufficient_history");
  });

  it("uses the short-history divisor, never a fixed 13 weeks", () => {
    // First snapshot 07-05, today 08-27: 53 days -> 7 full weeks
    const v = computeVelocity(
      buildDailySeries([
        snap("2026-07-05", 700),
        snap("2026-08-26", 350),
      ]),
      "2026-08-27",
    );
    expect(v.windowWeeks).toBe(7);
    // window start = 08-27 minus 49d = 07-09; only the 08-26 row is inside,
    // so a single in-window point -> insufficient for a rate
    expect(v.ratePerWeek).toBeNull();
  });

  it("computes a stockout-corrected rate", () => {
    const series = buildDailySeries([
      snap("2026-06-01", 100),
      snap("2026-06-08", 0), // 100 consumed over 7 days
      snap("2026-06-15", 0), // stocked out span: excluded
      snap("2026-06-22", 500), // receipt span (counts as active, 0 consumption)
      snap("2026-06-29", 400), // 100 consumed over 7 days
    ]);
    const v = computeVelocity(series, "2026-06-29");
    // active days = 7 + 7 + 7 = 21; consumption = 200 -> 200 / 3w
    expect(v.windowWeeks).toBe(4);
    expect(v.ratePerWeek).toBeCloseTo(200 / 3, 5);
  });

  it("reports no_movement on a flat series with real history", () => {
    const series = buildDailySeries(
      Array.from({ length: 9 }, (_, i) => snap(addDays("2026-06-01", i * 7), 500)),
    );
    const v = computeVelocity(series, "2026-07-27");
    expect(v.ratePerWeek).toBe(0);
    expect(v.reason).toBe("no_movement");
  });
});

describe("ATP math", () => {
  it("does not double-subtract orders UNIS already staged", () => {
    // qty 1,004 available at UNIS, 84 staged, 120 on open paper
    expect(computeAvailable(1004, 84, 120)).toBe(968);
  });
  it("subtracts nothing when staging covers all open paper", () => {
    expect(computeAvailable(1004, 150, 120)).toBe(1004);
  });
  it("goes negative as a signal, never clamped", () => {
    expect(computeAvailable(100, 0, 150)).toBe(-50);
  });
  it("flags staged cases with no matching paper", () => {
    expect(reconcileFlag(84, 0)).toBe(true);
    expect(reconcileFlag(84, 120)).toBe(false);
  });
  it("sums open order lines net of shipped", () => {
    expect(
      computeOrdersOpen([
        { vendorProductId: "vp-1", qtyCases: 100, qtyShippedCases: 40, orderNumber: null, customerName: "A", requestedDate: null },
        { vendorProductId: "vp-1", qtyCases: 60, qtyShippedCases: 60, orderNumber: null, customerName: "B", requestedDate: null },
      ]),
    ).toBe(60);
  });
});

describe("coverWeeks", () => {
  it("is null without a usable rate", () => {
    expect(coverWeeks(500, vel(null, "insufficient_history"))).toBeNull();
    expect(coverWeeks(500, vel(0, "no_movement"))).toBeNull();
  });
  it("divides available by the weekly rate", () => {
    expect(coverWeeks(500, vel(70))).toBeCloseTo(7.1428, 3);
  });
});

describe("computeBucket precedence", () => {
  const base = {
    hasHistory: true,
    physical: 500,
    available: 500,
    inboundTotal: 0,
    inboundWithinLeadTime: 0,
    velocity: vel(70),
    cover: 500 / 70,
    floor: null as number | null,
    leadTimeDays: 70,
  };

  it("none without history", () => {
    expect(computeBucket({ ...base, hasHistory: false })).toBe("none");
  });
  it("stockout beats everything, floor set or not", () => {
    expect(computeBucket({ ...base, physical: 0, available: 0 })).toBe("stockout");
  });
  it("allocated_out when fully committed but physically present", () => {
    expect(computeBucket({ ...base, physical: 100, available: -50 })).toBe(
      "allocated_out",
    );
  });
  it("act_now when projected position at lead time falls below the floor", () => {
    // 500 available - 70/wk * 10wk = -200 < 240
    expect(computeBucket({ ...base, floor: 240 })).toBe("act_now");
  });
  it("act_now suppressed when inbound inside lead time closes the gap; cover < lead time still watches", () => {
    expect(
      computeBucket({
        ...base,
        floor: 240,
        inboundTotal: 4000,
        inboundWithinLeadTime: 4000,
      }),
    ).toBe("watch"); // cover 7.1w < 10w lead time
  });
  it("watch when below floor but position covers (covered only if the container arrives)", () => {
    expect(
      computeBucket({
        ...base,
        available: 100,
        physical: 100,
        velocity: vel(2),
        cover: 50,
        floor: 240,
        inboundTotal: 4000,
        inboundWithinLeadTime: 4000,
      }),
    ).toBe("watch");
  });
  it("no_movement takes priority over excess and divides nothing", () => {
    expect(
      computeBucket({
        ...base,
        velocity: vel(0, "no_movement"),
        cover: null,
      }),
    ).toBe("no_movement");
  });
  it("excess above 26 weeks of cover", () => {
    expect(
      computeBucket({ ...base, velocity: vel(10), cover: 50 }),
    ).toBe("excess");
  });
  it("healthy otherwise", () => {
    expect(
      computeBucket({ ...base, velocity: vel(40), cover: 12.5 }),
    ).toBe("healthy");
  });
});

describe("computeStaleness", () => {
  const report = "2026-08-27T20:00:00Z"; // 4pm ET
  it("fresh inside 30 hours", () => {
    expect(computeStaleness("2026-08-28T16:00:00Z", report).state).toBe("fresh");
  });
  it("amber after one missed report (>30h)", () => {
    expect(computeStaleness("2026-08-29T03:00:00Z", report).state).toBe("amber");
  });
  it("red after two missed reports (>54h)", () => {
    expect(computeStaleness("2026-08-30T03:00:00Z", report).state).toBe("red");
  });
  it("red when no report exists at all", () => {
    expect(computeStaleness("2026-08-28T16:00:00Z", null).state).toBe("red");
  });
});

describe("missingReportDays", () => {
  it("lists gap days in the trailing window", () => {
    const have = ["2026-08-26", "2026-08-24", "2026-08-23"];
    const missing = missingReportDays(have, "2026-08-27", 4);
    expect(missing).toEqual(["2026-08-25"]);
  });
});

describe("projectRunway", () => {
  it("starts at ATP, declines at velocity, jumps at container ETAs", () => {
    const r = projectRunway({
      todayKey: "2026-09-01",
      available: 800,
      velocity: vel(70), // 10/day
      inbound: [
        { shipmentId: "s1", vendorProductId: "vp-1", sku: null, qtyCases: 4000, eta: "2026-09-20", containerNo: "EGSU2569353" },
      ],
      floor: 240,
    });
    const byDay = new Map(r.points.map((p) => [p.day, p]));
    // starts at ATP exactly — open commitments are already netted out and
    // must NOT be re-added (the pre-audit version showed an inflated start)
    expect(byDay.get("2026-09-01")!.value).toBe(800);
    expect(byDay.get("2026-09-01")!.inferred).toBe(false);
    // velocity decline from day 1; everything forward is inferred
    expect(byDay.get("2026-09-05")!.value).toBeCloseTo(760, 5);
    expect(byDay.get("2026-09-05")!.inferred).toBe(true);
    expect(byDay.get("2026-09-19")!.value).toBeCloseTo(620, 5);
    // container arrival jumps the line
    expect(byDay.get("2026-09-20")!.value).toBeCloseTo(4610, 5);
    expect(r.arrivals).toEqual([
      { day: "2026-09-20", qty: 4000, containerNo: "EGSU2569353" },
    ]);
    // 800 - 10/day crosses 240 at +57d, but the container refills first —
    // after 09-20 the line stays far above floor, so no crossing before it.
    expect(r.floorCrossDay).toBeNull();
  });

  it("holds flat across the horizon when velocity is unknown", () => {
    const r = projectRunway({
      todayKey: "2026-09-01",
      available: 500,
      velocity: vel(null, "insufficient_history"),
      inbound: [],
      floor: null,
    });
    expect(r.points[0]).toMatchObject({ day: "2026-09-01", value: 500 });
    expect(r.points[r.points.length - 1].value).toBe(500);
    expect(r.points.length).toBe(16 * 7 + 1);
  });

  it("records the floor-crossing day, matching computeBucket's ACT NOW math", () => {
    const r = projectRunway({
      todayKey: "2026-09-01",
      available: 300,
      velocity: vel(70), // 10/day
      inbound: [],
      floor: 240,
    });
    // 300 - 10/day: below 240 on day +7 (value 230)
    expect(r.floorCrossDay).toBe("2026-09-08");
    // consistency: bucket position at a 7-day lead time = same value
    const bucket = computeBucket({
      hasHistory: true,
      physical: 300,
      available: 300,
      inboundTotal: 0,
      inboundWithinLeadTime: 0,
      velocity: vel(70),
      cover: 300 / 70,
      floor: 240,
      leadTimeDays: 7,
    });
    expect(bucket).toBe("act_now");
  });

  it("merges same-day arrivals and joins container labels", () => {
    const r = projectRunway({
      todayKey: "2026-09-01",
      available: 100,
      velocity: vel(null, "insufficient_history"),
      inbound: [
        { shipmentId: "s1", vendorProductId: "vp-1", sku: null, qtyCases: 2000, eta: "2026-10-15", containerNo: "CONT-A" },
        { shipmentId: "s2", vendorProductId: "vp-1", sku: null, qtyCases: 1500, eta: "2026-10-15", containerNo: "CONT-B" },
      ],
      floor: null,
    });
    expect(r.arrivals).toEqual([
      { day: "2026-10-15", qty: 3500, containerNo: "CONT-A / CONT-B" },
    ]);
  });
});

describe("consumptionStats", () => {
  it("totals, peak draw, and days since movement", () => {
    const m = buildMovement(
      buildDailySeries([
        snap("2026-08-01", 500),
        snap("2026-08-05", 450),
        snap("2026-08-10", 240),
        snap("2026-08-20", 240),
      ]),
    );
    const st = consumptionStats(m, "2026-08-27");
    expect(st.totalConsumed).toBe(260);
    expect(st.peakDraw).toEqual({ day: "2026-08-10", cases: 210 });
    expect(st.firstObservedDay).toBe("2026-08-01");
    expect(st.daysSinceMovement).toBe(17);
  });
});

describe("customerCadences", () => {
  const line = (customerName: string, day: string, sku = "SKU-A", cases = 10) => ({
    customerName,
    day,
    sku,
    cases,
  });
  it("computes median gap and due-in from 3+ order days, most overdue first", () => {
    const out = customerCadences(
      [
        // FSD: orders every ~21 days, last on 08-01 -> overdue by 5 on 08-27
        line("FSD", "2026-06-20"),
        line("FSD", "2026-07-11"),
        line("FSD", "2026-08-01"),
        // Tolteca: only 2 orders -> no cadence yet
        line("Tolteca", "2026-07-01"),
        line("Tolteca", "2026-08-01"),
      ],
      "2026-08-27",
    );
    expect(out[0].customerName).toBe("FSD");
    expect(out[0].typicalGapDays).toBe(21);
    expect(out[0].dueInDays).toBe(-5);
    expect(out[1].customerName).toBe("Tolteca");
    expect(out[1].dueInDays).toBeNull();
  });
  it("ranks usual SKUs by cases", () => {
    const out = customerCadences(
      [
        line("FSD", "2026-08-01", "LID-7", 210),
        line("FSD", "2026-08-01", "CUP-2", 12),
        line("FSD", "2026-07-01", "LID-7", 180),
      ],
      "2026-08-27",
    );
    expect(out[0].usualSkus[0]).toBe("LID-7");
  });
});

describe("guards", () => {
  it("finiteOrNull never lets NaN or Infinity through", () => {
    expect(finiteOrNull(Number.NaN)).toBeNull();
    expect(finiteOrNull(Infinity)).toBeNull();
    expect(finiteOrNull(3.5)).toBe(3.5);
    expect(finiteOrNull(null)).toBeNull();
  });
  it("computeInbound sums line cases", () => {
    expect(
      computeInbound([
        { shipmentId: "a", vendorProductId: "x", sku: null, qtyCases: 100, eta: null, containerNo: null },
        { shipmentId: "b", vendorProductId: "x", sku: null, qtyCases: 50, eta: null, containerNo: null },
      ]),
    ).toBe(150);
  });
});
