// POST /signout — clears Supabase session and redirects to /signin.
// POST-only to defeat trivial CSRF (third-party <img src="/signout"> won't sign you out).
// Linked from header dropdowns via a small <form method="POST"> wrapper.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/signin", req.url), { status: 303 });
}
