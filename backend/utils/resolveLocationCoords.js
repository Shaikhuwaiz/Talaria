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
};

const COORDS = { ...EXTRA_COORDS };

for (const [name, coords] of Object.entries(CITY_COORDS)) {
  const key = name.toLowerCase().replace(/\s+/g, "");
  if (!COORDS[key]) COORDS[key] = coords;
}

const normalize = (location = "") =>
  location.toLowerCase().replace(/\s+/g, "");

export function resolveLocationCoords(location) {
  if (!location) return null;
  return COORDS[normalize(location)] || null;
}