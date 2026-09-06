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

// Weather-driven delay reasons shown on "In Transit" check-ins
const WEATHER_DELAYS = [
  "Heavy snowstorm ahead — parcel held at sorting facility",
  "Severe thunderstorm warning — delayed departure",
  "Heavy sleet across the region — extended transit time",
  "Icy conditions on the highway — carrier delay",
  "Winter storm watch — delivery window rescheduled",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// MAIN: generate a UPS/FedEx-style movement timeline
// (Order Created → Departed Facility → In Transit check-ins → Out for Delivery → Delivered)
export function generateMovements(origin, destination, status = "In Transit") {
  const via = buildRoute(origin, destination);
  const stops = via.length;
  const checkins = Math.max(0, stops - 2); // intermediate sorting stops
  const stepMs = 6 * 60 * 60 * 1000; // ~6 hours between events
  const totalEvents = 2 + checkins * 2 + 2;
  let t = Date.now() - totalEvents * stepMs;

  const events = [];
  const push = (ev) => {
    events.push({
      delayed: false,
      delayReason: "",
      ...ev,
      timestamp: new Date(t).toISOString(),
    });
    t += stepMs;
  };

  push({
    status: "Order Created",
    location: origin,
    completed: true,
    details: "Label generated, parcel received at warehouse",
  });
  push({
    status: "Departed Facility",
    location: origin,
    completed: true,
    details: `Parcel departed the ${origin} facility`,
  });

  for (let i = 1; i < stops - 1; i++) {
    const city = via[i];
    push({
      status: "In Transit",
      location: city,
      details: `Arrived at sorting facility in ${city}`,
    });
    push({
      status: "In Transit",
      location: city,
      details: `Departed sorting facility in ${city}`,
    });
  }

  const dest = via[stops - 1] ?? destination;
  push({
    status: "Out for Delivery",
    location: dest,
    details: "Loaded onto local delivery vehicle",
  });
  push({
    status: "Delivered",
    location: dest,
    details:
      (status || "").toLowerCase().includes("undeliver")
        ? "Delivery attempted — held at facility"
        : "Delivered and signed for by recipient",
  });

  // Mark events completed based on the shipment's overall status
  const lower = (status || "").toLowerCase();
  let completedCount;
  if (lower.includes("undeliver")) completedCount = events.length - 1;
  else if (lower.includes("deliver")) completedCount = events.length;
  else completedCount = 2 + Math.ceil(checkins); // partial transit

  events.forEach((ev, i) => {
    ev.completed = i < completedCount;
  });

  // Simulate a weather delay on the latest completed in-transit check-in
  const delayIdx = completedCount - 1;
  if (
    delayIdx >= 2 &&
    events[delayIdx]?.status === "In Transit" &&
    Math.random() < 0.6
  ) {
    events[delayIdx].delayed = true;
    events[delayIdx].delayReason = pick(WEATHER_DELAYS);
  }

  return events;
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
