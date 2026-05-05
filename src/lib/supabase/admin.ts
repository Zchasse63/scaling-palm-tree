// Supabase admin client — service-role key, bypasses RLS entirely.
// SERVER-ONLY. The `server-only` import is a Next.js guard: any client
// component that imports this file (transitively or otherwise) will fail
// the build, preventing the service role key from leaking into the browser bundle.
//
// Used for catalog queries (server-side, with explicit access checks),
// order writes, and admin lookups.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Construct fresh per call — DO NOT cache at module scope. Next.js shares
// module state across concurrent server requests, which would leak admin
// auth state across users.
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceRole) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  return createClient<Database>(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
