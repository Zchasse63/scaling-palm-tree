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
    // Supabase still treats unknown emails as success when shouldCreateUser=false,
    // so reaching here means a hard error (rate limit, misconfig, etc.).
    return { ok: false, error: error.message };
  }

  return { ok: true, email };
}
