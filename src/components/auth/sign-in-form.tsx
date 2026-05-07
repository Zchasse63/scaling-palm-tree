"use client";

import { useActionState } from "react";
import { sendMagicLinkAction, type MagicLinkState } from "@/actions/send-magic-link";
import { Button } from "@/components/ui/button";
import { SectionBar } from "@/components/ui/section-bar";

export function SignInForm() {
  const [state, action, isPending] = useActionState<MagicLinkState | null, FormData>(
    sendMagicLinkAction,
    null,
  );

  if (state?.ok) {
    return (
      <div style={{ width: 420, background: "white", border: "1px solid var(--rule)" }}>
        <SectionBar regmarks>Check your inbox</SectionBar>
        <div style={{ padding: 28 }}>
          <div className="mono" style={{ fontSize: 14, color: "var(--ink)", marginBottom: 12 }}>
            <span style={{ fontWeight: 500 }}>{state.email}</span>
          </div>
          <div className="t-cap" style={{ lineHeight: 1.6 }}>
            If your email is provisioned for the Container Builder, a one-time
            link is on its way. It expires in 15 minutes. If nothing arrives within
            a few minutes, contact your Servous representative.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} style={{ width: 420, background: "white", border: "1px solid var(--rule)" }}>
      <SectionBar regmarks>Sign in</SectionBar>
      <div style={{ padding: 28 }}>
        <div className="t-cap" style={{ marginBottom: 18, lineHeight: 1.6 }}>
          Enter your work email and we&apos;ll send a one-time magic link.
        </div>
        <label className="t-eyebrow" htmlFor="email" style={{ display: "block", marginBottom: 6 }}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input"
          placeholder="name@yourcompany.com"
          style={{ marginBottom: 18 }}
          disabled={isPending}
        />
        {state?.error ? (
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--burgundy)", marginBottom: 12 }}
          >
            {state.error}
          </div>
        ) : null}
        <Button kind="primary" style={{ width: "100%" }} type="submit" disabled={isPending}>
          {isPending ? "Sending…" : "Send magic link"}
        </Button>
      </div>
    </form>
  );
}
