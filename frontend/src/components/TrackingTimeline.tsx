import { useMemo } from "react";
import { Check, AlertTriangle } from "lucide-react";
import {
  STAGE_ORDER,
  STAGE_META,
  stageFor,
  stageState,
  liveCompletedFor,
  formatEventTime,
  formatDateOnly,
  type MovementEvent,
  type StageKey,
  type LiveProgress,
} from "../utils/trackingStages";

interface LegacyHistory {
  date?: string;
  status?: string;
  location?: string;
  details?: string;
}

type Theme = "dark" | "light";

const T: Record<Theme, Record<string, string>> = {
  dark: {
    container: "rounded-2xl border border-neutral-800 bg-neutral-950/60",
    text: "text-white",
    muted: "text-neutral-500",
    soft: "text-neutral-400",
    line: "bg-neutral-800",
    lineOn: "bg-white/70",
    nodeDone: "border-white bg-white text-black",
    nodeActive:
      "border-white bg-neutral-950 text-white ring-4 ring-white/15 animate-pulse",
    nodePing: "bg-white/20",
    nodePending: "border-neutral-700 bg-neutral-950 text-neutral-600",
    card: "rounded-xl border border-neutral-800/80 bg-neutral-900/60",
    item: "rounded-lg border border-neutral-800/60 bg-neutral-950/50",
    dotOn: "bg-white",
    dotOff: "bg-neutral-700",
    pillDone: "bg-white/10 text-neutral-300",
    pillActive: "bg-white text-black",
    delay: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    delayIcon: "text-amber-400",
  },
  light: {
    container: "rounded-2xl border border-neutral-200 bg-white shadow-sm",
    text: "text-neutral-900",
    muted: "text-neutral-500",
    soft: "text-neutral-500",
    line: "bg-neutral-200",
    lineOn: "bg-neutral-500",
    nodeDone: "border-neutral-900 bg-neutral-900 text-white",
    nodeActive:
      "border-neutral-900 bg-white text-neutral-900 ring-4 ring-neutral-900/15 animate-pulse",
    nodePing: "bg-neutral-900/20",
    nodePending: "border-neutral-300 bg-white text-neutral-400",
    card: "rounded-xl border border-neutral-200 bg-neutral-50",
    item: "rounded-lg border border-neutral-200 bg-white",
    dotOn: "bg-neutral-900",
    dotOff: "bg-neutral-300",
    pillDone: "bg-neutral-200 text-neutral-600",
    pillActive: "bg-neutral-900 text-white",
    delay: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    delayIcon: "text-amber-500",
  },
};

const lastCompleted = (items: MovementEvent[]) => {
  const done = items.filter((i) => i.completed);
  return done[done.length - 1] ?? items[items.length - 1];
};

function CheckinRow({
  item,
  t,
}: {
  item: MovementEvent;
  t: Record<string, string>;
}) {
  const detail = item.details || `In transit`;
  const location = item.location && item.location !== "—" ? item.location : "";
  const locationDuplicated =
    detail.toLowerCase().includes(location.toLowerCase());

  return (
    <li className={`flex items-start gap-3 px-3 py-2.5 ${t.item}`}>
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          item.completed ? t.dotOn : t.dotOff
        }`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium leading-snug ${
            item.completed ? t.text : t.soft
          }`}
        >
          {detail || "Tracking update"}
        </p>
        {location && !locationDuplicated && (
          <p className={`mt-0.5 text-xs ${t.muted}`}>{location}</p>
        )}
        {item.delayed && item.delayReason && (
          <div
            className={`mt-2 flex items-start gap-2 rounded-lg border px-2.5 py-2 ${t.delay}`}
          >
            <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${t.delayIcon}`} />
            <p className="text-xs font-medium leading-snug">{item.delayReason}</p>
          </div>
        )}
      </div>
      {item.completed && formatEventTime(item.timestamp) !== "—" && (
        <span className={`shrink-0 text-xs ${t.muted}`}>
          {formatEventTime(item.timestamp)}
        </span>
      )}
    </li>
  );
}

export default function TrackingTimeline({
  movements,
  history,
  currentStatus,
  expectedDelivery,
  theme = "dark",
  showHeader = true,
  liveProgress,
}: {
  movements?: MovementEvent[];
  history?: LegacyHistory[];
  currentStatus: string;
  expectedDelivery?: string;
  theme?: Theme;
  showHeader?: boolean;
  liveProgress?: LiveProgress;
}) {
  const t = T[theme];

  const closed = liveProgress?.closed === true;
  const delivered =
    !liveProgress ||
    liveProgress.arrived ||
    liveProgress.returning ||
    liveProgress.p >= 1;
  const statusLabel = closed ? "Order Closed" : delivered ? "Delivered" : currentStatus;
  const stageLabel = (key: StageKey) => {
    if (closed && key === "delivered") {
      return {
        ...STAGE_META[key],
        label: "Order Closed",
        sub: "Order complete",
      };
    }
    return STAGE_META[key];
  };

  const groups = useMemo(() => {
    const init: Record<StageKey, MovementEvent[]> = {
      created: [],
      departed: [],
      transit: [],
      outfordelivery: [],
      delivered: [],
    };
    const events: MovementEvent[] = movements && movements.length
      ? movements
      : (history ?? []).map((h) => ({
          status:
            h.status?.toLowerCase() === "shipment created"
              ? "Order Created"
              : h.status || "In Transit",
          location: h.location || "—",
          timestamp: h.date || "",
          completed: true,
          details: h.details,
        }));

    for (const ev of events) {
      const key = stageFor(ev.status);
      init[key].push({ delayed: false, delayReason: "", ...ev });
    }
    for (const key of STAGE_ORDER) {
      init[key].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }
    return init;
  }, [movements, history]);

  return (
    <div className={`p-5 sm:p-6 ${t.container}`}>
      {showHeader && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-widest ${t.muted}`}>
              Shipment status
            </p>
            <p className={`mt-0.5 text-xl font-semibold ${t.text}`}>
              {statusLabel}
            </p>
          </div>
          <p className={`text-sm ${t.muted}`}>
            Estimated delivery:{" "}
            <span className={`font-semibold ${t.text}`}>
              {expectedDelivery ? formatDateOnly(expectedDelivery) : "—"}
            </span>
          </p>
        </div>
      )}

      <ol className={`${showHeader ? "mt-6" : ""} space-y-1`}>
        {STAGE_ORDER.map((key, i) => {
          const meta = stageLabel(key);
          const state = stageState(key, currentStatus, liveProgress);
          const items = groups[key];
          const displayItems = liveProgress
            ? items.map((item, j) => ({
                ...item,
                completed: liveCompletedFor(
                  key,
                  j,
                  items.length,
                  liveProgress,
                  currentStatus
                ),
              }))
            : items;
          const active = state.active;
          const hasNext = i < STAGE_ORDER.length - 1;
          const NodeIcon = state.completed ? Check : meta.icon;

          return (
            <li key={key} className="relative pb-7 pl-14 last:pb-0">
              {hasNext && (
                <span
                  aria-hidden
                  className={`absolute bottom-0 left-[15px] top-10 w-px ${
                    state.completed ? t.lineOn : t.line
                  }`}
                />
              )}
              <span
                className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border ${
                  state.completed
                    ? t.nodeDone
                    : active
                      ? t.nodeActive
                      : t.nodePending
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full ${t.nodePing}`}
                  />
                )}
                <NodeIcon
                  className="relative z-10"
                  size={state.completed ? 14 : 15}
                  strokeWidth={state.completed ? 3 : 2}
                />
              </span>

              <div className={`p-4 ${t.card}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className={`text-sm font-semibold ${t.text}`}>
                      {meta.label}
                    </h4>
                    <p className={`text-xs ${t.muted}`}>{meta.sub}</p>
                  </div>

                  {active ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.pillActive}`}
                    >
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                      In progress
                    </span>
                  ) : state.completed && displayItems.length ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.pillDone}`}
                    >
                      {formatEventTime(lastCompleted(displayItems).timestamp)}
                    </span>
                  ) : null}
                </div>

                {displayItems.length ? (
                  <ul className="mt-3 space-y-2">
                    {displayItems.map((item, j) => (
                      <CheckinRow key={j} item={item} t={t} />
                    ))}
                  </ul>
                ) : (
                  <p className={`mt-3 text-xs ${t.muted}`}>
                    {key === "delivered"
                      ? `Estimated delivery: ${
                          expectedDelivery
                            ? formatDateOnly(expectedDelivery)
                            : "pending"
                        }`
                      : key === "transit"
                        ? "Awaiting tracking update"
                        : "No update yet"}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}