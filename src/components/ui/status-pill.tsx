// Status pill — order lifecycle states.

import type { ReactNode } from "react";

const MAP: Record<string, { cls: string; label: string }> = {
  quoted:        { cls: "status-quoted",        label: "submitted" },
  submitted:     { cls: "status-quoted",        label: "submitted" },
  confirmed:     { cls: "status-confirmed",     label: "confirmed" },
  in_production: { cls: "status-in-production", label: "in production" },
  ready:         { cls: "status-in-production", label: "ready" },
  shipped:       { cls: "status-shipped",       label: "shipped" },
  delivered:     { cls: "status-delivered",     label: "delivered" },
  invoiced:      { cls: "status-delivered",     label: "invoiced" },
  paid:          { cls: "status-delivered",     label: "paid" },
  cancelled:     { cls: "status-quoted",        label: "cancelled" },
};

export function StatusPill({ status }: { status: string }) {
  const v = MAP[status] ?? { cls: "", label: status };
  return <span className={"status-pill " + v.cls}>{v.label}</span>;
}

export function StatusLabel({ status }: { status: string }): ReactNode {
  return <StatusPill status={status} />;
}
