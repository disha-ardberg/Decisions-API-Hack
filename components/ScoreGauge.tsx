"use client";

import { animate } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import type { Aggregate } from "@/lib/aggregate";

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

export function Ring({ value, size = 140, stroke = 12, small = false, sub }: { value: number | null; size?: number; stroke?: number; small?: boolean; sub?: string }) {
  const shown = useCountUp(value);
  const id = useId();
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6d6af5" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2236" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold tabular-nums ${small ? "text-base" : "text-3xl"}`}>{value === null ? "—" : `${shown}%`}</span>
        {sub && <span className="text-[11px] text-zinc-400">{sub}</span>}
      </div>
    </div>
  );
}

export function SplitRows({ split }: { split: Aggregate["split"] }) {
  const rows = [
    ["Buy", split.buy, "bg-emerald-400"],
    ["Maybe", split.maybe, "bg-amber-400"],
    ["Pass", split.pass, "bg-red-400"],
  ] as const;
  return (
    <div className="flex-1 space-y-2">
      {rows.map(([label, n, dot]) => (
        <div key={label} className="flex items-center justify-between rounded-lg border border-line bg-bg/50 px-3 py-1.5 text-sm">
          <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span>
          <span className="font-semibold tabular-nums">{n}</span>
        </div>
      ))}
    </div>
  );
}

export default function ScoreGauge({ agg }: { agg: Aggregate }) {
  const md = agg.model_disagreement;
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 font-semibold">Simulated Conversion Score</h2>
      <div className="flex items-center gap-5">
        <Ring value={agg.score} sub={`${agg.successful}/${agg.expected} successful`} />
        <SplitRows split={agg.split} />
      </div>
      <div className={`mt-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${md.contested ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-line bg-bg/50 text-zinc-300"}`}>
        <span>Model disagreement{md.contested ? " · contested" : ""}</span>
        <span className="font-semibold tabular-nums">{agg.successful > 0 ? `${Math.round(md.spread * 100)}%` : "—"}</span>
      </div>
      <p className="mt-3 text-xs text-zinc-500">Simulated conversion based on synthetic personas. Not a real-world conversion prediction.</p>
    </section>
  );
}
