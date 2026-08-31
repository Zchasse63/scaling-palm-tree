"use client";

// Admin orders filter bar — status multi-select, customer dropdown, quick
// Day/Week/Month range presets, and a custom date range. Status chips,
// presets, and the customer dropdown apply IMMEDIATELY (one click, one
// result); only hand-typed custom dates go through Apply. Filter state lives
// in the URL search params so views stay shareable and refreshable.

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

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

// Quick ranges: trailing windows ending today (local calendar).
const RANGE_PRESETS = [
  { key: "day", label: "Day", days: 1 },
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
];

function localDayKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

interface OrdersFilterBarProps {
  customers: Array<{ id: string; name: string }>;
  statuses: string[];
  customerId: string | null;
  fromDate: string | null;
  toDate: string | null;
}

export function OrdersFilterBar({
  customers,
  statuses,
  customerId,
  fromDate,
  toDate,
}: OrdersFilterBarProps) {
  const router = useRouter();
  const [selStatuses, setSelStatuses] = useState<Set<string>>(new Set(statuses));
  const [selCustomer, setSelCustomer] = useState(customerId ?? "");
  const [from, setFrom] = useState(fromDate ?? "");
  const [to, setTo] = useState(toDate ?? "");

  function push(next: {
    statuses?: Set<string>;
    customer?: string;
    from?: string;
    to?: string;
  }) {
    const st = next.statuses ?? selStatuses;
    const cust = next.customer ?? selCustomer;
    const f = next.from ?? from;
    const t = next.to ?? to;
    const params = new URLSearchParams();
    if (st.size > 0) params.set("status", Array.from(st).join(","));
    if (cust) params.set("customer", cust);
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    const qs = params.toString();
    router.push("/admin/orders" + (qs ? "?" + qs : ""));
  }

  function toggleStatus(s: string) {
    const next = new Set(selStatuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelStatuses(next);
    push({ statuses: next });
  }

  function pickCustomer(id: string) {
    setSelCustomer(id);
    push({ customer: id });
  }

  function applyPreset(days: number) {
    const f = localDayKey(days - 1);
    const t = localDayKey(0);
    setFrom(f);
    setTo(t);
    push({ from: f, to: t });
  }

  function presetActive(days: number): boolean {
    return from === localDayKey(days - 1) && to === localDayKey(0);
  }

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    push({});
  }

  function clearAll() {
    setSelStatuses(new Set());
    setSelCustomer("");
    setFrom("");
    setTo("");
    router.push("/admin/orders");
  }

  const hasFilters = selStatuses.size > 0 || selCustomer || from || to;

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 10px",
    border: active ? "1px solid var(--ink)" : "1px solid var(--rule-strong)",
    background: active ? "var(--ink)" : "white",
    color: active ? "white" : "var(--ink)",
    fontSize: 11,
    letterSpacing: "0.04em",
    cursor: "pointer",
  });

  return (
    <form
      onSubmit={applyFilters}
      style={{
        background: "white",
        border: "1px solid var(--rule)",
        padding: "16px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div className="flex" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div className="t-eyebrow" style={{ marginRight: 8 }}>
          Status
        </div>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => toggleStatus(s.value)}
            className="mono"
            style={chipStyle(selStatuses.has(s.value))}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div
        className="flex"
        style={{ gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}
      >
        <label className="flex flex-col" style={{ gap: 4, minWidth: 220 }}>
          <span className="t-eyebrow">Customer</span>
          <select
            className="input"
            value={selCustomer}
            onChange={(e) => pickCustomer(e.target.value)}
            style={{ minWidth: 220 }}
          >
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col" style={{ gap: 4 }}>
          <span className="t-eyebrow">Range</span>
          <div className="flex" style={{ gap: 6 }}>
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="mono"
                style={{ ...chipStyle(presetActive(p.days)), height: 34 }}
                title={p.days === 1 ? "Today" : `Last ${p.days} days`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col" style={{ gap: 4 }}>
          <span className="t-eyebrow">From</span>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col" style={{ gap: 4 }}>
          <span className="t-eyebrow">To</span>
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="flex" style={{ gap: 8, marginLeft: "auto" }}>
          {hasFilters ? (
            <Button kind="text" type="button" onClick={clearAll}>
              Clear
            </Button>
          ) : null}
          <Button kind="primary" type="submit">
            Apply
          </Button>
        </div>
      </div>
    </form>
  );
}
