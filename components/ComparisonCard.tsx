import type { Aggregate } from "@/lib/aggregate";
import { Ring } from "./ScoreGauge";

type Props = {
  original: Aggregate;
  revised: Aggregate;
  hasRevised: boolean;
  revoteDone: boolean;
  rewriting: boolean;
  canFix: boolean;
  onFix: () => void;
};

function Side({ title, agg }: { title: string; agg: Aggregate }) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-bg/50 p-3">
      <div className="mb-2 text-xs font-medium text-zinc-400">{title}</div>
      <div className="flex flex-col items-center gap-2">
        <Ring value={agg.score} size={92} stroke={9} small sub={`${agg.successful}/${agg.expected}`} />
        <div className="w-full space-y-0.5 text-xs text-zinc-300">
          <div className="flex justify-between"><span className="text-emerald-400">Buy</span><b>{agg.split.buy}</b></div>
          <div className="flex justify-between"><span className="text-amber-400">Maybe</span><b>{agg.split.maybe}</b></div>
          <div className="flex justify-between"><span className="text-red-400">Pass</span><b>{agg.split.pass}</b></div>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonCard({ original, revised, hasRevised, revoteDone, rewriting, canFix, onFix }: Props) {
  const delta = revoteDone && original.score !== null && revised.score !== null ? revised.score - original.score : null;
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-card p-5">
      <h2 className="mb-4 font-semibold">Original vs Revised</h2>
      <div className="flex flex-1 gap-3">
        <Side title="Original" agg={original} />
        {hasRevised ? (
          <Side title="Revised" agg={revised} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line p-3 text-center">
            <p className="text-xs text-zinc-400">Rewrite the copy using the top objections, then re-run all 10 personas.</p>
            <button
              onClick={onFix}
              disabled={!canFix}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              {rewriting && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {rewriting ? "Rewriting…" : "Fix Objections"}
            </button>
          </div>
        )}
      </div>
      {delta !== null && (
        <p className={`mt-3 text-center text-sm font-semibold ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-zinc-400"}`}>
          {delta > 0 ? "↗ +" : delta < 0 ? "↘ " : ""}{delta} pts {delta > 0 ? "improvement" : delta < 0 ? "decline (shown as measured)" : "no change"}
        </p>
      )}
    </section>
  );
}
