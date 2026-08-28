// /account — the signed-in user's own settings. Password change only for now.

import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Wordmark } from "@/components/ui/wordmark";
import { SectionBar } from "@/components/ui/section-bar";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireSession();
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
          }}
        >
          <Link href="/" aria-label="Back to the portal">
            <Wordmark height={32} />
          </Link>
          <div className="mono t-cap" style={{ color: "var(--warm)" }}>
            {session.email}
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px 64px" }}>
        <Link
          href="/"
          className="mono t-cap"
          style={{ color: "var(--mid)", textDecoration: "none", display: "inline-block", marginBottom: 16 }}
        >
          ← Back
        </Link>
        <section style={{ background: "white", border: "1px solid var(--rule)" }}>
          <SectionBar regmarks as="h1">
            Change password
          </SectionBar>
          <ChangePasswordForm />
        </section>
      </main>
    </div>
  );
}
