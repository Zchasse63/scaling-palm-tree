"use client";

// Admin-only controls on /admin/orders/[id]: status select + internal notes.

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateOrderAction } from "@/actions/admin-update-order";

const STATUS_OPTIONS = [
  { value: "quoted", label: "Submitted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_production", label: "In production" },
  { value: "ready", label: "Ready" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

interface AdminOrderControlsProps {
  orderId: string;
  initialStatus: string;
  initialInternalNotes: string | null;
}

export function AdminOrderStatusForm({
  orderId,
  initialStatus,
}: Pick<AdminOrderControlsProps, "orderId" | "initialStatus">) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      const res = await updateOrderAction({
        orderId,
        newStatus: status,
      });
      setMsg(res.ok ? "Saved" : (res.error ?? "Save failed"));
      if (res.ok) {
        setTimeout(() => setMsg(null), 2000);
      }
    });
  }

  const dirty = status !== initialStatus;

  return (
    <div className="flex" style={{ gap: 8, alignItems: "center" }}>
      <select
        className="input"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={pending}
        style={{ minWidth: 160 }}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <Button
        kind="primary"
        onClick={save}
        disabled={!dirty || pending}
      >
        {pending ? "Saving…" : "Update status"}
      </Button>
      {msg ? (
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: msg === "Saved" ? "var(--ink)" : "var(--burgundy)",
          }}
        >
          {msg}
        </span>
      ) : null}
    </div>
  );
}

export function AdminInternalNotes({
  orderId,
  initialInternalNotes,
}: Pick<AdminOrderControlsProps, "orderId" | "initialInternalNotes">) {
  const [notes, setNotes] = useState(initialInternalNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      const res = await updateOrderAction({
        orderId,
        internalNotes: notes,
      });
      setMsg(res.ok ? "Saved" : (res.error ?? "Save failed"));
      if (res.ok) {
        setTimeout(() => setMsg(null), 2000);
      }
    });
  }

  const dirty = notes !== (initialInternalNotes ?? "");

  return (
    <section
      style={{
        background: "white",
        border: "1px solid var(--rule)",
        padding: "18px 22px",
      }}
    >
      <div
        className="flex"
        style={{ justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}
      >
        <div className="t-eyebrow">Internal notes</div>
        <div className="mono t-cap" style={{ color: "var(--mid)" }}>
          Customer never sees these
        </div>
      </div>
      <textarea
        className="input"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={pending}
        placeholder="Notes for the Servous team only — quantity adjustments, factory ETA, follow-up reminders..."
        style={{
          width: "100%",
          minHeight: 90,
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 12,
          padding: "10px 12px",
          resize: "vertical",
        }}
      />
      <div
        className="flex"
        style={{
          gap: 8,
          marginTop: 10,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        {msg ? (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: msg === "Saved" ? "var(--ink)" : "var(--burgundy)",
            }}
          >
            {msg}
          </span>
        ) : null}
        <Button kind="secondary" onClick={save} disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </section>
  );
}
