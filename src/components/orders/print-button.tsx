"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print order" }: { label?: string }) {
  return (
    <Button
      kind="secondary"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      {label}
    </Button>
  );
}
