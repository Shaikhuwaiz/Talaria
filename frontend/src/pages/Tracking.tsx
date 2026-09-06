import { useEffect, useState } from "react";
import LiveFlightMap, { type LiveFlight } from "../components/LiveFlightMap";
import TrackingTimeline from "../components/TrackingTimeline";
import { resolveLocationCoords } from "../utils/shipmentCoords";
import { isWarehouseOrigin } from "../utils/warehouses";
import { getPlaneProgress } from "../utils/planeProgress";
import type { MovementEvent } from "../utils/trackingStages";

interface ShipmentHistory {
  date: string;
  status: string;
  location: string;
  details: string;
}

interface Shipment {
  trackingId: string;
  origin: string;
  destination: string;
  status: string;
  expectedDelivery: string;
  history: ShipmentHistory[];
  movements?: MovementEvent[];
  originMode?: string;
}

export default function Tracking() {
  const [trackingId, setTrackingId] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setTick] = useState(0);

  // Re-render on an interval so the timeline stays in sync with the live
  // truck/plane progress the map pushes into the shared planeProgress store.
  useEffect(() => {
    if (!shipment) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 500);
    return () => window.clearInterval(id);
  }, [shipment]);

  const live = shipment ? getPlaneProgress(shipment.trackingId) : undefined;

  const getDotRingClasses = (status: string) => {
    switch (status) {
      case "Delivered":
        return "border-emerald-400";
      case "In Transit":
        return "border-white";
      case "Undelivered":
        return "border-red-500";
      default:
        return "border-neutral-500";
    }
  };

  const getDotFillClasses = (status: string) => {
    switch (status) {
      case "Delivered":
        return "h-2.5 w-2.5 rounded-full bg-emerald-400";
      case "In Transit":
        return "h-2.5 w-2.5 rounded-full bg-white";
      case "Undelivered":
        return "h-2.5 w-2.5 rounded-full bg-red-500";
      default:
        return "h-2.5 w-2.5 rounded-full bg-neutral-500";
    }
  };

  const handleTrack = async () => {
    if (!trackingId) return;

    setLoading(true);
    setError("");
    setShipment(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/shipments/${trackingId}`
      );

      if (!res.ok) throw new Error("Shipment not found");

      const data = await res.json();

      // Safety fallback
      if (!data || typeof data !== "object") {
        throw new Error("Invalid shipment data");
      }

      setShipment(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <h2 className="text-3xl font-bold mb-4 text-white text-center">
        Track Your Shipment
      </h2>

      {/* Input */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Enter Tracking ID (e.g. AWB12345)"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          className="flex-1 p-3 rounded-full bg-neutral-900 text-white border border-neutral-700
             focus:border-white focus:ring-2 focus:ring-white/40
             placeholder-neutral-500 transition outline-none"
        />
        <button
          onClick={handleTrack}
          disabled={loading}
          className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-neutral-200 disabled:opacity-60"
        >
          {loading ? "Tracking..." : "Track"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-400 font-semibold text-center mb-4">
          {error}
        </div>
      )}

      {/* No Shipment */}
      {!shipment && !loading && !error && (
        <p className="text-center text-neutral-500">
          Enter a tracking ID to view shipment details.
        </p>
      )}

      {/* Shipment Details */}
      {shipment && (
        <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
          <h3 className="text-xl font-bold mb-2">{shipment.trackingId}</h3>

          <p className="text-neutral-400 mb-1">
            {shipment.origin} → {shipment.destination}
          </p>

          <p className="font-semibold mb-1">
            Status:{" "}
            <span
              className={
                shipment.status === "Delivered"
                  ? "text-green-400"
                  : shipment.status === "In Transit"
                  ? "text-white"
                  : "text-red-400"
              }
            >
              {shipment.status}
            </span>
          </p>

          <p className="text-neutral-400 mb-6">
            Expected Delivery:{" "}
            {new Date(shipment.expectedDelivery).toLocaleDateString()}
          </p>

          <div className="w-full mb-6 rounded-xl overflow-hidden border border-neutral-800">
            <LiveFlightMap
              autoFit
              flights={[
                {
                  shipmentId: shipment.trackingId,
                  origin: shipment.origin,
                  destination: shipment.destination,
                  status: shipment.status,
                  originIsWarehouse:
                    shipment.originMode === "warehouse" ||
                    isWarehouseOrigin(shipment.origin),
                  routeCoords: (shipment.history ?? [])
                    .map((h) => resolveLocationCoords(h.location))
                    .filter(
                      (c): c is [number, number] =>
                        Array.isArray(c) && c.length === 2
                    ),
                },
              ]}
            />
          </div>

          <TrackingTimeline
            movements={shipment.movements}
            history={shipment.history}
            currentStatus={shipment.status}
            expectedDelivery={shipment.expectedDelivery}
            theme="dark"
            showHeader={false}
            liveProgress={
              live
                ? {
                    p: live.p,
                    arrived: live.arrived,
                    returning: live.returning,
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}