"use client";

// Sticky right-column summary panel.
// Pure presentational — receives totals + callbacks from BuilderClient.

import { SectionBar } from "@/components/ui/section-bar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Ticker } from "@/components/ui/ticker";
import { Button } from "@/components/ui/button";
import { fmt1, fmt2, fmtInt } from "@/lib/math/fmt";
import type { BuilderTotals } from "@/lib/math/fill";

interface SummaryPanelProps {
  totals: BuilderTotals;
  termsLabel: string;
  minFillPct: number;
  onOptimize: () => void;
  onSubmit: () => void;
  pending: boolean;
  errored?: string | null;
  /**
   * When true, the catalog is in a pricing-refresh window. Submit is hard-
   * blocked and the disabled reason explains it. Subtotals render as "—".
   */
  pricesPending?: boolean;
  /** Customer-facing note attached to the order on submit. Optional. */
  notes: string;
  onNotesChange: (next: string) => void;
}

const NOTES_MAX = 2000;

export function SummaryPanel({
  totals,
  termsLabel,
  minFillPct,
  onOptimize,
  onSubmit,
  pending,
  errored,
  pricesPending = false,
  notes,
  onNotesChange,
}: SummaryPanelProps) {
  const empty = totals.cases === 0;
  const meetsMinFill = totals.volPct >= minFillPct - 0.05;
  const submittable =
    !empty &&
    meetsMinFill &&
    totals.volPct <= 100 + 1e-3 &&
    totals.wtPct <= 100 + 1e-3 &&
    totals.belowMinLines === 0 &&
    !pending &&
    !pricesPending;
  const canOptimize = totals.fillFraction > 0 && totals.volPct < 100;
  const pulseOptimize = totals.volPct >= 95 && totals.volPct < 100;

  let disabledReason: string | null = null;
  if (pricesPending && !empty) {
    disabledReason =
      "Pricing refresh in progress — submit is locked until updated rates publish.";
  } else if (!submittable && !empty) {
    if (totals.belowMinLines > 0) {
      disabledReason = `${totals.belowMinLines} line item${
        totals.belowMinLines === 1 ? " is" : "s are"
      } below the minimum case count.`;
    } else if (totals.volPct > 100) {
      disabledReason = "Container is over capacity by volume.";
    } else if (totals.wtPct > 100) {
      disabledReason = "Container exceeds weight maximum.";
    } else if (totals.volPct < minFillPct) {
      disabledReason =
        minFillPct === 100
          ? `Volume is ${totals.volPct.toFixed(1)}%. Submit when exactly 100.0%.`
          : `Volume is ${totals.volPct.toFixed(1)}%. Minimum to submit is ${minFillPct.toFixed(0)}%.`;
    }
  }

  return (
    <aside
      style={{
        position: "sticky",
        top: 88,
        width: 388,
        alignSelf: "flex-start",
        background: "white",
        border: "1px solid var(--rule)",
      }}
    >
      <SectionBar regmarks>Container Status</SectionBar>

      {errored ? (
        <div
          style={{
            background: "var(--burgundy)",
            color: "white",
            padding: "10px 18px",
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 11,
            letterSpacing: "0.04em",
          }}
        >
          {errored.toUpperCase()}
        </div>
      ) : null}

      {/* Volume */}
      <div style={{ padding: "22px 22px 20px" }}>
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>Volume Fill</div>
        <div className="flex" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="t-stat">
            {empty ? "0.0" : <Ticker value={fmt1(totals.volPct)} />}
            <span style={{ fontSize: 24, color: "var(--mid)", marginLeft: 4 }}>%</span>
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--mid)", textAlign: "right" }}
          >
            {fmt2(totals.approxCbm)} / {fmt1(totals.container.cbm)} CBM
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <ProgressBar pct={empty ? 0 : totals.volPct} />
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--mid)", marginTop: 8 }}>
          {empty ? (
            "Add cases to start building your container."
          ) : totals.volPct > 100 ? (
            <>
              Over capacity by:{" "}
              <span style={{ color: "var(--burgundy)" }}>
                {(totals.volPct - 100).toFixed(1)}% volume
              </span>
            </>
          ) : Math.abs(totals.volPct - 100) < 0.05 ? (
            "Container at exact capacity."
          ) : (
            <>
              Volume remaining:{" "}
              <span style={{ color: "var(--ink)" }}>
                {(100 - totals.volPct).toFixed(1)}%
              </span>
            </>
          )}
        </div>
      </div>

      <div className="rule" />

      {/* Weight */}
      <div style={{ padding: "20px 22px" }}>
        <div className="flex" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="t-eyebrow">Weight</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>
            <Ticker value={fmtInt(totals.kg)} /> / {fmtInt(totals.container.weight_max_kg)} kg
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <ProgressBar pct={empty ? 0 : totals.wtPct} height={10} />
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: totals.wtPct > 100 ? "var(--burgundy)" : "var(--mid)",
            marginTop: 8,
          }}
        >
          {totals.wtPct > 100
            ? `Over by ${fmtInt(totals.kg - totals.container.weight_max_kg)} kg`
            : `${(100 - totals.wtPct).toFixed(1)}% weight remaining`}
        </div>
      </div>

      <div className="rule" />

      {/* Order ledger */}
      <div style={{ padding: "20px 22px 22px" }}>
        <div className="t-eyebrow" style={{ marginBottom: 14 }}>Order Ledger</div>
        <Ledger label="Line items" value={fmtInt(totals.lines)} />
        <Ledger label="Total cases" value={fmtInt(totals.cases)} />
        <Ledger label="Pallet-equivalents" value={fmt1(totals.palletEq)} />
        <Ledger label="Approx. CBM" value={fmt2(totals.approxCbm)} />
        <div className="rule" style={{ margin: "14px 0 12px" }} />
        <div className="flex" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="t-eyebrow">Subtotal</div>
          <div className="t-stat-md">
            {pricesPending ? (
              <span style={{ color: "var(--warm)" }}>—</span>
            ) : (
              <>
                $<Ticker
                  value={totals.subtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                />
              </>
            )}
          </div>
        </div>
        <div
          className="mono"
          style={{ fontSize: 10, color: "var(--mid)", marginTop: 6, lineHeight: 1.5 }}
        >
          {pricesPending
            ? "Prices are being refreshed by your representative — check back shortly."
            : `Pricing reflects ${termsLabel.toLowerCase()}. Final invoice issued upon container confirmation.`}
        </div>
      </div>

      <div className="rule" />

      {/* Customer-facing note (optional) — saved to customer_orders.notes */}
      <div style={{ padding: "18px 22px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>
          Special instructions <span style={{ color: "var(--warm)" }}>· Optional</span>
        </div>
        <textarea
          className="input"
          placeholder="Anything we should know? Carrier preference, delivery date constraints, sample requests, custom labeling…"
          value={notes}
          maxLength={NOTES_MAX}
          onChange={(e) => onNotesChange(e.target.value)}
          disabled={pending || pricesPending}
          style={{
            width: "100%",
            minHeight: 64,
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 11,
            lineHeight: 1.5,
            padding: "8px 10px",
            resize: "vertical",
          }}
        />
        {notes.length > NOTES_MAX * 0.85 ? (
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: notes.length >= NOTES_MAX ? "var(--burgundy)" : "var(--mid)",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {notes.length} / {NOTES_MAX}
          </div>
        ) : null}
      </div>

      <div className="rule" style={{ marginTop: 14 }} />

      {/* Actions */}
      <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        <Button
          kind="secondary"
          className={pulseOptimize ? "pulse-once" : ""}
          onClick={onOptimize}
          disabled={!canOptimize || pending}
          style={{ width: "100%" }}
        >
          Optimize Fill
        </Button>
        <div title={disabledReason ?? ""}>
          <Button
            kind="primary"
            disabled={!submittable}
            onClick={onSubmit}
            style={{ width: "100%" }}
          >
            {pending ? "Submitting…" : "Submit Container Order"}
          </Button>
          {!submittable && !empty ? (
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--mid)",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {disabledReason}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function Ledger({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex"
      style={{ alignItems: "baseline", justifyContent: "space-between", padding: "5px 0" }}
    >
      <div className="t-cap">{label}</div>
      <div className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
