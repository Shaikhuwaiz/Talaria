// Shared flight-route helpers used by the visible map and the headless
// simulation driver (must stay identical so progress stays in sync).

export type LatLng = { lat: number; lng: number };

export const normLng = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;

export const hashOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

type Coord = [lat: number, lng: number];
type Spine = { lat: [number, number]; lng: [number, number]; nodes: Coord[] };

// Road-following spines so routes hug land instead of cutting across water.
// East Coast = I-95; Great Lakes = I-90/80/Thruway; Gulf coast = I-10/I-75.
const SPINES: Spine[] = [
  {
    lat: [24.5, 43.5],
    lng: [-83.0, -70.2],
    nodes: [
      [42.3601, -71.0589], // Boston
      [40.7128, -74.006], // New York
      [39.9526, -75.1652], // Philadelphia
      [39.2904, -76.6122], // Baltimore
      [37.5407, -77.436], // Richmond
      [35.7796, -78.6382], // Raleigh
      [35.0527, -78.8784], // Fayetteville
      [32.0809, -81.0912], // Savannah
      [30.3322, -81.6557], // Jacksonville
      [25.7617, -80.1918], // Miami
    ],
  },
  {
    lat: [40.2, 47.5],
    lng: [-90.0, -73.5],
    nodes: [
      [43.0389, -87.9065], // Milwaukee
      [41.8781, -87.6298], // Chicago
      [41.6528, -83.5379], // Toledo
      [41.2425, -82.6112], // Norwalk (inland I-80/90 hub, south of Lake Erie)
      [41.4993, -81.6944], // Cleveland
      [41.0995, -80.6497], // Youngstown
      [42.1292, -80.0851], // Erie
      [42.097, -79.2353], // Jamestown
      [42.8864, -78.8784], // Buffalo
      [43.1566, -77.6088], // Rochester
      [43.0481, -76.1474], // Syracuse
      [42.6526, -73.7562], // Albany
    ],
  },
  {
    lat: [25.5, 32.5],
    lng: [-97.0, -80.0],
    nodes: [
      [29.9511, -90.0715], // New Orleans
      [30.6954, -88.0399], // Mobile
      [30.4213, -87.2169], // Pensacola
      [30.4383, -84.2807], // Tallahassee
      [30.3322, -81.6557], // Jacksonville
      [25.7617, -80.1918], // Miami
    ],
  },
];

// Lakeside cities connect to the inland Great Lakes spine via these fixed
// road gateways, so every leg near the lakes is guaranteed to stay on land
// (Detroit through Toledo, Cleveland/Columbus through Norwalk, Pittsburgh
// through Youngstown). Keys are `${lat},${lng}` of the source city.
const LAKESIDE_GATEWAYS: Record<string, [number, number]> = {
  "42.3314,-83.0458": [41.6528, -83.5379], // Detroit -> Toledo
  "41.4993,-81.6944": [41.2425, -82.6112], // Cleveland -> Norwalk
  "39.9612,-82.9988": [41.2425, -82.6112], // Columbus -> Norwalk
  "40.4406,-79.9959": [41.0995, -80.6497], // Pittsburgh -> Youngstown
};

// Simplified bounding boxes of water bodies (lat/lng degrees).
const WATER_BOXES: { lat: [number, number]; lng: [number, number] }[] = [
  { lat: [41.55, 43.0], lng: [-83.6, -78.8] }, // Lake Erie
  { lat: [43.2, 44.5], lng: [-79.9, -76.0] }, // Lake Ontario
  { lat: [41.5, 46.5], lng: [-88.8, -85.4] }, // Lake Michigan
  { lat: [43.0, 46.3], lng: [-85.0, -81.5] }, // Lake Huron
  { lat: [45.9, 48.5], lng: [-92.5, -84.5] }, // Lake Superior
  { lat: [24.8, 29.5], lng: [-97.5, -91.5] }, // Gulf (west, off TX/LA)
  { lat: [25.5, 29.5], lng: [-92.0, -82.5] }, // Gulf (deep basin)
  { lat: [29.6, 30.4], lng: [-90.8, -87.2] }, // Gulf (Mississippi Sound)
  { lat: [30.0, 40.5], lng: [-79.5, -70.0] }, // Atlantic (east of Mid-Atlantic)
  { lat: [30.0, 32.5], lng: [-80.9, -78.9] }, // Atlantic (off GA / N. FL)
  { lat: [35.8, 36.5], lng: [-114.8, -114.1] }, // Lake Mead
  { lat: [36.9, 37.5], lng: [-111.4, -110.3] }, // Lake Powell
];

const inBox = (p: LatLng, b: { lat: [number, number]; lng: [number, number] }) =>
  p.lat > b.lat[0] &&
  p.lat < b.lat[1] &&
  p.lng > b.lng[0] &&
  p.lng < b.lng[1];

// True when the straight leg from `from` to `to` passes over a water body.
const crossesWater = (from: LatLng, to: LatLng): boolean => {
  for (const b of WATER_BOXES) {
    if (inBox(from, b) || inBox(to, b)) return true;

    const [l0, l1] = b.lat;
    const [g0, g1] = b.lng;

    const propsIntersect = (
      ax: number, ay: number, bx: number, by: number,
      cx: number, cy: number, dx: number, dy: number
    ) => {
      const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
      const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
      const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
      return (
        (d1 * d2 <= 0 && d3 * d4 <= 0) &&
        (d1 !== 0 || d2 !== 0 || d3 !== 0 || d4 !== 0)
      );
    };

    // Check the segment against each of the box's four edges.
    const segHit =
      propsIntersect(from.lng, from.lat, to.lng, to.lat, g0, l0, g1, l0) ||
      propsIntersect(from.lng, from.lat, to.lng, to.lat, g1, l0, g1, l1) ||
      propsIntersect(from.lng, from.lat, to.lng, to.lat, g1, l1, g0, l1) ||
      propsIntersect(from.lng, from.lat, to.lng, to.lat, g0, l1, g0, l0);

    if (segHit) return true;
  }
  return false;
};

const inSpine = (p: LatLng, s: Spine) =>
  p.lat > s.lat[0] &&
  p.lat < s.lat[1] &&
  p.lng > s.lng[0] &&
  p.lng < s.lng[1];

// Splice the subset of a spine that lies between `from` and `to`
// (ordered along the dominant axis) so the route stays on land.
const spliceSpine = (spine: Spine, from: LatLng, to: LatLng): LatLng[] => {
  const alongLat = Math.abs(to.lat - from.lat) > Math.abs(to.lng - from.lng);
  const fwd = alongLat ? from.lat > to.lat : from.lng > to.lng;

  const nodes = (spine.nodes as Coord[])
    .filter(([lat, lng]) =>
      alongLat
        ? fwd
          ? lat < from.lat - 0.05 && lat > to.lat + 0.05
          : lat > from.lat + 0.05 && lat < to.lat - 0.05
        : fwd
          ? lng < from.lng - 0.05 && lng > to.lng + 0.05
          : lng > from.lng + 0.05 && lng < to.lng - 0.05
    )
    .sort((a, b) =>
      alongLat ? (fwd ? b[0] - a[0] : a[0] - b[0]) : fwd ? b[1] - a[1] : a[1] - b[1]
    );

  const out: LatLng[] = [{ lat: from.lat, lng: from.lng }];
  for (const [lat, lng] of nodes) out.push({ lat, lng });
  out.push({ lat: to.lat, lng: to.lng });

  const ptKey = (p: LatLng) => `${p.lat},${p.lng}`;
  const gatewayFor = (p: LatLng): LatLng | null => {
    const gw = LAKESIDE_GATEWAYS[ptKey(p)];
    if (!gw) return null;
    const g = { lat: gw[0], lng: gw[1] };
    const already = out.some(
      (q) => Math.abs(q.lat - g.lat) < 0.01 && Math.abs(q.lng - g.lng) < 0.01
    );
    return already ? null : g;
  };

  const gFrom = gatewayFor(from);
  if (gFrom) out.splice(1, 0, gFrom);
  const gTo = gatewayFor(to);
  if (gTo) out.splice(out.length - 1, 0, gTo);
  return out;
};

// Rewrite a direct leg that would cross water using the best matching
// road spine, so trucks always follow land (no oceans, Great Lakes, Gulf,
// major reservoirs, or man-made lakes).
export const waterAvoidingRoute = (pts: LatLng[]): LatLng[] => {
  if (pts.length < 2) return pts;
  const from = pts[0];
  const to = pts[pts.length - 1];

  if (!crossesWater(from, to)) return pts;

  for (const spine of SPINES) {
    if (inSpine(from, spine) && inSpine(to, spine)) {
      return spliceSpine(spine, from, to);
    }
  }

  // No known spine covers this pair; keep the straight route.
  return pts;
};

// Build the multi-leg route: origin → (waypoints/hubs from history) → dest.
export const buildRoute = (
  from: LatLng,
  to: LatLng,
  routeCoords?: [number, number][]
): LatLng[] => {
  const pts: LatLng[] = [];
  if (routeCoords && routeCoords.length >= 2) {
    pts.push({ lat: from.lat, lng: from.lng });
    for (const c of routeCoords) {
      const last = pts[pts.length - 1];
      if (Math.abs(last.lat - c[0]) < 0.01 && Math.abs(last.lng - c[1]) < 0.01) continue;
      pts.push({ lat: c[0], lng: c[1] });
    }
    const last = pts[pts.length - 1];
    if (Math.abs(last.lat - to.lat) > 0.01 || Math.abs(last.lng - to.lng) > 0.01) {
      pts.push({ lat: to.lat, lng: to.lng });
    }
  } else {
    pts.push({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
  }
  return waterAvoidingRoute(pts);
};

// Keep every waypoint inside the single world [-180, 180] so nothing is
// folded off-map onto a hidden duplicate pane.
export const foldRoute = (pts: LatLng[]): LatLng[] =>
  pts.map((p) => ({ lat: p.lat, lng: normLng(p.lng) }));