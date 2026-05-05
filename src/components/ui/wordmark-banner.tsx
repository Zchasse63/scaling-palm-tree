// Full Servous banner — wide image with SERVOUS™ + "Foodservice Packaging" tagline.
// Used on the sign-in hero only. For all chrome/header use, prefer <Wordmark />.

import Image from "next/image";

interface WordmarkBannerProps {
  height?: number;
  className?: string;
}

export function WordmarkBanner({ height = 80, className = "" }: WordmarkBannerProps) {
  // The source PNG is approx 736x223 — preserve aspect ratio.
  const width = Math.round(height * (736 / 223));
  return (
    <Image
      src="/brand/servous-banner.png"
      alt="Servous · Foodservice Packaging"
      width={width}
      height={height}
      priority
      className={className}
      style={{ display: "block", height, width: "auto", objectFit: "contain" }}
    />
  );
}
