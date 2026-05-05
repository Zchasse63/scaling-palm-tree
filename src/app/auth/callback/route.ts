// Magic-link callback handler.
// Supabase redirects the user here with a `code` (PKCE) or `token_hash` query param.
// We exchange it for a session and redirect to /catalogs (or `next=` if specified).

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Restricts redirect targets to same-origin pathnames.
 * Anything else (full URLs, protocol-relative URLs, javascript:) collapses to "/catalogs".
 * This blocks the open-redirect class of attacks where `?next=https://evil.com`
 * would steal a freshly-minted session.
 */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  // Must start with a single slash — not "//" (protocol-relative).
  if (raw.length < 1 || raw[0] !== "/" || raw[1] === "/") return "/";
  // Disallow control chars and the auth namespace itself.
  if (/[\x00-\x1f\\]/.test(raw)) return "/";
  if (raw.startsWith("/auth/")) return "/";
  return raw;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/signin?error=callback_failed`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "magiclink" | "email",
      token_hash: tokenHash,
    });
    if (error) {
      return NextResponse.redirect(`${origin}/signin?error=callback_failed`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/signin?error=callback_failed`);
}
