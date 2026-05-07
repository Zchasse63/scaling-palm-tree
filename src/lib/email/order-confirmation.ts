import "server-only";

// Renders the customer + internal copies of the container-order confirmation
// email and dispatches both. Best-effort: send failures log + return so the
// caller can surface them without rolling back the order.

import { sendEmail, ZACH_EMAIL } from "./resend";

export interface OrderConfirmationLine {
  sku: string;
  description: string;
  packDisplay: string | null;
  qtyCases: number;
  /** Per-case sell price in customer currency. */
  sellPricePerCase: number;
  /** Pieces per case (case_pack_count). Used to surface per-roll price for rolls. */
  piecesPerCase: number | null;
}

export interface OrderConfirmationInput {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  catalogDisplayName: string;
  containerLabel: string;
  termsLabel: string;
  currency: string;
  /** ISO timestamp string. */
  submittedAt: string;
  lines: OrderConfirmationLine[];
  totals: {
    subtotal: number;
    cases: number;
    palletEq: number;
    weightKg: number;
    volPct: number;
  };
}

const CSS = `
  body { margin: 0; padding: 0; background: #F5F4F1; font-family: -apple-system, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif; color: #0A0A0A; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 40px; }
  .card { background: #ffffff; border: 1px solid #E8E8E8; }
  .head { background: #0A0A0A; color: #ffffff; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; }
  .head .brand { font-size: 18px; font-weight: 600; letter-spacing: 0.04em; }
  .head .label { font-family: "SFMono-Regular", "Menlo", "Consolas", monospace; font-size: 11px; color: #A0A0A0; letter-spacing: 0.14em; text-transform: uppercase; }
  .meta { padding: 18px 22px; border-bottom: 1px solid #E8E8E8; }
  .meta-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .meta-row .k { color: #6E6E6E; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }
  .meta-row .v { font-family: "SFMono-Regular", "Menlo", "Consolas", monospace; font-size: 12px; color: #0A0A0A; }
  .lead { padding: 18px 22px; font-size: 14px; line-height: 1.6; color: #0A0A0A; border-bottom: 1px solid #E8E8E8; }
  table.lines { width: 100%; border-collapse: collapse; }
  table.lines th, table.lines td { text-align: left; padding: 10px 16px; font-size: 12px; border-bottom: 1px solid #E8E8E8; vertical-align: top; }
  table.lines th { background: #FAF9F6; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #6E6E6E; font-weight: 500; }
  table.lines td.num { text-align: right; font-family: "SFMono-Regular", "Menlo", "Consolas", monospace; }
  .totals { padding: 18px 22px; background: #FAF9F6; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-row .k { color: #6E6E6E; }
  .totals-row .v { font-family: "SFMono-Regular", "Menlo", "Consolas", monospace; }
  .total-line { padding-top: 10px; margin-top: 10px; border-top: 1px solid #D4D4D2; font-size: 16px; font-weight: 500; }
  .foot { padding: 18px 22px; font-size: 11px; color: #6E6E6E; line-height: 1.6; }
  .foot a { color: #0A0A0A; }
  .stamp { font-family: "SFMono-Regular", "Menlo", "Consolas", monospace; font-size: 10px; color: #A0A0A0; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 22px 0; }
`;

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isRollSku(sku: string, description: string): boolean {
  return sku.startsWith("RL") || /\broll\b/i.test(description);
}

/**
 * Render the HTML body. `audience` controls the lead paragraph + footer
 * language so the customer copy and the internal (Zach) copy can share
 * the same line-item rendering but differ in the framing.
 */
function renderHtml(
  input: OrderConfirmationInput,
  audience: "customer" | "internal",
): string {
  const submitted = new Date(input.submittedAt);
  const submittedHuman = submitted.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const lead =
    audience === "customer"
      ? `<p style="margin:0 0 10px 0;">Thank you for your order, ${escapeHtml(input.customerName)}. We've received it and will confirm quantities and any adjustments shortly. Container orders typically need a final quantity check against the factory's most recent run, so a small back-and-forth is normal — we'll reach out if anything needs to move.</p>
         <p style="margin:0;">A copy of this confirmation has been sent to your representative.</p>`
      : `<p style="margin:0 0 10px 0;"><strong>${escapeHtml(input.customerName)}</strong> submitted a container order via the Container Builder. Review the manifest below and reply to the customer once final quantities are confirmed against the factory's run.</p>
         <p style="margin:0;">Submitted by <a href="mailto:${escapeHtml(input.customerEmail)}" style="color:#0A0A0A;">${escapeHtml(input.customerEmail)}</a>.</p>`;

  const linesHtml = input.lines
    .map((l) => {
      const lineSubtotal = l.qtyCases * l.sellPricePerCase;
      const isRoll =
        isRollSku(l.sku, l.description) &&
        (l.piecesPerCase ?? 1) > 1;
      const perRoll =
        isRoll && l.piecesPerCase
          ? `<div style="font-size:10px;color:#6E6E6E;margin-top:2px;">${fmtMoney(l.sellPricePerCase / l.piecesPerCase)}/roll · ${l.piecesPerCase} rolls/case</div>`
          : "";
      const totalRolls =
        isRoll && l.piecesPerCase
          ? `<div style="font-size:10px;color:#6E6E6E;margin-top:2px;">${fmtInt(l.qtyCases * l.piecesPerCase)} rolls total</div>`
          : "";
      return `
        <tr>
          <td style="font-family:'SFMono-Regular','Menlo',monospace;font-size:11px;">${escapeHtml(l.sku)}</td>
          <td>
            <div>${escapeHtml(l.description)}</div>
            ${l.packDisplay ? `<div style="font-size:10px;color:#6E6E6E;margin-top:2px;">${escapeHtml(l.packDisplay)}</div>` : ""}
          </td>
          <td class="num">
            ${fmtInt(l.qtyCases)}
            ${totalRolls}
          </td>
          <td class="num">
            ${fmtMoney(l.sellPricePerCase)}
            ${perRoll}
          </td>
          <td class="num">${fmtMoney(lineSubtotal)}</td>
        </tr>
      `;
    })
    .join("");

  const titleLabel = audience === "customer" ? "Order Submitted" : "New Container Order";
  const stamp =
    audience === "internal"
      ? `<div class="stamp">+ Internal copy · review &amp; reply</div>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.orderNumber)} — ${titleLabel}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="head">
        <span class="brand">SERVOUS</span>
        <span class="label">${escapeHtml(titleLabel)} · ${escapeHtml(input.orderNumber)}</span>
      </div>
      ${stamp}
      <div class="meta">
        <div class="meta-row"><span class="k">Customer</span><span class="v">${escapeHtml(input.customerName)}</span></div>
        <div class="meta-row"><span class="k">Catalog</span><span class="v">${escapeHtml(input.catalogDisplayName)}</span></div>
        <div class="meta-row"><span class="k">Container</span><span class="v">${escapeHtml(input.containerLabel)} · ${escapeHtml(input.termsLabel)}</span></div>
        <div class="meta-row"><span class="k">Submitted</span><span class="v">${escapeHtml(submittedHuman)}</span></div>
      </div>
      <div class="lead">${lead}</div>
      <table class="lines">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Item</th>
            <th class="num">Cases</th>
            <th class="num">Price / Case</th>
            <th class="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span class="k">Total cases</span><span class="v">${fmtInt(input.totals.cases)}</span></div>
        <div class="totals-row"><span class="k">Pallet-equivalents</span><span class="v">${input.totals.palletEq.toFixed(1)}</span></div>
        <div class="totals-row"><span class="k">Weight</span><span class="v">${fmtInt(input.totals.weightKg)} kg</span></div>
        <div class="totals-row"><span class="k">Container fill</span><span class="v">${input.totals.volPct.toFixed(1)}%</span></div>
        <div class="totals-row total-line"><span class="k">Subtotal</span><span class="v">${fmtMoney(input.totals.subtotal)}</span></div>
      </div>
      <div class="foot">
        ${
          audience === "customer"
            ? `Questions or changes? Reply to this email or contact <a href="mailto:${escapeHtml(ZACH_EMAIL)}">${escapeHtml(ZACH_EMAIL)}</a>. Final invoicing follows confirmation of factory quantities.`
            : `Customer reply-to: <a href="mailto:${escapeHtml(input.customerEmail)}">${escapeHtml(input.customerEmail)}</a>. Order ID: ${escapeHtml(input.orderId)}.`
        }
      </div>
    </div>
  </div>
</body>
</html>`;
}

/** Plain-text fallback for clients that don't render HTML. */
function renderText(input: OrderConfirmationInput, audience: "customer" | "internal"): string {
  const lines = input.lines
    .map((l) => {
      const sub = l.qtyCases * l.sellPricePerCase;
      const isRoll =
        isRollSku(l.sku, l.description) &&
        (l.piecesPerCase ?? 1) > 1;
      const perRoll =
        isRoll && l.piecesPerCase
          ? ` (${fmtMoney(l.sellPricePerCase / l.piecesPerCase)}/roll, ${l.piecesPerCase} rolls/case)`
          : "";
      return `  ${l.sku.padEnd(22)} ${l.description}\n    ${fmtInt(l.qtyCases)} cases × ${fmtMoney(l.sellPricePerCase)}${perRoll} = ${fmtMoney(sub)}`;
    })
    .join("\n");

  const lead =
    audience === "customer"
      ? `Thank you for your order, ${input.customerName}. We've received it and will confirm quantities shortly. Container orders typically need a final quantity check — we'll reach out if anything needs to move.`
      : `${input.customerName} submitted a container order. Review the manifest and reply once final quantities are confirmed.`;

  return `SERVOUS — ${audience === "customer" ? "Order Submitted" : "New Container Order"}
${input.orderNumber}

${lead}

Customer:   ${input.customerName}
Catalog:    ${input.catalogDisplayName}
Container:  ${input.containerLabel} · ${input.termsLabel}
Submitted:  ${input.submittedAt}

LINES
${lines}

TOTALS
  Total cases:        ${fmtInt(input.totals.cases)}
  Pallet-equivalents: ${input.totals.palletEq.toFixed(1)}
  Weight:             ${fmtInt(input.totals.weightKg)} kg
  Container fill:     ${input.totals.volPct.toFixed(1)}%
  Subtotal:           ${fmtMoney(input.totals.subtotal)}

${
    audience === "customer"
      ? `Questions? Reply to this email or contact ${ZACH_EMAIL}.`
      : `Customer reply-to: ${input.customerEmail}\nOrder ID: ${input.orderId}`
  }
`;
}

/**
 * Send both copies of the order confirmation. Returns a tuple so the
 * caller can record which (if any) failed without surfacing the failure
 * to the customer.
 */
export async function sendOrderConfirmation(
  input: OrderConfirmationInput,
): Promise<{ customer: { ok: boolean }; internal: { ok: boolean } }> {
  const customerHtml = renderHtml(input, "customer");
  const customerText = renderText(input, "customer");
  const internalHtml = renderHtml(input, "internal");
  const internalText = renderText(input, "internal");

  const customerResult = await sendEmail({
    to: input.customerEmail,
    subject: `Order ${input.orderNumber} received — Servous Container Builder`,
    html: customerHtml,
    text: customerText,
    replyTo: ZACH_EMAIL,
  });

  const internalResult = await sendEmail({
    to: ZACH_EMAIL,
    subject: `[ORDER] ${input.customerName} · ${input.orderNumber} · ${input.totals.cases} cases / ${fmtMoney(input.totals.subtotal)}`,
    html: internalHtml,
    text: internalText,
    replyTo: input.customerEmail,
  });

  return {
    customer: { ok: customerResult.ok },
    internal: { ok: internalResult.ok },
  };
}
