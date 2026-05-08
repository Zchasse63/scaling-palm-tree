// Admin-only layout. Every /admin/* route inherits this layout, which gates
// access via requireAdmin() and surfaces the admin chrome (nav + sign-out).

import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import { Caret } from "@/components/ui/caret";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await requireAdmin();
  return (
    <div className="paper-bg" style={{ minHeight: "100vh" }}>
      <header
        style={{
          background: "var(--ink)",
          color: "white",
          borderBottom: "1px solid var(--char)",
        }}
      >
        <div
          className="flex items-center"
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "20px 32px",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div className="flex items-center" style={{ gap: 18 }}>
            <Wordmark height={32} />
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--warm)",
                border: "1px solid var(--mid)",
                padding: "3px 8px",
              }}
            >
              + Admin +
            </span>
          </div>
          <nav className="flex items-center" style={{ gap: 22 }}>
            <Link
              href="/admin"
              className="mono"
              style={{
                color: "white",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Overview
            </Link>
            <Link
              href="/admin/orders"
              className="mono"
              style={{
                color: "white",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Orders
            </Link>
            <Link
              href="/orders"
              className="mono"
              style={{
                color: "var(--warm)",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Customer view
            </Link>
            <div className="mono t-cap" style={{ color: "var(--warm)" }}>
              {session.email}
            </div>
            <SignOutButton
              ariaLabel="Sign out"
              className="flex items-center justify-center"
              style={{
                background: "transparent",
                border: "1px solid var(--mid)",
                height: 32,
                width: 32,
                color: "white",
                cursor: "pointer",
              }}
            >
              <Caret />
            </SignOutButton>
          </nav>
        </div>
      </header>
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 32px 64px" }}>
        {children}
      </main>
    </div>
  );
}
