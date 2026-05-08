// Order history queries.

import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { getContainerSpec } from "@/lib/containers";
import type {
  AdminOrderRow,
  CustomerOrderDetail,
  CustomerOrderLine,
  CustomerOrderSummary,
  LastOrderForCatalog,
  OrderStatusTimeline,
} from "./types";

export async function fetchOrdersForCustomer(
  customerId: string,
): Promise<CustomerOrderSummary[]> {
  const admin = adminClient();
  const { data: orders, error } = await admin
    .from("customer_orders")
    .select(
      "id, order_number, customer_id, status, quoted_at, case_count, total, metadata",
    )
    .eq("customer_id", customerId)
    .order("quoted_at", { ascending: false })
    .limit(50);

  if (error) throw new Error("orders fetch failed: " + error.message);

  const ids = (orders ?? []).map((o) => o.id);
  // Pull line counts and vendor info from line items.
  if (ids.length === 0) return [];

  const { data: lineCounts } = await admin
    .from("customer_order_lines")
    .select("order_id, vendor_product_id")
    .in("order_id", ids);

  const lineCountByOrder = new Map<string, number>();
  const vendorIdByOrder = new Map<string, string>();

  // Resolve vendor_product_id → vendor_id once
  const vendorProductIds = Array.from(
    new Set((lineCounts ?? []).map((l) => l.vendor_product_id).filter(Boolean) as string[]),
  );
  let vendorIdByProduct = new Map<string, string>();
  if (vendorProductIds.length > 0) {
    const { data: vps } = await admin
      .from("vendor_products" as never)
      .select("id, vendor_id")
      .in("id", vendorProductIds);
    if (vps) {
      for (const vp of vps as Array<{ id: string; vendor_id: string }>) {
        vendorIdByProduct.set(vp.id, vp.vendor_id);
      }
    }
  }

  for (const l of lineCounts ?? []) {
    lineCountByOrder.set(l.order_id, (lineCountByOrder.get(l.order_id) ?? 0) + 1);
    if (l.vendor_product_id && !vendorIdByOrder.has(l.order_id)) {
      const vid = vendorIdByProduct.get(l.vendor_product_id);
      if (vid) vendorIdByOrder.set(l.order_id, vid);
    }
  }

  const vendorIds = Array.from(new Set(vendorIdByOrder.values()));
  let vendorNameById = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendors } = await admin
      .from("companies")
      .select("id, name")
      .in("id", vendorIds);
    if (vendors) {
      for (const v of vendors) vendorNameById.set(v.id, v.name);
    }
  }

  return (orders ?? []).map((o) => {
    const vendorId = vendorIdByOrder.get(o.id);
    const vendorName = vendorId ? vendorNameById.get(vendorId) ?? "—" : "—";
    const containerCode =
      ((o.metadata as Record<string, unknown> | null)?.container_code as string | undefined) ??
      "40HC";
    const containerLabel = getContainerSpec(containerCode).label;
    return {
      id: o.id,
      orderNumber: o.order_number,
      vendorName,
      containerLabel,
      status: o.status,
      quotedAt: o.quoted_at,
      caseCount: o.case_count ?? 0,
      total: Number(o.total ?? 0),
      lineCount: lineCountByOrder.get(o.id) ?? 0,
    };
  });
}

/**
 * Fetch a single order's full detail.
 *
 * `customerIdGuard`:
 *  - When a uuid: enforces customer_id match; returns null if mismatch.
 *    Use this for the customer view so a customer can't read another
 *    customer's order via URL guessing.
 *  - When `null`: skips the guard. ONLY pass null from admin-gated routes
 *    (after `requireAdmin()`).
 *
 * `includeAdminFields` controls whether vendor_cost / margin / internal_notes
 * are returned. Customer view passes false.
 */
export async function fetchOrderDetail(
  orderId: string,
  customerIdGuard: string | null,
  includeAdminFields: boolean,
): Promise<CustomerOrderDetail | null> {
  const admin = adminClient();
  // Generated types are missing some columns (`shipped_at`, etc.) — cast to
  // `any` for the chain, then assert the shape on the result.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (admin as any)
    .from("customer_orders")
    .select(
      "id, order_number, customer_id, status, quoted_at, confirmed_at, shipped_at, delivered_at, invoiced_at, paid_at, cancelled_at, case_count, pallet_count, total, subtotal_product, subtotal_freight, notes, internal_notes, metadata",
    )
    .eq("id", orderId);
  if (customerIdGuard) q = q.eq("customer_id", customerIdGuard);
  const { data: order, error } = (await q.maybeSingle()) as {
    data: {
      id: string;
      order_number: string | null;
      customer_id: string;
      status: string;
      quoted_at: string;
      confirmed_at: string | null;
      shipped_at: string | null;
      delivered_at: string | null;
      invoiced_at: string | null;
      paid_at: string | null;
      cancelled_at: string | null;
      case_count: number | null;
      pallet_count: number | null;
      total: number | string | null;
      subtotal_product: number | string | null;
      subtotal_freight: number | string | null;
      notes: string | null;
      internal_notes: string | null;
      metadata: Record<string, unknown> | null;
    } | null;
    error: { message: string } | null;
  };
  if (error) throw new Error("order detail fetch failed: " + error.message);
  if (!order) return null;

  // Resolve customer + catalog identity from companies + metadata
  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const containerCode = (meta.container_code as string | undefined) ?? "40HC";
  const containerLabel = getContainerSpec(containerCode).label;

  const { data: customer } = await admin
    .from("companies")
    .select("id, name")
    .eq("id", order.customer_id)
    .maybeSingle();

  // Lines + per-line vendor_product info for pieces/pallet display
  const { data: rawLines } = await admin
    .from("customer_order_lines")
    .select(
      "sku, description, pack_size, qty_cases, sell_price_per_case, vendor_cost_per_case, margin_pct_applied, vendor_product_id, line_number, cases_per_pallet",
    )
    .eq("order_id", order.id)
    .order("line_number", { ascending: true });

  const vpIds = Array.from(
    new Set(
      (rawLines ?? [])
        .map((l) => l.vendor_product_id)
        .filter((x): x is string => Boolean(x)),
    ),
  );
  let pcsByVp = new Map<string, { pieces: number | null; perPal: number | null }>();
  if (vpIds.length > 0) {
    const { data: vps } = await admin
      .from("vendor_products" as never)
      .select("id, case_pack_count, cases_per_pallet")
      .in("id", vpIds);
    for (const vp of (vps ?? []) as Array<{
      id: string;
      case_pack_count: number | null;
      cases_per_pallet: number | null;
    }>) {
      pcsByVp.set(vp.id, { pieces: vp.case_pack_count, perPal: vp.cases_per_pallet });
    }
  }

  const lines: CustomerOrderLine[] = (rawLines ?? []).map((l) => {
    const vp = l.vendor_product_id ? pcsByVp.get(l.vendor_product_id) : undefined;
    return {
      sku: l.sku,
      description: l.description,
      packDisplay: l.pack_size,
      qtyCases: l.qty_cases,
      piecesPerCase: vp?.pieces ?? null,
      casesPerPallet: l.cases_per_pallet ?? vp?.perPal ?? null,
      sellPricePerCase: Number(l.sell_price_per_case ?? 0),
      lineTotal: Number(l.qty_cases ?? 0) * Number(l.sell_price_per_case ?? 0),
      vendorCostPerCase: includeAdminFields ? Number(l.vendor_cost_per_case ?? 0) : null,
      marginPctApplied: includeAdminFields ? Number(l.margin_pct_applied ?? 0) : null,
    };
  });

  // Pull customer's auth email if available (admin-only useful)
  let customerEmail: string | null = null;
  if (includeAdminFields) {
    const submittedByEmail = meta.submitted_by_email;
    if (typeof submittedByEmail === "string" && submittedByEmail) {
      customerEmail = submittedByEmail;
    }
  }

  const timeline: OrderStatusTimeline = {
    quoted_at: order.quoted_at,
    confirmed_at: order.confirmed_at,
    shipped_at: order.shipped_at,
    delivered_at: order.delivered_at,
    invoiced_at: order.invoiced_at,
    paid_at: order.paid_at,
    cancelled_at: order.cancelled_at,
  };

  // Vendor name for display label (kept for compatibility with CustomerOrderSummary)
  const firstVendorProductId = (rawLines ?? [])[0]?.vendor_product_id;
  let vendorName = "—";
  if (firstVendorProductId) {
    const { data: vp } = await admin
      .from("vendor_products" as never)
      .select("vendor_id")
      .eq("id", firstVendorProductId)
      .maybeSingle();
    const vendorId = (vp as { vendor_id?: string } | null)?.vendor_id ?? null;
    if (vendorId) {
      const { data: vendor } = await admin
        .from("companies")
        .select("name")
        .eq("id", vendorId)
        .maybeSingle();
      vendorName = vendor?.name ?? "—";
    }
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: customer?.name ?? "—",
    customerEmail,
    vendorName,
    catalogSlug: (meta.catalog_slug as string | undefined) ?? null,
    catalogDisplayName: (meta.catalog_display_name as string | undefined) ?? null,
    termsLabel: (meta.terms_label as string | undefined) ?? null,
    currency: (meta.currency as string | undefined) ?? "USD",
    containerCode,
    containerLabel,
    status: order.status,
    quotedAt: order.quoted_at,
    caseCount: order.case_count ?? 0,
    palletCount: order.pallet_count ?? 0,
    total: Number(order.total ?? 0),
    subtotalProduct: Number(order.subtotal_product ?? 0),
    subtotalFreight: Number(order.subtotal_freight ?? 0),
    weightKg: typeof meta.weight_kg === "number" ? meta.weight_kg : null,
    volPct: typeof meta.volume_pct === "number" ? meta.volume_pct : null,
    notes: order.notes,
    internalNotes: includeAdminFields ? order.internal_notes : null,
    lineCount: lines.length,
    timeline,
    lines,
  };
}

export interface AdminOrdersFilters {
  /** Multi-select status filter; empty/null = all */
  statuses?: string[];
  /** Filter to one customer; null = all */
  customerId?: string | null;
  /** ISO date strings (YYYY-MM-DD); null = no bound */
  fromDate?: string | null;
  toDate?: string | null;
  /** Default 200, max 1000 */
  limit?: number;
}

/** All orders across all customers. Caller must be admin. */
export async function fetchAllOrdersForAdmin(
  filters: AdminOrdersFilters = {},
): Promise<AdminOrderRow[]> {
  const admin = adminClient();
  let q = admin
    .from("customer_orders")
    .select(
      "id, order_number, customer_id, status, quoted_at, case_count, total, metadata",
    )
    .order("quoted_at", { ascending: false })
    .limit(Math.min(filters.limit ?? 200, 1000));

  if (filters.statuses && filters.statuses.length > 0) {
    q = q.in("status", filters.statuses);
  }
  if (filters.customerId) q = q.eq("customer_id", filters.customerId);
  if (filters.fromDate) q = q.gte("quoted_at", filters.fromDate);
  if (filters.toDate) q = q.lte("quoted_at", filters.toDate + "T23:59:59Z");

  const { data: orders, error } = await q;
  if (error) throw new Error("admin orders fetch failed: " + error.message);
  const rows = orders ?? [];
  if (rows.length === 0) return [];

  // Resolve customer names in one shot
  const customerIds = Array.from(new Set(rows.map((o) => o.customer_id)));
  const { data: customers } = await admin
    .from("companies")
    .select("id, name")
    .in("id", customerIds);
  const customerNameById = new Map<string, string>();
  for (const c of customers ?? []) customerNameById.set(c.id, c.name);

  // Line counts + first vendor name per order (same approach as customer query)
  const orderIds = rows.map((o) => o.id);
  const { data: lines } = await admin
    .from("customer_order_lines")
    .select("order_id, vendor_product_id")
    .in("order_id", orderIds);
  const lineCountByOrder = new Map<string, number>();
  const vendorIdByOrder = new Map<string, string>();
  const vpIds = Array.from(
    new Set((lines ?? []).map((l) => l.vendor_product_id).filter(Boolean) as string[]),
  );
  let vendorIdByProduct = new Map<string, string>();
  if (vpIds.length > 0) {
    const { data: vps } = await admin
      .from("vendor_products" as never)
      .select("id, vendor_id")
      .in("id", vpIds);
    for (const vp of (vps ?? []) as Array<{ id: string; vendor_id: string }>) {
      vendorIdByProduct.set(vp.id, vp.vendor_id);
    }
  }
  for (const l of lines ?? []) {
    lineCountByOrder.set(l.order_id, (lineCountByOrder.get(l.order_id) ?? 0) + 1);
    if (l.vendor_product_id && !vendorIdByOrder.has(l.order_id)) {
      const vid = vendorIdByProduct.get(l.vendor_product_id);
      if (vid) vendorIdByOrder.set(l.order_id, vid);
    }
  }
  const vendorIds = Array.from(new Set(vendorIdByOrder.values()));
  const vendorNameById = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendors } = await admin
      .from("companies")
      .select("id, name")
      .in("id", vendorIds);
    for (const v of vendors ?? []) vendorNameById.set(v.id, v.name);
  }

  return rows.map((o) => {
    const meta = (o.metadata ?? {}) as Record<string, unknown>;
    const containerCode = (meta.container_code as string | undefined) ?? "40HC";
    const containerLabel = getContainerSpec(containerCode).label;
    const vendorId = vendorIdByOrder.get(o.id);
    return {
      id: o.id,
      orderNumber: o.order_number,
      vendorName: vendorId ? vendorNameById.get(vendorId) ?? "—" : "—",
      containerLabel,
      status: o.status,
      quotedAt: o.quoted_at,
      caseCount: o.case_count ?? 0,
      total: Number(o.total ?? 0),
      lineCount: lineCountByOrder.get(o.id) ?? 0,
      customerName: customerNameById.get(o.customer_id) ?? "—",
      customerEmail: typeof meta.submitted_by_email === "string" ? meta.submitted_by_email : null,
      catalogDisplayName: (meta.catalog_display_name as string | undefined) ?? null,
    } satisfies AdminOrderRow;
  });
}

/** All customers — for the admin filter dropdown. */
export async function fetchAllCustomerCompanies(): Promise<Array<{ id: string; name: string }>> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("companies")
    .select("id, name")
    .eq("type", "customer")
    .order("name");
  if (error) throw new Error("customers fetch failed: " + error.message);
  return data ?? [];
}

/**
 * Returns the most recent order per catalog slug for a given customer.
 *
 * Matches orders to catalogs by `metadata->>'catalog_slug'` (set by submit-order
 * action since Phase A). Older orders that predate slug-stamping fall through
 * cleanly — they just won't show as "last order" for any catalog. New orders
 * always carry the slug, so this becomes accurate going forward.
 */
export async function fetchLastOrderPerCatalog(
  customerId: string,
): Promise<Map<string, LastOrderForCatalog>> {
  const admin = adminClient();
  const { data, error } = await admin
    .from("customer_orders")
    .select("id, order_number, status, quoted_at, case_count, total, metadata")
    .eq("customer_id", customerId)
    .order("quoted_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("last-order-per-catalog fetch failed: " + error.message);

  const out = new Map<string, LastOrderForCatalog>();
  for (const o of data ?? []) {
    const meta = o.metadata as Record<string, unknown> | null;
    const slug = meta && typeof meta.catalog_slug === "string" ? meta.catalog_slug : null;
    if (!slug) continue;
    if (out.has(slug)) continue; // first hit (most recent due to ORDER BY desc)
    out.set(slug, {
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      quotedAt: o.quoted_at,
      caseCount: o.case_count ?? 0,
      total: Number(o.total ?? 0),
    });
  }
  return out;
}
