import { CITY_COORDS } from "./cityCoords.js";

const EXTRA_COORDS = {
  pune: [18.5204, 73.8567],
  kerla: [10.8505, 76.2711],
  newyork: [40.7128, -74.006],
  melbourne: [-37.8136, 144.9631],
  sydney: [-33.8688, 151.2093],
  toronto: [43.65107, -79.347015],
  vancouver: [49.2827, -123.1207],
  paris: [48.8566, 2.3522],
  berlin: [52.52, 13.405],
  tokyo: [35.6762, 139.6503],
  heathrow: [51.4706, -0.4619],
  govandi: [19.0041, 72.894],
  france: [46.6034, 1.8883],
  // Talaria facility cities
  oakland: [37.8044, -122.2712],
  commerce: [33.9766, -118.1562],
  hodgkins: [41.7717, -87.8601],
  collegepark: [33.6534, -84.4494],
  newark: [40.7357, -74.1724],
};

const COORDS = { ...EXTRA_COORDS };

for (const [name, coords] of Object.entries(CITY_COORDS)) {
  const key = name.toLowerCase().replace(/\s+/g, "");
  if (!COORDS[key]) COORDS[key] = coords;
}

const normalize = (location = "") =>
  location.toLowerCase().replace(/\s+/g, "");

const STATE_ABBR = {
  al: "alabama",
  ak: "alaska",
  az: "arizona",
  ar: "arkansas",
  ca: "california",
  co: "colorado",
  ct: "connecticut",
  de: "delaware",
  fl: "florida",
  ga: "georgia",
  hi: "hawaii",
  id: "idaho",
  il: "illinois",
  in: "indiana",
  ia: "iowa",
  ks: "kansas",
  ky: "kentucky",
  la: "louisiana",
  me: "maine",
  md: "maryland",
  ma: "massachusetts",
  mi: "michigan",
  mn: "minnesota",
  ms: "mississippi",
  mo: "missouri",
  mt: "montana",
  ne: "nebraska",
  nv: "nevada",
  nh: "newhampshire",
  nj: "newjersey",
  nm: "newmexico",
  ny: "newyork",
  nc: "northcarolina",
  nd: "northdakota",
  oh: "ohio",
  ok: "oklahoma",
  or: "oregon",
  pa: "pennsylvania",
  ri: "rhodeisland",
  sc: "southcarolina",
  sd: "southdakota",
  tn: "tennessee",
  tx: "texas",
  ut: "utah",
  vt: "vermont",
  va: "virginia",
  wa: "washington",
  wv: "westvirginia",
  wi: "wisconsin",
  wy: "wyoming",
};

export function resolveLocationCoords(location) {
  if (!location) return null;
  const n = normalize(location);

  if (COORDS[n]) return COORDS[n];

  const parts = location.split(",").map(normalize).filter(Boolean);
  for (const part of parts) {
    if (COORDS[part]) return COORDS[part];
    const expanded = STATE_ABBR[part];
    if (expanded && COORDS[expanded]) return COORDS[expanded];
  }

  let best = null;
  let bestLen = -1;
  for (const [key, coords] of Object.entries(COORDS)) {
    const kn = normalize(key);
    if (kn.length > bestLen && n.includes(kn)) {
      best = coords;
      bestLen = kn.length;
    }
  }

  return best;
}