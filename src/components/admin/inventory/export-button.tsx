"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportInventoryAsCsvAction } from "@/actions/admin-export-inventory";

export function InventoryExportButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await exportInventoryAsCsvAction();
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
      <Button kind="secondary" className="btn-sm" onClick={handleClick} disabled={busy}>
        {busy ? "Exporting…" : "Export CSV"}
      </Button>
      {error ? (
        <div className="mono" style={{ fontSize: 10, color: "var(--burgundy)" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
