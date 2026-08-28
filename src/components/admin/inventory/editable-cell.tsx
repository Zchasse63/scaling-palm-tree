"use client";

// Settings-in-place: click, type, Enter commits, Esc or blur reverts.
// Integers >= 0 only; empty commits NULL (clears the setting). Failure
// restores the prior value and shows a burgundy line for 3 seconds.

import { useRef, useState } from "react";
import { updateInventorySettingsAction } from "@/actions/admin-inventory-settings";

export function EditableCell({
  vendorProductId,
  field,
  value,
  placeholder,
  ariaLabel,
}: {
  vendorProductId: string;
  field: "reorder_point_cases" | "reorder_qty_cases" | "lead_time_days";
  value: number | null;
  placeholder: string; // e.g. "not set" or "70 (default)"
  ariaLabel: string;
}) {
  const [current, setCurrent] = useState<number | null>(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function begin() {
    if (busy) return;
    setDraft(current === null ? "" : String(current));
    setEditing(true);
  }

  function revert() {
    setEditing(false);
    setDraft("");
  }

  async function commit() {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isInteger(next) || next < 0)) {
      showError("Whole numbers of 0 or more only");
      revert();
      return;
    }
    if (next === current) {
      revert();
      return;
    }
    setBusy(true);
    setEditing(false);
    const prior = current;
    setCurrent(next);
    const res = await updateInventorySettingsAction({
      vendorProductId,
      field,
      value: next,
    });
    setBusy(false);
    if (!res.ok) {
      setCurrent(prior);
      showError(res.error ?? "Save failed");
    }
  }

  function showError(msg: string) {
    setError(msg);
    if (errTimer.current) clearTimeout(errTimer.current);
    errTimer.current = setTimeout(() => setError(null), 3000);
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      {editing ? (
        <input
          autoFocus
          inputMode="numeric"
          value={draft}
          aria-label={ariaLabel}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={revert}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") revert();
          }}
          className="mono"
          style={{
            width: 72,
            height: 26,
            border: "1px solid var(--ink)",
            padding: "0 6px",
            fontSize: 12,
            textAlign: "right",
            background: "white",
            outline: "none",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={begin}
          aria-label={ariaLabel}
          className="mono"
          style={{
            minWidth: 72,
            height: 26,
            border: "1px dashed var(--rule-strong)",
            background: busy ? "var(--press)" : "transparent",
            padding: "0 6px",
            fontSize: 12,
            textAlign: "right",
            cursor: "pointer",
            color: current === null ? "var(--warm)" : "var(--ink)",
          }}
        >
          {current === null ? placeholder : current.toLocaleString("en-US")}
        </button>
      )}
      {error ? (
        <span className="t-micro" style={{ color: "var(--burgundy)" }}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
