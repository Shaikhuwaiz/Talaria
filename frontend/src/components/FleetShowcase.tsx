import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { FLEET } from "../utils/fleet";

export default function FleetShowcase({ dark = false }: { dark?: boolean }) {
  const card = dark
    ? "border-neutral-800 bg-white/[0.02] hover:border-neutral-600"
    : "border-neutral-200 bg-white shadow-sm hover:border-neutral-400 hover:shadow-xl";
  const name = dark ? "text-white" : "text-neutral-900";
  const sub = dark ? "text-neutral-400" : "text-neutral-500";
  const muted = dark ? "text-neutral-500" : "text-neutral-400";

  return (
    <div>
      {/* Fleet grid */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FLEET.map((t) => (
          <Link
            key={t.id}
            to={`/fleet/${t.id}`}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${card}`}
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
              <img
                src={t.img}
                alt={`${t.name} trailer`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-95"
              />
              <span
                className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.badge}`}
              >
                {t.tier}
              </span>
              <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                {t.category}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest ${muted}`}>
                    Capacity tier {t.scale} of {FLEET.length}
                  </p>
                  <h3 className={`mt-1 text-xl font-semibold tracking-tight ${name}`}>
                    {t.name}
                  </h3>
                </div>
                <t.icon className={`mt-1 h-6 w-6 shrink-0 ${muted}`} />
              </div>

              <p className={`text-sm leading-relaxed ${sub}`}>{t.description}</p>

              <div className={`mt-auto grid grid-cols-2 gap-3 border-t pt-4 ${dark ? "border-white/10" : "border-neutral-100"}`}>
                <div>
                  <p className={`text-[11px] font-medium uppercase tracking-widest ${muted}`}>
                    Payload
                  </p>
                  <p className={`mt-0.5 text-sm font-semibold ${name}`}>
                    {t.payload}
                    <span className={`ml-1 font-normal ${muted}`}>{t.payloadKg}</span>
                  </p>
                </div>
                <div>
                  <p className={`text-[11px] font-medium uppercase tracking-widest ${muted}`}>
                    Load height
                  </p>
                  <p className={`mt-0.5 text-sm font-semibold ${name}`}>{t.loadHeight}</p>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-all ${dark ? "text-white group-hover:gap-3" : "text-neutral-900 group-hover:gap-3"}`}>
                View rig in 3D <ArrowUpRight size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}