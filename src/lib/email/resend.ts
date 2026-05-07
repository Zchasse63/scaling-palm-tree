import "server-only";

// Thin Resend HTTPS client. We don't pull in resend-node — the API surface
// we use is a single POST /emails call, so a direct fetch keeps the bundle
// small and the dependency surface zero.
//
// Required env vars (Netlify Site settings → Environment):
//   RESEND_API_KEY   — re_... key from resend.com dashboard
//   ORDER_FROM_EMAIL — from address (must be on a verified Resend domain).
//                      Default: "Servous <orders@atyourservous.com>"
//
// All sends are best-effort. A missing key or transport failure logs a
// warning and returns null — the caller decides whether to swallow or
// surface. Order confirmation emails should never block the order
// itself: the order is already persisted by the time we attempt to
// send.

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  /** Optional plain-text alternative. */
  text?: string;
  /** Optional reply-to (defaults to from). */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export const DEFAULT_FROM = "Servous <orders@atyourservous.com>";
export const ZACH_EMAIL = "zchasse@atyourservous.com";

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY missing — skipping send. Subject: " + args.subject,
    );
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const from = process.env.ORDER_FROM_EMAIL ?? DEFAULT_FROM;
  const to = Array.isArray(args.to) ? args.to : [args.to];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: args.subject,
        html: args.html,
        text: args.text,
        reply_to: args.replyTo ?? ZACH_EMAIL,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(
        `[email] resend POST /emails failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
      );
      return { ok: false, error: `${res.status} ${res.statusText}` };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.warn(`[email] resend send threw: ${msg}`);
    return { ok: false, error: msg };
  }
}
