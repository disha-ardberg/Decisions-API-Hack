"use client";

import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Aggregate } from "@/lib/aggregate";
import { SIMULATED_LABEL } from "@/lib/prompts";

function useCountUp(target: number | null): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (target === null) return;
    const controls = animate(from.current, target, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => {
        from.current = v;
        setValue(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [target]);
  return target === null ? 0 : value;
}

type Props = { title: string; agg: Aggregate; compareTo?: number | null };

export default function ScoreGauge({ title, agg, compareTo }: Props) {
  const shown = useCountUp(agg.score);
  const { split, model_disagreement: md } = agg;
  const delta = compareTo != null && agg.score != null ? agg.score - compareTo : null;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</div>
      <div className="flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#232634" strokeWidth="10" />
            <circle
              cx="64" cy="64" r={R} fill="none" stroke="#7c6cff" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)}
              style={{ filter: "drop-shadow(0 0 6px rgba(124,108,255,.6))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums">{agg.score === null ? "—" : `${shown}%`}</span>
            {delta !== null && (
              <span className={`text-xs font-semibold ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-zinc-400"}`}>
                {delta > 0 ? "+" : ""}{delta} pts
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Buy {split.buy}</span>
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300">Maybe {split.maybe}</span>
            <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-red-300">Pass {split.pass}</span>
          </div>
          <div className="text-xs text-zinc-400">
            {agg.successful} of {agg.expected} personas evaluated
            {agg.successful < agg.expected && agg.successful > 0 && " — failed personas are excluded, not scored as 0"}
          </div>
          {md.contested && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
              Contested: models disagree by {Math.round(md.spread * 100)} pts
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">{SIMULATED_LABEL}</p>
    </div>
  );
}
