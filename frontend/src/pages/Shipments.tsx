import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Package,
  History,
} from "lucide-react";
import {
  getPlaneProgress,
  nearestLocationOf,
  type PlaneProgressEntry,
} from "../utils/planeProgress";
import type { LiveFlight } from "../components/LiveFlightMap";
import FlightSimulationDriver from "../components/FlightSimulationDriver";
import { resolveLocationCoords } from "../utils/shipmentCoords";
import { isWarehouseOrigin } from "../utils/warehouses";
import { flagSrc } from "../utils/flags";
import StageStepper from "../components/StageStepper";

interface ContactInfo {
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
}

interface Shipment {
  _id?: string;
  trackingId: string;
  origin: string;
  destination: string;
  status: string;
  expectedDelivery: string;
  lastLocation: string;
  truckType?: string;
  createdAt?: string;
  weight?: number;
  sender?: ContactInfo;
  recipient?: ContactInfo;
  history?: { location: string; status?: string; date?: string; details?: string }[];
  originMode?: string;
}

const toLiveFlight = (s: Shipment): LiveFlight => ({
  shipmentId: s.trackingId,
  origin: s.origin,
  destination: s.destination,
  status: s.status,
  originIsWarehouse: s.originMode === "warehouse" || isWarehouseOrigin(s.origin),
  deliveryDate: s.expectedDelivery,
  departedAt: departedAtOf(s),
  routeCoords: (s.history ?? [])
    .map((h) => resolveLocationCoords(h.location))
    .filter((c): c is [number, number] => Array.isArray(c) && c.length === 2),
});

const departedAtOf = (s: Shipment): string | undefined =>
  s.history?.find((h) => !/created|label|book/i.test(h.status ?? ""))?.date ??
  s.history?.[0]?.date;

const ITEMS_PER_PAGE = 10;

// Truck type → local truck photo/icon in /public/truck.
const TRUCK_IMAGES: Record<string, string> = {
  "Dry Van": "/icons/dry_van.png",
  Reefer: "/icons/reefer_van.png",
  Flatbed: "/icons/flatbed_truck.png",
  "Box Truck": "/icons/box_van.png",
  "Logging Truck": "/icons/logged_truck.png",
  "Step Deck": "/icons/stepdeck.png",
};

const truckImageOf = (type?: string): string =>
  TRUCK_IMAGES[type ?? ""] ?? "/truck/dryvan.png";

// Pick a concise label from a full address string (e.g. "1234 Harbor Blvd,
// Suite 300, California" → "California"). Falls back to the trailing segment,
// or the original value when there's nothing to shorten.
const US_STATE_NAMES = new Set([
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
]);

const COUNTRY_ALIASES: Record<string, string> = {
  USA: "United States",
  US: "United States",
  UK: "United Kingdom",
};

const conciseLocation = (value?: string): string => {
  const v = (value ?? "").trim();
  if (!v) return v;
  const parts = v.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return v;
  const last = parts[parts.length - 1];
  for (let i = parts.length - 1; i >= 0; i--) {
    if (US_STATE_NAMES.has(parts[i])) return parts[i];
  }
  return COUNTRY_ALIASES[last.toUpperCase()] ?? last;
};

const formatDate = (d?: string): string =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

// Live-aware status for a row (same logic the old table used).
const statusOf = (s: Shipment, live?: PlaneProgressEntry): string =>
  live?.closed
    ? "Closed"
    : live?.returning
      ? "Return"
      : live?.arrived
        ? "Delivered"
        : s.status;

// Completed journeys (delivered, on the return leg, or fully closed) live in
// Shipment History; everything else stays in Active Orders.
const isHistoryShipment = (s: Shipment, live?: PlaneProgressEntry): boolean => {
  const st = statusOf(s, live);
  return st === "Delivered" || st === "Return" || st === "Closed";
};

const getStatusClasses = (status: string) => {
  switch (status) {
    case "Delivered":
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    case "In Transit":
      return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    case "Undelivered":
      return "bg-red-500/15 text-red-400 border border-red-500/30";
    case "Return":
      return "bg-sky-500/15 text-sky-400 border border-sky-500/30";
    case "Closed":
      return "bg-white/5 text-[#A1A1AA] border border-[#27272A]";
    default:
      return "bg-white/5 text-[#A1A1AA] border border-[#27272A]";
  }
};

function TruckTypeBadge({ truckType }: { truckType?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A1A1AA]">
      <img
        src={truckImageOf(truckType)}
        alt={truckType || "Dry Van"}
        className="h-4 w-5 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
      />
      {truckType || "Dry Van"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}

// Flag icon next to an origin/destination state or city name.
function StateFlag({ location }: { location?: string }) {
  const src = flagSrc(location);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={location}
      className="h-3 w-4 rounded-[2px] object-cover"
    />
  );
}

/* ─── Shipment History (compact sidebar card) ─────────────────────── */
function HistoryCard({
  s,
  onView,
  onRebook,
}: {
  s: Shipment;
  onView: () => void;
  onRebook: () => void;
}) {
  const originLabel = conciseLocation(s.origin);
  const destLabel = conciseLocation(s.destination);
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[#27272A] bg-[#18181B] p-3 text-white shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between gap-2">
        <TruckTypeBadge truckType={s.truckType} />
        <span className="text-[11px] text-[#9CA3AF]">
          {formatDate(s.expectedDelivery)}
        </span>
      </div>
      <p className="text-sm font-semibold text-white">{s.trackingId}</p>
      <p className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
        <StateFlag location={s.origin} />
        <span className="truncate text-white">{originLabel}</span>
        <ArrowRight size={11} className="shrink-0 text-[#52525B]" />
        <StateFlag location={s.destination} />
        <span className="truncate text-white">{destLabel}</span>
      </p>
      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 rounded-md border border-[#27272A] bg-[#121212] px-2 py-1.5 text-xs font-medium text-[#D4D4D8] transition-colors hover:border-[#3F3F46] hover:text-white"
        >
          View Details
        </button>
        <button
          onClick={onRebook}
          className="flex-1 rounded-md bg-white px-2 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200"
        >
          Rebook
        </button>
      </div>
    </li>
  );
}

/* ─── Active Order (stacked dashboard card) ──────────────────────── */
function ActiveOrderCard({
  s,
  live,
  onTrack,
  onInvoice,
}: {
  s: Shipment;
  live?: PlaneProgressEntry;
  onTrack: () => void;
  onInvoice: () => void;
}) {
  const status = statusOf(s, live);
  const originLabel = conciseLocation(s.origin);
  const destLabel = conciseLocation(s.destination);
  const displayLoc = live
    ? nearestLocationOf(live.lat, live.lng)
    : s.lastLocation;
  const lastEvent = s.history?.[s.history.length - 1];
  const contactName = s.recipient?.contactName || s.recipient?.name || "—";

  return (
    <article className="mb-5 rounded-lg border border-[#27272A] bg-[#121212] text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
      {/* Metadata header bar */}
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-t-lg border-b border-[#27272A] bg-[#1F1F23] px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Order placed
            </span>
            <span className="font-medium text-white">
              {formatDate(s.createdAt)}
            </span>
          </span>
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Total weight
            </span>
            <span className="font-medium text-white">
              {s.weight ? `${s.weight} kg` : "—"}
            </span>
          </span>
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Contact name
            </span>
            <span className="font-medium text-white">{contactName}</span>
          </span>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={onTrack}
              className="font-semibold text-white transition-colors hover:text-neutral-300"
            >
              View details
            </button>
            <button
              onClick={onInvoice}
              className="font-medium text-[#A1A1AA] transition-colors hover:text-white"
            >
              Invoice
            </button>
          </div>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Order / AWB
          </span>
          <span className="font-mono text-sm font-medium text-white">
            {s.trackingId}
          </span>
        </div>
      </header>

      {/* Body: shipment info + right action area */}
      <div className="flex flex-col gap-5 px-5 py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-start">
        <div className="flex min-w-0 gap-4">
          {/* Truck photo icon */}
          <div className="h-16 w-20 shrink-0">
            <img
              src={truckImageOf(s.truckType)}
              alt={s.truckType || "Dry Van truck"}
              className="h-full w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              <span className="font-mono text-xs text-[#A1A1AA]">
                {s.trackingId}
              </span>
            </div>

            {/* Route: flags + prominent white state names */}
            <p className="mt-2 inline-flex items-center text-[15px] font-semibold leading-snug">
              <StateFlag location={s.origin} />
              <span className="text-white">{originLabel}</span>
              <span className="mx-2 text-[#52525B]">
                <ArrowRight size={14} />
              </span>
              <StateFlag location={s.destination} />
              <span className="text-white">{destLabel}</span>
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#A1A1AA]">
              <TruckTypeBadge truckType={s.truckType} />
              <span>
                Est. delivery:{" "}
                <span className="font-semibold text-white">
                  {formatDate(s.expectedDelivery)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <StateFlag location={displayLoc} />
                <span className="capitalize text-[#A1A1AA]">
                  {displayLoc || "—"}
                </span>
              </span>
            </div>

            {lastEvent && (
              <p className="mt-2 text-xs text-[#A1A1AA]">
                Last update: {lastEvent.status} ·{" "}
                {conciseLocation(lastEvent.location)}
              </p>
            )}

            <div className="mt-3">
              <StageStepper status={status} theme="dark" live={live} />
            </div>
          </div>
        </div>

        {/* Right action area */}
        <div className="flex shrink-0 flex-col gap-2">
          <button
            onClick={onTrack}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
          >
            Track Package
          </button>
          <button
            onClick={onTrack}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#27272A] bg-[#18181B] text-sm font-medium text-[#D4D4D8] transition-colors hover:border-[#3F3F46] hover:text-white"
          >
            View Receipt
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Shipment;
    direction: "asc" | "desc";
  } | null>(null);
  const navigate = useNavigate();

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipments`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Network error: ${res.status} ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        setShipments(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const historyLiveOf = (s: Shipment) => getPlaneProgress(s.trackingId);
  const activeShipments = shipments.filter(
    (s) => !isHistoryShipment(s, historyLiveOf(s))
  );
  const historyShipments = shipments.filter((s) =>
    isHistoryShipment(s, historyLiveOf(s))
  );

  const sortedActive = sortConfig
    ? [...activeShipments].sort((a, b) => {
        const { key, direction } = sortConfig;
        if ((a[key] ?? "") < (b[key] ?? "")) return direction === "asc" ? -1 : 1;
        if ((a[key] ?? "") > (b[key] ?? "")) return direction === "asc" ? 1 : -1;
        return 0;
      })
    : activeShipments;

  const totalPages = Math.ceil(sortedActive.length / ITEMS_PER_PAGE);
  const activePage = sortedActive.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // If the active list shrinks below the current page, step back so we never
  // show a blank page.
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const liveFlights = shipments
    .filter((s) => s.status === "In Transit")
    .map((s) => toLiveFlight(s));

  const handlePrev = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  const handleSortKey = (key: keyof Shipment) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key ? (prev.direction === "asc" ? "desc" : "asc") : "asc",
    }));
  };

  const goTrack = (s: Shipment) =>
    navigate("/tracking", { state: { trackingId: s.trackingId } });
  const goInvoice = (s: Shipment) =>
    navigate(`/orders/invoice/${s.trackingId}`);
  const goRebook = () => navigate("/orders/create");

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-white">
        <h2 className="text-3xl font-bold mb-8 text-center text-white">
          My Orders
        </h2>
        <div className="space-y-5 animate-pulse">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-40 rounded-lg bg-[#18181B] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-400 text-lg font-semibold">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-[#09090B] p-8 max-w-7xl mx-auto text-white">
      <FlightSimulationDriver flights={liveFlights} />

      <h2 className="text-3xl font-bold mb-8 text-center text-white">
        My Orders
      </h2>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        {/* ── Active Orders (left / main) ────────────────────────────── */}
        <section className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">
              Active Orders
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-[#A1A1AA]">
                {activeShipments.length}
              </span>
            </h3>

            <div className="ml-auto flex items-center gap-2">
              <select
                value={sortConfig?.key ?? ""}
                onChange={(e) => {
                  const key = e.target.value as keyof Shipment;
                  if (key) handleSortKey(key);
                  else setSortConfig(null);
                }}
                className="rounded-lg border border-[#27272A] bg-[#121212] px-3 py-1.5 text-sm text-white outline-none focus:border-[#3F3F46]"
              >
                <option value="">Sort by…</option>
                <option value="trackingId">AWB</option>
                <option value="status">Status</option>
                <option value="expectedDelivery">Delivery date</option>
              </select>
              <button
                onClick={() => sortConfig && handleSortKey(sortConfig.key)}
                disabled={!sortConfig}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#27272A] bg-[#121212] text-white transition-colors hover:border-[#3F3F46] disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  sortConfig?.direction === "asc" ? "Ascending" : "Descending"
                }
              >
                {sortConfig?.direction === "asc" ? (
                  <ArrowUp size={15} />
                ) : (
                  <ArrowDown size={15} />
                )}
              </button>
            </div>
          </div>

          {activePage.length ? (
            <>
              <div>
                {activePage.map((s) => {
                  const live = getPlaneProgress(s.trackingId);
                  return (
                    <ActiveOrderCard
                      key={s._id || s.trackingId}
                      s={s}
                      live={live}
                      onTrack={() => goTrack(s)}
                      onInvoice={() => goInvoice(s)}
                    />
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center items-center gap-3">
                <button
                  onClick={handlePrev}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-full border border-[#27272A] bg-[#121212] px-4 py-2 text-sm text-white transition-colors hover:border-[#3F3F46] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} /> Prev
                </button>
                <span className="text-sm text-[#A1A1AA]">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-full border border-[#27272A] bg-[#121212] px-4 py-2 text-sm text-white transition-colors hover:border-[#3F3F46] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[#27272A] bg-[#121212] px-6 py-14 text-center">
              <Package size={26} className="mb-2 text-[#52525B]" />
              <p className="text-sm font-semibold text-white">
                No active orders
              </p>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Shipments in motion will show up here.
              </p>
            </div>
          )}
        </section>

        {/* ── Shipment History sidebar (right) ───────────────────────── */}
        <aside className="w-72 shrink-0 rounded-xl border border-[#27272A] bg-[#121212] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <History size={15} className="text-[#A1A1AA]" />
            Shipment History
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-[#A1A1AA]">
              {historyShipments.length}
            </span>
          </div>

          {historyShipments.length ? (
            <ul className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto pr-1">
              {historyShipments.map((s) => (
                <HistoryCard
                  key={s._id || s.trackingId}
                  s={s}
                  onView={() => goTrack(s)}
                  onRebook={goRebook}
                />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-[#A1A1AA]">
              Completed shipments will appear here.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}