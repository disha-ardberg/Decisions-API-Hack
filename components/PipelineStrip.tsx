const STAGES = ["Input", "10 Personas", "Aggregate", "Rewrite", "Re-vote"];

export default function PipelineStrip({ active, completed }: { active: number | null; completed: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs sm:text-sm" aria-label="Pipeline">
      {STAGES.map((label, i) => {
        const done = i < completed && active !== i;
        const running = active === i;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={[
                "rounded-full border px-3 py-1 transition-colors",
                running
                  ? "animate-pulse border-accent bg-accent/20 text-white shadow-[0_0_14px_rgba(124,108,255,.45)]"
                  : done
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-line text-zinc-500",
              ].join(" ")}
            >
              {done ? "✓ " : ""}
              {label}
            </span>
            {i < STAGES.length - 1 && <span className="text-zinc-600">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
