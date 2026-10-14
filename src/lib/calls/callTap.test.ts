import { describe, expect, it } from "vitest";
import { createRateLimiter, readBody, tokenMatches, validateCallTap } from "./callTap";

const NOW = new Date("2026-10-14T18:30:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function body(over: Record<string, unknown> = {}) {
  return { phone: "7703385494", usdot: "1202901", source: "sheet", at: NOW.toISOString(), ...over };
}

describe("readBody", () => {
  it("parses a JSON object", () => {
    expect(readBody(JSON.stringify(body()))).toEqual({ ok: true, body: body() });
  });
  it("rejects non-JSON, arrays, null and scalars with 400", () => {
    for (const t of ["not json", "[]", "null", "42", '"x"', ""]) {
      expect(readBody(t)).toEqual({ ok: false, status: 400 });
    }
  });
  it("rejects bodies over 2 KB with 413", () => {
    expect(readBody(JSON.stringify({ pad: "x".repeat(2100) }))).toEqual({ ok: false, status: 413 });
  });
});

describe("tokenMatches", () => {
  it("accepts only an exact match", () => {
    expect(tokenMatches("s3cret", "s3cret")).toBe(true);
    expect(tokenMatches("s3creT", "s3cret")).toBe(false);
    expect(tokenMatches("s3cre", "s3cret")).toBe(false);
    expect(tokenMatches("", "s3cret")).toBe(false);
    expect(tokenMatches(undefined, "s3cret")).toBe(false);
    expect(tokenMatches(123, "123")).toBe(false);
  });
  it("never matches an empty secret", () => {
    expect(tokenMatches("", "")).toBe(false);
  });
});

describe("validateCallTap", () => {
  it("maps the call.html body to the row fields", () => {
    expect(validateCallTap(body(), NOW)).toEqual({
      phoneE164: "+17703385494",
      usdot: "1202901",
      source: "sheet_tap",
      happenedAt: NOW.toISOString(),
    });
  });
  it("normalizes phone formats and drops a leading 1", () => {
    expect(validateCallTap(body({ phone: "1 (770) 338-5494" }), NOW)?.phoneE164).toBe("+17703385494");
    expect(validateCallTap(body({ phone: "770.338.5494" }), NOW)?.phoneE164).toBe("+17703385494");
  });
  it("rejects bad phones", () => {
    for (const phone of ["770338549", "27703385494", "177033854941", "", 7703385494, undefined]) {
      expect(validateCallTap(body({ phone }), NOW)).toBeNull();
    }
  });
  it("treats empty or missing usdot as null and rejects non-digit or long values", () => {
    expect(validateCallTap(body({ usdot: "" }), NOW)?.usdot).toBeNull();
    expect(validateCallTap(body({ usdot: undefined }), NOW)?.usdot).toBeNull();
    expect(validateCallTap(body({ usdot: "12345678901" }), NOW)).toBeNull();
    expect(validateCallTap(body({ usdot: "12a" }), NOW)).toBeNull();
    expect(validateCallTap(body({ usdot: 1202901 }), NOW)).toBeNull();
  });
  it("defaults source to sheet_tap and caps it at 40 chars", () => {
    expect(validateCallTap(body({ source: undefined }), NOW)?.source).toBe("sheet_tap");
    expect(validateCallTap(body({ source: "manual" }), NOW)?.source).toBe("manual");
    expect(validateCallTap(body({ source: "x".repeat(40) }), NOW)?.source).toBe("x".repeat(40));
    expect(validateCallTap(body({ source: "x".repeat(41) }), NOW)).toBeNull();
    expect(validateCallTap(body({ source: 5 }), NOW)).toBeNull();
  });
  it("falls back to now for missing, invalid, or out-of-window timestamps", () => {
    const inWindow = new Date(NOW.getTime() - 6 * DAY).toISOString();
    expect(validateCallTap(body({ at: inWindow }), NOW)?.happenedAt).toBe(inWindow);
    for (const at of [undefined, "garbage", new Date(NOW.getTime() + 2 * DAY).toISOString(),
      new Date(NOW.getTime() - 8 * DAY).toISOString()]) {
      expect(validateCallTap(body({ at }), NOW)?.happenedAt).toBe(NOW.toISOString());
    }
  });
});

describe("createRateLimiter", () => {
  it("allows 30 per key per window, then blocks until the window resets", () => {
    const allow = createRateLimiter(30, 600_000);
    for (let i = 0; i < 30; i++) expect(allow("a", 1000)).toBe(true);
    expect(allow("a", 1000)).toBe(false);
    expect(allow("b", 1000)).toBe(true);
    expect(allow("a", 1000 + 600_000)).toBe(true);
  });
  it("refuses new keys once maxKeys live keys exist, and frees them when their window expires", () => {
    const allow = createRateLimiter(30, 600_000, 3, 1000);
    expect(allow("k1", 1000)).toBe(true);
    expect(allow("k2", 1000)).toBe(true);
    expect(allow("k3", 1000)).toBe(true);
    expect(allow("k4", 1000)).toBe(false); // map is full of live keys
    expect(allow("k1", 1000)).toBe(true); // existing keys still count normally
    expect(allow("k4", 1000 + 600_000)).toBe(true); // old keys expired and were pruned
  });
  it("applies a global ceiling across all keys per window", () => {
    const allow = createRateLimiter(30, 600_000, 1000, 5);
    for (let i = 0; i < 5; i++) expect(allow("key" + i, 1000)).toBe(true);
    expect(allow("key99", 1000)).toBe(false);
    expect(allow("key0", 1000)).toBe(false);
    expect(allow("key0", 1000 + 600_000)).toBe(true);
  });
});
