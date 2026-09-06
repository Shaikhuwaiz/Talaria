// backend/utils/autoRoute.js

import { CITY_COORDS } from "./cityCoords.js";

// Major logistics hubs (must exist in CITY_COORDS) —
// U.S. road/parcel hubs (FedEx · UPS style ground network).
const MAJOR_HUBS = [
  "Memphis",
  "Louisville",
  "Atlanta",
  "Dallas",
  "Chicago",
  "Los Angeles",
  "New York, USA",
  "Seattle",
  "Denver",
  "Miami",
];

// Haversine distance in km
function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCoord(name) {
  return CITY_COORDS[name] || null;
}

// Pick the nearest hub to a given city
function nearestHub(city) {
  const cityCoord = getCoord(city);
  if (!cityCoord) return null;

  let bestHub = null;
  let bestDist = Infinity;

  for (const hub of MAJOR_HUBS) {
    const hubCoord = getCoord(hub);
    if (!hubCoord) continue;

    const d = haversineDistance(cityCoord, hubCoord);
    if (d < bestDist) {
      bestDist = d;
      bestHub = hub;
    }
  }

  return bestHub;
}

// Build a simple route: Origin -> Hub -> Destination
function buildRoute(origin, destination) {
  const hubFromOrigin = nearestHub(origin);
  const hubFromDest = nearestHub(destination);

  // If no coords at all, just direct route
  if (!hubFromOrigin && !hubFromDest) {
    return [origin, destination];
  }

  // If only one hub is known, use that as mid
  if (!hubFromOrigin && hubFromDest) {
    return [origin, hubFromDest, destination];
  }
  if (hubFromOrigin && !hubFromDest) {
    return [origin, hubFromOrigin, destination];
  }

  // Both hubs known: choose which gives shorter total distance
  const originCoord = getCoord(origin);
  const destCoord = getCoord(destination);
  const hub1Coord = getCoord(hubFromOrigin);
  const hub2Coord = getCoord(hubFromDest);

  // If any coord missing, fall back to hubFromOrigin
  if (!originCoord || !destCoord || !hub1Coord || !hub2Coord) {
    return [origin, hubFromOrigin, destination];
  }

  // Prefer a direct route whenever both endpoints have known coordinates —
  // avoids bogus hub detours (e.g. Charlotte → Massachusetts via Atlanta).
  if (originCoord && destCoord) return [origin, destination];

  const path1 =
    haversineDistance(originCoord, hub1Coord) +
    haversineDistance(hub1Coord, destCoord);

  const path2 =
    haversineDistance(originCoord, hub2Coord) +
    haversineDistance(hub2Coord, destCoord);

  const midHub = path1 <= path2 ? hubFromOrigin : hubFromDest;

  // Avoid “Origin == Hub” or “Hub == Destination”
  if (midHub === origin || midHub === destination) {
    return [origin, destination];
  }

  return [origin, midHub, destination];
}

// MAIN: generate history for any route
export function generateHistory(origin, destination, status = "In Transit") {
  const routeCities = buildRoute(origin, destination);

  const now = Date.now();
  const stepMs = 24 * 60 * 60 * 1000; // 1 day per leg

  return routeCities.map((city, index) => {
    const reverseIndex = routeCities.length - 1 - index; // last stop = latest date
    const date = new Date(now - reverseIndex * stepMs);

    let entryStatus = "In Transit";
    if (index === 0) entryStatus = "Shipment created";
    if (index === routeCities.length - 1 && status === "Delivered") {
      entryStatus = "Delivered";
    } else if (index === routeCities.length - 1 && status !== "Delivered") {
      entryStatus = "In Transit";
    }

    return {
      date,
      status: entryStatus,
      location: city,
      details: `Package processed at ${city}`,
    };
  });
}
