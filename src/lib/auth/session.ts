// Session helpers used by Server Components and Server Actions.

import "server-only";
import { redirect } from "next/navigation";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export interface AuthedSession {
  userId: string;
  email: string;
  customerId: string;
  customerName: string;
  displayName: string | null;
}

/**
 * Fetches the current session and resolves the customer profile.
 * Redirects to /signin if no user, or 403s if no profile (no customer access).
 *
 * The customer_user_profiles lookup uses the admin client so it's not subject
 * to RLS races — we trust auth.uid() coming back from the SSR client and
 * resolve the customer mapping with service-role privileges.
 */
export async function requireSession(): Promise<AuthedSession> {
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/signin");
  }
  const userId = userData.user.id;
  const email = userData.user.email ?? "";

  const admin = adminClient();
  const { data: profile, error: profileErr } = await admin
    .from("customer_user_profiles")
    .select("company_id, display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) {
    throw new Error("Failed to load customer profile: " + profileErr.message);
  }
  if (!profile) {
    // User authenticated but not provisioned for the Container Builder.
    redirect("/signin?error=not_provisioned");
  }

  const { data: company, error: companyErr } = await admin
    .from("companies")
    .select("id, name")
    .eq("id", profile.company_id)
    .single();

  if (companyErr || !company) {
    throw new Error("Customer profile points at a missing company.");
  }

  return {
    userId,
    email,
    customerId: company.id,
    customerName: company.name,
    displayName: profile.display_name,
  };
}

/** Non-redirecting variant for places that want to handle missing auth themselves. */
export async function getOptionalSession(): Promise<AuthedSession | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const admin = adminClient();
  const { data: profile } = await admin
    .from("customer_user_profiles")
    .select("company_id, display_name")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: company } = await admin
    .from("companies")
    .select("id, name")
    .eq("id", profile.company_id)
    .single();
  if (!company) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    customerId: company.id,
    customerName: company.name,
    displayName: profile.display_name,
  };
}
