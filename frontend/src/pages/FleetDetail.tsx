import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MoveHorizontal,
  Ruler,
  Weight,
  ArrowLeftRight,
} from "lucide-react";
import talariaLogo from "../image/logo.svg";
import { FLEET } from "../utils/fleet";
import SketchfabEmbed from "../components/SketchfabEmbed";
import SketchfabViewer from "../components/SketchfabViewer";

const STAT_ICONS = [Weight, Ruler, ArrowLeftRight, MoveHorizontal];
const STAT_LABELS = ["Payload", "Load height", "Length", "Width"];

export default function FleetDetail() {
  const { id } = useParams();
  const idx = FLEET.findIndex((t) => t.id === id);
  const truck = idx >= 0 ? FLEET[idx] : null;

  if (!truck) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-5 text-center text-white">
        <p className="text-5xl font-black text-neutral-800">404</p>
        <h1 className="mt-3 text-2xl font-semibold">That rig's off the fleet list</h1>
        <p className="mt-2 text-neutral-400">
          The truck you're looking for doesn't exist on our equipment board.
        </p>
        <Link
          to="/#services"
          className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-neutral-200"
        >
          Back to the fleet
        </Link>
      </div>
    );
  }

  const prev = FLEET[(idx - 1 + FLEET.length) % FLEET.length];
  const next = FLEET[(idx + 1) % FLEET.length];
  const loggedIn = Boolean(localStorage.getItem("token"));
  const cta = loggedIn ? "/orders/create" : "/register";
  const stats: { value: string; sub?: string }[] = [
    { value: truck.payload, sub: truck.payloadKg },
    { value: truck.loadHeight },
    { value: truck.length },
    { value: truck.width },
  ];

  return (
    <div className="min-h-screen bg-[#08090c] text-white">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={talariaLogo} alt="Talaria" className="h-7 w-7 invert" />
            <span className="text-lg font-semibold tracking-tight">
              Talaria <span className="text-neutral-400">Freight</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-neutral-400">
            <a href="#specs" className="hover:text-white transition-colors">
              Specs
            </a>
            <Link
              to="/#services"
              className="hover:text-white transition-colors"
            >
              Full fleet
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-10 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Link
              to="/#services"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} /> Back to the fleet
            </Link>

            <p
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: truck.tierColor }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: truck.tierColor }}
              />
              {truck.category}
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {truck.name}
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-neutral-400">
              {truck.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[truck.payload, truck.loadHeight, truck.length].map((v) => (
                <span
                  key={v}
                  className="rounded-full border border-neutral-700 bg-white/[0.03] px-4 py-2 text-sm"
                >
                  <span className="text-neutral-500">Capacity · </span>
                  <span className="font-semibold text-white">{v}</span>
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to={cta}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
              >
                Ship with this rig <ArrowRight size={18} />
              </Link>
              <a
                href="#specs"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-600 px-6 py-3.5 text-sm font-semibold text-white hover:border-white transition-colors"
              >
                Full specs
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-[#06070a] shadow-2xl shadow-black/60">
            {truck.id === "step-deck" ? (
              <SketchfabViewer
                src={truck.sketchfab}
                autoSpin={2}
                className="aspect-[4/3] w-full lg:h-[520px]"
              />
            ) : (
              <SketchfabEmbed
                src={truck.sketchfab}
                title={`${truck.name} 3D model`}
                className="aspect-[4/3] w-full lg:h-[520px]"
              />
            )}
            <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur">
              Auto-rotating · Drag to orbit
            </span>
          </div>
        </div>
      </section>

      {/* ── Specs ───────────────────────────────────────────────────────── */}
      <section id="specs" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = STAT_ICONS[i];
            return (
              <div
                key={STAT_LABELS[i]}
                className="rounded-2xl border border-neutral-800 bg-white/[0.02] p-5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5">
                  <Icon size={18} className="text-neutral-300" />
                </span>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                  {STAT_LABELS[i]}
                </p>
                <p className="mt-1 text-xl font-semibold">{s.value}</p>
                {s.sub && <p className="text-sm text-neutral-500">{s.sub}</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-neutral-800 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold">Why shippers run {truck.name}s</h2>
          <ul className="mt-4 space-y-3">
            {truck.highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-neutral-300">
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: `${truck.tierColor}22`, color: truck.tierColor }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="text-sm leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Prev / next rigs */}
        <div className="mt-10 flex flex-wrap justify-between gap-3">
          <Link
            to={`/fleet/${prev.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:border-white hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> {prev.name}
          </Link>
          <Link
            to={`/fleet/${next.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:border-white hover:text-white transition-colors"
          >
            {next.name} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-800 py-8">
        <p className="text-center text-sm text-neutral-500">
          © {new Date().getFullYear()} Talaria Freight — 48-state coverage, live tracked.
        </p>
      </footer>
    </div>
  );
}