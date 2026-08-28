// /admin/inventory — the inventory dashboard. Admin-gated by the layout;
// live data on every request.

import Link from "next/link";
import { fmtInt, fmtMoneyPos } from "@/lib/math/fmt";
import { dayDiff, fmtDayShort, fmtEtStamp } from "@/lib/inventory/calc";
import {
  fetchInventoryDashboard,
  type InventoryDashboardData,
  type InventoryRow,
} from "@/lib/inventory/query";
import type { Bucket } from "@/lib/inventory/types";
import { FeedStamp } from "@/components/admin/inventory/feed-stamp";
import { CategorySidebar } from "@/components/admin/inventory/category-sidebar";
import { BucketTabs, type BucketCounts } from "@/components/admin/inventory/bucket-tabs";
import {
  InventoryTable,
  coverLabel,
  type SortKey,
} from "@/components/admin/inventory/inventory-table";
import { InventoryExportButton } from "@/components/admin/inventory/export-button";

export const dynamic = "force-dynamic";

const SEVERITY: Record<Bucket, number> = {
  stockout: 0,
  allocated_out: 1,
  act_now: 2,
  watch: 3,
  healthy: 4,
  excess: 5,
  no_movement: 6,
  none: 7,
};

const SORT_KEYS: SortKey[] = [
  "sku",
  "on_hand",
  "staged",
  "orders",
  "avail",
  "inbound",
  "cover",
  "value",
];

function sortValue(r: InventoryRow, key: SortKey): number | string {
  switch (key) {
    case "sku":
      return r.sku;
    case "on_hand":
      return r.onHand;
    case "staged":
      return r.staged;
    case "orders":
      return r.ordersOpen;
    case "avail":
      return r.available;
    case "inbound":
      return r.inbound;
    case "cover":
      return r.cover ?? Number.POSITIVE_INFINITY;
    case "value":
      return r.valueAtCost ?? -1;
  }
}

interface PageProps {
  searchParams: Promise<{
    bucket?: string;
    sort?: string;
    dir?: string;
    feed?: string;
    cat?: string;
    q?: string;
  }>;
}

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const data = await fetchInventoryDashboard(new Date().toISOString());
  const { rows, feed } = data;

  const activeCat = sp.cat ?? null;
  const q = (sp.q ?? "").trim();
  const qLower = q.toLowerCase();
  // Category + search scope first; the status tabs then count within scope.
  const scoped = rows.filter((r) => {
    if (activeCat !== null && (r.category ?? "Uncategorized") !== activeCat) return false;
    if (
      qLower &&
      !r.sku.toLowerCase().includes(qLower) &&
      !r.description.toLowerCase().includes(qLower)
    ) {
      return false;
    }
    return true;
  });

  const counts: BucketCounts = {
    stockout: scoped.filter((r) => r.bucket === "stockout" || r.bucket === "allocated_out")
      .length,
    act_now: scoped.filter((r) => r.bucket === "act_now").length,
    watch: scoped.filter((r) => r.bucket === "watch").length,
    excess: scoped.filter((r) => r.bucket === "excess").length,
    no_movement: scoped.filter((r) => r.bucket === "no_movement").length,
    all: scoped.length,
  };

  const defaultBucket: keyof BucketCounts =
    counts.stockout > 0 ? "stockout" : counts.act_now > 0 ? "act_now" : "all";
  const activeBucket = (
    sp.bucket && sp.bucket in counts ? sp.bucket : defaultBucket
  ) as keyof BucketCounts;

  const sort = SORT_KEYS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : null;
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const showFeed = sp.feed === "1";

  const filtered = scoped.filter((r) => {
    if (activeBucket === "all") return true;
    if (activeBucket === "stockout") {
      return r.bucket === "stockout" || r.bucket === "allocated_out";
    }
    return r.bucket === activeBucket;
  });

  const sorted = filtered.slice().sort((a, b) => {
    if (sort) {
      const av = sortValue(a, sort);
      const bv = sortValue(b, sort);
      const cmp =
        typeof av === "string"
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number);
      if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      return a.sku.localeCompare(b.sku);
    }
    const sev = SEVERITY[a.bucket] - SEVERITY[b.bucket];
    if (sev !== 0) return sev;
    const ac = a.cover ?? Number.POSITIVE_INFINITY;
    const bc = b.cover ?? Number.POSITIVE_INFINITY;
    if (ac !== bc) return ac - bc;
    return a.sku.localeCompare(b.sku);
  });

  const makeHref = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | null> = {
      bucket: activeBucket,
      sort: sort ?? null,
      dir: sort ? dir : null,
      feed: showFeed ? "1" : null,
      cat: activeCat,
      q: q || null,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v !== null) params.set(k, v);
    const qs = params.toString();
    return qs ? `/admin/inventory?${qs}` : "/admin/inventory";
  };

  const makeSortHref = (key: SortKey) =>
    makeHref({ sort: key, dir: sort === key && dir === "asc" ? "desc" : "asc" });

  const totals = rows.reduce(
    (t, r) => ({
      onHand: t.onHand + r.onHand,
      avail: t.avail + r.available,
      pallets: t.pallets + (r.pallets ?? 0),
      value: t.value + (r.valueAtCost ?? 0),
      anyApprox: t.anyApprox || r.costApprox || r.valueAtCost === null,
    }),
    { onHand: 0, avail: 0, pallets: 0, value: 0, anyApprox: false },
  );

  const actionable = counts.stockout + counts.act_now;
  const shortest = scoped
    .filter((r) => r.cover !== null)
    .sort((a, b) => (a.cover ?? 0) - (b.cover ?? 0))[0];

  const trendWeeks = Math.max(0, ...rows.map((r) => r.velocity.windowWeeks)) || 13;
  const trendLabel = `${trendWeeks}w`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-col" style={{ gap: 6 }}>
        <div className="t-eyebrow">Admin · Inventory</div>
        <div className="t-h1">Savannah stock</div>
      </div>

      <FeedStamp feed={feed} variant="full" />

      {showFeed ? <FeedDetail data={data} /> : null}

      {rows.length === 0 ? (
        <section
          style={{
            background: "white",
            border: "1px solid var(--rule)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div className="mono t-cap">No inventory data has been ingested yet.</div>
          <div className="t-micro" style={{ marginTop: 8 }}>
            The daily 4pm UNIS report feeds this page automatically.
          </div>
        </section>
      ) : (
        <>
          {/* KPI row */}
          <div
            className="admin-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <Stat
              label="Cases on hand"
              value={fmtInt(totals.onHand)}
              href={makeHref({ sort: "on_hand", dir: "desc" })}
            />
            <Stat
              label="Available to promise"
              value={fmtInt(totals.avail)}
              href={makeHref({ sort: "avail", dir: "asc" })}
            />
            <Stat
              label="Pallets on hand"
              value={fmtInt(totals.pallets)}
              href={makeHref({ sort: "on_hand", dir: "desc" })}
            />
            <Stat
              label="Value at cost"
              value={fmtMoneyPos(totals.value)}
              sub={totals.anyApprox ? "internal · approx" : "internal · current cost"}
              href={makeHref({ sort: "value", dir: "desc" })}
            />
            <Stat
              label="Next container"
              value={
                data.nextArrival
                  ? `${fmtDayShort(data.nextArrival.eta)} · ${dayDiff(data.todayKey, data.nextArrival.eta)}d`
                  : "None inbound"
              }
              sub={
                data.nextArrival
                  ? `${fmtInt(data.nextArrival.cases)} cases aboard`
                  : counts.act_now > 0
                    ? "SKUs project below floor"
                    : undefined
              }
              amber={!data.nextArrival && counts.act_now > 0}
              href="/admin/inventory/inbound"
            />
          </div>

          <div
            className="builder-grid"
            style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <CategorySidebar
                categories={data.categories}
                active={activeCat}
                makeHref={(cat) => makeHref({ cat, sort: null, dir: null })}
              />
              {data.expectedOrders.length === 0 ? (
                <div className="t-micro" style={{ color: "var(--warm)", padding: "0 2px" }}>
                  Expected orders appear here as order history accumulates.
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              {data.expectedOrders.length > 0 ? (
                <section style={{ background: "white", border: "1px solid var(--rule)" }}>
                  <div
                    className="t-eyebrow"
                    style={{ padding: "10px 16px", background: "var(--paper-2)", borderBottom: "1px solid var(--rule)" }}
                  >
                    Expected orders · by customer cadence
                  </div>
                  <div style={{ padding: "8px 16px 12px" }}>
                    {data.expectedOrders.slice(0, 6).map((c) => (
                      <div
                        key={c.customerName}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          padding: "6px 0",
                          borderBottom: "1px solid var(--rule)",
                          alignItems: "baseline",
                        }}
                      >
                        <span className="t-body">{c.customerName}</span>
                        <span className="mono t-micro">{c.usualSkus.join(" · ")}</span>
                        {c.dueInDays === null ? (
                          <span className="t-micro">
                            {c.orderCount} order{c.orderCount === 1 ? "" : "s"} · cadence forming
                          </span>
                        ) : c.dueInDays < 0 ? (
                          <span className="chip chip-amber">Overdue {-c.dueInDays}d</span>
                        ) : (
                          <span className="mono t-micro">due in {c.dueInDays}d</span>
                        )}
                      </div>
                    ))}
                    <div className="t-micro" style={{ marginTop: 6, color: "var(--warm)" }}>
                      Reorder calendar from real order gaps (median, 3+ orders). Not a forecast.
                    </div>
                  </div>
                </section>
              ) : null}

              <div
                className="flex"
                style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}
              >
                <BucketTabs
                  counts={counts}
                  active={activeBucket}
                  makeHref={(b) => makeHref({ bucket: b, sort: null, dir: null })}
                />
                <div className="flex" style={{ gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <form action="/admin/inventory" method="get" className="flex" style={{ gap: 0 }}>
                    {activeBucket ? <input type="hidden" name="bucket" value={activeBucket} /> : null}
                    {activeCat ? <input type="hidden" name="cat" value={activeCat} /> : null}
                    <input
                      type="search"
                      name="q"
                      defaultValue={q}
                      placeholder="Search SKU or description"
                      aria-label="Search inventory"
                      className="input"
                      style={{ height: 32, width: 220, fontSize: 12 }}
                    />
                  </form>
                  <InventoryExportButton />
                </div>
              </div>

              {actionable === 0 && shortest ? (
                <div className="mono t-cap" style={{ color: "var(--mid)" }}>
                  Nothing needs action{activeCat || q ? " in this view" : " today"}. Shortest
                  runway: {shortest.sku} at {coverLabel(shortest).text}.
                </div>
              ) : null}

              {sorted.length === 0 ? (
                <section
                  style={{
                    background: "white",
                    border: "1px solid var(--rule)",
                    padding: "36px 24px",
                    textAlign: "center",
                  }}
                >
                  <div className="mono t-cap">No SKUs match this view.</div>
                </section>
              ) : (
                <InventoryTable
                  rows={sorted}
                  sort={sort}
                  dir={dir}
                  makeSortHref={makeSortHref}
                  trendLabel={trendLabel}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  amber,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  amber?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      style={{
        background: "white",
        color: amber ? "var(--amber)" : "var(--ink)",
        border: amber ? "1px solid var(--amber)" : "1px solid var(--rule)",
        padding: "16px 20px",
        height: "100%",
      }}
    >
      <div className="t-eyebrow" style={{ color: amber ? "var(--amber)" : undefined }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          marginTop: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div className="t-micro" style={{ marginTop: 4, color: amber ? "var(--amber)" : undefined }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function FeedDetail({ data }: { data: InventoryDashboardData }) {
  const { feed } = data;
  return (
    <section style={{ background: "white", border: "1px solid var(--rule)" }}>
      <div
        style={{
          padding: "12px 22px",
          background: "var(--paper-2)",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div className="t-eyebrow">Feed detail · last 14 reports</div>
        <Link
          href="/admin/inventory"
          className="mono t-cap"
          style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Close
        </Link>
      </div>

      <div style={{ padding: "14px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        {feed.missingDays.length > 0 ? (
          <div className="flex" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="t-micro">Missing days:</span>
            {feed.missingDays.map((d) => (
              <span key={d} className="chip chip-burgundy">
                {fmtDayShort(d)} missed
              </span>
            ))}
          </div>
        ) : null}

        <div>
          {feed.reportHistory.map((r) => (
            <div
              key={r.day}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 90px 110px 1fr",
                gap: 14,
                padding: "6px 0",
                borderBottom: "1px solid var(--rule)",
              }}
            >
              <span className="mono" style={{ fontSize: 12 }}>
                {fmtDayShort(r.day)}
              </span>
              <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
                {fmtInt(r.rowCount)} SKUs
              </span>
              <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>
                {fmtInt(r.totalCases)} cases
              </span>
              <span className="t-micro">
                {r.ingestedAt ? `ingested ${fmtEtStamp(r.ingestedAt)}` : ""}
              </span>
            </div>
          ))}
        </div>

        {feed.syncJobs.length > 0 ? (
          <div>
            <div className="t-eyebrow" style={{ marginBottom: 6 }}>
              Pipeline jobs
            </div>
            {feed.syncJobs.map((j) => (
              <div
                key={j.job + j.account}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr 1fr",
                  gap: 14,
                  padding: "4px 0",
                }}
              >
                <span className="mono" style={{ fontSize: 12 }}>
                  {j.job}
                </span>
                <span className="t-micro">
                  {j.lastSuccessAt ? `last success ${fmtEtStamp(j.lastSuccessAt)}` : "never succeeded"}
                </span>
                <span className="t-micro">{j.lastStatus ?? ""}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="t-micro" style={{ color: "var(--warm)" }}>
          Source: daily UNIS 4:00 PM report email, ingested by the ops pipeline. The
          dashboard never edits inventory.
        </div>
      </div>
    </section>
  );
}
