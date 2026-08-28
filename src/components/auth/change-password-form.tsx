"use client";

// Change the signed-in user's password. Runs on the browser client so the
// current session authorizes the change; no email round-trip involved.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const MIN_LENGTH = 10;

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      setPassword("");
      setConfirm("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ padding: 28 }}>
      <label className="t-eyebrow" htmlFor="new-password" style={{ display: "block", marginBottom: 6 }}>
        New password
      </label>
      <input
        id="new-password"
        type="password"
        required
        autoComplete="new-password"
        className="input"
        style={{ marginBottom: 18 }}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={pending}
      />
      <label className="t-eyebrow" htmlFor="confirm-password" style={{ display: "block", marginBottom: 6 }}>
        Confirm new password
      </label>
      <input
        id="confirm-password"
        type="password"
        required
        autoComplete="new-password"
        className="input"
        style={{ marginBottom: 18 }}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={pending}
      />
      {error ? (
        <div className="mono" style={{ fontSize: 11, color: "var(--burgundy)", marginBottom: 12 }}>
          {error}
        </div>
      ) : null}
      {done ? (
        <div className="mono" style={{ fontSize: 11, color: "var(--char)", marginBottom: 12 }}>
          Password updated. It takes effect on your next sign-in.
        </div>
      ) : null}
      <Button kind="primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
