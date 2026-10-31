"use client";

import Link from "next/link";
import LoadRecordedButton from "@/components/LoadRecordedButton";
import { Avatar } from "@/components/PersonaNode";
import { btnGhost, btnPrimary } from "@/components/PageHeader";
import { Ring } from "@/components/ScoreGauge";
import { aggOf, useEvaluations } from "@/lib/evaluations";
import { PERSONAS } from "@/lib/personas";

const STEPS = [
  ["1", "Enter your copy", "Paste a pitch or start from a strong, weak or ambiguous sample."],
  ["2", "10 personas react", "Each synthetic customer decides Buy, Maybe or Pass, live."],
  ["3", "Read the objections", "See what blocks conversion and which personas raised it."],
  ["4", "Rewrite and re-test", "Fix objections, then re-run the panel on the new copy."],
];

export default function Overview() {
  const { evaluations, hydrated } = useEvaluations();
  const rows = evaluations.map((e) => ({ e, agg: aggOf(e.original), revised: e.completed >= 5 ? aggOf(e.revised) : null }));
  const scored = rows.filter((r) => r.agg.score !== null && r.e.completed >= 3);
  const best = scored.length ? Math.max(...scored.map((r) => r.agg.score as number)) : null;

  return (
    <div className="space-y-8">
      <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl xl:text-5xl">
            Know how your <span className="text-accent">customers</span> will react{" "}
            <span className="bg-gradient-to-r from-accent to-fuchsia-400 bg-clip-text text-transparent">before you launch.</span>
          </h1>
          <p className="mt-4 max-w-lg text-zinc-400">
            Test your marketing copy against 10 synthetic customer personas and uncover objections before spending on campaigns.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/evaluate" className={btnPrimary}>▶ Start new evaluation</Link>
            <LoadRecordedButton className={btnGhost} />
            <Link href="/api-docs" className={btnGhost}>View API docs</Link>
            <Link href="/agent" className={btnGhost}>Chat with agent</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex flex-wrap gap-3">{PERSONAS.map((p) => <Avatar key={p.id} persona={p} size={48} />)}</div>
          <p className="text-sm text-zinc-300"><b>10 personas</b> · real reactions · better decisions</p>
          <p className="mt-1 text-xs text-zinc-500">Synthetic personas, not real customers. Scores simulate their reactions and are not a real-world prediction.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Evaluations run", hydrated ? String(evaluations.length) : "—"],
          ["Latest score", scored[0] ? `${scored[0].agg.score}%` : "—"],
          ["Best score", best !== null ? `${best}%` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-card p-5">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent evaluations</h2>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-zinc-400">
            {hydrated ? <>No evaluations yet. <Link href="/evaluate" className="text-accent hover:underline">Run your first one</Link>.</> : "Loading…"}
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.slice(0, 6).map(({ e, agg, revised }) => (
              <li key={e.id} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4">
                <Ring value={e.completed >= 3 ? agg.score : null} size={72} stroke={8} small />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-zinc-200">{e.copy}</p>
                  {e.recordedRun && <span className="mt-1 inline-block rounded-full border border-sky-500/40 px-2 py-0.5 text-[11px] text-sky-300">Recorded run · {e.recordedRun.source}</span>}
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(e.createdAt).toLocaleString()} · Buy {agg.split.buy} / Maybe {agg.split.maybe} / Pass {agg.split.pass}
                    {revised?.score != null && agg.score != null && <> · revised {revised.score}%</>}
                  </p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <Link href={`/evaluate/${e.id}`} className="text-accent hover:underline">Results</Link>
                    <Link href={`/insights/${e.id}`} className="text-accent hover:underline">Insights</Link>
                    <Link href={`/rewrite/${e.id}`} className="text-accent hover:underline">Rewrite</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="rounded-2xl border border-line bg-card p-5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-indigo-200">{n}</span>
              <h3 className="mt-3 font-medium">{t}</h3>
              <p className="mt-1 text-sm text-zinc-400">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
