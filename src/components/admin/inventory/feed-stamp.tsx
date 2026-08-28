// Feed freshness: the highest-stakes element on every inventory view.
// The SNAPSHOT time is stamped, never the page-load time. Stale looks stale.

import Link from "next/link";
import { fmtDayShort, fmtEtStamp, etDayKey } from "@/lib/inventory/calc";
import type { FeedHealth } from "@/lib/inventory/query";

function staleBanner(feed: FeedHealth): React.ReactNode {
  if (feed.staleness === "fresh") return null;
  if (!feed.latestCountedAt) {
    return <div className="banner-alarm">No UNIS report has ever been ingested.</div>;
  }
  const latestDay = fmtDayShort(etDayKey(feed.latestCountedAt));
  if (feed.staleness === "amber") {
    return (
      <div className="banner-amber">
        Yesterday&apos;s 4pm report has not arrived. Figures are from {latestDay}.
      </div>
    );
  }
  const days = Math.max(2, feed.missingDays.length);
  return (
    <div className="banner-alarm">
      No report for {days} days. Do not promise stock from these figures.
    </div>
  );
}

/** Full strip for the dashboard; compact single line for detail/inbound views. */
export function FeedStamp({
  feed,
  variant,
}: {
  feed: FeedHealth;
  variant: "full" | "compact";
}) {
  const banner = staleBanner(feed);
  const stamp = feed.latestCountedAt ? (
    <>
      As of UNIS report {fmtEtStamp(feed.latestCountedAt)}
      {feed.ingestedAt ? (
        <span style={{ color: "var(--warm)" }}>
          {" "}
          &middot; ingested {fmtEtStamp(feed.ingestedAt)}
        </span>
      ) : null}
    </>
  ) : (
    <>No inventory data has been ingested yet</>
  );

  if (variant === "compact") {
    return (
      <div className="flex flex-col" style={{ gap: 8 }}>
        <div className="mono t-cap">{stamp}</div>
        {banner}
      </div>
    );
  }

  const gapLine =
    feed.missingDays.length === 0
      ? "no gaps in the last 14 reports"
      : `${feed.missingDays.length} missing day${feed.missingDays.length === 1 ? "" : "s"} in the last 14`;

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div
        style={{
          background: "white",
          border: "1px solid var(--rule)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div className="mono t-cap" style={{ color: "var(--ink)" }}>
          {stamp}
          <span style={{ color: feed.missingDays.length === 0 ? "var(--warm)" : "var(--amber)" }}>
            {" "}
            &middot; {gapLine}
          </span>
        </div>
        <Link
          href="/admin/inventory?feed=1"
          className="mono t-cap"
          style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Feed detail →
        </Link>
      </div>
      {banner}
    </div>
  );
}
