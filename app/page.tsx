"use client";

import { useState } from "react";
import ApiTab from "@/components/ApiTab";
import CopyInput from "@/components/CopyInput";
import ObjectionList from "@/components/ObjectionList";
import PersonaDetailPanel from "@/components/PersonaDetailPanel";
import PipelineStrip from "@/components/PipelineStrip";
import ReactionMap from "@/components/ReactionMap";
import RedlineView from "@/components/RedlineView";
import ScoreGauge from "@/components/ScoreGauge";
import { useFocusGroup, type RoundKey } from "@/lib/useFocusGroup";

export default function Home() {
  const fg = useFocusGroup();
  const [copy, setCopy] = useState("");
  const [tab, setTab] = useState<"panel" | "api">("panel");
  const [view, setView] = useState<RoundKey>("original");
  const [selected, setSelected] = useState<string | null>(null);

  const hasResults = fg.completed >= 3;
  const hasRevised = fg.completed >= 4 && !!fg.rewrite;
  const shownKey: RoundKey = hasRevised ? view : "original";
  const round = shownKey === "original" ? fg.original : fg.revised;
  const roundCopy = shownKey === "original" ? fg.originalCopy : fg.revisedCopy;
  const canFix = hasResults && !fg.busy && !hasRevised && fg.originalAgg.top_objections.length > 0;
  const revoteDone = fg.completed >= 5;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Panel<span className="text-accent">.</span></h1>
        <p className="mt-1 text-zinc-400">Test your pitch on 10 synthetic customers before you spend a dollar.</p>
      </header>

      <PipelineStrip active={fg.active} completed={fg.completed} />

      <nav className="flex gap-2">
        {(["panel", "api"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1 text-sm ${tab === t ? "border-accent bg-accent/20 text-white" : "border-line text-zinc-400 hover:text-white"}`}>
            {t === "panel" ? "Panel" : "API"}
          </button>
        ))}
      </nav>

      <div hidden={tab !== "panel"} className="space-y-6">
        <CopyInput copy={copy} onChange={setCopy} onRun={() => { setView("original"); fg.run(copy); }} busy={fg.busy} serverError={fg.error} />

        {fg.completed >= 1 && (
          <>
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Reaction map</h2>
                {hasRevised && (
                  <div className="flex gap-2 text-sm">
                    {(["original", "revised"] as const).map((k) => (
                      <button key={k} onClick={() => setView(k)} className={`rounded-full border px-3 py-1 ${shownKey === k ? "border-accent bg-accent/20 text-white" : "border-line text-zinc-400"}`}>
                        {k === "original" ? "Original copy" : "Revised copy"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ReactionMap round={round} onSelect={setSelected} />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              {revoteDone || fg.active === 4 || hasRevised ? (
                <>
                  <ScoreGauge title="Original score" agg={fg.originalAgg} />
                  <ScoreGauge title="Revised score" agg={fg.revisedAgg} compareTo={fg.originalAgg.score} />
                </>
              ) : (
                <ScoreGauge title="Simulated conversion" agg={fg.originalAgg} />
              )}
              <ObjectionList objections={(shownKey === "original" ? fg.originalAgg : fg.revisedAgg).top_objections} />
              {hasResults && !hasRevised && (
                <div className="flex flex-col items-start justify-center gap-2 rounded-2xl border border-line bg-card p-5">
                  <p className="text-sm text-zinc-400">Rewrite the copy to address these objections, then re-run all 10 personas on the new version.</p>
                  <button onClick={fg.fixObjections} disabled={!canFix} className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,108,255,.35)] hover:brightness-110 disabled:opacity-40 disabled:shadow-none">
                    {fg.active === 3 ? "Rewriting…" : "Fix Objections"}
                  </button>
                </div>
              )}
            </section>

            {hasRevised && fg.rewrite && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Before vs. after</h2>
                {revoteDone && fg.revisedAgg.score !== null && fg.originalAgg.score !== null && fg.revisedAgg.score < fg.originalAgg.score && (
                  <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                    The revised copy scored lower than the original. The result is shown as measured.
                  </p>
                )}
                <RedlineView original={fg.originalCopy} rewrite={fg.rewrite} />
              </section>
            )}
          </>
        )}
      </div>

      <div hidden={tab !== "api"}><ApiTab copy={copy} /></div>

      <PersonaDetailPanel
        personaId={selected}
        state={selected ? round[selected] : undefined}
        copy={roundCopy}
        onClose={() => setSelected(null)}
        onRetry={(id) => fg.retryPersona(shownKey, id)}
      />
    </main>
  );
}
