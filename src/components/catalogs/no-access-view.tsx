// Rendered when an authenticated user has zero active catalogs they can order from.
// The customer was provisioned but no `customer_catalog_access` rows are linked to
// their company. The fix is on the Servous side, not theirs.

import { Wordmark } from "@/components/ui/wordmark";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { Caret } from "@/components/ui/caret";

interface NoAccessViewProps {
  customerName: string;
  message?: string;
}

export function NoAccessView({ customerName, message }: NoAccessViewProps) {
  return (
    <div className="paper-bg" style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--rule)" }}>
        <div
          className="flex items-center"
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "20px 32px",
            justifyContent: "space-between",
          }}
        >
          <Wordmark height={32} />
          <div className="flex items-center" style={{ gap: 18 }}>
            <div className="mono t-cap">{customerName}</div>
            <SignOutButton
              ariaLabel="Sign out"
              className="flex items-center justify-center"
              style={{
                background: "transparent",
                border: "1px solid var(--rule-strong)",
                height: 32,
                width: 32,
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <Caret />
            </SignOutButton>
          </div>
        </div>
      </header>
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "80px 32px",
          textAlign: "center",
        }}
      >
        <div className="t-h1" style={{ marginBottom: 12 }}>
          No catalogs assigned yet
        </div>
        <div className="t-cap" style={{ lineHeight: 1.7 }}>
          {message ??
            "Your account is provisioned but no vendor catalogs are linked to it. Contact your Servous representative — usually a one-step fix."}
        </div>
      </main>
    </div>
  );
}
