import type { LucideIcon } from "lucide-react";
import { FileText, Warehouse, Truck, MapPin, PackageCheck } from "lucide-react";

export type StageKey =
  | "created"
  | "departed"
  | "transit"
  | "outfordelivery"
  | "delivered";

export interface MovementEvent {
  status: string;
  location: string;
  timestamp: string;
  completed: boolean;
  details?: string;
  delayed?: boolean;
  delayReason?: string;
}

// Live truck/plane progress pushed into the shared store by LiveFlightMap /
// FlightSimulationDriver (getPlaneProgress). Kept as a subset of
// PlaneProgressEntry so pages can pass it straight through.
export interface LiveProgress {
  p: number;
  arrived: boolean;
  returning: boolean;
}

// Fraction-of-route thresholds that drive which stage is live/complete.
export const TRANSIT_START = 0.15; // truck has left origin
export const TRANSIT_END = 0.85; // truck nears destination
export const OUT_FOR_DELIVERY_AT = 0.85;
export const RETURN_DONE_AT = 0.1; // truck essentially back at the facility

const liveEffectiveP = (live: LiveProgress) =>
  live.arrived
    ? 1
    : live.returning
      ? 1 - live.p
      : Math.max(0, Math.min(1, live.p));

export const STAGE_ORDER: StageKey[] = [
  "created",
  "departed",
  "transit",
  "outfordelivery",
  "delivered",
];

export const STAGE_META: Record<
  StageKey,
  { label: string; sub: string; icon: LucideIcon }
> = {
  created: { label: "Order Created", sub: "Label generated", icon: FileText },
  departed: { label: "Departed Facility", sub: "Warehouse out", icon: Warehouse },
  transit: { label: "In Transit", sub: "On the way", icon: Truck },
  outfordelivery: {
    label: "Out for Delivery",
    sub: "Loaded on local vehicle",
    icon: MapPin,
  },
  delivered: { label: "Delivered", sub: "Signed POD", icon: PackageCheck },
};

// Overrides shown while the driver is on the return leg to the facility.
export const RETURN_LABELS: Partial<Record<StageKey, { label: string; sub: string }>> = {
  transit: { label: "In Transit Back to Facility", sub: "Returning to Talaria facility" },
  delivered: { label: "Arrived at Warehouse", sub: "Ready for Reload" },
};

export const stageFor = (status: string): StageKey => {
  const s = status.toLowerCase();
  if (s.includes("created") || s.includes("label")) return "created";
  if (s.includes("departed") || s.includes("depart") || s.includes("warehouse"))
    return "departed";
  if (s.includes("out for delivery") || s.includes("out-for-delivery"))
    return "outfordelivery";
  if (s.includes("delivered")) return "delivered";
  if (s.includes("deliver")) return "delivered";
  return "transit";
};

export function stageState(
  key: StageKey,
  status: string,
  live?: LiveProgress
): { completed: boolean; active: boolean } {
  const idx = STAGE_ORDER.indexOf(key);
  const s = status.toLowerCase();
  if (s.includes("undeliver")) {
    return { completed: idx <= 3, active: false };
  }
  if (s.includes("deliver")) {
    return { completed: true, active: false };
  }

  // Live truck/plane progress overrides the static mapping so the timeline
  // moves in lockstep with the unit on the map.
  if (live) {
    if (live.returning) {
      // Carrier turned back to the facility: opening stages done, driver in
      // transit. The terminal stage flips to "Arrived at Warehouse / Ready
      // for Reload" once the truck is essentially back (p → 0).
      if (idx === 2) return { completed: false, active: live.p > RETURN_DONE_AT };
      if (idx === STAGE_ORDER.length - 1)
        return { completed: live.p <= RETURN_DONE_AT, active: false };
      return { completed: idx <= 1, active: false };
    }
    const eff = liveEffectiveP(live);
    let done = false;
    switch (key) {
      case "created":
        done = true;
        break;
      case "departed":
        done = eff >= TRANSIT_START;
        break;
      case "transit":
        done = eff >= TRANSIT_END;
        break;
      case "outfordelivery":
        done = eff >= OUT_FOR_DELIVERY_AT;
        break;
      case "delivered":
        done = eff >= 1;
        break;
    }
    const prev =
      done || idx === 0
        ? undefined
        : stageState(STAGE_ORDER[idx - 1], status, live);
    const active = !done && (idx === 0 || (prev ? prev.completed : false));
    return { completed: done, active };
  }

  // In Transit / Return / anything else: through "Departed", "In Transit" is active
  if (idx < 2) return { completed: true, active: false };
  if (idx === 2) return { completed: false, active: true };
  return { completed: false, active: false };
}

// Completion of an individual movement event while live progress exists.
// Transit check-ins fill in left-to-right as the truck advances.
export function liveCompletedFor(
  key: StageKey,
  index: number,
  total: number,
  live: LiveProgress,
  status: string
): boolean {
  if (status.toLowerCase().includes("deliver")) return true;
  if (live.returning) {
    if (key === "created" || key === "departed") return true;
    if (key === "delivered") return live.p <= RETURN_DONE_AT;
    return false;
  }
  const eff = liveEffectiveP(live);
  switch (key) {
    case "created":
      return true;
    case "departed":
      return eff >= TRANSIT_START;
    case "transit":
      return (
        eff >=
        TRANSIT_START +
          ((index + 1) / Math.max(1, total)) * (TRANSIT_END - TRANSIT_START)
      );
    case "outfordelivery":
      return eff >= OUT_FOR_DELIVERY_AT;
    case "delivered":
      return eff >= 1;
  }
}

export function currentStage(status: string, live?: LiveProgress): StageKey {
  const s = status.toLowerCase();
  if (s.includes("undeliver")) return "outfordelivery";
  if (s.includes("deliver")) return "delivered";
  if (live) {
    for (const k of STAGE_ORDER) {
      if (stageState(k, status, live).active) return k;
    }
    return "delivered";
  }
  return "transit";
}

export function formatEventTime(ts?: string | number | Date | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfThat = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  ).getTime();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const days = Math.round((startOfToday - startOfThat) / 86400000);
  if (days === 0) return `Today at ${time}`;
  if (days === 1) return `Yesterday at ${time}`;
  return `${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}, ${time}`;
}

export function formatDateOnly(ts?: string | number | Date | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}