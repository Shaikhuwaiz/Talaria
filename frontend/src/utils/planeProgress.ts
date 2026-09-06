// Live plane-progress store.
// LiveFlightMap writes each plane's progress + live position here; pages
// (DashboardHome, Shipments) read it so bars/last-location follow the plane.

import { LOCATION_COORDS } from "./shipmentCoords";

export interface PlaneProgressEntry {
  p: number;
  arrived: boolean;
  returning: boolean;
  lat: number;
  lng: number;
}

const store = new Map<string, PlaneProgressEntry>();

export const setPlaneProgress = (
  id: string,
  p: number,
  arrived: boolean,
  returning: boolean,
  lat: number,
  lng: number
): void => {
  store.set(id, { p, arrived, returning, lat, lng });
};

export const getPlaneProgress = (id: string): PlaneProgressEntry | undefined =>
  store.get(id);

const DISPLAY_NAMES: Record<string, string> = {
  newyork: "New York",
  "newyork,usa": "New York",
  newhampshire: "New Hampshire",
  newjersey: "New Jersey",
  newmexico: "New Mexico",
  northcarolina: "North Carolina",
  northdakota: "North Dakota",
  southcarolina: "South Carolina",
  southdakota: "South Dakota",
  westvirginia: "West Virginia",
  rhodeisland: "Rhode Island",
  lasvegas: "Las Vegas",
  losangeles: "Los Angeles",
  sanfrancisco: "San Francisco",
  sandiego: "San Diego",
  sanantonio: "San Antonio",
  saltlakecity: "Salt Lake City",
  kansascity: "Kansas City",
  saintlouis: "Saint Louis",
  stlouis: "St. Louis",
  neworleans: "New Orleans",
  washingtondc: "Washington D.C.",
  usa: "USA",
  unitedstates: "United States",
}

const toRad = (d: number) => (d * Math.PI) / 180;

// Approximate reverse-geocode: nearest known US city/state to the truck.
export function nearestLocationOf(lat: number, lng: number): string {
  let best = "";
  let bestDist = Infinity;
  const R = 6371;

  for (const [name, [lat2, lon2]] of Object.entries(LOCATION_COORDS)) {
    const dLat = toRad(lat2 - lat);
    const dLon = toRad(lon2 - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const d = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }

  return DISPLAY_NAMES[best] ?? best.charAt(0).toUpperCase() + best.slice(1);
}