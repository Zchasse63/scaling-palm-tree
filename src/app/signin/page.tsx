// Sign-in page — split editorial layout.
//
// Left column: brand hero + value statement + numbered spec strip.
// Right column: the magic-link form, anchored to the visible center.
// Top register strip and footer plate frame the page.
//
// All monochrome. Industrial-editorial language: "01" / "02" / "03" index
// marks, register-mark glyphs, Geist + Geist Mono. The page leans into the
// product's thesis ("the container is the unit of order") rather than
// running up a generic auth screen.

import { Wordmark } from "@/components/ui/wordmark";
import { SignInForm } from "@/components/auth/sign-in-form";

export const dynamic = "force-dynamic";

interface SignInPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

interface SpecCellProps {
  index: string;
  title: string;
  body: string;
}

function SpecCell({ index, title, body }: SpecCellProps) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--warm)",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        {index}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: 6,
          lineHeight: 1.35,
        }}
      >
        {title}
      </div>
      <div className="t-cap" style={{ lineHeight: 1.6 }}>
        {body}
      </div>
    </div>
  );
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
      {/* Top register strip */}
      <header
        style={{
          padding: "18px 32px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Wordmark height={26} />
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
      </header>

      {/* Two-column body */}
      <div className="signin-grid" style={{ flex: 1 }}>
        {/* LEFT — brand presence */}
        <section
          className="signin-left"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 56px",
            borderRight: "1px solid var(--rule)",
            background: "var(--paper)",
            position: "relative",
            minHeight: "100%",
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--warm)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 28,
              }}
            >
              <span aria-hidden style={{ marginRight: 8 }}>+</span>
              Foodservice Packaging
            </div>
            <h1
              style={{
                fontFamily: "var(--font-geist), sans-serif",
                fontSize: "clamp(40px, 5vw, 60px)",
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
                fontWeight: 500,
                color: "var(--ink)",
                margin: 0,
                marginBottom: 28,
              }}
            >
              Foodservice
              <br />
              packaging,
              <br />
              by the container.
            </h1>
            <div
              className="t-cap"
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 540,
                color: "var(--ink)",
              }}
            >
              The Container Builder is direct-from-factory ordering for
              distributors and operators. Build a 40-foot mixed-pallet load,
              watch the live price-per-case as you fill, and submit only when
              the container is at 100%.
            </div>
          </div>

          {/* Numbered spec strip */}
          <div
            style={{
              marginTop: 56,
              paddingTop: 28,
              borderTop: "1px solid var(--rule-strong)",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 28,
            }}
          >
            <SpecCell
              index="01 / Direct"
              title="From the factory."
              body="DDP-Savannah pricing is the basis of every line. No wholesale-tier markup; the manufacturer is one step behind the screen."
            />
            <SpecCell
              index="02 / Mixed"
              title="One container, many SKUs."
              body="Combine pans, lids, rolls, sheets — and across categories — until the container is full. The math reconciles in real time."
            />
            <SpecCell
              index="03 / Honest"
              title="Margin on product. Freight pass-through."
              body="The price you see is product cost plus a transparent margin. Freight is the carrier's number, never marked up."
            />
          </div>
        </section>

        {/* RIGHT — sign-in form */}
        <section
          className="signin-right"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 40px",
            background: "var(--paper-2)",
          }}
        >
          <div style={{ width: "100%", maxWidth: 420 }}>
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
                marginTop: 24,
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
        </section>
      </div>

      {/* Footer plate */}
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
          Servous · Boca Raton FL · Savannah GA · Est. 2026
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

      {/* Responsive grid: stack on narrow viewports */}
      <style>{`
        .signin-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
        }
        @media (max-width: 900px) {
          .signin-grid {
            grid-template-columns: 1fr;
          }
          .signin-left {
            border-right: 0 !important;
            border-bottom: 1px solid var(--rule);
            padding: 40px 28px !important;
          }
          .signin-right {
            padding: 48px 28px !important;
          }
        }
      `}</style>
    </main>
  );
}
