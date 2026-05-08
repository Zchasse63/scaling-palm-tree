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
  /**
   * When true, the user can access `/admin/*` routes — sees every customer's
   * orders, can update statuses, export CSVs, etc. Resolved from
   * customer_user_profiles.is_admin on every request (no caching).
   */
  isAdmin: boolean;
}

/**
 * Fetches the current session and resolves the customer profile.
 * Redirects to /signin if no user, or to /signin?error=not_provisioned if
 * authed but not mapped to a customer.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRes = (await (admin as any)
    .from("customer_user_profiles")
    .select("company_id, display_name, is_admin")
    .eq("user_id", userId)
    .maybeSingle()) as {
    data: { company_id: string; display_name: string | null; is_admin: boolean } | null;
    error: { message: string } | null;
  };

  if (profileRes.error) {
    throw new Error("Failed to load customer profile: " + profileRes.error.message);
  }
  if (!profileRes.data) {
    redirect("/signin?error=not_provisioned");
  }
  const profile = profileRes.data;

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
    isAdmin: profile.is_admin === true,
  };
}

/**
 * Admin-only gate. Calls requireSession(), then redirects authed-but-not-admin
 * users back to /orders (their own customer view). Use at the top of every
 * /admin page + admin-only server actions.
 */
export async function requireAdmin(): Promise<AuthedSession> {
  const session = await requireSession();
  if (!session.isAdmin) {
    redirect("/orders");
  }
  return session;
}

/** Non-redirecting variant for places that want to handle missing auth themselves. */
export async function getOptionalSession(): Promise<AuthedSession | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const admin = adminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRes = (await (admin as any)
    .from("customer_user_profiles")
    .select("company_id, display_name, is_admin")
    .eq("user_id", data.user.id)
    .maybeSingle()) as {
    data: { company_id: string; display_name: string | null; is_admin: boolean } | null;
  };
  const profile = profileRes.data;
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
    isAdmin: profile.is_admin === true,
  };
}
