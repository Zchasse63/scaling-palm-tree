// Servous wordmark — uses the hex/cube mark + small SERVOUS letterforms.
// For places that want the full SERVOUS™ banner (sign-in hero), see WordmarkBanner.

import Image from "next/image";

interface WordmarkProps {
  /** Height in px of the hex mark and the proportional letterforms next to it. */
  height?: number;
  className?: string;
}

export function Wordmark({ height = 32, className = "" }: WordmarkProps) {
  const fontSize = Math.round(height * 0.62);
  return (
    <span
      className={"inline-flex items-center " + className}
      style={{ height, gap: Math.round(height * 0.4) }}
    >
      <Image
        src="/brand/servous-mark.png"
        alt=""
        width={height}
        height={height}
        priority
        style={{
          display: "block",
          height,
          width: height,
          objectFit: "contain",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-geist), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.16em",
          fontSize,
          color: "var(--ink)",
          lineHeight: 1,
        }}
      >
        SERVOUS
      </span>
    </span>
  );
}
