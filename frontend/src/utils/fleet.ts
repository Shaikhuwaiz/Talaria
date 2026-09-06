import type { LucideIcon } from "lucide-react";
import { Box, Container, Layers, Snowflake, Truck } from "lucide-react";

export type CapacityTier = "Lite" | "Standard" | "Heavy" | "Over-Dimensional";

export interface TruckFleet {
  id: string;
  name: string;
  category: string;
  scale: number;
  tier: CapacityTier;
  tierColor: string;
  badge: string;
  icon: LucideIcon;
  img: string;
  sketchfab: string;
  payload: string;
  payloadKg: string;
  loadHeight: string;
  length: string;
  width: string;
  description: string;
  highlights: string[];
}

export const FLEET_SCALE_LABELS: { tier: CapacityTier; note: string }[] = [
  { tier: "Lite", note: "Expedite & hot-shot" },
  { tier: "Standard", note: "Van & reefer freight" },
  { tier: "Heavy", note: "Open deck & flatbed" },
  { tier: "Over-Dimensional", note: "Low-boy & step deck" },
];

export const FLEET: TruckFleet[] = [
  {
    id: "box-truck",
    name: "Box Truck",
    category: "Expedite & Hot-Shot",
    scale: 1,
    tier: "Lite",
    tierColor: "#059669",
    badge: "bg-emerald-600 text-white",
    icon: Box,
    img: "/fleet/expedite.jpg",
    sketchfab:
      "https://sketchfab.com/models/c14fbf00cc8c49f8a51fcedaa7287d23/embed?camera=0&autostart=1&transparent=1&ui_controls=0&ui_stop=0&ui_infos=0&ui_social=0&ui_share=0&ui_watermark=0&ui_fav=0&ui_embed=0&ui_help=0&ui_fullscreen=0&ui_settings=0&ui_annotations=0&ui_inspector=0&ui_hint=0&ui_ar=0&ui_vr=0&ui_theme=dark",
    payload: "7,500 lb",
    payloadKg: "3,400 kg",
    loadHeight: "8 ft 6 in",
    length: "26 ft",
    width: "8 ft 6 in",
    description:
      "Straight-body rigs that roll when the plant can't wait. Local and regional expedite with tight windows — dispatched hot-shot style with a live ETA the moment it leaves the yard.",
    highlights: [
      "Same-day dispatch windows",
      "Curbside and tight-dock friendly",
      "Live driver tracking and ETA",
    ],
  },
  {
    id: "dry-van",
    name: "Dry Van",
    category: "Van & Dry Freight",
    scale: 2,
    tier: "Standard",
    tierColor: "#0284c7",
    badge: "bg-sky-600 text-white",
    icon: Truck,
    img: "/fleet/ltl.jpg",
    sketchfab:
      "https://sketchfab.com/models/12801ef7a6ce4f6e9d9983d4bf4b4b9e/embed?autostart=1&transparent=1&ui_controls=0&ui_stop=0&ui_infos=0&ui_social=0&ui_share=0&ui_watermark=0&ui_fav=0&ui_embed=0&ui_help=0&ui_fullscreen=0&ui_settings=0&ui_annotations=0&ui_inspector=0&ui_hint=0&ui_ar=0&ui_vr=0&ui_theme=dark",
    payload: "43,000 lb",
    payloadKg: "19,500 kg",
    loadHeight: "8 ft 6 in",
    length: "53 ft",
    width: "8 ft 6 in",
    description:
      "Enclosed 53 ft dry vans move palletized LTL and full truckload freight — sealed tight, stacked higher and tracked on every mile from pickup dock to final drop.",
    highlights: [
      "Holds 26 standard pallets",
      "Sealed, weatherproof loading dock",
      "LTL and FTL consolidation lanes",
    ],
  },
  {
    id: "reefer",
    name: "Reefer",
    category: "Temperature-Controlled",
    scale: 3,
    tier: "Standard",
    tierColor: "#0284c7",
    badge: "bg-sky-600 text-white",
    icon: Snowflake,
    img: "/fleet/reefer.jpg",
    sketchfab:
      "https://sketchfab.com/models/be6003019c3c478182bd8f128f3d9559/embed?autostart=1&transparent=1&ui_controls=0&ui_stop=0&ui_infos=0&ui_social=0&ui_share=0&ui_watermark=0&ui_fav=0&ui_embed=0&ui_help=0&ui_fullscreen=0&ui_settings=0&ui_annotations=0&ui_inspector=0&ui_hint=0&ui_ar=0&ui_vr=0&ui_theme=dark",
    payload: "42,000 lb",
    payloadKg: "19,050 kg",
    loadHeight: "8 ft 6 in",
    length: "48 ft",
    width: "8 ft 6 in",
    description:
      "Temperature-monitored reefers for produce, pharma and perishable freight — holding the exact window from dock to dock with live temp logs you can watch while it rolls.",
    highlights: [
      "-20°F to 80°F temperature window",
      "Dual-probe live temperature logs",
      "Pre-cooled and verified before loading",
    ],
  },
  {
    id: "flatbed",
    name: "Flatbed",
    category: "Heavy & Open Deck",
    scale: 4,
    tier: "Heavy",
    tierColor: "#d97706",
    badge: "bg-amber-500 text-white",
    icon: Container,
    img: "/fleet/flatbed.jpg",
    sketchfab:
      "https://sketchfab.com/models/8f9f3bae89aa426bb0b0e3a8855cc30a/embed?autostart=1&transparent=1&ui_controls=0&ui_stop=0&ui_infos=0&ui_social=0&ui_share=0&ui_watermark=0&ui_fav=0&ui_embed=0&ui_help=0&ui_fullscreen=0&ui_settings=0&ui_annotations=0&ui_inspector=0&ui_hint=0&ui_ar=0&ui_vr=0&ui_theme=dark",
    payload: "48,000 lb",
    payloadKg: "21,770 kg",
    loadHeight: "8 ft 6 in above deck",
    length: "53 ft",
    width: "8 ft 6 in",
    description:
      "Open-deck flatbeds for steel, lumber, machinery and coils — loaded by crane or forklift, secured to spec and tarped on request for cross-country runs.",
    highlights: [
      "Steel, lumber, pipe and coil capable",
      "Tarping and securement included",
      "Coast-to-coast permit lanes",
    ],
  },
  {
    id: "step-deck",
    name: "Step Deck",
    category: "Over-Dimensional",
    scale: 5,
    tier: "Over-Dimensional",
    tierColor: "#7c3aed",
    badge: "bg-violet-600 text-white",
    icon: Layers,
    img: "/fleet/oversized.jpg",
    sketchfab:
      "https://sketchfab.com/models/b55162849ad04765962fcf6dc38e75b9/embed?autostart=1&transparent=1&ui_controls=0&ui_stop=0&ui_infos=0&ui_social=0&ui_share=0&ui_watermark=0&ui_fav=0&ui_embed=0&ui_help=0&ui_fullscreen=0&ui_settings=0&ui_annotations=0&ui_inspector=0&ui_hint=0&ui_ar=0&ui_vr=0&ui_theme=dark",
    payload: "47,000 lb",
    payloadKg: "21,320 kg",
    loadHeight: "9 ft 9 in well",
    length: "53 ft",
    width: "8 ft 6 in",
    description:
      "Drop-deck trailers with a deep lower well for cargo too tall for a standard flatbed — permits, escorts and route planning handled end to end.",
    highlights: [
      "Oversized loads up to 10 ft tall",
      "Permits and route planning included",
      "Pilot car escort coordination",
    ],
  },
];