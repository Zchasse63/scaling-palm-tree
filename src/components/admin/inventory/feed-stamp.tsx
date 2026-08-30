// Feed freshness: the highest-stakes element on every inventory view.
// The SNAPSHOT time is stamped, never the page-load time. Stale looks stale,
// and a degraded pipeline (parse failures, unmatched SKUs, missed reports)
// says so instead of hiding behind a green "ok".

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
  // Count the CONSECUTIVE missed run ending at the newest gap — an unrelated
  // gap two weeks ago must not inflate "no report for N days".
  const consecutive = (() => {
    let n = 0;
    const sorted = feed.missingDays.slice().sort();
    for (let i = sorted.length - 1; i > 0; i--) {
      n++;
      const gap =
        (new Date(sorted[i] + "T00:00:00Z").getTime() -
          new Date(sorted[i - 1] + "T00:00:00Z").getTime()) /
        86_400_000;
      if (gap !== 1) return n;
    }
    return sorted.length;
  })();
  const days = Math.max(2, consecutive);
  return (
    <div className="banner-alarm">
      No report for {days} days. Do not promise stock from these figures.
    </div>
  );
}

/**
 * Degraded signal from the jobs that feed THIS dashboard only. Other ops jobs
 * (briefs, intel) use their own status vocabularies and would false-alarm on
 * an "ok" prefix check.
 */
const FEED_JOBS = new Set(["unis_ingest", "inbox_sync"]);
function pipelineIssue(feed: FeedHealth): { job: string; status: string } | null {
  for (const j of feed.syncJobs) {
    if (!FEED_JOBS.has(j.job)) continue;
    if (j.lastStatus && !j.lastStatus.startsWith("ok")) {
      return { job: j.job, status: j.lastStatus };
    }
  }
  return null;
}

/** Full strip for the dashboard; compact single line for detail/inbound views. */
export function FeedStamp({
  feed,
  variant,
  detailHref,
}: {
  feed: FeedHealth;
  variant: "full" | "compact";
  /** Href for the feed-detail toggle, built by the page so filters survive. */
  detailHref?: string;
}) {
  const banner = staleBanner(feed);
  const issue = pipelineIssue(feed);
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
          {feed.unmatchedSkus > 0 ? (
            <span style={{ color: "var(--amber)" }} title="Report SKUs with no vendor_products match; excluded from every figure. See feed detail.">
              {" "}
              &middot; {feed.unmatchedSkus} unmatched SKU{feed.unmatchedSkus === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <Link
          href={detailHref ?? "/admin/inventory?feed=1"}
          className="mono t-cap"
          style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Feed detail →
        </Link>
      </div>
      {issue ? (
        <div className="banner-amber">
          Pipeline degraded — {issue.job}: {issue.status.slice(0, 160)}
        </div>
      ) : null}
      {banner}
    </div>
  );
}
