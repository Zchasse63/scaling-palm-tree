// Sign-in page — restrained customer portal.
//
// Dark chrome header (matches the rest of the app's chrome). Single
// centered sign-in card on the paper field. No spec strip, no
// marketing-deck copy — the customer is here to log in, and the page
// should feel like a private portal, not a landing page.

import { Wordmark } from "@/components/ui/wordmark";
import { SignInForm } from "@/components/auth/sign-in-form";

export const dynamic = "force-dynamic";

interface SignInPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const sp = await searchParams;
  const errorMsg =
    sp.error === "not_provisioned"
      ? "Your account is not yet provisioned for the Container Builder. Contact your Servous representative."
      : sp.error === "callback_failed"
        ? "Sign-in link could not be verified. Request a new one."
        : null;

  return (
    <main
      className="paper-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Dark chrome header — same surface as the in-app builder header */}
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
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Wordmark height={28} />
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--warm)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            <span aria-hidden style={{ marginRight: 8 }}>+</span>
            Container Builder · No. 01
            <span aria-hidden style={{ marginLeft: 8 }}>+</span>
          </div>
        </div>
      </header>

      {/* Centered sign-in column */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Eyebrow + heading establish the portal frame without selling */}
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--warm)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            <span aria-hidden style={{ marginRight: 8 }}>+</span>
            Customer Portal
          </div>
          <h1
            style={{
              fontFamily: "var(--font-geist), sans-serif",
              fontSize: 32,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              fontWeight: 500,
              color: "var(--ink)",
              margin: 0,
              marginBottom: 10,
            }}
          >
            Sign in to the Container Builder.
          </h1>
          <div
            className="t-cap"
            style={{ marginBottom: 24, lineHeight: 1.6 }}
          >
            For active Servous customers. New accounts are provisioned by your
            representative.
          </div>

          {errorMsg ? (
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--burgundy)",
                background: "var(--burgundy-bg)",
                padding: "10px 14px",
                border: "1px solid var(--burgundy)",
                marginBottom: 18,
                lineHeight: 1.6,
              }}
            >
              {errorMsg}
            </div>
          ) : null}

          <SignInForm />

          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--warm)",
              marginTop: 22,
              lineHeight: 1.7,
              letterSpacing: "0.06em",
            }}
          >
            Magic-link sign-in only. Servous never asks for a password.
            <br />
            Need an account? Email{" "}
            <a
              href="mailto:zchasse@atyourservous.com"
              style={{ color: "var(--ink)", textDecoration: "underline" }}
            >
              zchasse@atyourservous.com
            </a>
            .
          </div>
        </div>
      </div>

      {/* Footer plate — single line, no city stamps */}
      <footer
        style={{
          borderTop: "1px solid var(--rule)",
          padding: "14px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          background: "var(--paper)",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--warm)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Servous · Foodservice Packaging
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--warm)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Atyourservous.com
        </div>
      </footer>
    </main>
  );
}
