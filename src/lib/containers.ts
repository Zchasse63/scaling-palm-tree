// Physical shipping container specs — usable CBM and contractual payload max.
// Constants, not DB-stored (these are industry standards that don't change).
//
// `cbm` is the **practical usable load volume**, not the geometric interior.
// A 40HC has ~76 m³ of geometric interior (12.03 × 2.35 × 2.69 m) but only
// ~69 m³ actually loads with floor-stacked cartons because of packing
// inefficiency (cartons don't perfectly tile, top headroom partially wasted,
// dunnage, etc.). The manufacturer's `cases_per_40hc` is empirically tied
// to this usable figure — fitting "100% of cases_per_40hc" puts you at
// ~69 m³ of real loaded volume, not 76.
//
// `weight_max_kg` is the realistic commercial payload for **US road delivery**.
// The binding constraint is the 80,000-lb federal GVW limit (NOT the container's
// structural max). Without an overweight permit a 40HC chassis on US roads can
// carry roughly 19,732 kg (43,500 lb) of cargo. We round to 20,000 kg.
// (Theoretical structural payloads are higher — ~26,500 kg for 40HC at sea —
// but those numbers would block legal US road delivery without permits.)

export type ContainerCode = "40HC" | "40STD" | "20STD";

export interface ContainerSpec {
  code: ContainerCode;
  label: string;
  /** Practical usable load volume in cubic meters, not the geometric interior. */
  cbm: number;
  /** Geometric interior volume — for "container has X m³" reference labels only. */
  nominalCbm: number;
  weight_max_kg: number;
}

export const CONTAINERS: Record<ContainerCode, ContainerSpec> = {
  // 40HC: 76 m³ geometric, ~69 m³ usable for floor-load. Cases/40HC is empirical
  // against the usable figure.
  "40HC":  { code: "40HC",  label: "40' High Cube", cbm: 69.0, nominalCbm: 76.0, weight_max_kg: 20000 },
  // 40STD: 67 m³ geometric, ~58 m³ usable.
  "40STD": { code: "40STD", label: "40' Standard",  cbm: 58.0, nominalCbm: 67.0, weight_max_kg: 20000 },
  // 20STD: 33 m³ geometric, ~28 m³ usable.
  "20STD": { code: "20STD", label: "20' Standard",  cbm: 28.0, nominalCbm: 33.0, weight_max_kg: 20000 },
};

export function getContainerSpec(code: string): ContainerSpec {
  if (code === "40HC" || code === "40STD" || code === "20STD") {
    return CONTAINERS[code];
  }
  // Fallback to 40HC for unrecognized codes; log in caller if you need to alert.
  return CONTAINERS["40HC"];
}
