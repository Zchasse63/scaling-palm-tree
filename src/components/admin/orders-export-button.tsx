"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportOrdersAsCsvAction } from "@/actions/admin-export-orders";

interface OrdersExportButtonProps {
  statuses: string[];
  customerId: string | null;
  fromDate: string | null;
  toDate: string | null;
}

export function OrdersExportButton({
  statuses,
  customerId,
  fromDate,
  toDate,
}: OrdersExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await exportOrdersAsCsvAction({
        statuses: statuses.length > 0 ? statuses : undefined,
        customerId: customerId,
        fromDate: fromDate,
        toDate: toDate,
      });
      if (!res.ok || !res.csv || !res.filename) {
        setError(res.error ?? "Export failed");
        return;
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ alignItems: "flex-end", gap: 4 }}>
      <Button kind="secondary" onClick={handleClick} disabled={busy}>
        {busy ? "Exporting…" : "Download CSV"}
      </Button>
      {error ? (
        <div
          className="mono"
          style={{ fontSize: 10, color: "var(--burgundy)" }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
