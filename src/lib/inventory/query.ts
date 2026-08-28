// Inventory reads. Server-only; all queries run on the service-role client
// from admin-gated Server Components. Semantics: PLAN_08-27-2026.md section 3.

import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import {
  buildDailySeries,
  buildMovement,
  computeAvailable,
  computeBucket,
  computeInbound,
  computeOrdersOpen,
  computeStaleness,
  computeVelocity,
  consumptionStats,
  coverWeeks,
  customerCadences,
  etDayKey,
  finiteOrNull,
  missingReportDays,
  reconcileFlag,
  addDays,
  type ConsumptionStats,
  type CustomerCadence,
} from "./calc";
import {
  DEFAULT_LEAD_TIME_DAYS,
  OPEN_ORDER_STATUSES,
  type Bucket,
  type DayPoint,
  type InboundLineInput,
  type MovementDay,
  type OpenOrderLineInput,
  type SnapshotInput,
  type Staleness,
  type Velocity,
} from "./types";

// ---------------------------------------------------------------- view models

export interface FeedHealth {
  latestCountedAt: string | null;
  ingestedAt: string | null;
  staleness: Staleness;
  reportDays: string[]; // ET day keys with a system report, newest first (14)
  missingDays: string[]; // gaps within the trailing 14-day window
  syncJobs: Array<{
    job: string;
    account: string;
    lastSuccessAt: string | null;
    lastStatus: string | null;
  }>;
  reportHistory: Array<{
    day: string;
    rowCount: number;
    totalCases: number;
    ingestedAt: string | null;
  }>;
}

export interface InventoryRow {
  vendorProductId: string;
  sku: string;
  description: string;
  category: string | null;
  inactive: boolean;
  hasHistory: boolean;
  notYetReceived: boolean;
  inNewestBatch: boolean;
  onHand: number; // physical
  staged: number;
  ordersOpen: number;
  available: number;
  inbound: number;
  pallets: number | null;
  velocity: Velocity;
  cover: number | null;
  bucket: Bucket;
  reconcile: boolean;
  weeklyConsumption: number[]; // oldest -> newest, for the sparkline
  weeklyReceipts: boolean[];
  valueAtCost: number | null;
  costApprox: boolean;
  floor: number | null;
  reorderQty: number | null;
  leadTimeDays: number | null; // null renders "70 (default)"
}

export interface CategoryRollup {
  name: string; // "Uncategorized" for SKUs without a category
  skus: number;
  cases: number; // physical
  valueAtCost: number;
}

export interface InventoryDashboardData {
  rows: InventoryRow[];
  feed: FeedHealth;
  nextArrival: { eta: string; containerNo: string | null; cases: number } | null;
  inboundTotalCases: number;
  todayKey: string;
  categories: CategoryRollup[];
  /** Per-customer reorder cadence from real orders; empty until orders flow. */
  expectedOrders: CustomerCadence[];
}

export interface SkuDetailData {
  row: InventoryRow;
  packDisplay: string | null;
  casesPerPallet: number | null;
  caseWeightLb: number | null;
  costPerCase: number | null;
  movement: MovementDay[]; // newest first, trailing 60 days
  openOrderLines: Array<{
    orderNumber: string | null;
    customerName: string;
    qtyOpen: number;
    requestedDate: string | null;
  }>;
  buyers: Array<{
    customerName: string;
    cases26w: number;
    lastOrderDay: string | null;
    typicalGapDays: number | null;
    overdueDays: number | null;
  }>;
  inboundLines: InboundLineInput[];
  series: DayPoint[];
  feed: FeedHealth;
  todayKey: string;
  /**
   * DN-number references resolved from the email log (interactions): the DN
   * paperwork thread's subject, date, and, when the thread body names exactly
   * one known customer, that customer. Display-only context, labeled as
   * email-derived; the authoritative customer/PO link arrives with the order
   * pipeline.
   */
  dnRefs: Record<string, { subject: string; day: string; customer: string | null }>;
  stats: ConsumptionStats;
  costHistory: Array<{
    effectiveFrom: string;
    effectiveTo: string | null;
    costPerCase: number;
    source: string | null;
  }>;
  /** Order-line co-occurrence: items on the same orders as this SKU. Empty until orders flow. */
  boughtWith: Array<{ sku: string; description: string | null; orders: number; cases: number }>;
}

export interface InboundShipmentView {
  id: string;
  containerNo: string | null;
  poNumber: string | null;
  vendorName: string | null;
  etd: string | null;
  eta: string | null;
  status: string;
  receivedAt: string | null;
  notes: string | null;
  lines: Array<{
    id: string;
    vendorProductId: string | null;
    sku: string | null;
    description: string | null;
    qtyCases: number;
  }>;
  plannedLeadDays: number | null; // etd -> eta
  actualLeadDays: number | null; // etd -> received
}

// ---------------------------------------------------------------- helpers

interface SnapshotDbRow {
  vendor_product_id: string;
  counted_at: string;
  created_at: string;
  qty_cases: number;
  qty_picked_cases: number | null;
  pallets_on_hand: number | null;
  notes: string | null;
}

async function fetchSystemSnapshots(sinceIso: string) {
  // PostgREST silently caps responses at 1,000 rows regardless of .limit();
  // the history is ~2,500 rows, so an uncapped single fetch would return only
  // the OLDEST rows and every downstream number would be weeks stale. Page
  // explicitly until a short page arrives.
  const admin = adminClient();
  const PAGE = 1000;
  const rows: SnapshotDbRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from("inventory_snapshots")
      .select(
        "vendor_product_id, counted_at, created_at, qty_cases, qty_picked_cases, pallets_on_hand, notes",
      )
      .eq("count_method", "system")
      .gte("counted_at", sinceIso)
      .order("counted_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error("snapshots fetch failed: " + error.message);
    rows.push(...((data ?? []) as SnapshotDbRow[]));
    if (!data || data.length < PAGE) break;
    if (offset > 20_000) throw new Error("snapshots fetch runaway: >20k rows");
  }
  return rows;
}

interface OpenLineJoin extends OpenOrderLineInput {
  orderId: string;
}

/** Open (confirmed, unshipped, non-METRO) order lines with customer names. */
async function fetchOpenOrderLines(): Promise<OpenLineJoin[]> {
  const admin = adminClient();
  const { data: orders, error } = await admin
    .from("customer_orders")
    .select("id, order_number, customer_id, status, requested_date")
    .in("status", OPEN_ORDER_STATUSES)
    .not("order_number", "like", "METRO-%")
    .limit(500);
  if (error) throw new Error("open orders fetch failed: " + error.message);
  const rows = orders ?? [];
  if (rows.length === 0) return [];

  const customerIds = Array.from(new Set(rows.map((o) => o.customer_id)));
  const { data: customers } = await admin
    .from("companies")
    .select("id, name")
    .in("id", customerIds);
  const nameById = new Map((customers ?? []).map((c) => [c.id, c.name]));

  const { data: lines, error: lineErr } = await admin
    .from("customer_order_lines")
    .select("order_id, vendor_product_id, qty_cases, qty_shipped_cases")
    .in(
      "order_id",
      rows.map((o) => o.id),
    );
  if (lineErr) throw new Error("open order lines fetch failed: " + lineErr.message);

  const orderById = new Map(rows.map((o) => [o.id, o]));
  return (lines ?? []).map((l) => {
    const o = orderById.get(l.order_id)!;
    return {
      orderId: l.order_id,
      vendorProductId: l.vendor_product_id,
      qtyCases: l.qty_cases,
      qtyShippedCases: l.qty_shipped_cases ?? 0,
      orderNumber: o.order_number,
      customerName: nameById.get(o.customer_id) ?? "unknown",
      requestedDate: o.requested_date,
    };
  });
}

interface InboundJoin {
  shipments: Array<{
    id: string;
    container_no: string | null;
    po_number: string | null;
    vendor_id: string | null;
    etd: string | null;
    eta: string | null;
    status: string;
    received_at: string | null;
    notes: string | null;
  }>;
  lines: Array<{
    id: string;
    shipment_id: string;
    vendor_product_id: string | null;
    sku: string | null;
    qty_cases: number | null;
  }>;
}

async function fetchInboundOpen(): Promise<InboundJoin> {
  const admin = adminClient();
  const { data: shipments, error } = await admin
    .from("inbound_shipments")
    .select(
      "id, container_no, po_number, vendor_id, etd, eta, status, received_at, notes",
    )
    .is("received_at", null)
    .neq("status", "cancelled")
    .order("eta", { ascending: true });
  if (error) throw new Error("inbound fetch failed: " + error.message);
  const rows = shipments ?? [];
  if (rows.length === 0) return { shipments: [], lines: [] };
  const { data: lines, error: lineErr } = await admin
    .from("inbound_shipment_lines")
    .select("id, shipment_id, vendor_product_id, sku, qty_cases")
    .in(
      "shipment_id",
      rows.map((s) => s.id),
    );
  if (lineErr) throw new Error("inbound lines fetch failed: " + lineErr.message);
  return { shipments: rows, lines: lines ?? [] };
}

function inboundLineInputs(j: InboundJoin): InboundLineInput[] {
  const byId = new Map(j.shipments.map((s) => [s.id, s]));
  return j.lines.map((l) => {
    const s = byId.get(l.shipment_id)!;
    return {
      shipmentId: l.shipment_id,
      vendorProductId: l.vendor_product_id,
      sku: l.sku,
      qtyCases: l.qty_cases ?? 0,
      eta: s.eta,
      containerNo: s.container_no,
    };
  });
}

/** Most recent open-ended cost per vendor_product; flags multi-row ambiguity. */
async function fetchCurrentCosts(): Promise<
  Map<string, { cost: number; approx: boolean }>
> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("vendor_costs")
    .select("vendor_product_id, cost_per_case, effective_from")
    .is("effective_to", null)
    .order("effective_from", { ascending: false });
  if (error) throw new Error("costs fetch failed: " + error.message);
  const out = new Map<string, { cost: number; approx: boolean }>();
  for (const r of data ?? []) {
    const existing = out.get(r.vendor_product_id);
    if (!existing) {
      out.set(r.vendor_product_id, { cost: Number(r.cost_per_case), approx: false });
    } else {
      existing.approx = true; // more than one current cost row
    }
  }
  return out;
}

async function fetchFeedHealth(
  snapshots: SnapshotDbRow[],
  nowIso: string,
  todayKey: string,
): Promise<FeedHealth> {
  const admin = adminClient();
  const latestCountedAt = snapshots.reduce<string | null>(
    (max, s) => (max === null || s.counted_at > max ? s.counted_at : max),
    null,
  );

  const byDay = new Map<string, { rowCount: number; totalCases: number; ingestedAt: string | null }>();
  for (const s of snapshots) {
    const day = etDayKey(s.counted_at);
    const e = byDay.get(day) ?? { rowCount: 0, totalCases: 0, ingestedAt: null };
    e.rowCount += 1;
    e.totalCases += s.qty_cases + (s.qty_picked_cases ?? 0);
    if (e.ingestedAt === null || s.created_at > e.ingestedAt) e.ingestedAt = s.created_at;
    byDay.set(day, e);
  }
  const days = Array.from(byDay.keys()).sort().reverse();
  const reportDays = days.slice(0, 14);

  const { data: jobs } = await admin
    .from("sync_state")
    .select("job, account, last_success_at, last_status")
    .order("job");

  const ingestedAt = latestCountedAt
    ? (byDay.get(etDayKey(latestCountedAt))?.ingestedAt ?? null)
    : null;

  return {
    latestCountedAt,
    ingestedAt,
    staleness: computeStaleness(nowIso, latestCountedAt).state,
    reportDays,
    missingDays: missingReportDays(days, todayKey, 14),
    syncJobs: (jobs ?? []).map((j) => ({
      job: j.job,
      account: j.account,
      lastSuccessAt: j.last_success_at,
      lastStatus: j.last_status,
    })),
    reportHistory: reportDays.map((day) => ({
      day,
      rowCount: byDay.get(day)!.rowCount,
      totalCases: byDay.get(day)!.totalCases,
      ingestedAt: byDay.get(day)!.ingestedAt,
    })),
  };
}

interface VendorProductInfo {
  id: string;
  sku: string;
  description: string;
  inactive: boolean;
  packDisplay: string | null;
  casesPerPallet: number | null;
  caseWeightLb: number | null;
  category: string | null;
}

async function fetchVendorProductInfo(ids: string[]): Promise<Map<string, VendorProductInfo>> {
  const admin = adminClient();
  const out = new Map<string, VendorProductInfo>();
  if (ids.length === 0) return out;
  // pack_display / cases_per_pallet / is_active / deleted_at are outside the
  // hand-typed vendor_products Row — cast per codebase convention.
  const { data, error } = await admin
    .from("vendor_products" as never)
    .select(
      "id, sku, description, pack_display, cases_per_pallet, case_weight_lb, is_active, deleted_at, canonical_product_id",
    )
    .in("id", ids);
  if (error) throw new Error("vendor products fetch failed: " + error.message);
  const vps = (data ?? []) as Array<{
    id: string;
    sku: string;
    description: string;
    pack_display: string | null;
    cases_per_pallet: number | null;
    case_weight_lb: number | null;
    is_active: boolean;
    deleted_at: string | null;
    canonical_product_id: string | null;
  }>;

  // Resolve categories: vendor_product -> canonical_product -> product_category.
  const canonicalIds = Array.from(
    new Set(vps.map((v) => v.canonical_product_id).filter((x): x is string => x !== null)),
  );
  const categoryByCanonical = new Map<string, string>();
  if (canonicalIds.length > 0) {
    const { data: canon } = await admin
      .from("canonical_products" as never)
      .select("id, category_id")
      .in("id", canonicalIds);
    const canonRows = (canon ?? []) as Array<{ id: string; category_id: string | null }>;
    const catIds = Array.from(
      new Set(canonRows.map((c) => c.category_id).filter((x): x is string => x !== null)),
    );
    const { data: cats } = catIds.length
      ? await admin.from("product_categories" as never).select("id, name").in("id", catIds)
      : { data: [] };
    const nameById = new Map(
      ((cats ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
    );
    for (const c of canonRows) {
      if (c.category_id && nameById.has(c.category_id)) {
        categoryByCanonical.set(c.id, nameById.get(c.category_id)!);
      }
    }
  }

  for (const vp of vps) {
    out.set(vp.id, {
      id: vp.id,
      sku: vp.sku,
      description: vp.description,
      inactive: !vp.is_active || vp.deleted_at !== null,
      packDisplay: vp.pack_display,
      casesPerPallet: vp.cases_per_pallet,
      caseWeightLb: vp.case_weight_lb === null ? null : Number(vp.case_weight_lb),
      category: vp.canonical_product_id
        ? categoryByCanonical.get(vp.canonical_product_id) ?? null
        : null,
    });
  }
  return out;
}

interface WarehouseSettingsRow {
  vendor_product_id: string;
  reorder_point_cases: number | null;
  reorder_qty_cases: number | null;
  lead_time_days: number | null;
}

/** The Savannah hub: the (single) location the UNIS snapshots report against. */
export async function fetchSavannahLocationId(): Promise<string | null> {
  const admin = adminClient();
  const { data } = await admin
    .from("inventory_snapshots")
    .select("location_id")
    .eq("count_method", "system")
    .order("counted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.location_id ?? null;
}

/**
 * Per-SKU settings for the Savannah hub only. vendor_product_warehouses also
 * carries vendor-origin routing rows; taking "any row per SKU" would read a
 * vendor warehouse's values, so the location filter is load-bearing.
 */
async function fetchWarehouseSettings(
  locationId: string | null,
): Promise<Map<string, WarehouseSettingsRow>> {
  if (!locationId) return new Map();
  const admin = adminClient();
  const { data, error } = await admin
    .from("vendor_product_warehouses")
    .select("vendor_product_id, reorder_point_cases, reorder_qty_cases, lead_time_days")
    .eq("location_id", locationId);
  if (error) throw new Error("warehouse settings fetch failed: " + error.message);
  return new Map((data ?? []).map((r) => [r.vendor_product_id, r]));
}

// ---------------------------------------------------------------- assembly

function toSnapshotInputs(rows: SnapshotDbRow[]): Map<string, SnapshotInput[]> {
  const bySku = new Map<string, SnapshotInput[]>();
  for (const r of rows) {
    const list = bySku.get(r.vendor_product_id) ?? [];
    list.push({
      vendorProductId: r.vendor_product_id,
      countedAt: r.counted_at,
      qtyCases: r.qty_cases,
      qtyPickedCases: r.qty_picked_cases,
      palletsOnHand: r.pallets_on_hand,
      notes: r.notes,
    });
    bySku.set(r.vendor_product_id, list);
  }
  return bySku;
}

/** Weekly consumption + receipt-week flags (oldest -> newest) for the sparkline. */
function weeklyBuckets(
  movement: MovementDay[],
  todayKey: string,
  weeks: number,
): { consumption: number[]; receipts: boolean[] } {
  const consumption = new Array<number>(weeks).fill(0);
  const receipts = new Array<boolean>(weeks).fill(false);
  for (const m of movement) {
    const age = Math.floor(
      (new Date(todayKey + "T00:00:00Z").getTime() -
        new Date(m.day + "T00:00:00Z").getTime()) /
        (7 * 86_400_000),
    );
    if (age < 0 || age >= weeks) continue;
    const idx = weeks - 1 - age;
    consumption[idx] += m.consumption;
    if (m.isReceipt) receipts[idx] = true;
  }
  return { consumption, receipts };
}

export async function fetchInventoryDashboard(nowIso: string): Promise<InventoryDashboardData> {
  const todayKey = etDayKey(nowIso);
  const sinceIso = new Date(new Date(nowIso).getTime() - 140 * 86_400_000).toISOString();

  const savannahId = await fetchSavannahLocationId();
  const [snapshots, openLines, inboundJoin, costs, settings] = await Promise.all([
    fetchSystemSnapshots(sinceIso),
    fetchOpenOrderLines(),
    fetchInboundOpen(),
    fetchCurrentCosts(),
    fetchWarehouseSettings(savannahId),
  ]);

  const feed = await fetchFeedHealth(snapshots, nowIso, todayKey);
  const bySku = toSnapshotInputs(snapshots);
  const inboundLines = inboundLineInputs(inboundJoin);

  // Row universe: snapshot SKUs + settings rows + open inbound lines.
  const ids = new Set<string>([
    ...bySku.keys(),
    ...settings.keys(),
    ...inboundLines.map((l) => l.vendorProductId).filter((x): x is string => x !== null),
  ]);
  const info = await fetchVendorProductInfo(Array.from(ids));

  const newestBatchKey = feed.latestCountedAt ? etDayKey(feed.latestCountedAt) : null;

  const rows: InventoryRow[] = [];
  for (const id of ids) {
    const vp = info.get(id);
    if (!vp) continue; // FK guarantees existence; missing means a torn read
    const snaps = bySku.get(id) ?? [];
    const series = buildDailySeries(snaps);
    const hasHistory = series.length > 0;
    const latest = hasHistory ? series[series.length - 1] : null;
    const inNewestBatch =
      latest !== null && newestBatchKey !== null && latest.day === newestBatchKey;

    // Tombstone: history exists but the SKU is absent from the newest report:
    // it has physically left the warehouse (sold to zero or delisted).
    const current = inNewestBatch
      ? latest!
      : hasHistory
        ? { ...latest!, available: 0, staged: 0, physical: 0, pallets: 0 }
        : null;

    const skuOpenLines = openLines.filter((l) => l.vendorProductId === id);
    const ordersOpen = computeOrdersOpen(skuOpenLines);
    const skuInbound = inboundLines.filter((l) => l.vendorProductId === id);
    const inbound = computeInbound(skuInbound);

    const staged = current?.staged ?? 0;
    const qtyAvailable = current?.available ?? 0;
    const available = current ? computeAvailable(qtyAvailable, staged, ordersOpen) : 0;
    const velocity = computeVelocity(series, todayKey);
    const cover = current ? coverWeeks(available, velocity) : null;
    const movement = buildMovement(series);

    const st = settings.get(id);
    const floor = st?.reorder_point_cases ?? null;
    const leadTimeDays = st?.lead_time_days ?? null;
    const lt = leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
    const ltCutoff = addDays(todayKey, lt);
    const inboundWithinLeadTime = skuInbound
      .filter((l) => l.eta !== null && l.eta <= ltCutoff)
      .reduce((s, l) => s + l.qtyCases, 0);

    const bucket = computeBucket({
      hasHistory,
      physical: current?.physical ?? 0,
      available,
      inboundTotal: inbound,
      inboundWithinLeadTime,
      velocity,
      cover,
      floor,
      leadTimeDays,
    });

    const costEntry = costs.get(id) ?? null;
    const valueAtCost =
      costEntry && current ? finiteOrNull(available * costEntry.cost) : null;

    rows.push({
      vendorProductId: id,
      sku: vp.sku,
      description: vp.description,
      category: vp.category,
      inactive: vp.inactive,
      hasHistory,
      notYetReceived: !hasHistory,
      inNewestBatch,
      onHand: current?.physical ?? 0,
      staged,
      ordersOpen,
      available,
      inbound,
      pallets: current?.pallets ?? null,
      velocity,
      cover,
      bucket,
      reconcile: reconcileFlag(staged, ordersOpen),
      ...(() => {
        const wb = weeklyBuckets(movement, todayKey, velocity.windowWeeks || 13);
        return { weeklyConsumption: wb.consumption, weeklyReceipts: wb.receipts };
      })(),
      valueAtCost,
      costApprox: costEntry?.approx ?? false,
      floor,
      reorderQty: st?.reorder_qty_cases ?? null,
      leadTimeDays,
    });
  }

  // Next arrival across all open shipments with an ETA.
  const withEta = inboundJoin.shipments.filter((s) => s.eta !== null);
  const next = withEta.length > 0 ? withEta[0] : null;
  const nextArrival = next
    ? {
        eta: next.eta!,
        containerNo: next.container_no,
        cases: inboundJoin.lines
          .filter((l) => l.shipment_id === next.id)
          .reduce((s, l) => s + (l.qty_cases ?? 0), 0),
      }
    : null;

  const catMap = new Map<string, CategoryRollup>();
  for (const r of rows) {
    const name = r.category ?? "Uncategorized";
    const e = catMap.get(name) ?? { name, skus: 0, cases: 0, valueAtCost: 0 };
    e.skus += 1;
    e.cases += r.onHand;
    e.valueAtCost += r.valueAtCost ?? 0;
    catMap.set(name, e);
  }
  const categories = Array.from(catMap.values()).sort(
    (a, b) => b.valueAtCost - a.valueAtCost,
  );

  const expectedOrders = customerCadences(await fetchOrderLineFacts(), todayKey);

  return {
    rows,
    feed,
    nextArrival,
    inboundTotalCases: inboundLines.reduce((s, l) => s + l.qtyCases, 0),
    todayKey,
    categories,
    expectedOrders,
  };
}

/**
 * Every real order line as a (customer, day, sku, cases) fact for the
 * expected-orders cadence engine. Non-METRO, non-cancelled orders only.
 */
async function fetchOrderLineFacts(): Promise<
  Array<{ customerName: string; day: string; sku: string; cases: number }>
> {
  const admin = adminClient();
  const { data: orders } = await admin
    .from("customer_orders")
    .select("id, customer_id, quoted_at")
    .or("order_number.is.null,order_number.not.like.METRO-%")
    .neq("status", "cancelled")
    .limit(1000);
  if (!orders || orders.length === 0) return [];

  const [{ data: lines }, { data: customers }] = await Promise.all([
    admin
      .from("customer_order_lines")
      .select("order_id, sku, qty_cases")
      .in(
        "order_id",
        orders.map((o) => o.id),
      ),
    admin
      .from("companies")
      .select("id, name")
      .in("id", Array.from(new Set(orders.map((o) => o.customer_id)))),
  ]);
  const nameById = new Map((customers ?? []).map((c) => [c.id, c.name]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  return (lines ?? []).map((l) => {
    const o = orderById.get(l.order_id)!;
    return {
      customerName: nameById.get(o.customer_id) ?? "unknown",
      day: etDayKey(o.quoted_at),
      sku: l.sku ?? "unknown",
      cases: l.qty_cases,
    };
  });
}

export async function fetchSkuDetail(
  vendorProductId: string,
  nowIso: string,
): Promise<SkuDetailData | null> {
  const dashboard = await fetchInventoryDashboard(nowIso);
  const row = dashboard.rows.find((r) => r.vendorProductId === vendorProductId);
  if (!row) return null;

  const admin = adminClient();
  const todayKey = dashboard.todayKey;
  const sinceIso = new Date(new Date(nowIso).getTime() - 140 * 86_400_000).toISOString();

  const [snapshots, openLines, inboundJoin, costs, info] = await Promise.all([
    fetchSystemSnapshots(sinceIso),
    fetchOpenOrderLines(),
    fetchInboundOpen(),
    fetchCurrentCosts(),
    fetchVendorProductInfo([vendorProductId]),
  ]);

  const series = buildDailySeries(
    toSnapshotInputs(snapshots).get(vendorProductId) ?? [],
  );
  const movement = buildMovement(series)
    .filter((m) => dayDiffSafe(m.day, todayKey) <= 60)
    .reverse();

  const skuOpen = openLines.filter((l) => l.vendorProductId === vendorProductId);
  const inboundLines = inboundLineInputs(inboundJoin).filter(
    (l) => l.vendorProductId === vendorProductId,
  );

  // Buyers: strictly real order lines on non-METRO orders, trailing 26 weeks.
  const buyers = await fetchBuyers(admin, vendorProductId, todayKey);

  const dnTokens = Array.from(
    new Set(movement.flatMap((m) => m.notes?.match(/DN-\d+/g) ?? [])),
  );
  const dnRefs = await fetchDnRefs(admin, dnTokens);

  const stats = consumptionStats(buildMovement(series), todayKey);

  const { data: costRows } = await admin
    .from("vendor_costs")
    .select("effective_from, effective_to, cost_per_case, source")
    .eq("vendor_product_id", vendorProductId)
    .order("effective_from", { ascending: false })
    .limit(20);
  const costHistory = (costRows ?? []).map((c) => ({
    effectiveFrom: c.effective_from,
    effectiveTo: c.effective_to,
    costPerCase: Number(c.cost_per_case),
    source: c.source,
  }));

  const boughtWith = await fetchBoughtWith(admin, vendorProductId);

  const vp = info.get(vendorProductId);
  return {
    row,
    packDisplay: vp?.packDisplay ?? null,
    casesPerPallet: vp?.casesPerPallet ?? null,
    caseWeightLb: vp?.caseWeightLb ?? null,
    costPerCase: costs.get(vendorProductId)?.cost ?? null,
    movement,
    openOrderLines: skuOpen.map((l) => ({
      orderNumber: l.orderNumber,
      customerName: l.customerName,
      qtyOpen: Math.max(0, l.qtyCases - l.qtyShippedCases),
      requestedDate: l.requestedDate,
    })),
    buyers,
    inboundLines,
    series,
    feed: dashboard.feed,
    todayKey,
    dnRefs,
    stats,
    costHistory,
    boughtWith,
  };
}

/** Items appearing on the same (real) orders as this SKU, by co-occurrence. */
async function fetchBoughtWith(
  admin: ReturnType<typeof adminClient>,
  vendorProductId: string,
): Promise<SkuDetailData["boughtWith"]> {
  const { data: myLines } = await admin
    .from("customer_order_lines")
    .select("order_id")
    .eq("vendor_product_id", vendorProductId);
  const orderIds = Array.from(new Set((myLines ?? []).map((l) => l.order_id)));
  if (orderIds.length === 0) return [];

  const { data: orders } = await admin
    .from("customer_orders")
    .select("id")
    .in("id", orderIds)
    .or("order_number.is.null,order_number.not.like.METRO-%")
    .neq("status", "cancelled");
  const realOrderIds = (orders ?? []).map((o) => o.id);
  if (realOrderIds.length === 0) return [];

  const { data: siblings } = await admin
    .from("customer_order_lines")
    .select("order_id, vendor_product_id, sku, description, qty_cases")
    .in("order_id", realOrderIds)
    .neq("vendor_product_id", vendorProductId);

  const byVp = new Map<
    string,
    { sku: string; description: string | null; orderIds: Set<string>; cases: number }
  >();
  for (const l of siblings ?? []) {
    const key = l.vendor_product_id ?? l.sku ?? "unknown";
    const e =
      byVp.get(key) ?? {
        sku: l.sku ?? "unknown",
        description: l.description,
        orderIds: new Set<string>(),
        cases: 0,
      };
    e.orderIds.add(l.order_id);
    e.cases += l.qty_cases;
    byVp.set(key, e);
  }
  return Array.from(byVp.values())
    .map((e) => ({ sku: e.sku, description: e.description, orders: e.orderIds.size, cases: e.cases }))
    .sort((a, b) => b.orders - a.orders || b.cases - a.cases)
    .slice(0, 10);
}

/**
 * Resolve UNIS DN numbers to their paperwork email in `interactions`.
 * Customer attribution is deterministic string matching only: the thread body
 * must name exactly ONE known customer company, otherwise null (never guess).
 */
async function fetchDnRefs(
  admin: ReturnType<typeof adminClient>,
  dnTokens: string[],
): Promise<SkuDetailData["dnRefs"]> {
  const out: SkuDetailData["dnRefs"] = {};
  if (dnTokens.length === 0) return out;

  const { data: customers } = await admin
    .from("companies")
    .select("name")
    .eq("type", "customer");
  const customerNames = (customers ?? []).map((c) => c.name);

  const orClauses = dnTokens
    .flatMap((t) => [`email_subject.ilike.%${t}%`, `body.ilike.%${t}%`])
    .join(",");
  // interactions is outside the hand-typed database.types.ts — cast per
  // codebase convention and assert the row shape on the result.
  const { data: emailRows } = await admin
    .from("interactions" as never)
    .select("occurred_at, email_subject, body")
    .or(orClauses)
    .order("occurred_at", { ascending: false })
    .limit(20);
  const emails = (emailRows ?? []) as Array<{
    occurred_at: string;
    email_subject: string | null;
    body: string | null;
  }>;

  for (const dn of dnTokens) {
    const hit = emails.find(
      (e) =>
        (e.email_subject ?? "").includes(dn) || (e.body ?? "").includes(dn),
    );
    if (!hit) continue;
    const text = (hit.email_subject ?? "") + "\n" + (hit.body ?? "");
    const named = customerNames.filter((n) => n.length > 3 && text.includes(n));
    out[dn] = {
      subject: (hit.email_subject ?? "").replace(/^((fw|fwd|re):\s*)+/i, ""),
      day: etDayKey(hit.occurred_at),
      customer: named.length === 1 ? named[0] : null,
    };
  }
  return out;
}

function dayDiffSafe(a: string, b: string): number {
  return Math.abs(
    Math.round(
      (new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) /
        86_400_000,
    ),
  );
}

async function fetchBuyers(
  admin: ReturnType<typeof adminClient>,
  vendorProductId: string,
  todayKey: string,
): Promise<SkuDetailData["buyers"]> {
  const { data: lines } = await admin
    .from("customer_order_lines")
    .select("order_id, qty_cases")
    .eq("vendor_product_id", vendorProductId);
  if (!lines || lines.length === 0) return [];

  const orderIds = Array.from(new Set(lines.map((l) => l.order_id)));
  const { data: orders } = await admin
    .from("customer_orders")
    .select("id, customer_id, order_number, status, quoted_at")
    .in("id", orderIds)
    .not("order_number", "like", "METRO-%")
    .neq("status", "cancelled");
  if (!orders || orders.length === 0) return [];

  const customerIds = Array.from(new Set(orders.map((o) => o.customer_id)));
  const { data: customers } = await admin
    .from("companies")
    .select("id, name")
    .in("id", customerIds);
  const nameById = new Map((customers ?? []).map((c) => [c.id, c.name]));
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const cutoff26w = addDays(todayKey, -26 * 7);
  const byCustomer = new Map<
    string,
    { cases26w: number; orderDays: string[] }
  >();
  for (const l of lines) {
    const o = orderById.get(l.order_id);
    if (!o) continue; // METRO or cancelled
    const day = etDayKey(o.quoted_at);
    const e = byCustomer.get(o.customer_id) ?? { cases26w: 0, orderDays: [] };
    if (day >= cutoff26w) e.cases26w += l.qty_cases;
    e.orderDays.push(day);
    byCustomer.set(o.customer_id, e);
  }

  return Array.from(byCustomer.entries())
    .map(([customerId, e]) => {
      const days = Array.from(new Set(e.orderDays)).sort();
      const last = days[days.length - 1] ?? null;
      let typicalGapDays: number | null = null;
      if (days.length >= 3) {
        const gaps = days.slice(1).map((d, i) => dayDiffSafe(days[i], d));
        gaps.sort((a, b) => a - b);
        typicalGapDays = gaps[Math.floor(gaps.length / 2)];
      }
      const sinceLast = last ? dayDiffSafe(last, todayKey) : null;
      const overdueDays =
        typicalGapDays !== null && sinceLast !== null && sinceLast > 1.5 * typicalGapDays
          ? Math.round(sinceLast - typicalGapDays)
          : null;
      return {
        customerName: nameById.get(customerId) ?? "unknown",
        cases26w: e.cases26w,
        lastOrderDay: last,
        typicalGapDays,
        overdueDays,
      };
    })
    .sort((a, b) => b.cases26w - a.cases26w);
}

export async function fetchInboundShipments(): Promise<{
  open: InboundShipmentView[];
  received: InboundShipmentView[];
}> {
  const admin = adminClient();
  const { data: shipments, error } = await admin
    .from("inbound_shipments")
    .select(
      "id, container_no, po_number, vendor_id, etd, eta, status, received_at, notes",
    )
    .neq("status", "cancelled")
    .order("eta", { ascending: true, nullsFirst: false });
  if (error) throw new Error("inbound shipments fetch failed: " + error.message);
  const rows = shipments ?? [];
  if (rows.length === 0) return { open: [], received: [] };

  const { data: lines } = await admin
    .from("inbound_shipment_lines")
    .select("id, shipment_id, vendor_product_id, sku, qty_cases")
    .in(
      "shipment_id",
      rows.map((s) => s.id),
    );

  const vendorIds = Array.from(
    new Set(rows.map((s) => s.vendor_id).filter((x): x is string => x !== null)),
  );
  const { data: vendors } = vendorIds.length
    ? await admin.from("companies").select("id, name").in("id", vendorIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const vendorNameById = new Map((vendors ?? []).map((v) => [v.id, v.name]));

  const vpIds = Array.from(
    new Set(
      (lines ?? [])
        .map((l) => l.vendor_product_id)
        .filter((x): x is string => x !== null),
    ),
  );
  const info = await fetchVendorProductInfo(vpIds);

  const views: InboundShipmentView[] = rows.map((s) => {
    const myLines = (lines ?? [])
      .filter((l) => l.shipment_id === s.id)
      .map((l) => ({
        id: l.id,
        vendorProductId: l.vendor_product_id,
        sku: l.sku ?? (l.vendor_product_id ? info.get(l.vendor_product_id)?.sku ?? null : null),
        description: l.vendor_product_id
          ? info.get(l.vendor_product_id)?.description ?? null
          : null,
        qtyCases: l.qty_cases ?? 0,
      }));
    const plannedLeadDays =
      s.etd && s.eta ? dayDiffSafe(s.etd, s.eta) : null;
    const actualLeadDays =
      s.etd && s.received_at ? dayDiffSafe(s.etd, etDayKey(s.received_at)) : null;
    return {
      id: s.id,
      containerNo: s.container_no,
      poNumber: s.po_number,
      vendorName: s.vendor_id ? vendorNameById.get(s.vendor_id) ?? null : null,
      etd: s.etd,
      eta: s.eta,
      status: s.status,
      receivedAt: s.received_at,
      notes: s.notes,
      lines: myLines,
      plannedLeadDays,
      actualLeadDays,
    };
  });

  return {
    open: views.filter((v) => v.receivedAt === null),
    received: views.filter((v) => v.receivedAt !== null),
  };
}

/** Vendors + active SKUs for the inbound entry form. */
export async function fetchInboundFormOptions(): Promise<{
  vendors: Array<{ id: string; name: string }>;
  skus: Array<{ vendorProductId: string; sku: string; description: string }>;
}> {
  const admin = adminClient();
  const savannahId = await fetchSavannahLocationId();
  const [{ data: vendors }, dashboardIds] = await Promise.all([
    admin.from("companies").select("id, name").eq("type", "vendor").order("name"),
    fetchWarehouseSettings(savannahId),
  ]);
  const info = await fetchVendorProductInfo(Array.from(dashboardIds.keys()));
  return {
    vendors: vendors ?? [],
    skus: Array.from(info.values())
      .filter((v) => !v.inactive)
      .map((v) => ({ vendorProductId: v.id, sku: v.sku, description: v.description }))
      .sort((a, b) => a.sku.localeCompare(b.sku)),
  };
}
