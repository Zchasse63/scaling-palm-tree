"use client";

// Email + password sign-in. Sessions land in cookies via @supabase/ssr, so
// middleware and every server component see them exactly as before. The
// magic-link machinery still exists server-side (tests provision sessions
// through it without sending email), but the UI is password-only: the
// Supabase plan's built-in email service is rate-limited too tightly for
// magic links in production use.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SectionBar } from "@/components/ui/section-bar";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email or password is incorrect."
            : authError.message,
        );
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{ width: "100%", maxWidth: 420, background: "white", border: "1px solid var(--rule)" }}
    >
      <SectionBar regmarks>Sign in</SectionBar>
      <div style={{ padding: 28 }}>
        <label className="t-eyebrow" htmlFor="email" style={{ display: "block", marginBottom: 6 }}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="name@yourcompany.com"
          style={{ marginBottom: 18 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
        <label className="t-eyebrow" htmlFor="password" style={{ display: "block", marginBottom: 6 }}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          placeholder="••••••••••••"
          style={{ marginBottom: 18 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
        />
        {error ? (
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--burgundy)", marginBottom: 12 }}
          >
            {error}
          </div>
        ) : null}
        <Button kind="primary" style={{ width: "100%" }} type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
