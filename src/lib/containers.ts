// Physical shipping container specs — interior CBM and contractual payload max.
// Constants, not DB-stored (these are industry standards that don't change).
//
// weight_max_kg is the realistic commercial payload for **US road delivery**, where
// the binding constraint is the 80,000-lb GVW federal limit (NOT the container's
// structural max). Without an overweight permit a 40HC chassis on US roads can
// carry roughly 19,500 kg (43,000 lb) of cargo — beyond which the load needs
// per-state permits and route restrictions.
//
// Theoretical structural payloads are higher (~26,500 kg for 40HC at sea) but
// for a DDP-to-customer-dock product these would block legal delivery in the US.
// Numbers below are conservative for permit-free domestic dray.

export type ContainerCode = "40HC" | "40STD" | "20STD";

export interface ContainerSpec {
  code: ContainerCode;
  label: string;
  cbm: number;
  weight_max_kg: number;
}

export const CONTAINERS: Record<ContainerCode, ContainerSpec> = {
  // 40HC interior ~76 m³, US road payload ~19,732 kg without overweight permit.
  // We round to 20,000 kg for headline UX; if Servous secures overweight permits
  // for a specific customer, the per-relationship row in customer_catalog_access
  // can override this in a future iteration.
  "40HC":  { code: "40HC",  label: "40' High Cube", cbm: 76.0, weight_max_kg: 20000 },
  "40STD": { code: "40STD", label: "40' Standard",  cbm: 67.0, weight_max_kg: 20000 },
  "20STD": { code: "20STD", label: "20' Standard",  cbm: 33.0, weight_max_kg: 20000 },
};

export function getContainerSpec(code: string): ContainerSpec {
  if (code === "40HC" || code === "40STD" || code === "20STD") {
    return CONTAINERS[code];
  }
  // Fallback to 40HC for unrecognized codes; log in caller if you need to alert.
  return CONTAINERS["40HC"];
}
