// POST /api/call-tap: records one tap on a prospect call-sheet phone link.
// Sent by public/call.html via navigator.sendBeacon (fetch fallback), so the body
// may arrive as application/json or text/plain; we read raw text either way.
// No user session (the page is public; see PUBLIC_PATHS in src/middleware.ts).
// Guarded by the shared secret `k` (env CALL_TAP_TOKEN) plus a per-IP rate limit.

import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  MAX_BODY_BYTES,
  createRateLimiter,
  readBody,
  tokenMatches,
  validateCallTap,
} from "@/lib/calls/callTap";

// Module scope on purpose: this holds request counts, not auth state, so the
// "never cache" rule in admin.ts does not apply. It lives per server instance,
// so on Netlify functions the limit is best-effort rather than global.
const allowTap = createRateLimiter(30, 10 * 60 * 1000);
let warnedNoToken = false;

function fail(status: number) {
  return NextResponse.json({ ok: false }, { status });
}

/**
 * Rate-limit key for this request: an HMAC (keyed with the tap secret) of the client IP,
 * taken from Netlify's trusted header first, then the LAST x-forwarded-for entry (the
 * one appended by the edge, which a client cannot forge). Kept in memory only; never stored.
 */
function ipKey(req: NextRequest, secret: string): string | null {
  const nf = req.headers.get("x-nf-client-connection-ip")?.trim();
  const xff = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  const ip = nf || (xff && xff.length ? xff[xff.length - 1] : "");
  if (!ip) return null;
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 16);
}

// A casual visit gets an empty 405. Other unexported methods get Next's own 405.
export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export async function POST(req: NextRequest) {
  const expected = process.env.CALL_TAP_TOKEN;
  if (!expected) {
    if (!warnedNoToken) {
      console.error("call-tap: CALL_TAP_TOKEN is not set; rejecting taps with 503");
      warnedNoToken = true;
    }
    return fail(503);
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(413);

  // Every request counts the same (valid, malformed, or wrong k). Requests with
  // no client IP header share one bucket so they cannot dodge the limit, and a
  // global ceiling inside the limiter bounds the total regardless of key.
  if (!allowTap(ipKey(req, expected) ?? "no-ip")) return fail(429);

  const read = readBody(await req.text());
  if (!read.ok) return fail(read.status);
  if (!tokenMatches(read.body.k, expected)) return fail(401);

  const tap = validateCallTap(read.body);
  if (!tap) return fail(400);

  try {
    const { error } = await adminClient()
      .from("call_events")
      .insert({
        happened_at: tap.happenedAt,
        kind: "tap",
        direction: "outbound",
        phone_e164: tap.phoneE164,
        usdot: tap.usdot,
        source: tap.source,
        source_id: null,
        // No IP or IP hash is stored: the row only needs the number, the sheet key and the time.
        metadata: { ua: req.headers.get("user-agent")?.slice(0, 200) ?? null },
      });
    if (error) {
      console.error("call-tap: insert failed", error.code, error.message);
      return fail(500);
    }
  } catch (err) {
    console.error("call-tap: insert threw", err instanceof Error ? err.message : err);
    return fail(500);
  }

  return new NextResponse(null, { status: 204 });
}
