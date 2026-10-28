const STAGES = ["Input", "Customer Simulation", "Insights", "Rewrite", "Re-evaluation"];

export default function PipelineStrip({ active, completed }: { active: number | null; completed: number }) {
  return (
    <ol className="flex items-center overflow-x-auto rounded-2xl border border-line bg-card px-4 py-3 text-sm" aria-label="Pipeline">
      {STAGES.map((label, i) => {
        const done = i < completed && active !== i;
        const running = active === i;
        const current = running || (!done && i === completed);
        return (
          <li key={label} className="flex flex-1 items-center gap-2 whitespace-nowrap last:flex-none">
            <span
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                done ? "bg-emerald-500 text-white" : running ? "animate-pulse bg-accent text-white" : "bg-zinc-700/70 text-zinc-300",
              ].join(" ")}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={done || current ? "text-zinc-100" : "text-zinc-500"} style={current && !done ? { color: "#a5a3ff" } : undefined}>{label}</span>
            {i < STAGES.length - 1 && <span className={`mx-2 hidden h-px flex-1 min-[700px]:block ${done ? "bg-emerald-500/50" : "bg-line"}`} />}
            {i < STAGES.length - 1 && <span className="mx-2 text-zinc-600 min-[700px]:hidden">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
