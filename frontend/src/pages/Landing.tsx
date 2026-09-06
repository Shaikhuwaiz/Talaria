import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import talariaLogo from "../image/logo.svg";
import LiveTrackPreview from "../components/LiveTrackPreview";
import FleetShowcase from "../components/FleetShowcase";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Mail,
  MapPin,
  Menu,
  Phone,
  Radar,
  Route,
  ShieldCheck,
  Star,
  Truck,
  X,
} from "lucide-react";

/* ── Industrial bits ─────────────────────────────────────────────────── */

const HazardStrip = ({ className = "" }: { className?: string }) => (
  <div className={`h-3 bg-white/[0.04] ${className}`} />
);

const Eyebrow = ({
  children,
  dark = false,
}: {
  children: string;
  dark?: boolean;
}) => (
  <p
    className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] ${
      dark ? "text-neutral-500" : "text-neutral-400"
    }`}
  >
    <span className={`h-1 w-6 ${dark ? "bg-black" : "bg-white"}`} />
    {children}
  </p>
);

/* ── Content ─────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "The fleet", href: "#services" },
  { label: "How we haul", href: "#how" },
  { label: "Live load tracking", href: "#track" },
  { label: "Road tests", href: "#reviews" },
];

const STEPS = [
  {
    n: "01",
    title: "Request a quote",
    icon: Phone,
    text: "Tell us the load, the lane and your pickup window. Booked in minutes — no app juggling, no phone tag.",
  },
  {
    n: "02",
    title: "Rig dispatched",
    icon: Truck,
    text: "The nearest available rig rolls to your dock with a vetted driver, a route plan and an ETA.",
  },
  {
    n: "03",
    title: "Follow it live",
    icon: Radar,
    text: "Watch the truck on real highway routes and get milestone updates the whole way across.",
  },
  {
    n: "04",
    title: "Signed, sealed, delivered",
    icon: ShieldCheck,
    text: "Electronic POD on file the moment the load hits your dock — proof of delivery without the paperwork.",
  },
];

const HERO_SLIDES = [
  {
    img: "/hero/highway.jpg",
    alt: "Freight truck rolling down an American mountain highway",
  },
  {
    img: "/hero/dusk.jpg",
    alt: "Cargo truck on a highway at dusk",
  },
  {
    img: "/hero/flags.jpg",
    alt: "Truck driving past American flags",
  },
];

const STATS = [
  { value: "120+", label: "Trucks on the road" },
  { value: "48", label: "States covered" },
  { value: "500k", label: "Miles / month" },
  { value: "99.2%", label: "On-time delivery" },
  { value: "24/7", label: "Dispatch support" },
];

const REVIEWS = [
  {
    name: "Gary Whitfield",
    role: "Fleet Manager · Whitfield Transport",
    text: "Dispatch gives an ETA and the rig is at the dock when they promise. I track every load on the map without a single phone tag.",
    initials: "GW",
    color: "bg-black text-white",
  },
  {
    name: "Rosa Delgado",
    role: "Warehouse Director · Texas Dry Goods",
    text: "We moved our entire LTL program onto Talaria. The live rouline actually follows the highways — none of that straight-line nonsense.",
    initials: "RD",
    color: "bg-neutral-200 text-black",
  },
  {
    name: "Ken Murphy",
    role: "Shipper · Murphy Steel Inc.",
    text: "Reefer runs with temp logs, flatbed freights with no headaches. These guys run freight like it's 1995 — handshakes and deadlines.",
    initials: "KM",
    color: "bg-black text-white",
  },
  {
    name: "Ashley Boone",
    role: "Logistics Buyer · Boone Farms",
    text: "Hot-shot lanes get there hours faster than the big carriers and the tracking page keeps our customers off the phone.",
    initials: "AB",
    color: "bg-neutral-200 text-black",
  },
  {
    name: "Tom Hargrave",
    role: "Owner-Operator · Hargrave Hauling",
    text: "As a driver, the pre-planned routes and ETA keeps me rolling. Dispatch actually knows where I am before I call.",
    initials: "TH",
    color: "bg-black text-white",
  },
];

const fade = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setDir(1);
      setIdx((i) => (i + 1) % REVIEWS.length);
    }, 5200);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => window.clearInterval(t);
  }, []);

  const go = (d: number) => {
    setDir(d);
    setIdx((i) => (i + d + REVIEWS.length) % REVIEWS.length);
  };

  const review = REVIEWS[idx];
  const [loggedIn] = useState(() => Boolean(localStorage.getItem("token")));

  return (
    <div className="min-h-screen bg-black text-white scroll-smooth overflow-x-hidden">
      {/* ── Dispatch strip ─────────────────────────────────────────────── */}
      <div className="border-b border-neutral-800 bg-neutral-950 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
        <div className="mx-auto max-w-6xl px-5 py-2 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="flex items-center gap-1.5 text-white">
            <Phone size={12} /> 24/7 Dispatch · 1-800-555-LOAD
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} /> DOT #2849172 · Insured & Bonded
          </span>
          <span className="ml-auto hidden sm:flex items-center gap-1.5">
            <Mail size={12} /> dispatch@talaria.freight
          </span>
        </div>
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={talariaLogo} alt="Talaria" className="h-7 w-7 invert" />
            <span className="text-lg font-semibold tracking-tight">
              Talaria <span className="text-neutral-400">Freight</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {loggedIn ? (
              <Link
                to="/orders"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
              >
                My Orders
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full border border-neutral-700 px-5 py-2 text-sm font-medium text-white hover:border-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
                >
                  Get a quote
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded border border-neutral-700"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-neutral-800 bg-black/95 px-5 py-4 space-y-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2 font-medium text-sm text-neutral-400 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 flex gap-3">
              {loggedIn ? (
                <Link
                  to="/orders"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 text-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                >
                  My Orders
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                  >
                    Get a quote
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-neutral-950">
        <div className="absolute inset-0">
          {HERO_SLIDES.map((slide, i) => (
            <img
              key={slide.img}
              src={slide.img}
              alt={slide.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1600ms] ease-in-out ${
                heroIdx === i
                  ? "opacity-70 scale-[1.05]"
                  : "opacity-0 scale-100"
              }`}
            />
          ))}
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,12,20,0.4)_0%,rgba(9,13,22,0.25)_40%,rgba(9,13,22,0.1)_72%,transparent_100%)] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-neutral-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1120]/60 via-transparent to-[#0b1120]/40" />

        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-24">
          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            transition={{ duration: 0.55 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="flex items-center justify-center">
              <Eyebrow>Cargo freight · Coast to coast</Eyebrow>
            </div>

            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
              Moving America's freight.
            </h1>

            <p className="mt-5 mx-auto max-w-xl text-lg text-neutral-400 leading-relaxed">
              Flatbeds, dry vans, reefers and hot-shots — dispatched from our
              hubs and tracked live on real road routes from pickup dock to
              final drop.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#track"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
              >
                Track a load <ArrowRight size={18} />
              </a>
              {loggedIn ? (
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-600 px-6 py-3.5 text-sm font-semibold text-white hover:border-white transition-colors"
                >
                  My Orders
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-600 px-6 py-3.5 text-sm font-semibold text-white hover:border-white transition-colors"
                >
                  Get a quote
                </Link>
              )}
            </div>

            {/* Fleet stats */}
            <div className="mt-16 border-t border-neutral-800 pt-10">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="text-4xl font-semibold text-white">
                      {s.value}
                    </p>
                    <p className="mt-1.5 text-xs font-medium uppercase tracking-widest text-neutral-500">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="mt-8 flex items-center justify-center gap-2">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.img}
                onClick={() => setHeroIdx(i)}
                aria-label={`Show hero image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  heroIdx === i
                    ? "w-8 bg-white"
                    : "w-2.5 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── The fleet (services) ───────────────────────────────────────── */}
      <section id="services" className="bg-white text-black scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <Eyebrow dark>The fleet</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              From expedite to over-dimensional
            </h2>
            <p className="mt-4 text-neutral-600">
              Every trailer class your freight needs — dispatched from our yards and
              tracked on every mile. Capacity scales from expedite hot-shots to full
              over-dimensional permits.
            </p>
          </div>

          <FleetShowcase />
        </div>
      </section>

      {/* ── How we haul ────────────────────────────────────────────────── */}
      <section
        id="how"
        className="mx-auto max-w-6xl px-5 py-20 scroll-mt-20 border-t border-white/5"
      >
        <div className="max-w-2xl">
          <Eyebrow>How we haul</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            From request to signed dock
          </h2>
        </div>

        <div className="mt-16">
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute left-[15px] top-1 bottom-1 w-px -translate-x-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent lg:left-1/2" />

            <div className="space-y-14 lg:space-y-0">
              {STEPS.map((s, i) => {
                const left = i % 2 === 0;
                return (
                  <motion.div
                    key={s.n}
                    variants={fade}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: 0.08 }}
                    className={`relative pl-16 lg:w-1/2 lg:pb-16 lg:pl-0 ${
                      left ? "lg:mr-0 lg:pr-14" : "lg:ml-auto lg:pl-14"
                    }`}
                  >
                    <span
                      className={`absolute left-[15px] top-1 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-white/20 bg-neutral-950 text-[11px] font-bold text-neutral-300 ring-4 ring-neutral-950 lg:left-auto ${
                        left
                          ? "lg:right-0 lg:translate-x-1/2"
                          : "lg:left-0 lg:-translate-x-1/2"
                      }`}
                    >
                      {s.n}
                    </span>

                    <div className="group relative rounded-xl border border-neutral-800 bg-white/[0.02] p-6 sm:p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-600">
                      <span className="absolute right-4 top-3 text-5xl font-black text-white/[0.04] transition-colors group-hover:text-white/[0.07]">
                        {s.n}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white">
                          <s.icon size={20} />
                        </span>
                        <h3 className="text-lg font-semibold tracking-tight">
                          {s.title}
                        </h3>
                      </div>
                      <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
                        {s.text}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live tracking CTA ──────────────────────────────────────────── */}
      <section id="track" className="bg-white scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-stretch p-8 sm:p-10">
          <div className="flex flex-col justify-center">
            <Eyebrow>Live load tracking</Eyebrow>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              Know where the rig is, always
            </h2>
            <p className="mt-4 text-neutral-400">
              Every truck is a live marker on the map below, following real
              highway geometry with progress, nearest city and ETA. Log in to
              manage loads or track one right now.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/tracking"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
              >
                Track a load <ArrowRight size={18} />
              </Link>
              <Link
                to={loggedIn ? "/orders" : "/register"}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-600 px-6 py-3.5 text-sm font-semibold text-white hover:border-white transition-colors"
              >
                {loggedIn ? "My Orders" : "Create an account"}
              </Link>
            </div>
          </div>
          <LiveTrackPreview />
        </div>
      </div>
      </div>
      </section>

      {/* ── Reviews carousel ───────────────────────────────────────────── */}
      <section
        id="reviews"
        className="mx-auto max-w-6xl px-5 py-20 scroll-mt-20 border-t border-white/5"
      >
        <div className="max-w-2xl">
          <Eyebrow>Road tests</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            What the dispatch desk says
          </h2>
        </div>

        <div className="relative mt-12 mx-auto max-w-3xl">
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={idx}
                custom={dir}
                initial={{ opacity: 0, x: dir * 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -80 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`rounded-xl border p-8 sm:p-10 ${
                  idx % 2 === 0
                    ? "border-neutral-200 bg-white text-black"
                    : "border-neutral-800 bg-black text-white"
                }`}
              >
                <div className={`flex gap-1 ${idx % 2 === 0 ? "text-black" : "text-white"}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={17} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>

                <p
                  className={`mt-6 text-lg sm:text-2xl leading-relaxed font-medium ${
                    idx % 2 === 0 ? "text-black" : "text-white"
                  }`}
                >
                  “{review.text}”
                </p>

                <div className="mt-8 flex items-center gap-4">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full font-semibold ${
                      idx % 2 === 0 ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {review.initials}
                  </span>
                  <div>
                    <p className="font-semibold tracking-tight">{review.name}</p>
                    <p
                      className={`text-sm ${
                        idx % 2 === 0 ? "text-neutral-600" : "text-neutral-400"
                      }`}
                    >
                      {review.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={() => go(-1)}
            aria-label="Previous review"
            className="absolute left-0 top-14 -translate-x-1/2 grid h-10 w-10 place-items-center rounded-full border border-neutral-700 bg-black hover:bg-white hover:text-black transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next review"
            className="absolute right-0 top-14 translate-x-1/2 grid h-10 w-10 place-items-center rounded-full border border-neutral-700 bg-black hover:bg-white hover:text-black transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          <div className="mt-8 flex justify-center gap-2">
            {REVIEWS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDir(i > idx ? 1 : -1);
                  setIdx(i);
                }}
                aria-label={`Review ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx
                    ? "w-8 bg-white"
                    : "w-2 bg-neutral-700 hover:bg-neutral-500"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-5 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <img src={talariaLogo} alt="Talaria" className="h-7 w-7 invert" />
              <span className="text-lg font-semibold tracking-tight">
                Talaria <span className="text-neutral-400">Freight</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-neutral-500 leading-relaxed">
              Cargo freight, parcels and live load tracking — from the yard to
              the last dock.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
              The fleet
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              <li><a href="#services" className="hover:text-white transition-colors">Flatbed & Dry Van</a></li>
              <li><a href="#services" className="hover:text-white transition-colors">Reefer</a></li>
              <li><a href="#services" className="hover:text-white transition-colors">Expedite</a></li>
              <li><a href="#track" className="hover:text-white transition-colors">Live tracking</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
              Account
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              <li><Link to="/login" className="hover:text-white transition-colors">Sign in</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Get a quote</Link></li>
              <li><Link to="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
              Dispatch desk
            </p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-500">
              <li className="flex items-center gap-2">
                <Clock size={14} /> 24/7 — 1-800-555-LOAD
              </li>
              <li className="flex items-center gap-2">
                <Headphones size={14} /> support@talaria.freight
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} /> Freight hubs nationwide
              </li>
            </ul>
          </div>
        </div>

        <HazardStrip />
        <div className="py-5 text-center text-[11px] font-bold uppercase tracking-widest text-gray-500">
          © {new Date().getFullYear()} Talaria Freight Lines · DOT #2849172 · All rights reserved
        </div>
      </footer>
    </div>
  );
}