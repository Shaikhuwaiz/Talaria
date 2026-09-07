import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlaneProgress, nearestLocationOf } from "../utils/planeProgress";
import type { LiveFlight } from "../components/LiveFlightMap";
import FlightSimulationDriver from "../components/FlightSimulationDriver";
import { resolveLocationCoords } from "../utils/shipmentCoords";
import { isWarehouseOrigin } from "../utils/warehouses";
import { flagSrc } from "../utils/flags";
import StageStepper from "../components/StageStepper";

interface Shipment {
  _id?: string;
  trackingId: string;
  origin: string;
  destination: string;
  status: string;
  expectedDelivery: string;
  lastLocation: string;
  history?: { location: string; status?: string; date?: string }[];
  originMode?: string;
}

const toLiveFlight = (s: Shipment): LiveFlight => ({
  shipmentId: s.trackingId,
  origin: s.origin,
  destination: s.destination,
  status: s.status,
  originIsWarehouse: s.originMode === "warehouse" || isWarehouseOrigin(s.origin),
  deliveryDate: s.expectedDelivery,
  departedAt:
    s.history?.find((h) => !/created|label|book/i.test(h.status ?? ""))?.date ??
    s.history?.[0]?.date,
  routeCoords: (s.history ?? [])
    .map((h) => resolveLocationCoords(h.location))
    .filter((c): c is [number, number] => Array.isArray(c) && c.length === 2),
});

const ITEMS_PER_PAGE = 10;

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

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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

  const filteredShipments = shipments.filter(
    (s) =>
      s.trackingId.toLowerCase().includes(search.toLowerCase()) ||
      s.status.toLowerCase().includes(search.toLowerCase())
  );

  const sortedShipments = sortConfig
    ? [...filteredShipments].sort((a, b) => {
        const { key, direction } = sortConfig;
        if ((a[key] ?? "") < (b[key] ?? "")) return direction === "asc" ? -1 : 1;
        if ((a[key] ?? "") > (b[key] ?? "")) return direction === "asc" ? 1 : -1;
        return 0;
      })
    : filteredShipments;

  const totalPages = Math.ceil(sortedShipments.length / ITEMS_PER_PAGE);
  const paginatedShipments = sortedShipments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const liveFlights = shipments
    .filter((s) => s.status === "In Transit")
    .map((s) => toLiveFlight(s));

  const handlePrev = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));

  const handleSort = (key: keyof Shipment) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

const getStatusClasses = (status: string) => {
  switch (status) {
    case "Delivered":
      return `
        text-green-300
        border border-green-400/40
        rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap
        bg-green-500/10
      `;
    case "In Transit":
      return `
        text-white
        border border-neutral-500
        rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap
        bg-white/5
      `;
    case "Undelivered":
      return `
        text-red-300
        border border-red-400/40
        rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap
        bg-red-500/10
      `;
    case "Return":
      return `
        text-sky-300
        border border-sky-400/40
        rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap
        bg-sky-500/10
      `;
    default:
      return `
        text-gray-300
        border border-neutral-600
        rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap
        bg-transparent
      `;
  }
};
  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center text-white">
          My Orders
        </h2>
        <div className="space-y-3 animate-pulse">
          {[...Array(ITEMS_PER_PAGE)].map((_, idx) => (
            <div key={idx} className="h-10 bg-neutral-800 rounded-md w-full"></div>
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
    <div className="p-8 max-w-7xl mx-auto text-white">
      <FlightSimulationDriver flights={liveFlights} />
      <h2 className="text-4xl font-bold mb-6 text-center text-white">
        My Orders
      </h2>

      <div className="mb-6 flex justify-between items-center">
  <input
    type="text"
    placeholder="Search by Tracking ID or Status"
    value={search}
    onChange={(e) => {
      setSearch(e.target.value);
      setCurrentPage(1);
    }}
    className="w-80 p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:ring-2 focus:ring-white outline-none"
  />

  <button
    onClick={() => navigate("/orders/create")}
    className="px-5 py-3 bg-white hover:bg-neutral-200 text-black font-semibold rounded-full transition"
  >
    + Create Shipment
  </button>
</div>

      <div className="overflow-x-auto rounded-xl bg-neutral-900 border border-neutral-800 text-white shadow-lg shadow-neutral-900/5">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-neutral-400">
            <tr>
              <th
                className="p-4 cursor-pointer"
                onClick={() => handleSort("trackingId")}
              >
                Tracking ID
              </th>
              <th className="p-4 cursor-pointer">Origin → Destination</th>
              <th
                className="p-4 cursor-pointer"
                onClick={() => handleSort("status")}
              >
                Status
              </th>
              <th className="p-3 ">Progress</th>
              <th className="p-3 ">Last Location</th>
              <th
                className="p-4 cursor-pointer"
                onClick={() => handleSort("expectedDelivery")}
              >
                Expected Delivery
              </th>
              <th className="p-4 ">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedShipments.map((s, idx) => {
const live = getPlaneProgress(s.trackingId);
const arrived = live?.arrived === true;
const returning = live?.returning === true;
const displayStatus = live?.closed
  ? "Closed"
  : returning
    ? "Return"
    : arrived
      ? "Delivered"
      : s.status;
const displayLoc = live
  ? nearestLocationOf(live.lat, live.lng)
  : s.lastLocation;
const originLabel = conciseLocation(s.origin);
const destLabel = conciseLocation(s.destination);
              return (
                <tr
                  key={s._id || s.trackingId}
                  className={
                    idx % 2 === 0
                      ? "bg-white/[0.02] hover:bg-white/[0.05] transition"
                      : "hover:bg-white/[0.05] transition"
                  }
                >
                  <td className="p-4 font-semibold">{s.trackingId}</td>

                  <td className="p-4 flex items-center gap-3">
                    <div className="flex items-center gap-4">
                      {/* Origin */}
                      <div className="flex items-center gap-2">
                        {flagSrc(originLabel) ? (
                          <img
                            src={flagSrc(originLabel)}
                            alt={originLabel}
                            className="w-6 h-4 object-cover rounded-sm"
                          />
                        ) : (
                          <span className="w-6 h-4 bg-neutral-800 rounded-sm" />
                        )}
                        <span className="capitalize">{originLabel}</span>
                      </div>
                      <span className="text-gray-500 font-bold">→</span>
                      {/* Destination */}
                      <div className="flex items-center gap-2">
                        {flagSrc(destLabel) ? (
                          <img
                            src={flagSrc(destLabel)}
                            alt={destLabel}
                            className="w-6 h-4 object-cover rounded-sm"
                          />
                        ) : (
                          <span className="w-6 h-4 bg-neutral-800 rounded-sm" />
                        )}
                        <span className="capitalize">{destLabel}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-sm font-semibold ${getStatusClasses(
                        displayStatus
                      )}`}
                    >
                      {displayStatus}
                    </span>
                  </td>

                  <td className="p-3 ">
    <StageStepper status={displayStatus} theme="dark" live={live} />
          </td>

                  <td className="p-3 ">
                    <div className="flex items-center gap-2">
                      {flagSrc(displayLoc) ? (
                        <img
                          src={flagSrc(displayLoc)}
                          alt={displayLoc}
                          className="w-6 h-4 object-cover rounded-sm"
                        />
                      ) : (
                        <span className="w-6 h-4 bg-neutral-800 rounded-sm" />
                      )}
                      <span className="capitalize">{displayLoc || "—"}</span>
                    </div>
                  </td>

                  <td className="p-3 ">
                    {s.expectedDelivery
                      ? new Date(s.expectedDelivery).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>

                  <td className="p-3">
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Are you sure you want to delete this shipment?"
                          )
                        )
                          return;
                      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipments/${s._id}`, {
  method: "DELETE",
});
                        setShipments((prev) =>
                          prev.filter((ship) => ship._id !== s._id)
                        );
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center items-center gap-3 mt-4">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-neutral-700 text-white rounded-full hover:border-white disabled:opacity-40 transition"
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border border-neutral-700 text-white rounded-full hover:border-white disabled:opacity-40 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
