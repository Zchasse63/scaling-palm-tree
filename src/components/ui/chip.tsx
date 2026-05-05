// Tag chip — small inline pill for spec annotations (EST., Pre-palletized, Pack × 200).

import type { ReactNode } from "react";

type Variant = "warm" | "ink" | "burgundy";

interface ChipProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

export function Chip({ children, variant = "warm", className = "" }: ChipProps) {
  const cls =
    variant === "ink"
      ? "chip chip-ink"
      : variant === "burgundy"
      ? "chip chip-burgundy"
      : "chip";
  return <span className={cls + " " + className}>{children}</span>;
}
