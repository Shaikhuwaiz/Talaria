import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Loader2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Package,
  Truck,
  Zap,
  Timer,
  Rocket,
  Layers,
  Snowflake,
  CreditCard,
  Receipt,
  Wallet,
  Landmark,
  FileText,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  Boxes,
  Warehouse,
  Container,
  Box,
} from "lucide-react";
import { WAREHOUSES } from "../utils/warehouses";

const STEPS = [
  { id: 0, label: "Shipping Details" },
  { id: 1, label: "Service Selection" },
  { id: 2, label: "Additional Details" },
  { id: 3, label: "Payment" },
  { id: 4, label: "Confirmation" },
];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

type OriginMode = "warehouse" | "custom";

// Truck types available for a shipment, rendered as selectable icon cards.
const TRUCK_TYPES: { id: string; name: string; desc: string; icon: LucideIcon }[] = [
  { id: "Dry Van", name: "Dry Van", desc: "Sealed standard trailer", icon: Truck },
  { id: "Flatbed", name: "Flatbed", desc: "Open deck for oversized", icon: Container },
  { id: "Reefer", name: "Reefer", desc: "Temperature-controlled", icon: Snowflake },
  { id: "Box Truck", name: "Box Truck", desc: "Straight truck, local runs", icon: Box },
  { id: "Step Deck", name: "Step Deck", desc: "Drop-deck for tall loads", icon: Layers },
];

const DIM_FIELDS = [
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "length", label: "Length", unit: "cm" },
  { key: "width", label: "Width", unit: "cm" },
  { key: "height", label: "Height", unit: "cm" },
] as const;

type ParcelKey = (typeof DIM_FIELDS)[number]["key"];

const PACKAGING_OPTIONS = [
  { id: "standard", name: "Standard Packaging", desc: "Talaria boxes, mailers and void fill" },
  { id: "carrier", name: "Talaria / Carrier Packaging", desc: "Official Talaria box, envelope or Express tube" },
];

const SERVICES: {
  id: string;
  name: string;
  desc: string;
  days: number;
  price: number;
  truckType: string;
  icon: LucideIcon;
}[] = [
  { id: "express-plus", name: "Talaria Express Plus", desc: "Next-day delivery by 8:00 A.M.", days: 1, price: 89.95, truckType: "Box Truck", icon: Rocket },
  { id: "express", name: "Talaria Express", desc: "Next-day delivery by 10:30 A.M.", days: 1, price: 64.5, truckType: "Box Truck", icon: Zap },
  { id: "express-saver", name: "Talaria Express Saver", desc: "Next-day delivery by end of day", days: 1, price: 42.8, truckType: "Box Truck", icon: Timer },
  { id: "ground", name: "Talaria Ground", desc: "1–5 business days, standard delivery", days: 4, price: 19.25, truckType: "Dry Van", icon: Truck },
  { id: "heavy", name: "Heavy & Oversized", desc: "Flatbed hauling for oversized freight", days: 5, price: 149.0, truckType: "Flatbed", icon: Layers },
  { id: "reefer", name: "Reefer / Cold Chain", desc: "Temperature-controlled transport", days: 2, price: 112.0, truckType: "Reefer", icon: Snowflake },
];

const PAYMENT_METHODS = [
  { id: "card", name: "Credit / Debit Card", desc: "Visa, Mastercard, Amex, Discover", icon: CreditCard },
  { id: "paypal", name: "PayPal", desc: "Pay with your PayPal balance or linked card", icon: Wallet },
  { id: "stripe", name: "Stripe", desc: "Cards and payment links via Stripe", icon: Landmark },
  { id: "account", name: "Invoice to Account", desc: "Bill this shipment to your account", icon: Receipt },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddressForm {
  state: string;
  city: string;
  fullName: string;
  contactName: string;
  email: string;
  phone: string;
  street: string;
}

const emptyAddress = (): AddressForm => ({
  state: "California",
  city: "",
  fullName: "",
  contactName: "",
  email: "",
  phone: "",
  street: "",
});

const generateAWB = () => `AWB${Math.floor(10000 + Math.random() * 90000)}`;

// Live cutoff (local time) after which a shipment picks up on the next day.
const DAILY_CUTOFF_HOUR = 17; // 5:00 PM local

// Business-day logic used by ground services (skip weekends).
const isWeekend = (d: Date) => {
  const day = d.getDay();
  return day === 0 || day === 6;
};

const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addBusinessDays = (d: Date, count: number) => {
  const out = new Date(d);
  let added = 0;
  while (added < count) {
    out.setDate(out.getDate() + 1);
    if (!isWeekend(out)) added++;
  }
  return out;
};

// Next business day from the given date component (skips weekends; holidays
// could be added to a list if desired).
const nextBusinessDay = (d: Date) => {
  const out = new Date(d);
  out.setDate(out.getDate() + 1);
  while (isWeekend(out)) out.setDate(out.getDate() + 1);
  return out;
};

// Default ship date: today, or the next business day if past the daily cutoff.
function defaultShipDate(): string {
  const now = new Date();
  const cand = new Date(now);
  if (now.getHours() >= DAILY_CUTOFF_HOUR) {
    return toDateInput(nextBusinessDay(cand));
  }
  return toDateInput(cand);
}

const fieldInput = (hasError: boolean) =>
  `w-full rounded-lg border px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 ${
    hasError
      ? "border-red-500/70 bg-white focus:border-red-500"
      : "border-neutral-300 bg-white focus:border-neutral-900"
  }`;

const selectableCard = (active: boolean) =>
  `flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
    active
      ? "border-neutral-900 bg-neutral-900 text-white"
      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
  }`;

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const formatCard = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-0.5 text-xs font-medium text-neutral-500">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CheckboxField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-neutral-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-neutral-300 bg-white accent-neutral-900"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

function SectionCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-700">
          <Icon size={16} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          {hint && <p className="text-xs text-neutral-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

interface AddressSuggestion {
  street: string;
  city: string;
  state: string;
  label: string;
  kind: "city" | "address";
}

const CITIES_BY_STATE: Record<string, string[]> = {
  Alabama: ["Birmingham", "Montgomery", "Huntsville"],
  Alaska: ["Anchorage", "Fairbanks", "Juneau"],
  Arizona: ["Phoenix", "Tucson", "Mesa"],
  Arkansas: ["Little Rock", "Fayetteville", "Fort Smith"],
  California: ["Los Angeles", "San Francisco", "San Diego"],
  Colorado: ["Denver", "Colorado Springs", "Boulder"],
  Connecticut: ["Hartford", "New Haven", "Stamford"],
  Delaware: ["Wilmington", "Dover", "Newark"],
  "District of Columbia": ["Washington"],
  Florida: ["Miami", "Orlando", "Tampa"],
  Georgia: ["Atlanta", "Savannah", "Augusta"],
  Hawaii: ["Honolulu", "Hilo", "Kahului"],
  Idaho: ["Boise", "Coeur d'Alene", "Idaho Falls"],
  Illinois: ["Chicago", "Springfield", "Rockford"],
  Indiana: ["Indianapolis", "Fort Wayne", "Evansville"],
  Iowa: ["Des Moines", "Cedar Rapids", "Davenport"],
  Kansas: ["Wichita", "Kansas City", "Topeka"],
  Kentucky: ["Louisville", "Lexington", "Bowling Green"],
  Louisiana: ["New Orleans", "Baton Rouge", "Shreveport"],
  Maine: ["Portland", "Bangor", "Lewiston"],
  Maryland: ["Baltimore", "Annapolis", "Rockville"],
  Massachusetts: ["Boston", "Worcester", "Springfield"],
  Michigan: ["Detroit", "Grand Rapids", "Lansing"],
  Minnesota: ["Minneapolis", "St. Paul", "Duluth"],
  Mississippi: ["Jackson", "Gulfport", "Hattiesburg"],
  Missouri: ["St. Louis", "Kansas City", "Springfield"],
  Montana: ["Billings", "Missoula", "Great Falls"],
  Nebraska: ["Omaha", "Lincoln", "Grand Island"],
  Nevada: ["Las Vegas", "Reno", "Henderson"],
  "New Hampshire": ["Manchester", "Nashua", "Concord"],
  "New Jersey": ["Newark", "Jersey City", "Trenton"],
  "New Mexico": ["Albuquerque", "Santa Fe", "Las Cruces"],
  "New York": ["New York", "Buffalo", "Rochester"],
  "North Carolina": ["Charlotte", "Raleigh", "Greensboro"],
  "North Dakota": ["Fargo", "Bismarck", "Grand Forks"],
  Ohio: ["Columbus", "Cleveland", "Cincinnati"],
  Oklahoma: ["Oklahoma City", "Tulsa", "Norman"],
  Oregon: ["Portland", "Eugene", "Salem"],
  Pennsylvania: ["Philadelphia", "Pittsburgh", "Harrisburg"],
  "Rhode Island": ["Providence", "Warwick", "Cranston"],
  "South Carolina": ["Charleston", "Columbia", "Greenville"],
  "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen"],
  Tennessee: ["Nashville", "Memphis", "Knoxville"],
  Texas: ["Houston", "Dallas", "Austin"],
  Utah: ["Salt Lake City", "Provo", "Ogden"],
  Vermont: ["Burlington", "Montpelier", "Rutland"],
  Virginia: ["Virginia Beach", "Richmond", "Arlington"],
  Washington: ["Seattle", "Spokane", "Tacoma"],
  "West Virginia": ["Charleston", "Huntington", "Morgantown"],
  Wisconsin: ["Milwaukee", "Madison", "Green Bay"],
  Wyoming: ["Cheyenne", "Casper", "Laramie"],
};

function CityField({
  value,
  onChange,
  onSelect,
  state,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  state: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [matches, setMatches] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const q = value.trim();

  useEffect(() => {
    setHighlight(0);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const curated = (CITIES_BY_STATE[state] ?? []).map<AddressSuggestion>(
      (c) => ({
        street: `${c}, ${state}`,
        city: c,
        state,
        label: `${c}, ${state}`,
        kind: "city" as const,
      })
    );

    const ctrl = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const url = new URL(
          "https://api.geoapify.com/v1/geocode/autocomplete"
        );
        url.searchParams.set("text", q ? `${q}, ${state}` : state);
        url.searchParams.set("apiKey", import.meta.env.VITE_GEOAPIFY_KEY);
        url.searchParams.set("limit", "8");
        url.searchParams.set("type", "city");
        url.searchParams.set("filter", "countrycode:us");

        const res = await fetch(url.toString(), { signal: ctrl.signal });
        const data = await res.json();
        const stateLower = state.toLowerCase();
        const live: AddressSuggestion[] = (Array.isArray(data.features)
          ? (data.features as any[])
          : [])
          .map((f) => {
            const p = f.properties ?? {};
            return {
              street: `${p.city || p.name || ""}, ${p.state || state}`,
              city: p.city || p.name || "",
              state: p.state || state,
              label: p.city || p.name || p.formatted || p.address_line2 || "",
              kind: "city" as const,
            };
          })
          .filter(
            (s) => s.city && (!state || s.state.toLowerCase() === stateLower)
          );
        const seen = new Set(curated.map((s) => s.city.toLowerCase()));
        const merged = [
          ...curated,
          ...live.filter((s) => {
            const k = s.city.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }),
        ];
        setMatches(merged.length ? merged : curated);
      } catch {
        if (!ctrl.signal.aborted) setMatches(curated);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, q.length === 0 ? 200 : 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, state]);

  const pick = (s: AddressSuggestion) => {
    onChange(s.city);
    onSelect(s);
    setOpen(false);
  };

  return (
    <Field label="City / Town" required error={error}>
      <div ref={rootRef} className="relative">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              if (matches.length > 0)
                setHighlight((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              if (matches.length > 0)
                setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              if (open && matches[highlight]) {
                e.preventDefault();
                pick(matches[highlight]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search cities, e.g. Des Moines"
          className={`${fieldInput(!!error)} pr-10`}
        />
        <button
          type="button"
          aria-expanded={open}
          aria-label="Toggle city suggestions"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {loading && matches.length === 0 && (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500">
                <Loader2 size={14} className="animate-spin" /> Searching…
              </li>
            )}
            {!loading && matches.length === 0 && q.length >= 3 && (
              <li className="px-3 py-2 text-sm text-neutral-500">
                No cities found
              </li>
            )}
            {matches.map((s, i) => (
              <li key={s.street + s.label}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`block w-full px-3 py-2 text-left ${
                    i === highlight ? "bg-neutral-100" : "bg-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-neutral-800">
                      {s.city}
                    </span>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      City
                    </span>
                  </span>
                  <span className="block text-xs text-neutral-500">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

function StreetAddressField({
  value,
  onChange,
  onSelect,
  state,
  city,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  state: string;
  city: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [matches, setMatches] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const q = value.trim();

  useEffect(() => {
    setHighlight(0);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (q.length < 2) {
      setMatches([]);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const url = new URL(
          "https://api.geoapify.com/v1/geocode/autocomplete"
        );
        const parts = [q];
        if (city.trim()) parts.push(city.trim());
        if (state) parts.push(state);
        url.searchParams.set("text", parts.filter(Boolean).join(", "));
        url.searchParams.set("apiKey", import.meta.env.VITE_GEOAPIFY_KEY);
        url.searchParams.set("limit", "10");
        url.searchParams.set("filter", "countrycode:us");

        const res = await fetch(url.toString(), { signal: ctrl.signal });
        const data = await res.json();
        const stateLower = state.toLowerCase();
        const rawFeatures = Array.isArray(data.features)
          ? (data.features as any[])
          : Array.isArray(data.results)
            ? (data.results as any[]).map((r) => ({ properties: r }))
            : [];
        setMatches(
          rawFeatures
            .map((f) => {
              const p = f.properties ?? {};
              const sub: string =
                [p.city || "", p.postcode || "", p.state || "", p.country || ""]
                  .filter(Boolean)
                  .join(", ") ||
                p.address_line2 ||
                p.formatted ||
                "";
              return {
                street: p.address_line1 || p.street || p.name || "",
                city: p.city || city,
                state: p.state || state,
                label: sub,
                kind: "address" as const,
              };
            })
            .filter(
              (s) =>
                s.street &&
                s.label &&
                (!state || s.state.toLowerCase() === stateLower)
            )
        );
      } catch {
        if (!ctrl.signal.aborted) setMatches([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, city, state]);

  const pick = (s: AddressSuggestion) => {
    onSelect(s);
    setOpen(false);
  };

  return (
    <Field label="Street address" required error={error}>
      <div ref={rootRef} className="relative">
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              if (matches.length > 0)
                setHighlight((h) => Math.min(h + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              if (matches.length > 0)
                setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              if (open && matches[highlight]) {
                e.preventDefault();
                pick(matches[highlight]);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Type to search, e.g. 1234 Main St"
          className={`${fieldInput(!!error)} pr-10`}
        />
        <button
          type="button"
          aria-expanded={open}
          aria-label="Toggle address suggestions"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            {loading && matches.length === 0 && (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500">
                <Loader2 size={14} className="animate-spin" /> Searching…
              </li>
            )}
            {!loading && matches.length === 0 && q.length >= 2 && (
              <li className="px-3 py-2 text-sm text-neutral-500">
                No addresses found
              </li>
            )}
            {!loading && matches.length === 0 && q.length < 2 && city.trim() && (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500">
                <MapPin size={14} className="shrink-0" />
                <span>
                  Type a street address in <strong>{city}</strong>
                  {state ? `, ${state}` : ""}
                </span>
              </li>
            )}
            {matches.map((s, i) => (
              <li key={s.street + s.label}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`block w-full px-3 py-2 text-left ${
                    i === highlight ? "bg-neutral-100" : "bg-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-neutral-800">
                      {s.street}
                    </span>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      Address
                    </span>
                  </span>
                  <span className="block text-xs text-neutral-500">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

function AddressFields({
  icon,
  title,
  data,
  update,
  errors,
  prefix,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  data: AddressForm;
  update: (key: keyof AddressForm, value: string) => void;
  errors: Record<string, string>;
  prefix: "from" | "to";
  footer?: React.ReactNode;
}) {
  const err = (k: string) => errors[`${prefix}.${k}`];
  return (
    <SectionCard icon={icon} title={title}>
      <div className="space-y-4">
        <Field label="State" error={err("state")}>
          <select
            value={data.state}
            onChange={(e) => update("state", e.target.value)}
            className={fieldInput(!!err("state"))}
          >
            {US_STATES.map((s) => (
              <option key={s} value={s} className="bg-white text-neutral-900">
                {s}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name or company" required error={err("fullName")}>
            <input
              value={data.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="e.g. Acme Logistics Inc."
              className={fieldInput(!!err("fullName"))}
            />
          </Field>
          <Field label="Contact name" error={err("contactName")}>
            <input
              value={data.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              placeholder="e.g. Jane Doe"
              className={fieldInput(!!err("contactName"))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required error={err("email")}>
            <input
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@company.com"
              className={fieldInput(!!err("email"))}
            />
          </Field>
          <Field label="Phone" error={err("phone")}>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+1 555 000 0000"
              className={fieldInput(!!err("phone"))}
            />
          </Field>
        </div>

        <CityField
          value={data.city}
          onChange={(v) => update("city", v)}
          onSelect={(s) => update("street", s.street)}
          state={data.state}
          error={err("city")}
        />

        <StreetAddressField
          value={data.street}
          onChange={(v) => update("street", v)}
          onSelect={(s) => {
            update("street", s.street);
            update("city", s.city || "");
            update("state", s.state);
          }}
          state={data.state}
          city={data.city}
          error={err("street")}
        />

        {footer && <div className="space-y-2.5">{footer}</div>}
      </div>
    </SectionCard>
  );
}

function StepIndicator({
  step,
  onSelect,
}: {
  step: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ol className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        const circleCls = active
          ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_0_0_4px_rgba(23,23,23,0.1)]"
          : done
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-300 bg-white text-neutral-500";
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-center last:flex-none">
            <button
              type="button"
              onClick={() => done && onSelect(i)}
              className={`flex min-w-0 items-center gap-2.5 ${done ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${circleCls}`}>
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`hidden truncate text-xs font-medium md:block ${
                  active || done ? "text-neutral-900" : "text-neutral-500"
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={`mx-3 h-px flex-1 ${done ? "bg-neutral-900" : "bg-neutral-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</h4>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="break-words text-right text-xs font-medium text-neutral-900">{value ?? "—"}</dd>
    </div>
  );
}

function Tri({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="truncate text-right text-xs font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

export default function CreateShipment() {
  const navigate = useNavigate();

  const [trackingId, setTrackingId] = useState(generateAWB());
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [shipFrom, setShipFrom] = useState<AddressForm>(emptyAddress());
  const [shipTo, setShipTo] = useState<AddressForm>(emptyAddress());
  const [originMode, setOriginMode] = useState<OriginMode>("warehouse");
  const [warehouseId, setWarehouseId] = useState(WAREHOUSES[0].id);
  const [truckType, setTruckType] = useState("Dry Van");
  const [emailStatus, setEmailStatus] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [residential, setResidential] = useState(false);

  const [packaging, setPackaging] = useState<"standard" | "carrier">("standard");
  const [unpackaged, setUnpackaged] = useState(false);
  const [parcel, setParcel] = useState<Record<ParcelKey, string>>({
    weight: "",
    length: "",
    width: "",
    height: "",
  });

  const [serviceId, setServiceId] = useState("");
  const [shipDate, setShipDate] = useState(defaultShipDate());

  const [reference, setReference] = useState("");
  const [instructions, setInstructions] = useState("");
  const [insurance, setInsurance] = useState(false);
  const [declaredValue, setDeclaredValue] = useState("");
  const [signatureRequired, setSignatureRequired] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvc: "" });

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [created, setCreated] = useState<string | null>(null);

  const selectedService = SERVICES.find((s) => s.id === serviceId);
  const insuranceFee = insurance
    ? Math.max(2.5, (parseFloat(declaredValue) || 0) * 0.01)
    : 0;
  const total = (selectedService?.price ?? 0) + insuranceFee;
  // Earliest selectable ship date: today, or the next business day past cutoff.
  const minDate = defaultShipDate();

  const selectedWarehouse =
    WAREHOUSES.find((w) => w.id === warehouseId) ?? WAREHOUSES[0];
  const warehousesOrigin = () => ({
    street: selectedWarehouse.street,
    city: selectedWarehouse.city,
    state: selectedWarehouse.state,
  });
  const originLabel =
    originMode === "warehouse"
      ? `${selectedWarehouse.name} · ${selectedWarehouse.city}`
      : shipFrom.street;

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const updateFrom = (key: keyof AddressForm, value: string) => {
    setShipFrom((p) => ({ ...p, [key]: value }));
    clearError(`from.${key}`);
  };

  const updateTo = (key: keyof AddressForm, value: string) => {
    setShipTo((p) => ({ ...p, [key]: value }));
    clearError(`to.${key}`);
  };

  const setParcelField = (key: ParcelKey, value: string) => {
    setParcel((p) => ({ ...p, [key]: value }));
    clearError(`parcel.${key}`);
  };

  // Estimated delivery date. Ground-style services skip weekends/holidays.
  const calculateEstimatedDelivery = (
    shipDateStr: string,
    transitDays: number,
    ground = false
  ) => {
    const base = shipDateStr ? new Date(`${shipDateStr}T00:00:00`) : new Date();
    if (Number.isNaN(base.getTime())) return { date: base, label: "—" };
    let d = ground ? addBusinessDays(base, transitDays) : new Date(base);
    if (!ground) d.setDate(d.getDate() + transitDays);
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return { date: d, label };
  };

  const deliveryDate = (days: number, ground = false) =>
    calculateEstimatedDelivery(shipDate, days, ground).label;

  const isGroundService = (id: string) => id === "ground" || id === "heavy";

  const paymentLabel = () => {
    if (paymentMethod === "card")
      return `Card •••• ${card.number.replace(/\D/g, "").slice(-4) || "—"}`;
    if (paymentMethod === "paypal") return "PayPal (demo)";
    if (paymentMethod === "stripe") return "Stripe (demo)";
    return "Invoice to account";
  };

  function validateStep1() {
    const e: Record<string, string> = {};
    if (originMode === "custom") {
      if (!shipFrom.fullName.trim()) e["from.fullName"] = "Full name or company is required";
      if (!shipFrom.state) e["from.state"] = "Select a state";
      if (!shipFrom.street.trim()) e["from.street"] = "Street address is required";
      if (!shipFrom.email.trim()) e["from.email"] = "Email is required";
      else if (!EMAIL_RE.test(shipFrom.email)) e["from.email"] = "Enter a valid email address";
    }

    if (!shipTo.fullName.trim()) e["to.fullName"] = "Full name or company is required";
    if (!shipTo.state) e["to.state"] = "Select a state";
    if (!shipTo.street.trim()) e["to.street"] = "Street address is required";
    if (notifyEmail) {
      if (!shipTo.email.trim()) e["to.email"] = "Email is required for notifications";
      else if (!EMAIL_RE.test(shipTo.email)) e["to.email"] = "Enter a valid email address";
    }

    for (const f of DIM_FIELDS) {
      const v = parcel[f.key].trim();
      if (!v) e[`parcel.${f.key}`] = `${f.label} is required`;
      else if (!/^\d+(\.\d+)?$/.test(v) || Number(v) <= 0)
        e[`parcel.${f.key}`] = `Enter a valid ${f.label.toLowerCase()} greater than 0`;
    }
    return e;
  }

  function validateStep3() {
    const e: Record<string, string> = {};
    if (insurance) {
      const v = declaredValue.trim();
      if (!v) e["declaredValue"] = "Declared value is required when insured";
      else if (!/^\d+(\.\d+)?$/.test(v) || Number(v) <= 0)
        e["declaredValue"] = "Enter a valid declared value";
    }
    return e;
  }

  function validateStep4() {
    const e: Record<string, string> = {};
    if (paymentMethod === "card") {
      const num = card.number.replace(/\s/g, "");
      if (!num) e["card.number"] = "Card number is required";
      else if (!/^\d{13,19}$/.test(num)) e["card.number"] = "Enter a valid card number";
      if (!card.name.trim()) e["card.name"] = "Name on card is required";
      if (!card.expiry.trim()) e["card.expiry"] = "Expiry is required";
      else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) e["card.expiry"] = "Use MM/YY format";
      if (!card.cvc.trim()) e["card.cvc"] = "CVC is required";
      else if (!/^\d{3,4}$/.test(card.cvc)) e["card.cvc"] = "CVC must be 3–4 digits";
    }
    return e;
  }

  function handleNext() {
    let nextErrors: Record<string, string> = {};
    if (step === 0) nextErrors = validateStep1();
    else if (step === 1 && !serviceId)
      nextErrors = { service: "Select a delivery service to continue." };
    else if (step === 2) nextErrors = validateStep3();
    else if (step === 3) nextErrors = validateStep4();

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    if (step === 0) return;
    setStep((s) => s - 1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!selectedService) return;
    setLoading(true);
    setSubmitError("");
    try {
      const base = shipDate ? new Date(`${shipDate}T00:00:00`) : new Date();
      const eta = new Date(base);
      eta.setDate(eta.getDate() + selectedService.days);

      const origin =
        originMode === "warehouse"
          ? `${warehousesOrigin().street}, ${warehousesOrigin().city}, ${warehousesOrigin().state}`
          : [shipFrom.street, shipFrom.city, shipFrom.state]
              .filter(Boolean)
              .join(", ");

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingId,
          origin,
          destination: [shipTo.street, shipTo.city, shipTo.state]
            .filter(Boolean)
            .join(", "),
          expectedDelivery: eta.toISOString(),
          truckType: truckType,
          originMode: originMode,
        }),
      });
      if (!res.ok) throw new Error(`Failed to create shipment (${res.status})`);
      await res.json();
      setCreated(trackingId);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong creating the shipment.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTrackingId(generateAWB());
    setStep(0);
    setErrors({});
    setShipFrom(emptyAddress());
    setShipTo(emptyAddress());
    setOriginMode("warehouse");
    setWarehouseId(WAREHOUSES[0].id);
    setTruckType("Dry Van");
    setEmailStatus(true);
    setNotifyEmail(false);
    setResidential(false);
    setPackaging("standard");
    setUnpackaged(false);
    setParcel({ weight: "", length: "", width: "", height: "" });
    setServiceId("");
    setShipDate("");
    setReference("");
    setInstructions("");
    setInsurance(false);
    setDeclaredValue("");
    setSignatureRequired(false);
    setPaymentMethod("card");
    setCard({ number: "", name: "", expiry: "", cvc: "" });
    setSubmitError("");
    setCreated(null);
    window.scrollTo({ top: 0 });
  }

  if (created) {
    return (
      <div className="min-h-screen bg-white px-5 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-white">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-neutral-900">Shipment created</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Your parcel has been booked. Here's your tracking reference:
          </p>
          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-neutral-500">Tracking ID</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">{created}</p>
            <p className="mt-1 truncate text-xs text-neutral-500">
              {originLabel} → {shipTo.street}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate("/orders")}
              className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
            >
              View my shipments
            </button>
            <button
              onClick={resetForm}
              className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-900"
            >
              Create another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-5 py-8 text-neutral-900 lg:py-12 ">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            New shipment · {trackingId}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Create a Shipment
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-neutral-500">
            Tell us where your parcel is going, how fast it needs to get there, and how you'd like to pay.
          </p>
        </div>

        {/* ── Step bar ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 sm:px-6">
          <StepIndicator
            step={step}
            onSelect={(i) => {
              if (i < step) {
                setStep(i);
                setErrors({});
              }
            }}
          />
        </div>

        <form
  noValidate
  onSubmit={(e) => e.preventDefault()}
  className="mx-auto mt-8 w-full"
>
  <div
    className={
      step >= 1
        ? "grid items-start gap-6 lg:grid-cols-[1fr_300px]"
        : "w-full"
    }
  >
            <div className="w-full space-y-10">
              {/* ── Step 1 · Shipping Details ─────────────────────────────── */}
              {step === 0 && (
                <>
                  <SectionCard icon={Home} title="Ship From" hint="Choose a Talaria facility or a custom pickup location">
                    {/* Origin mode toggle */}
                    <div role="radiogroup" aria-label="Ship from mode" className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={originMode === "warehouse"}
                        onClick={() => setOriginMode("warehouse")}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          originMode === "warehouse"
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            originMode === "warehouse"
                              ? "border-neutral-700 bg-white/10 text-white"
                              : "border-neutral-200 bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          <Warehouse size={15} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">Saved Warehouse</span>
                          <span className={`mt-0.5 block text-xs ${originMode === "warehouse" ? "text-neutral-300" : "text-neutral-500"}`}>
                            Ship from a company facility
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={originMode === "custom"}
                        onClick={() => setOriginMode("custom")}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          originMode === "custom"
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            originMode === "custom"
                              ? "border-neutral-700 bg-white/10 text-white"
                              : "border-neutral-200 bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          <MapPin size={15} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">Custom Pickup</span>
                          <span className={`mt-0.5 block text-xs ${originMode === "custom" ? "text-neutral-300" : "text-neutral-500"}`}>
                            Enter a pickup address manually
                          </span>
                        </span>
                      </button>
                    </div>

                    {originMode === "warehouse" ? (
                      <div className="mt-5">
                        <div className="mb-4 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700">
                            <Warehouse size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-neutral-900">
                              {warehousesOrigin().street}, {warehousesOrigin().city}, {warehousesOrigin().state}
                            </p>
                            <p className="text-xs text-neutral-500">Pickup at this Talaria facility</p>
                          </div>
                          <Warehouse size={18} className="ml-auto shrink-0 text-neutral-300" />
                        </div>
                        <Field label="Select warehouse / facility">
                          <select
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                            className={fieldInput(false)}
                          >
                            {WAREHOUSES.map((w) => (
                              <option key={w.id} value={w.id} className="bg-white text-neutral-900">
                                {w.name} — {w.city}, {w.state}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <div className="mt-4">
                          <CheckboxField
                            checked={emailStatus}
                            onChange={setEmailStatus}
                            label="Send me an email whenever my parcel status changes"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <AddressFields
                          icon={MapPin}
                          title="Custom Pickup Details"
                          data={shipFrom}
                          update={updateFrom}
                          errors={errors}
                          prefix="from"
                          footer={
                            <CheckboxField
                              checked={emailStatus}
                              onChange={setEmailStatus}
                              label="Send me an email whenever my parcel status changes"
                            />
                          }
                        />
                      </div>
                    )}
                  </SectionCard>

                  <AddressFields
                    icon={MapPin}
                    title="Ship To"
                    data={shipTo}
                    update={updateTo}
                    errors={errors}
                    prefix="to"
                    footer={
                      <>
                        <CheckboxField
                          checked={notifyEmail}
                          onChange={setNotifyEmail}
                          label="Send shipping notifications to this email"
                        />
                        <CheckboxField
                          checked={residential}
                          onChange={setResidential}
                          label="This is a residential address"
                        />
                      </>
                    }
                  />

                  <SectionCard icon={Package} title="Packaging" hint="Tell us what's inside and how it's packed">
                    <div role="radiogroup" aria-label="Packaging type" className="grid gap-3 sm:grid-cols-2">
                      {PACKAGING_OPTIONS.map((p) => {
                        const active = packaging === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setPackaging(p.id as "standard" | "carrier")}
                            className={selectableCard(active)}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                active ? "border-white" : "border-neutral-400"
                              }`}
                            >
                              {active && <span className="h-2 w-2 rounded-full bg-white" />}
                            </span>
                            <span>
                              <span className="block text-sm font-semibold">{p.name}</span>
                              <span className={`mt-0.5 block text-xs ${active ? "text-neutral-300" : "text-neutral-500"}`}>
                                {p.desc}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <CheckboxField
                        checked={unpackaged}
                        onChange={setUnpackaged}
                        label="My shipment is unpackaged or crated"
                      />
                    </div>

                    <div className="mt-5">
                      <p className="mb-1.5 text-xs font-medium text-neutral-500">
                        Parcel dimensions <span className="text-neutral-400">— weight and physical size</span>
                      </p>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {DIM_FIELDS.map((f) => (
                          <Field
                            key={f.key}
                            label={`${f.label} (${f.unit})`}
                            required
                            error={errors[`parcel.${f.key}`]}
                          >
                            <input
                              inputMode="decimal"
                              value={parcel[f.key]}
                              onChange={(e) => setParcelField(f.key, e.target.value)}
                              placeholder="0"
                              className={fieldInput(!!errors[`parcel.${f.key}`])}
                            />
                          </Field>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="mb-1.5 text-xs font-medium text-neutral-500">
                        Truck type <span className="text-neutral-400">— trailer used for this shipment</span>
                      </p>
                      <div role="radiogroup" aria-label="Truck type" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {TRUCK_TYPES.map((tt) => {
                          const active = truckType === tt.id;
                          const Icon = tt.icon;
                          return (
                            <button
                              key={tt.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => setTruckType(tt.id)}
                              className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                                active
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                  active
                                    ? "border-neutral-700 bg-white/10 text-white"
                                    : "border-neutral-200 bg-neutral-50 text-neutral-500"
                                }`}
                              >
                                <Icon size={15} />
                              </span>
                              <span>
                                <span className="block text-sm font-semibold">{tt.name}</span>
                                <span className={`mt-0.5 block text-xs ${active ? "text-neutral-300" : "text-neutral-500"}`}>
                                  {tt.desc}
                                </span>
                              </span>
                              <span
                                className={`ml-auto mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                  active ? "border-white" : "border-neutral-300"
                                }`}
                              >
                                {active && <span className="h-2 w-2 rounded-full bg-white" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ── Step 2 · Service Selection ────────────────────────────── */}
              {step === 1 && (
                <>
                  <SectionCard
                    icon={Truck}
                    title="Service Selection"
                    hint="Choose a delivery speed and transit time"
                  >
                    <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
                      <Field label="Ship date">
                        <input
                          type="date"
                          min={minDate}
                          value={shipDate}
                          onChange={(e) => setShipDate(e.target.value)}
                          className={fieldInput(false)}
                        />
                      </Field>
                      <div className="flex items-end gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-500">
                        <CalendarDays size={16} className="shrink-0" />
                        Estimated delivery:{" "}
                        <span className="font-semibold text-neutral-900">
                          {selectedService ? deliveryDate(selectedService.days, isGroundService(selectedService.id)) : "—"}
                        </span>
                      </div>
                    </div>

                    <div role="radiogroup" aria-label="Delivery service" className="mt-5 grid gap-3 sm:grid-cols-2">
                      {SERVICES.map((svc) => {
                        const active = serviceId === svc.id;
                        const Icon = svc.icon;
                        return (
                          <button
                            key={svc.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => {
                              setServiceId(svc.id);
                              clearError("service");
                            }}
                            className={selectableCard(active)}
                          >
                            <span
                              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                active
                                  ? "border-neutral-700 bg-white/10 text-white"
                                  : "border-neutral-200 bg-neutral-50 text-neutral-500"
                              }`}
                            >
                              <Icon size={15} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold">{svc.name}</span>
                                <span className={`text-sm font-semibold ${active ? "text-white" : "text-neutral-900"}`}>
                                  {money(svc.price)}
                                </span>
                              </span>
                              <span className={`mt-0.5 block text-xs ${active ? "text-neutral-300" : "text-neutral-500"}`}>
                                {svc.desc}
                              </span>
                              <span className={`mt-1 block text-xs ${active ? "text-neutral-300" : "text-neutral-400"}`}>
                                Est. delivery {deliveryDate(svc.days, isGroundService(svc.id))} · {svc.truckType}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.service && <p className="mt-2 text-xs text-red-500">{errors.service}</p>}
                  </SectionCard>
                  <p className="text-xs text-neutral-500">
                    Rates reflect domestic U.S. ground and air services. Insurance, fuel and residential
                    surcharges are applied at checkout.
                  </p>
                </>
              )}

              {/* ── Step 3 · Additional Details ───────────────────────────── */}
              {step === 2 && (
                <>
                  <SectionCard
                    icon={FileText}
                    title="Additional Details"
                    hint="Optional references and delivery preferences"
                  >
                    <Field label="Reference number" error={errors.reference}>
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="PO, order or internal reference (optional)"
                        className={fieldInput(!!errors.reference)}
                      />
                    </Field>
                    <div className="mt-4">
                      <Field label="Special delivery instructions" error={errors.instructions}>
                        <textarea
                          rows={4}
                          maxLength={300}
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder="e.g. Leave with the concierge. Call 30 minutes before delivery."
                          className={`${fieldInput(!!errors.instructions)} resize-none`}
                        />
                      </Field>
                      <p className="mt-1 text-right text-xs text-neutral-400">{instructions.length}/300</p>
                    </div>
                  </SectionCard>

                  <SectionCard icon={ShieldCheck} title="Protection & Options">
                    <CheckboxField
                      checked={insurance}
                      onChange={setInsurance}
                      label="Shipment insurance (protects the declared value)"
                    />
                    {insurance && (
                      <div className="mt-4 max-w-xs">
                        <Field label="Declared value ($)" required error={errors.declaredValue}>
                          <input
                            inputMode="decimal"
                            value={declaredValue}
                            onChange={(e) => {
                              setDeclaredValue(e.target.value);
                              clearError("declaredValue");
                            }}
                            placeholder="e.g. 1500"
                            className={fieldInput(!!errors.declaredValue)}
                          />
                        </Field>
                      </div>
                    )}
                    <div className="mt-4">
                      <CheckboxField
                        checked={signatureRequired}
                        onChange={setSignatureRequired}
                        label="Adult signature required on delivery"
                      />
                    </div>
                  </SectionCard>
                </>
              )}

              {/* ── Step 4 · Payment ──────────────────────────────────────── */}
              {step === 3 && (
                <SectionCard
                  icon={CreditCard}
                  title="Payment"
                  hint="How would you like to pay for this shipment?"
                >
                  <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-2">
                    {PAYMENT_METHODS.map((m) => {
                      const active = paymentMethod === m.id;
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setPaymentMethod(m.id)}
                          className={selectableCard(active)}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              active ? "border-white" : "border-neutral-400"
                            }`}
                          >
                            {active && <span className="h-2 w-2 rounded-full bg-white" />}
                          </span>
                          <span>
                            <span className="flex items-center gap-2 text-sm font-semibold">
                              <Icon size={15} />
                              {m.name}
                            </span>
                            <span className={`mt-0.5 block text-xs ${active ? "text-neutral-300" : "text-neutral-500"}`}>
                              {m.desc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === "card" && (
                    <div className="mt-6 space-y-4">
                      <Field label="Card number" required error={errors["card.number"]}>
                        <input
                          inputMode="numeric"
                          value={card.number}
                          onChange={(e) => {
                            setCard((c) => ({ ...c, number: formatCard(e.target.value) }));
                            clearError("card.number");
                          }}
                          placeholder="1234 5678 9012 3456"
                          className={fieldInput(!!errors["card.number"])}
                        />
                      </Field>
                      <Field label="Name on card" required error={errors["card.name"]}>
                        <input
                          value={card.name}
                          onChange={(e) => {
                            setCard((c) => ({ ...c, name: e.target.value }));
                            clearError("card.name");
                          }}
                          placeholder="JANE DOE"
                          className={fieldInput(!!errors["card.name"])}
                        />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Expiry (MM/YY)" required error={errors["card.expiry"]}>
                          <input
                            inputMode="numeric"
                            value={card.expiry}
                            onChange={(e) => {
                              setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }));
                              clearError("card.expiry");
                            }}
                            placeholder="09/28"
                            className={fieldInput(!!errors["card.expiry"])}
                          />
                        </Field>
                        <Field label="CVC" required error={errors["card.cvc"]}>
                          <input
                            inputMode="numeric"
                            type="password"
                            value={card.cvc}
                            onChange={(e) => {
                              setCard((c) => ({
                                ...c,
                                cvc: e.target.value.replace(/\D/g, "").slice(0, 4),
                              }));
                              clearError("card.cvc");
                            }}
                            placeholder="123"
                            className={fieldInput(!!errors["card.cvc"])}
                          />
                        </Field>
                      </div>
                      <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
                        Payments are processed securely. Your card is charged when the shipment is created.
                      </p>
                    </div>
                  )}

                  {paymentMethod === "paypal" && (
                    <div className="mt-6 flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
                      <Wallet size={16} className="mt-0.5 shrink-0" />
                      <span>
                        You'll be redirected to <span className="font-semibold text-neutral-900">PayPal</span> to
                        complete payment. <span className="text-neutral-400">Demo mode — no real charge is made and
                        no account is required.</span>
                      </span>
                    </div>
                  )}

                  {paymentMethod === "stripe" && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
                        <Landmark size={16} className="mt-0.5 shrink-0" />
                        <span>
                          Secured by <span className="font-semibold text-neutral-900">Stripe</span>.{" "}
                          <span className="text-neutral-400">Demo mode — try test card 4242 4242 4242 4242 with any
                          future expiry and CVC.</span>
                        </span>
                      </div>
                      <Field label="Card number" required error={errors["card.number"]}>
                        <input
                          inputMode="numeric"
                          value={card.number}
                          onChange={(e) => {
                            setCard((c) => ({ ...c, number: formatCard(e.target.value) }));
                            clearError("card.number");
                          }}
                          placeholder="4242 4242 4242 4242"
                          className={fieldInput(!!errors["card.number"])}
                        />
                      </Field>
                      <Field label="Name on card" required error={errors["card.name"]}>
                        <input
                          value={card.name}
                          onChange={(e) => {
                            setCard((c) => ({ ...c, name: e.target.value }));
                            clearError("card.name");
                          }}
                          placeholder="JANE DOE"
                          className={fieldInput(!!errors["card.name"])}
                        />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Expiry (MM/YY)" required error={errors["card.expiry"]}>
                          <input
                            inputMode="numeric"
                            value={card.expiry}
                            onChange={(e) => {
                              setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }));
                              clearError("card.expiry");
                            }}
                            placeholder="09/28"
                            className={fieldInput(!!errors["card.expiry"])}
                          />
                        </Field>
                        <Field label="CVC" required error={errors["card.cvc"]}>
                          <input
                            inputMode="numeric"
                            type="password"
                            value={card.cvc}
                            onChange={(e) => {
                              setCard((c) => ({
                                ...c,
                                cvc: e.target.value.replace(/\D/g, "").slice(0, 4),
                              }));
                              clearError("card.cvc");
                            }}
                            placeholder="123"
                            className={fieldInput(!!errors["card.cvc"])}
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "account" && (
                    <div className="mt-6 flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
                      <Boxes size={16} className="mt-0.5 shrink-0" />
                      <span>
                        This shipment will be billed to your <span className="font-semibold text-neutral-900">Talaria Freight</span>{" "}
                        account. Charges appear on your next invoice.
                      </span>
                    </div>
                  )}
                </SectionCard>
              )}

              {/* ── Step 5 · Confirmation ─────────────────────────────────── */}
              {step === 4 && (
                <>
                  <SectionCard
                    icon={CheckCircle2}
                    title="Review & Confirm"
                    hint="Check every detail before we book your shipment"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <ReviewGroup title="Ship From">
                        {originMode === "warehouse" ? (
                          <>
                            <ReviewRow label="Source" value={selectedWarehouse.name} />
                            <ReviewRow
                              label="Facility address"
                              value={`${warehousesOrigin().street}, ${warehousesOrigin().city}, ${warehousesOrigin().state}`}
                            />
                          </>
                        ) : (
                          <>
                            <ReviewRow label="Full name / company" value={shipFrom.fullName} />
                            <ReviewRow label="Contact name" value={shipFrom.contactName} />
                            <ReviewRow label="Street address" value={shipFrom.street} />
                            <ReviewRow label="State" value={shipFrom.state} />
                            <ReviewRow label="Email" value={shipFrom.email} />
                            <ReviewRow label="Phone" value={shipFrom.phone} />
                          </>
                        )}
                        <ReviewRow label="Status alerts" value={emailStatus ? "On" : "Off"} />
                      </ReviewGroup>

                      <ReviewGroup title="Ship To">
                        <ReviewRow label="Full name / company" value={shipTo.fullName} />
                        <ReviewRow label="Contact name" value={shipTo.contactName} />
                        <ReviewRow label="Street address" value={shipTo.street} />
                        <ReviewRow label="City / Town" value={shipTo.city} />
                        <ReviewRow label="State" value={shipTo.state} />
                        <ReviewRow label="Email" value={shipTo.email} />
                        <ReviewRow label="Phone" value={shipTo.phone} />
                        <ReviewRow
                          label="Options"
                          value={[notifyEmail ? "Notifications" : null, residential ? "Residential" : null]
                            .filter(Boolean)
                            .join(", ") || "None"}
                        />
                      </ReviewGroup>

                      <ReviewGroup title="Package">
                        <ReviewRow
                          label="Packaging"
                          value={packaging === "carrier" ? "Talaria / Carrier Packaging" : "Standard Packaging"}
                        />
                        <ReviewRow label="Unpackaged / crated" value={unpackaged ? "Yes" : "No"} />
                        <ReviewRow label="Weight" value={parcel.weight ? `${parcel.weight} kg` : "—"} />
                        <ReviewRow
                          label="Dimensions"
                          value={
                            parcel.length && parcel.width && parcel.height
                              ? `${parcel.length} × ${parcel.width} × ${parcel.height} cm`
                              : "—"
                          }
                        />
                        <ReviewRow label="Truck type" value={truckType} />
                      </ReviewGroup>

                      <ReviewGroup title="Service, Additional & Payment">
                        <ReviewRow label="Service" value={selectedService?.name} />
                        <ReviewRow
                          label="Est. delivery"
                          value={selectedService ? deliveryDate(selectedService.days, isGroundService(selectedService.id)) : "—"}
                        />
                        <ReviewRow label="Ship date" value={shipDate || "Today"} />
                        <ReviewRow label="Reference" value={reference || "—"} />
                        <ReviewRow label="Instructions" value={instructions || "—"} />
                        <ReviewRow label="Signature required" value={signatureRequired ? "Yes" : "No"} />
                        <ReviewRow label="Payment" value={paymentLabel()} />
                      </ReviewGroup>
                    </div>

                    <div className="mt-6 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
                      <div className="space-y-0.5">
                        <p className="text-xs text-neutral-500">
                          Subtotal{" "}
                          <span className="font-medium text-neutral-900">{selectedService ? money(selectedService.price) : "—"}</span>
                        </p>
                        {insuranceFee > 0 && (
                          <p className="text-xs text-neutral-500">
                            Insurance <span className="font-medium text-neutral-900">{money(insuranceFee)}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-widest text-neutral-500">Total</p>
                        <p className="text-lg font-semibold text-neutral-900">{money(total)}</p>
                      </div>
                    </div>
                  </SectionCard>

                  {submitError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                      {submitError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Order summary (steps 2–5) ───────────────────────────────── */}
            {step >= 1 && (
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-neutral-900">Order Summary</h3>
                  <dl className="mt-4 space-y-3">
                    <Tri label="From" value={originLabel || "—"} />
                    <Tri label="To" value={shipTo.street || "—"} />
                    <Tri
                      label="Package"
                      value={`${parcel.weight || "—"} kg · ${parcel.length || "—"}×${parcel.width || "—"}×${parcel.height || "—"} cm`}
                    />
                    {selectedService && (
                      <Tri label="Service" value={selectedService.name} />
                    )}
                    {selectedService && (
                      <Tri label="Est. delivery" value={deliveryDate(selectedService.days, isGroundService(selectedService.id))} />
                    )}
                  </dl>
                  <div className="mt-4 border-t border-neutral-200 pt-4">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>Subtotal</span>
                      <span className="font-medium text-neutral-900">
                        {selectedService ? money(selectedService.price) : "—"}
                      </span>
                    </div>
                    {insuranceFee > 0 && (
                      <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-500">
                        <span>Insurance</span>
                        <span className="font-medium text-neutral-900">{money(insuranceFee)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-sm font-semibold text-neutral-900">
                      <span>Total</span>
                      <span>{money(total)}</span>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>

          {/* ── Step navigation ───────────────────────────────────────────── */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-neutral-200 pt-5">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-colors ${
                  loading
                    ? "bg-neutral-300 text-neutral-500"
                    : "bg-neutral-900 text-white hover:bg-black"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Creating shipment...
                  </>
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} />
                    Confirm & Create Shipment
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}