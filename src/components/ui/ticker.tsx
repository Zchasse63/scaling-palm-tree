"use client";

// Cross-fade numeric ticker — fades the entire string out then in over 180ms
// when the value changes. Intentionally simple; no per-digit rolling effect.

import { useEffect, useState } from "react";

interface TickerProps {
  value: string | number;
  className?: string;
}

export function Ticker({ value, className = "" }: TickerProps) {
  const str = String(value);
  const [shown, setShown] = useState(str);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (str === shown) return;
    setOpacity(0);
    const t = setTimeout(() => {
      setShown(str);
      setOpacity(1);
    }, 90);
    return () => clearTimeout(t);
  }, [str, shown]);

  return (
    <span
      className={"ticker mono " + className}
      style={{ opacity }}
    >
      {shown}
    </span>
  );
}
