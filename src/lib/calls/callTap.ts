// Pure helpers for POST /api/call-tap (src/app/api/call-tap/route.ts).
// No server-only imports, so vitest can load this file directly.

import { timingSafeEqual } from "node:crypto";

export const MAX_BODY_BYTES = 2048;

const DAY_MS = 24 * 60 * 60 * 1000;

export type CallTap = {
  phoneE164: string;
  usdot: string | null;
  source: string;
  happenedAt: string;
};

type Body = Record<string, unknown>;

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

/** Size-checks and JSON-parses the raw text body. Works for application/json and text/plain. */
export function readBody(text: string): { ok: true; body: Body } | { ok: false; status: 400 | 413 } {
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) return { ok: false, status: 413 };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, status: 400 };
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, status: 400 };
  return { ok: true, body: raw as Body };
}

/** Constant-time compare of the body's `k` against the configured secret. */
export function tokenMatches(given: unknown, expected: string): boolean {
  if (typeof given !== "string" || expected === "") return false;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Validates the tap fields. Returns null on any failure (caller answers 400). */
export function validateCallTap(body: Body, now: Date = new Date()): CallTap | null {
  // phone: strip non-digits; 10 digits, or 11 starting with 1 (the 1 is dropped).
  if (typeof body.phone !== "string") return null;
  let digits = body.phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;

  // usdot: optional; empty means none. When present it must already be 1 to 10 digits.
  let usdot: string | null = null;
  if (!isBlank(body.usdot)) {
    if (typeof body.usdot !== "string" || !/^\d{1,10}$/.test(body.usdot)) return null;
    usdot = body.usdot;
  }

  // source: optional string up to 40 chars; missing, empty, or "sheet" all mean sheet_tap.
  let source = "sheet_tap";
  if (!isBlank(body.source)) {
    if (typeof body.source !== "string") return null;
    const s = body.source.trim();
    if (s.length > 40) return null;
    if (s !== "" && s !== "sheet") source = s;
  }

  // at: optional timestamp; missing, unparseable, or outside [now - 7d, now + 1d] falls back to now.
  let happened = now.getTime();
  if (typeof body.at === "string") {
    const t = Date.parse(body.at);
    if (Number.isFinite(t) && t <= happened + DAY_MS && t >= happened - 7 * DAY_MS) happened = t;
  }

  return { phoneE164: "+1" + digits, usdot, source, happenedAt: new Date(happened).toISOString() };
}

/**
 * Fixed-window counter: allows `limit` hits per key per `windowMs`, plus a global
 * ceiling of `globalLimit` hits per window across all keys, and at most `maxKeys`
 * live keys (a flood of fresh keys is refused rather than grown). Holds request
 * counts only (no auth state).
 */
export function createRateLimiter(limit: number, windowMs: number, maxKeys = 1000, globalLimit = 600) {
  const hits = new Map<string, { start: number; count: number }>();
  let globalStart = 0;
  let globalCount = 0;
  return function allow(key: string, now: number = Date.now()): boolean {
    if (now - globalStart >= windowMs) {
      globalStart = now;
      globalCount = 0;
    }
    if (globalCount >= globalLimit) return false;

    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      if (!entry && hits.size >= maxKeys) {
        for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
        if (hits.size >= maxKeys) return false;
      }
      hits.set(key, { start: now, count: 1 });
      globalCount += 1;
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    globalCount += 1;
    return true;
  };
}
