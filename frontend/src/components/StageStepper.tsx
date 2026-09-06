import { Check } from "lucide-react";
import {
  STAGE_ORDER,
  STAGE_META,
  stageState,
  currentStage,
  type LiveProgress,
} from "../utils/trackingStages";

type Theme = "dark" | "light";

const T: Record<Theme, Record<string, string>> = {
  dark: {
    dotOn: "border-white/80 bg-white text-black",
    dotOff: "border-neutral-700 bg-neutral-900 text-neutral-700",
    dotActive:
      "border-white ring-2 ring-white/25 bg-neutral-950 text-white animate-pulse",
    dotPing: "bg-white/20",
    lineOn: "bg-white/60",
    lineOff: "bg-neutral-800",
    label: "text-neutral-400",
    labelActive: "text-white",
  },
  light: {
    dotOn: "border-neutral-900 bg-neutral-900 text-white",
    dotOff: "border-neutral-300 bg-white text-neutral-400",
    dotActive:
      "border-neutral-900 ring-2 ring-neutral-900/25 bg-white text-neutral-900 animate-pulse",
    dotPing: "bg-neutral-900/20",
    lineOn: "bg-neutral-600",
    lineOff: "bg-neutral-200",
    label: "text-neutral-500",
    labelActive: "text-neutral-900",
  },
};

export default function StageStepper({
  status,
  theme = "dark",
  live,
}: {
  status: string;
  theme?: Theme;
  live?: LiveProgress;
}) {
  const t = T[theme];
  const current = currentStage(status, live);
  const currentIdx = STAGE_ORDER.indexOf(current);

  return (
    <div className="inline-flex items-center gap-1.5">
      {STAGE_ORDER.map((key, i) => {
        const state = stageState(key, status, live);
        const done = state.completed;
        const isCurrent = key === current;
        return (
          <div key={key} className="flex items-center gap-1.5">
            {i > 0 && (
              <span
                className={`h-px w-3.5 ${i <= currentIdx ? t.lineOn : t.lineOff}`}
              />
            )}
            <span
              title={STAGE_META[key].label}
              className={`relative flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                done
                  ? t.dotOn
                  : isCurrent
                    ? t.dotActive
                    : t.dotOff
              }`}
            >
              {isCurrent && !done && (
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full ${t.dotPing}`}
                />
              )}
              {done && <Check size={11} strokeWidth={3} className="relative z-10" />}
            </span>
          </div>
        );
      })}
      <span className={`ml-1 text-[11px] font-semibold ${t.labelActive}`}>
        {STAGE_META[current].label}
      </span>
    </div>
  );
}