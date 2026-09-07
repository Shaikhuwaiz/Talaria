import { Feature, Map as OlMap, Overlay, View } from "ol";
import { easeOut } from "ol/easing";
import { LineString } from "ol/geom";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import XYZ from "ol/source/XYZ";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";
import { useEffect, useRef } from "react";
import { resolveLocationCoords } from "../utils/shipmentCoords";
import { setPlaneProgress } from "../utils/planeProgress";
import { foldRoute, hashOf, normLng } from "../utils/routeMath";
import type { LatLng } from "../utils/routeMath";
import {
  ensureRouteGeometry,
  fallbackRoute,
  routeFor,
} from "../utils/routeGeo";

export interface LiveFlight {
  shipmentId: string;
  origin: string;
  destination: string;
  status?: string;
  routeCoords?: [number, number][];
  originIsWarehouse?: boolean;
  deliveryDate?: string;
  departedAt?: string;
}

const CARTO_KEY = (import.meta.env.VITE_CARTO_KEY as string | undefined)?.trim();
const TILE_URL = CARTO_KEY
  ? `https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(CARTO_KEY)}`
  : "https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

// One world only (no repeated copies when the viewport is wider than the map).
const WORLD_EXTENT = [
  -20037508.342789244,
  -20037508.342789244,
  20037508.342789244,
  20037508.342789244,
];

// Wider pan window so the user can drag up to Alaska and Canada
// (western Aleutians → Newfoundland, southern Canada → the far north).
const NA_EXTENT = (() => {
  const sw = fromLonLat([-173, 24.3]);
  const ne = fromLonLat([-52, 72]);
  return [sw[0], sw[1], ne[0], ne[1]] as number[];
})();

// Average pace (~2min per leg) so the position can be followed on the map.
const ONE_WAY_MS = 120000;
const VARIANCE_MS = 45000;
const ARRIVED_HOLD_MS = 4000;
// Distance ahead/behind a truck used to derive its heading, in Web Mercator
// units (≈ meters at the equator). Keeps the truck aimed along the overall
// road instead of jittering with individual vertices.
const LOOKAHEAD_METERS = 12000;

interface PlaneState {
  overlay: Overlay;
  img: HTMLElement;
  mpts: number[][];
  cum: number[];
  total: number;
  bearing: number;
  progress: number;
  duration: number;
  undelivered: boolean;
  phase: "forward" | "arrived" | "return";
  holdStart: number;
  rotation?: number;
  simSrc?: { from: LatLng; to: LatLng; via?: [number, number][] };
  waiting?: boolean;
  dateMode?: DateSchedule;
  closed?: boolean;
}

const DAY_MS = 86400000;
const DEFAULT_TRIP_MS = 3 * DAY_MS;
const OUTBOUND_MIN_MS = 60_000;
const DELIVERY_TZ = "America/Chicago";

const zonedOffsetMs = (tz: string, date: Date): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const num = (type: string) => {
    const p = parts.find((x) => x.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };
  const asUTC = Date.UTC(
    num("year"),
    num("month") - 1,
    num("day"),
    num("hour") % 24,
    num("minute"),
    num("second")
  );
  return asUTC - date.getTime();
};

// Persisted fallback start so a page refresh doesn't reset the trip: the
// truck keeps its place in the journey instead of jumping back to origin.
const persistedStart = (id: string): number | null => {
  try {
    const raw = localStorage.getItem(`talaria.tripStart:${id}`);
    if (!raw) return null;
    const v = Number(raw);
    return Number.isNaN(v) ? null : v;
  } catch {
    return null;
  }
};

const persistStart = (id: string, v: number): void => {
  try {
    localStorage.setItem(`talaria.tripStart:${id}`, String(v));
  } catch {
    /* ignore */
  }
};

export interface DateSchedule {
  startT: number;
  arriveT: number;
  returnStartT: number;
  closeT: number;
}

// Date-scheduled journey keyed to the promised delivery day (America/Chicago).
// Travels from startT → arriveT (start of the delivery day), marks Delivered at
// arriveT, returns to the warehouse immediately taking the same time as the
// outbound leg, then closes at closeT — the truck and route line disappear.
// If the order has no promised date (legacy rows), it runs forward-only and
// delivers in DEFAULT_TRIP_MS without ever returning, so nothing loops.
export const makeDateSchedule = (
  deliveryDate?: string,
  departedAt?: string,
  id?: string
): DateSchedule => {
  const real = deliveryDate ? new Date(deliveryDate) : null;
  const haveReal = !!real && !Number.isNaN(real.getTime());

  const departed = departedAt ? new Date(departedAt).getTime() : NaN;
  const persisted = id ? persistedStart(id) : null;

  let startT: number;
  if (!Number.isNaN(departed)) {
    startT = departed;
  } else if (persisted != null) {
    startT = persisted;
  } else {
    startT = Date.now();
    if (id) persistStart(id, startT);
  }

  if (haveReal) {
    const e = real as Date;
    const y = e.getFullYear();
    const m = e.getMonth();
    const d = e.getDate();
    const offset = zonedOffsetMs(DELIVERY_TZ, new Date(y, m, d, 12));
    const arriveT = Date.UTC(y, m, d, 0, 0, 0, 0) + offset;
    if (startT >= arriveT) startT = arriveT - Math.max(60_000, OUTBOUND_MIN_MS);
    const outboundDur = arriveT - startT;
    return {
      startT,
      arriveT,
      returnStartT: arriveT,
      closeT: arriveT + outboundDur,
    };
  }

  // No promised date: forward-only, arrive in DEFAULT_TRIP_MS, never return.
  const arriveT = startT + DEFAULT_TRIP_MS;
  return {
    startT,
    arriveT,
    returnStartT: Number.MAX_SAFE_INTEGER,
    closeT: Number.MAX_SAFE_INTEGER,
  };
};

const makeTruckImg = () => {
  const img = document.createElement("img");
  img.src = "https://img.icons8.com/office/40/truck-top-view.png";
  img.className = "flight-plane-img";
  img.alt = "truck";
  return img;
};

const makePin = (color: string, title: string) => {
  const el = document.createElement("div");
  el.title = title;
  el.style.width = "12px";
  el.style.height = "12px";
  el.style.borderRadius = "9999px";
  el.style.backgroundColor = color;
  el.style.border = "2px solid #ffffff";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.5)";
  el.style.zIndex = "20";
  return el;
};

const makeWarehousePin = (title: string) => {
  const el = document.createElement("div");
  el.title = title;
  el.style.width = "34px";
  el.style.height = "34px";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.zIndex = "20";
  const img = document.createElement("img");
  img.src = "/icons8-warehouse.png";
  img.alt = "warehouse";
  img.draggable = false;
  img.style.width = "27px";
  img.style.height = "27px";
  img.style.objectFit = "contain";
  img.style.pointerEvents = "none";
  img.style.filter = "drop-shadow(0 1px 3px rgba(0,0,0,0.45))";
  el.appendChild(img);
  return el;
};

export default function LiveFlightMap({
  flights,
  onProgress,
  autoFit = false,
}: {
  flights: LiveFlight[];
  onProgress?: (
    progress: Record<string, { p: number; arrived: boolean; returning: boolean; lat: number; lng: number }>
  ) => void;
  autoFit?: boolean;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<OlMap | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const flightStateRef = useRef<Map<string, PlaneState>>(new Map());
  const pinOverlaysRef = useRef<Map<string, Overlay>>(new Map());
  const flightsRef = useRef<LiveFlight[]>([]);
  const onProgressRef = useRef(onProgress);
  const fittedKeyRef = useRef<string | null>(null);
  flightsRef.current = flights;
  onProgressRef.current = onProgress;

  // Keep the latest sync logic available to the map init effect.
  const syncRef = useRef<() => void>(() => {});
  syncRef.current = () => {
    const map = mapRef.current;
    const source = vectorSourceRef.current;
    if (!map || !source) return;

    const active = new Set(flightsRef.current.map((f) => f.shipmentId));

    for (const [id, fs] of [...flightStateRef.current.entries()]) {
      if (!active.has(id)) {
        map.removeOverlay(fs.overlay);
        flightStateRef.current.delete(id);
      }
    }
    for (const [key, overlay] of [...pinOverlaysRef.current.entries()]) {
      const id = key.slice(0, key.lastIndexOf("-"));
      if (!active.has(id)) {
        map.removeOverlay(overlay);
        pinOverlaysRef.current.delete(key);
      }
    }

    source.clear();

    const coordKey = (lng: number, lat: number) =>
      `${Math.round(lat * 100)},${Math.round(normLng(lng) * 100)}`;
    const seenPins = new Set<string>();

    let fitExtent: [number, number, number, number] | null = null;

    for (const flight of flightsRef.current) {
      // Closed orders are done: remove the truck and skip the route line/pins.
      const existing = flightStateRef.current.get(flight.shipmentId);
      if (existing?.closed) {
        const el = existing.overlay.getElement();
        if (el) el.style.display = "none";
        continue;
      }

      const origin = resolveLocationCoords(flight.origin);
      const dest = resolveLocationCoords(flight.destination);
      if (!origin || !dest) continue;

      const from = { lat: origin[0], lng: origin[1] };
      const toRaw = { lat: dest[0], lng: dest[1] };
      ensureRouteGeometry(from, toRaw, flight.routeCoords);
      const r = routeFor(from, toRaw, flight.routeCoords);
      const ready = r !== null;
      const folded = foldRoute(r ?? fallbackRoute(from, toRaw, flight.routeCoords));
      const routeEnd = folded[folded.length - 1];
      const merc = folded.map((p) => fromLonLat([p.lng, p.lat]));

      const undelivered = flight.status === "Undelivered";

      if (ready) {
        for (const [x, y] of merc) {
          if (!fitExtent) fitExtent = [x, y, x, y];
          else {
            if (x < fitExtent[0]) fitExtent[0] = x;
            if (y < fitExtent[1]) fitExtent[1] = y;
            if (x > fitExtent[2]) fitExtent[2] = x;
            if (y > fitExtent[3]) fitExtent[3] = y;
          }
        }

        // ── Route line (re-added on every sync) ───────────────────────────
        const routeColor = undelivered ? "rgba(248,113,113,0.95)" : "rgba(250, 204, 21, 0.95)";
        const dashLine = new Feature({ geometry: new LineString(merc) });
        dashLine.setStyle(
          new Style({
            stroke: new Stroke({
              color: routeColor,
              width: 2.5,
              lineDash: [6, 4],
              lineCap: "round",
              lineJoin: "round",
            }),
          })
        );
        source.addFeature(dashLine);
      }

      // ── Plane overlay (created once per shipment) ─────────────────────
      if (!flightStateRef.current.has(flight.shipmentId)) {
        const el = document.createElement("div");
        el.className = "flight-plane";
        const truckImg = makeTruckImg();
        el.appendChild(truckImg);

        const overlay = new Overlay({
          element: el,
          positioning: "center-center",
          stopEvent: false,
        });
        overlay.setPosition(merc[0]);
        map.addOverlay(overlay);

        const cum = [0];
        for (let i = 1; i < merc.length; i++) {
          const dx = merc[i][0] - merc[i - 1][0];
          const dy = merc[i][1] - merc[i - 1][1];
          cum.push(cum[i - 1] + Math.hypot(dx, dy));
        }
        const total = cum[cum.length - 1] || 1;
        const dx0 = merc.length > 1 ? merc[1][0] - merc[0][0] : 0;
        const dy0 = merc.length > 1 ? merc[1][1] - merc[0][1] : 0;
        const bearing = (Math.atan2(dx0, dy0) * 180) / Math.PI;

        const seed = hashOf(flight.shipmentId);
        flightStateRef.current.set(flight.shipmentId, {
          overlay,
          img: truckImg,
          mpts: merc,
          cum,
          total,
          bearing,
          progress: 0,
          duration: ONE_WAY_MS + (seed % VARIANCE_MS),
          undelivered,
          phase: "forward",
          holdStart: 0,
          simSrc: { from, to: toRaw, via: flight.routeCoords },
          waiting: !ready,
          dateMode: makeDateSchedule(flight.deliveryDate, flight.departedAt, flight.shipmentId),
        });
      }

      // ── Origin / destination pins (dots only, no label overlap) ───────
      const originKey = coordKey(from.lng, from.lat);
      if (!seenPins.has(originKey)) {
        seenPins.add(originKey);
        const storeKey = `${flight.shipmentId}-origin`;
        if (!pinOverlaysRef.current.has(storeKey)) {
          const o = new Overlay({
            element: flight.originIsWarehouse
              ? makeWarehousePin(flight.origin)
              : makePin("#059669", flight.origin),
            positioning: "center-center",
            offset: [0, 0],
            stopEvent: false,
          });
          o.setPosition(fromLonLat([from.lng, from.lat]));
          map.addOverlay(o);
          pinOverlaysRef.current.set(storeKey, o);
        }
      }

      const destKey = coordKey(routeEnd.lng, routeEnd.lat);
      if (!seenPins.has(destKey)) {
        seenPins.add(destKey);
        const storeKey = `${flight.shipmentId}-dest`;
        if (!pinOverlaysRef.current.has(storeKey)) {
          const d = new Overlay({
            element: makePin(undelivered ? "#f87171" : "#e11d48", flight.destination),
            positioning: "center-center",
            offset: [0, 0],
            stopEvent: false,
          });
          d.setPosition(fromLonLat([routeEnd.lng, routeEnd.lat]));
          map.addOverlay(d);
          pinOverlaysRef.current.set(storeKey, d);
        }
      }
    }

    // When focused on specific shipments, zoom in on the full route
    // (origin + waypoints + destination) so nothing floats off-frame.
    // Fit only when the route extent changes so repeated syncs (e.g. the
    // tracking page re-rendering on a progress tick) don't restart the
    // zoom animation over and over.
    if (autoFit && fitExtent) {
      const key = fitExtent.map((v) => v.toFixed(3)).join(",");
      if (fittedKeyRef.current !== key) {
        fittedKeyRef.current = key;
        map.getView().fit(fitExtent, {
          padding: [90, 90, 90, 90],
          duration: 700,
          maxZoom: 9,
        });
      }
    }
  };

  // ── Map initialization ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const lineLayer = new VectorLayer({ source: vectorSource });

    const map = new OlMap({
      target: mapDivRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({ url: TILE_URL, crossOrigin: "anonymous", wrapX: false }),
        }),
        lineLayer,
      ],
      view: new View({
        center: fromLonLat([-97, 38]),
        zoom: 4.1,
        minZoom: 3,
        maxZoom: 18,
        extent: WORLD_EXTENT,
        enableRotation: false,
      }),
      controls: [],
    });
    mapRef.current = map;

    let animating = false;
    map.on("moveend", () => {
      if (animating) return;
      const view = map.getView();
      const c = view.getCenter();
      if (!c) return;
      const padX = (NA_EXTENT[2] - NA_EXTENT[0]) * 0.16;
      const padY = (NA_EXTENT[3] - NA_EXTENT[1]) * 0.16;
      const cx = c[0];
      const cy = c[1];
      if (
        cx < NA_EXTENT[0] - padX ||
        cx > NA_EXTENT[2] + padX ||
        cy < NA_EXTENT[1] - padY ||
        cy > NA_EXTENT[3] + padY
      ) {
        animating = true;
        view.animate({
          center: [
            Math.min(Math.max(cx, NA_EXTENT[0]), NA_EXTENT[2]),
            Math.min(Math.max(cy, NA_EXTENT[1]), NA_EXTENT[3]),
          ],
          duration: 380,
          easing: easeOut,
        });
        setTimeout(() => {
          animating = false;
        }, 450);
      }
    });

    syncRef.current();

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      vectorSourceRef.current = null;
      fittedKeyRef.current = null;
      flightStateRef.current.clear();
      pinOverlaysRef.current.clear();
    };
  }, []);

  // ── Keep flights in sync with the rendered map ────────────────────────
  useEffect(() => {
    syncRef.current();
  }, [flights]);

  // ── Animation loop (requestAnimationFrame) ────────────────────────────
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastEmit = last;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;

      const out: Record<string, { p: number; arrived: boolean; returning: boolean; closed: boolean; lat: number; lng: number }> = {};
      let resolvedWaiting = false;

      for (const [id, fs] of flightStateRef.current.entries()) {
        // Upgrade to real road geometry once it arrives; wait (don't pose)
        // until then so the truck/line never tracks a straight line.
        if (fs.waiting && fs.simSrc) {
          const r = routeFor(fs.simSrc.from, fs.simSrc.to, fs.simSrc.via);
          if (r) {
            fs.mpts = r.map((p) => fromLonLat([p.lng, p.lat]));
            fs.cum = [0];
            for (let i = 1; i < fs.mpts.length; i++) {
              const dx = fs.mpts[i][0] - fs.mpts[i - 1][0];
              const dy = fs.mpts[i][1] - fs.mpts[i - 1][1];
              fs.cum.push(fs.cum[i - 1] + Math.hypot(dx, dy));
            }
            fs.total = fs.cum[fs.cum.length - 1] || 1;
            const dx0 = fs.mpts.length > 1 ? fs.mpts[1][0] - fs.mpts[0][0] : 0;
            const dy0 = fs.mpts.length > 1 ? fs.mpts[1][1] - fs.mpts[0][1] : 0;
            fs.bearing = (Math.atan2(dx0, dy0) * 180) / Math.PI;
            fs.waiting = false;
            resolvedWaiting = true;
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

        const overlayEl = fs.overlay.getElement();
        if (fs.closed) {
          if (overlayEl) overlayEl.style.display = "none";
          const lonlat = toLonLat([fs.mpts[0][0], fs.mpts[0][1]]);
          out[id] = {
            p: 0,
            arrived: true,
            returning: false,
            closed: true,
            lat: lonlat[1],
            lng: lonlat[0],
          };
          continue;
        }
        if (overlayEl) overlayEl.style.display = "";

        const t = Math.max(0, Math.min(1, fs.progress)) * fs.total;
        let i = 0;
        while (i < fs.cum.length - 1 && t > fs.cum[i + 1]) i++;
        const segLen = fs.cum[i + 1] - fs.cum[i] || 1e-9;
        const f = Math.max(0, Math.min(1, (t - fs.cum[i]) / segLen));
        const x0 = fs.mpts[i][0];
        const y0 = fs.mpts[i][1];
        const x1 = fs.mpts[i + 1][0];
        const y1 = fs.mpts[i + 1][1];
        const px = x0 + (x1 - x0) * f;
        const py = y0 + (y1 - y0) * f;

        fs.overlay.setPosition([px, py]);

        // Aim at a point ~12 km ahead (behind on the return leg) so the
        // truck faces the true travel direction instead of snapping to
        // individual (noisy) road vertices. Rotation is then limited to a
        // fixed angular speed so the truck sweeps smoothly into turns and
        // never flicks around like a compass needle (e.g. the u-turn when
        // the return leg begins).
        const lookT =
          fs.phase === "return" ? t - LOOKAHEAD_METERS : t + LOOKAHEAD_METERS;
        const tc = Math.max(0, Math.min(fs.total, lookT));
        let k = 0;
        while (k < fs.cum.length - 1 && tc > fs.cum[k + 1]) k++;
        const ax = fs.mpts[k][0] - px;
        const ay = fs.mpts[k][1] - py;
        const heading = (Math.atan2(ax, ay) * 180) / Math.PI;
        const targetRotation = heading - 90;
        const prevRotation = fs.rotation ?? targetRotation;
        const diff = ((targetRotation - prevRotation + 540) % 360) - 180;
        const maxDegPerSec = 70;
        const maxStep = (maxDegPerSec * dt) / 1000;
        const step = Math.max(-maxStep, Math.min(maxStep, diff));
        fs.rotation = (fs.rotation ?? prevRotation) + step;
        fs.img.style.transform = `rotate(${fs.rotation}deg)`;

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
          setPlaneProgress(
            id,
            v.p,
            v.arrived,
            v.returning,
            v.lat,
            v.lng,
            v.closed
          );
        }
        onProgressRef.current?.(out);
      }

      // Redraw the dashed line with the real road geometry now that it is in.
      if (resolvedWaiting) syncRef.current();

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="lfm-map relative h-[480px] w-full overflow-hidden rounded-xl bg-[#aadaff]">
      <div ref={mapDivRef} className="absolute inset-0" style={{ zIndex: 0 }} />
    </div>
  );
}