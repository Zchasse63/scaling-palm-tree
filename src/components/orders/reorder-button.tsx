"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reorderFromPastOrderAction } from "@/actions/reorder";

export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await reorderFromPastOrderAction(orderId);
      if (!res.ok) {
        setError(res.error ?? "Reorder failed.");
        return;
      }
      // Land on the catalog the past order was built from.
      router.push(`/?c=${encodeURIComponent(res.catalogSlug ?? "")}`);
    });
  }

  return (
    <div className="flex flex-col" style={{ alignItems: "flex-end", gap: 4 }}>
      <Button kind="secondary" onClick={handleClick} disabled={pending}>
        {pending ? "Building draft…" : "Reorder this container"}
      </Button>
      {error ? (
        <div
          className="mono"
          style={{ fontSize: 10, color: "var(--burgundy)", maxWidth: 220, textAlign: "right" }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
