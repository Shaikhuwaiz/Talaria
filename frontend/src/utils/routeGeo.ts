// Road-aware route geometry shared by the map and the headless simulation
// driver (must stay identical so progress stays in sync).
//
// Primary: real highway geometry from the free OSRM driving router, cached
// per route. Fallback: deterministic spine route (routeMath) which keeps
// routes on land even when offline or the router is unreachable.

import type { LatLng } from "./routeMath";
import { buildRoute, foldRoute, normLng } from "./routeMath";

type Via = [number, number][];

const promiseCache = new Map<string, Promise<LatLng[] | null>>();
const geomCache = new Map<string, LatLng[]>();
const failTime = new Map<string, number>();

export const routeKey = (from: LatLng, to: LatLng, via?: Via): string => {
  const a = `${from.lat.toFixed(3)},${from.lng.toFixed(3)}`;
  const b = `${to.lat.toFixed(3)},${to.lng.toFixed(3)}`;
  const v = via
    ? `|${via.map(([la, ln]) => `${la.toFixed(2)},${ln.toFixed(2)}`).join(";")}`
    : "";
  return `${a}->${b}${v}`;
};

// Deterministic land-safe fallback (spines + water detection).
export const fallbackRoute = (from: LatLng, to: LatLng, via?: Via): LatLng[] =>
  foldRoute(buildRoute(from, to, via));

// Synchronously available cached road geometry for a route, if fetched.
export const getRouteGeometry = (
  from: LatLng,
  to: LatLng,
  via?: Via
): LatLng[] | undefined => geomCache.get(routeKey(from, to, via));

// The route to use right now:
//  - real road geometry once fetched
//  - deterministic land-safe multi-leg route immediately (better than straight)
//  - null while road geometry is still loading (draw nothing, never a straight
//    line — a straight line appears only if road routing actually failed)
//  - straight fallback only after a confirmed routing failure
export const routeFor = (from: LatLng, to: LatLng, via?: Via): LatLng[] | null => {
  const k = routeKey(from, to, via);
  const road = geomCache.get(k);
  if (road) return road;

  const fb = fallbackRoute(from, to, via);
  if (fb.length > 2) return fb;

  const failedAt = failTime.get(k);
  if (failedAt !== undefined && Date.now() - failedAt > 1000) return fb;

  return null;
};

const downsample = (pts: LatLng[], max: number): LatLng[] => {
  if (pts.length <= max) return pts;
  const step = Math.ceil(pts.length / max);
  const out: LatLng[] = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
  const last = pts[pts.length - 1];
  if (out[out.length - 1].lng !== last.lng || out[out.length - 1].lat !== last.lat) {
    out.push(last);
  }
  return out;
};

// Kick off (once per route) a fetch of real road geometry.
export const ensureRouteGeometry = (
  from: LatLng,
  to: LatLng,
  via?: Via
): void => {
  const k = routeKey(from, to, via);
  if (geomCache.has(k) || promiseCache.has(k)) return;

  const p = (async (): Promise<LatLng[] | null> => {
    const onFailure = () => {
      failTime.set(k, Date.now());
      return null;
    };
    try {
      const viaPart = via && via.length
        ? `;${via.map(([la, ln]) => `${ln},${la}`).join(";")}`
        : "";
      const url =
        "https://router.project-osrm.org/route/v1/driving/" +
        `${from.lng},${from.lat}${viaPart};${to.lng},${to.lat}` +
        "?overview=full&geometries=geojson&steps=false";

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);

      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return onFailure();

      const j = await res.json();
      const coords: [number, number][] | undefined =
        j?.routes?.[0]?.geometry?.coordinates;
      if (j?.code !== "Ok" || !coords || coords.length < 2) return onFailure();

      const pts = downsample(
        coords.map(([lng, lat]) => ({ lat, lng: normLng(lng) })),
        1200
      );
      geomCache.set(k, pts);
      return pts;
    } catch {
      return onFailure();
    }
  })();

  promiseCache.set(k, p);
};