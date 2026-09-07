import { useEffect, useRef } from "react";
import { fromLonLat, toLonLat } from "ol/proj";
import { resolveLocationCoords } from "../utils/shipmentCoords";
import { setPlaneProgress } from "../utils/planeProgress";
import { hashOf } from "../utils/routeMath";
import type { LatLng } from "../utils/routeMath";
import { ensureRouteGeometry, fallbackRoute, routeFor } from "../utils/routeGeo";
import { makeDateSchedule, type DateSchedule, type LiveFlight } from "./LiveFlightMap";

// Must mirror LiveFlightMap's constants so progress is identical.
const ONE_WAY_MS = 120000;
const VARIANCE_MS = 45000;
const ARRIVED_HOLD_MS = 4000;

interface SimState {
  mpts: number[][];
  cum: number[];
  total: number;
  progress: number;
  duration: number;
  phase: "forward" | "arrived" | "return";
  holdStart: number;
  simSrc?: { from: LatLng; to: LatLng; via?: [number, number][] };
  waiting?: boolean;
  dateMode?: DateSchedule;
  closed?: boolean;
}

const cumulate = (merc: number[][]): [number[], number] => {
  const cum = [0];
  for (let i = 1; i < merc.length; i++) {
    const dx = merc[i][0] - merc[i - 1][0];
    const dy = merc[i][1] - merc[i - 1][1];
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  return [cum, cum[cum.length - 1] || 1];
};

export default function FlightSimulationDriver({
  flights,
}: {
  flights: LiveFlight[];
}) {
  const flightsRef = useRef<LiveFlight[]>(flights);
  flightsRef.current = flights;
  const statesRef = useRef<Map<string, SimState>>(new Map());

  // Sync simulation states with the current flight list (no rendering).
  useEffect(() => {
    const active = new Set(flights.map((f) => f.shipmentId));
    for (const [id, s] of statesRef.current.entries()) {
      if (!active.has(id)) statesRef.current.delete(id);
    }

    for (const flight of flights) {
      if (flight.status === "Delivered" || statesRef.current.has(flight.shipmentId)) continue;
      const origin = resolveLocationCoords(flight.origin);
      const dest = resolveLocationCoords(flight.destination);
      if (!origin || !dest) continue;
      const from = { lat: origin[0], lng: origin[1] };
      const toRaw = { lat: dest[0], lng: dest[1] };
      ensureRouteGeometry(from, toRaw, flight.routeCoords);
      const loaded = routeFor(from, toRaw, flight.routeCoords);
      const folded =
        loaded ?? fallbackRoute(from, toRaw, flight.routeCoords);
      const merc = folded.map((p) => fromLonLat([p.lng, p.lat]));
      const [cum, total] = cumulate(merc);
      const seed = hashOf(flight.shipmentId);
      statesRef.current.set(flight.shipmentId, {
        mpts: merc,
        cum,
        total,
        progress: 0,
        duration: ONE_WAY_MS + (seed % VARIANCE_MS),
        phase: "forward",
        holdStart: 0,
        simSrc: { from, to: toRaw, via: flight.routeCoords },
        waiting: loaded === null,
        dateMode: makeDateSchedule(flight.deliveryDate, flight.departedAt, flight.shipmentId),
      });
    }
  }, [flights]);

  // Animation loop: advance progress and publish to the shared store.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastEmit = last;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;

      const out: Record<string, { p: number; arrived: boolean; returning: boolean; closed: boolean; lat: number; lng: number }> = {};

      for (const [id, fs] of statesRef.current.entries()) {
        // Wait for road geometry; once it (or a settled fallback) is in,
        // rebuild the path and keep the truck off any straight line. If
        // still loading, skip publishing this frame.
        if (fs.waiting && fs.simSrc) {
          const r = routeFor(fs.simSrc.from, fs.simSrc.to, fs.simSrc.via);
          if (r) {
            fs.mpts = r.map((p) => fromLonLat([p.lng, p.lat]));
            const [cum, total] = cumulate(fs.mpts);
            fs.cum = cum;
            fs.total = total;
            fs.waiting = false;
          } else {
            continue;
          }
        }

        if (fs.dateMode) {
          const nowAt = Date.now();
          if (nowAt >= fs.dateMode.closeT) {
            fs.progress = 0;
            fs.phase = "arrived";
            fs.closed = true;
          } else if (nowAt >= fs.dateMode.returnStartT) {
            fs.progress = Math.max(
              0,
              Math.min(
                1,
                (nowAt - fs.dateMode.returnStartT) /
                  (fs.dateMode.closeT - fs.dateMode.returnStartT)
              )
            );
            fs.phase = "return";
            fs.closed = false;
          } else if (nowAt >= fs.dateMode.arriveT) {
            fs.progress = 1;
            fs.phase = "arrived";
            fs.closed = false;
          } else {
            fs.progress = Math.max(
              0,
              Math.min(
                1,
                (nowAt - fs.dateMode.startT) /
                  (fs.dateMode.arriveT - fs.dateMode.startT)
              )
            );
            fs.phase = "forward";
            fs.closed = false;
          }
        } else if (fs.phase === "forward") {
          fs.progress = Math.min(1, fs.progress + dt / fs.duration);
          if (fs.progress >= 1) {
            fs.phase = "arrived";
            fs.holdStart = now;
          }
        } else if (fs.phase === "arrived") {
          if (now - fs.holdStart >= ARRIVED_HOLD_MS) {
            fs.phase = "return";
            fs.holdStart = now;
          }
        } else {
          fs.progress = Math.max(0, fs.progress - dt / fs.duration);
          if (fs.progress <= 0) {
            fs.phase = "forward";
            fs.holdStart = now;
          }
        }

        const t = Math.max(0, Math.min(1, fs.progress)) * fs.total;
        let i = 0;
        while (i < fs.cum.length - 1 && t > fs.cum[i + 1]) i++;
        const segLen = fs.cum[i + 1] - fs.cum[i] || 1e-9;
        const f = Math.max(0, Math.min(1, (t - fs.cum[i]) / segLen));
        const px = fs.mpts[i][0] + (fs.mpts[i + 1][0] - fs.mpts[i][0]) * f;
        const py = fs.mpts[i][1] + (fs.mpts[i + 1][1] - fs.mpts[i][1]) * f;
        const lonlat = toLonLat([px, py]);
        out[id] = {
          p: fs.progress,
          arrived: fs.phase === "arrived",
          returning: fs.phase === "return",
          closed: fs.closed === true,
          lat: lonlat[1],
          lng: lonlat[0],
        };
      }

      if (now - lastEmit >= 500) {
        lastEmit = now;
        for (const [id, v] of Object.entries(out)) {
          setPlaneProgress(id, v.p, v.arrived, v.returning, v.lat, v.lng, v.closed);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}