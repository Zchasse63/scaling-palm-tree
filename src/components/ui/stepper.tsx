"use client";

// Quantity stepper — minus / number / plus.
// `packMultiple` enforces order increments (e.g., foil rolls = 200/pallet).
// Direct typing is allowed; the value snaps to the nearest multiple on blur
// with a 2-second inline note explaining why.

import { useEffect, useState, type KeyboardEvent } from "react";

interface StepperProps {
  value: number;
  onChange: (n: number) => void;
  /** SKU pack-out (e.g., 200 rolls/pallet). Increments and snap-multiples follow this. */
  packMultiple?: number | null;
  /** Catalog-wide minimum cases per line item with qty > 0. Default 100. */
  minCaseQty?: number;
  max?: number;
  ariaLabel?: string;
}

/**
 * Effective minimum for a SKU is max(packMultiple, minCaseQty) — pack-multiples
 * always satisfy themselves, but the catalog minimum may force a higher floor.
 */
function effectiveMin(packMultiple: number | null | undefined, minCaseQty: number): number {
  const pack = packMultiple && packMultiple > 0 ? packMultiple : 1;
  const min = Math.max(minCaseQty, pack);
  // Round up to nearest pack multiple if min isn't already aligned.
  return Math.ceil(min / pack) * pack;
}

export function Stepper({
  value,
  onChange,
  packMultiple,
  minCaseQty = 100,
  max = 99999,
  ariaLabel,
}: StepperProps) {
  const [local, setLocal] = useState(String(value));
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2000);
    return () => clearTimeout(t);
  }, [note]);

  const step = packMultiple && packMultiple > 0 ? packMultiple : 1;
  const minIfActive = effectiveMin(packMultiple, minCaseQty);

  // Decrement: if we're at or just above min, drop straight to 0.
  // Otherwise step down by pack/1.
  const dec = () => {
    if (value <= minIfActive) {
      onChange(0);
    } else {
      const next = Math.max(minIfActive, value - step);
      onChange(next);
    }
  };
  // Increment: from 0 jump to min; otherwise step up.
  const inc = () => {
    if (value === 0) {
      onChange(Math.min(max, minIfActive));
    } else {
      onChange(Math.min(max, value + step));
    }
  };

  const onBlur = () => {
    let v = parseInt(local || "0", 10);
    if (Number.isNaN(v) || v < 0) v = 0;
    // Pack-multiple snap.
    if (v > 0 && packMultiple && packMultiple > 0 && v % packMultiple !== 0) {
      v = Math.round(v / packMultiple) * packMultiple;
      setNote(`Ships in units of ${packMultiple}.`);
    }
    // Below min becomes the min (or 0 — whichever is closer).
    if (v > 0 && v < minIfActive) {
      v = v <= minIfActive / 2 ? 0 : minIfActive;
      if (v > 0) setNote(`Minimum ${minIfActive} cases for this line.`);
    }
    const final = Math.max(0, Math.min(max, v));
    // Always reset the displayed string, even when the parent value doesn't
    // change — otherwise React.useState bails out and the input shows the
    // stale typed value (BUG-002 from the QA pipeline).
    setLocal(String(final));
    onChange(final);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const inc = e.shiftKey && packMultiple ? packMultiple : step;
      onChange(Math.min(max, Math.max(value === 0 ? minIfActive : value + inc, 0)));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const dec = e.shiftKey && packMultiple ? packMultiple : step;
      const next = value - dec;
      onChange(next < minIfActive ? 0 : next);
    }
  };

  return (
    <div className="flex flex-col items-end" style={{ gap: 4 }}>
      <div className="stepper" role="group" aria-label={ariaLabel ?? "Quantity"}>
        <button
          type="button"
          onClick={dec}
          aria-label="Decrease"
          disabled={value <= 0}
        >
          −
        </button>
        <input
          type="number"
          value={local}
          onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={onBlur}
          onKeyDown={onKey}
          aria-label={ariaLabel ?? "Quantity"}
        />
        <button type="button" onClick={inc} aria-label="Increase">
          +
        </button>
      </div>
      {note ? (
        <div className="mono" style={{ fontSize: 10, color: "var(--mid)" }}>
          {note}
        </div>
      ) : null}
    </div>
  );
}
