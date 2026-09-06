import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LiveFlightMap, { type LiveFlight } from "./LiveFlightMap";
import { resolveLocationCoords } from "../utils/shipmentCoords";
import { isWarehouseOrigin } from "../utils/warehouses";

type Shipment = {
  trackingId: string;
  origin: string;
  destination: string;
  status: string;
  history?: { location: string }[];
  originMode?: string;
};

const toLiveFlight = (s: Shipment): LiveFlight => ({
  shipmentId: s.trackingId,
  origin: s.origin,
  destination: s.destination,
  status: s.status,
  originIsWarehouse: s.originMode === "warehouse" || isWarehouseOrigin(s.origin),
  routeCoords: (s.history ?? [])
    .map((h) => resolveLocationCoords(h.location))
    .filter((c): c is [number, number] => Array.isArray(c) && c.length === 2),
});

export default function LiveTrackPreview() {
  const [flights, setFlights] = useState<LiveFlight[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Shipment[]) => {
        if (cancelled) return;
        setFlights(
          data
            .filter((s) => s.status && s.status !== "Delivered")
            .map(toLiveFlight)
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.DEV ? undefined : import.meta.env.VITE_BACKEND_URL);

    const socket = SOCKET_URL
      ? io(SOCKET_URL, { transports: ["websocket", "polling"] })
      : io({ transports: ["websocket", "polling"] });

    const addFlight = (s: Shipment) => {
      if (!s?.trackingId || !s.origin || !s.destination) return;
      if (s.status === "Delivered") return;
      setFlights((prev) =>
        prev.some((f) => f.shipmentId === s.trackingId)
          ? prev
          : [...prev, toLiveFlight(s)]
      );
    };

    socket.on("shipmentCreated", addFlight);
    socket.on("shipments:init", (list: Shipment[]) => {
      setFlights((prev) => {
        const seen = new Map(prev.map((f) => [f.shipmentId, f]));
        list.forEach((s) => {
          if (
            s &&
            s.status !== "Delivered" &&
            s.trackingId &&
            s.origin &&
            s.destination &&
            !seen.has(s.trackingId)
          ) {
            seen.set(s.trackingId, toLiveFlight(s));
          }
        });
        return Array.from(seen.values());
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Live · US network
          </span>
        </div>
        <span className="text-xs font-medium text-neutral-500">
          {flights.length} loads on the road
        </span>
      </div>
      <LiveFlightMap flights={flights} />
    </div>
  );
}