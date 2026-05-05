// Servous wordmark — hex mark image + the actual SERVOUS letterforms cropped
// from the supplied brand banner. Using a real image (not CSS text) so the
// chrome matches the brand exactly.

import Image from "next/image";

interface WordmarkProps {
  /** Height in px of the hex mark; wordmark text aligns to ~80% of this for visual balance. */
  height?: number;
  className?: string;
}

// Source dimensions of the cropped wordmark image (servous-wordmark-text.png).
// Used to compute width while preserving aspect ratio.
const WORDMARK_SRC_W = 724;
const WORDMARK_SRC_H = 103;

export function Wordmark({ height = 32, className = "" }: WordmarkProps) {
  // Wordmark text scaled so its visual height feels balanced next to the hex mark.
  // Letters fill less of their bounding box than the cube does, so we go ~78%.
  const textHeight = Math.round(height * 0.78);
  const textWidth = Math.round((textHeight * WORDMARK_SRC_W) / WORDMARK_SRC_H);

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
      <Image
        src="/brand/servous-wordmark-text.png"
        alt="Servous"
        width={textWidth}
        height={textHeight}
        priority
        style={{
          display: "block",
          height: textHeight,
          width: textWidth,
          objectFit: "contain",
        }}
      />
    </span>
  );
}
