"use client";

// Admin orders filter bar — status multi-select, customer dropdown, date range.
// Pushes filter state into the URL search params (server component below
// re-renders on each change). Form submits use GET so the page stays
// shareable / refreshable.

import { useRouter, useSearchParams } from "next/navigation";
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
  const sp = useSearchParams();
  const [selStatuses, setSelStatuses] = useState<Set<string>>(new Set(statuses));
  const [selCustomer, setSelCustomer] = useState(customerId ?? "");
  const [from, setFrom] = useState(fromDate ?? "");
  const [to, setTo] = useState(toDate ?? "");

  function toggleStatus(s: string) {
    const next = new Set(selStatuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelStatuses(next);
  }

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selStatuses.size > 0) {
      params.set("status", Array.from(selStatuses).join(","));
    }
    if (selCustomer) params.set("customer", selCustomer);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    router.push("/admin/orders" + (qs ? "?" + qs : ""));
  }

  function clearAll() {
    setSelStatuses(new Set());
    setSelCustomer("");
    setFrom("");
    setTo("");
    router.push("/admin/orders");
  }

  const hasFilters = selStatuses.size > 0 || selCustomer || from || to;

  // Suppress unused warning: sp may be useful for future deep-linking
  void sp;

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
        {STATUS_OPTIONS.map((s) => {
          const active = selStatuses.has(s.value);
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleStatus(s.value)}
              className="mono"
              style={{
                padding: "5px 10px",
                border: active ? "1px solid var(--ink)" : "1px solid var(--rule-strong)",
                background: active ? "var(--ink)" : "white",
                color: active ? "white" : "var(--ink)",
                fontSize: 11,
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
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
            onChange={(e) => setSelCustomer(e.target.value)}
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
