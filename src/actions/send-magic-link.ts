"use server";

// Server Action: send a Supabase magic-link to the entered email.
//
// We pass shouldCreateUser: false so unknown emails silently fail
// (no enumeration). The redirectTo points at our callback that
// exchanges the auth code for a session.

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface MagicLinkState {
  ok: boolean;
  email?: string;
  error?: string;
}

export async function sendMagicLinkAction(
  _prev: MagicLinkState | null,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    (process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL
      : "http://localhost:3000");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    // "Signups not allowed for otp" is what Supabase returns when
    // shouldCreateUser=false and the email is not in auth.users. Showing this
    // to the user would leak which emails are/aren't provisioned (an
    // enumeration vector). Treat it as silent success — the friendly
    // "check your inbox" UX is correct: provisioned users get an email,
    // unprovisioned users get nothing. Both see the same screen.
    const msg = (error.message || "").toLowerCase();
    const isUnknownEmail =
      msg.includes("signups not allowed") ||
      msg.includes("user not found") ||
      msg.includes("not allowed for this instance");
    if (isUnknownEmail) {
      return { ok: true, email };
    }
    // Real errors (rate limit, misconfig, network) — surface with a generic message.
    return { ok: false, error: "Could not send magic link. Try again in a moment." };
  }

  return { ok: true, email };
}
