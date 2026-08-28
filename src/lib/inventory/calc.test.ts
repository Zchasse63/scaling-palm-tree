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
  coverWeeks,
  etDayKey,
  finiteOrNull,
  fmtEtStamp,
  missingReportDays,
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
  it("replays open orders on their dates and jumps at container ETAs", () => {
    const r = projectRunway({
      todayKey: "2026-09-01",
      available: 800,
      velocity: vel(70),
      openOrders: [
        { vendorProductId: "vp-1", qtyCases: 120, qtyShippedCases: 0, orderNumber: "SO-1", customerName: "A", requestedDate: "2026-09-05" },
      ],
      inbound: [
        { shipmentId: "s1", vendorProductId: "vp-1", sku: null, qtyCases: 4000, eta: "2026-09-20", containerNo: "EGSU2569353" },
      ],
      floor: 240,
    });
    const byDay = new Map(r.points.map((p) => [p.day, p]));
    // starts at available + open (ATP already nets the order out)
    expect(byDay.get("2026-09-01")!.value).toBe(920);
    // the order steps the line down on its requested date
    expect(byDay.get("2026-09-05")!.value).toBe(800);
    expect(byDay.get("2026-09-05")!.inferred).toBe(false);
    // inferred decline at 10/day after the last commitment
    expect(byDay.get("2026-09-19")!.value).toBeCloseTo(660, 5);
    expect(byDay.get("2026-09-06")!.inferred).toBe(true);
    // container arrival jumps the line
    expect(byDay.get("2026-09-20")!.value).toBeCloseTo(4650, 5);
    expect(r.arrivals).toEqual([
      { day: "2026-09-20", qty: 4000, containerNo: "EGSU2569353" },
    ]);
    expect(r.floorCrossDay).toBeNull();
  });

  it("ends at the last known commitment when velocity is unknown", () => {
    const r = projectRunway({
      todayKey: "2026-09-01",
      available: 500,
      velocity: vel(null, "insufficient_history"),
      openOrders: [
        { vendorProductId: "vp-1", qtyCases: 100, qtyShippedCases: 0, orderNumber: "SO-2", customerName: "B", requestedDate: "2026-09-03" },
      ],
      inbound: [],
      floor: null,
    });
    expect(r.points[r.points.length - 1]).toMatchObject({
      day: "2026-09-03",
      value: 500,
    });
  });

  it("records the floor-crossing day", () => {
    const r = projectRunway({
      todayKey: "2026-09-01",
      available: 300,
      velocity: vel(70), // 10/day inferred from day 2
      openOrders: [],
      inbound: [],
      floor: 240,
    });
    // 300 - 10/day: crosses below 240 on day +7 (value 230)
    expect(r.floorCrossDay).toBe("2026-09-08");
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
