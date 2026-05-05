import { WordmarkBanner } from "@/components/ui/wordmark-banner";
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
      className="paper-bg flex flex-col items-center"
      style={{ minHeight: "100vh", padding: "64px 32px" }}
    >
      <div style={{ marginBottom: 36 }}>
        <WordmarkBanner height={68} />
      </div>
      {errorMsg ? (
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--burgundy)",
            background: "var(--burgundy-bg)",
            padding: "8px 14px",
            border: "1px solid var(--burgundy)",
            marginBottom: 18,
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          {errorMsg}
        </div>
      ) : null}
      <SignInForm />
      <div className="mono t-cap" style={{ marginTop: 32, color: "var(--warm)" }}>
        SERVOUS · Foodservice Packaging
      </div>
    </main>
  );
}
