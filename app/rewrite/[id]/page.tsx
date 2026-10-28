"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import ComparisonCard from "@/components/ComparisonCard";
import DecisionShift from "@/components/DecisionShift";
import EvalGuard from "@/components/EvalGuard";
import ObjectionList from "@/components/ObjectionList";
import PageHeader, { btnGhost } from "@/components/PageHeader";
import PipelineStrip from "@/components/PipelineStrip";
import RedlineView from "@/components/RedlineView";
import VerdictCard from "@/components/VerdictCard";
import { roundVotes, useEvaluations } from "@/lib/evaluations";
import { evaluate } from "@/lib/gate";
import { COPY_MAX, validateCopy } from "@/lib/schemas";

export default function RewritePage() {
  const { id } = useParams<{ id: string }>();
  const { fixObjections, revoteEditedCopy, busy } = useEvaluations();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const draftError = editing ? validateCopy(draft) : null;

  return (
    <EvalGuard id={id}>
      {({ evaluation: e, originalAgg, revisedAgg }) => {
        const hasRevised = e.completed >= 4 && !!e.rewrite;
        const revoteDone = e.completed >= 5;
        const canFix = e.completed >= 3 && !busy && !e.recordedRun && !hasRevised && originalAgg.top_objections.length > 0;
        const originalGate = e.completed >= 3 ? evaluate({ score: originalAgg.score, votes: roundVotes(e.original), top_objections: originalAgg.top_objections }) : null;
        const revisedGate = revoteDone ? evaluate({ score: revisedAgg.score, votes: roundVotes(e.revised), top_objections: revisedAgg.top_objections }) : null;

        async function saveEdit() {
          if (draftError) return;
          if (draft === e.revisedCopy) { setEditing(false); return; }
          if (await revoteEditedCopy(e.id, draft)) setEditing(false);
        }

        return (
          <>
            <PageHeader
              crumbs={[{ label: "Overview", href: "/" }, { label: `Evaluation #${e.id}`, href: `/evaluate/${e.id}` }, { label: "Rewrite studio" }]}
              title="Rewrite studio"
              subtitle="Rewrite your copy against the top objections, then compare the original and revised panels."
              actions={<Link href={`/insights/${e.id}`} className={btnGhost}>← Insights</Link>}
            />
            <div className="space-y-5">
              <PipelineStrip active={e.active} completed={e.completed} />
              {e.recordedRun && <span className="inline-flex rounded-full border border-sky-500/40 px-3 py-1 text-xs font-semibold text-sky-300">Recorded run · {e.recordedRun.source}</span>}
              {e.error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{e.error} You can try again.</p>}

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ComparisonCard original={originalAgg} revised={revisedAgg} hasRevised={hasRevised} revoteDone={revoteDone} rewriting={e.active === 3} canFix={canFix} onFix={() => fixObjections(e.id)} />
                <ObjectionList objections={originalAgg.top_objections} total={originalAgg.successful} />
              </div>

              {originalGate && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <VerdictCard title="Original Launch Gate" result={originalGate} />
                  {revisedGate && <VerdictCard title="Revised Launch Gate" result={revisedGate} />}
                </div>
              )}

              {hasRevised && e.rewrite ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Revised copy</h2>
                    {!e.recordedRun && !editing && <button type="button" onClick={() => { setDraft(e.revisedCopy); setEditing(true); }} disabled={busy} className={btnGhost}>Edit revised copy</button>}
                  </div>
                  {e.recordedRun && <p className="text-sm text-zinc-400">Recorded runs are read-only. Run a new evaluation to edit a revision.</p>}
                  {editing && (
                    <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
                      <label htmlFor="revised-copy-editor" className="block text-sm font-semibold text-zinc-200">Edit revised copy</label>
                      <textarea id="revised-copy-editor" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy} rows={7} className="w-full resize-y rounded-xl border border-line bg-bg p-3 text-sm leading-relaxed text-zinc-100 outline-none focus:border-accent disabled:opacity-60" />
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div><span className="text-zinc-400">{draft.trim().length.toLocaleString()} / {COPY_MAX.toLocaleString()} characters</span>{draftError && <p role="alert" className="text-red-400">{draftError}</p>}</div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditing(false)} disabled={busy} className={btnGhost}>Cancel</button>
                          <button type="button" onClick={saveEdit} disabled={busy || !!draftError} className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-white disabled:opacity-40">{busy ? "Re-voting…" : "Save and re-vote"}</button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">The revised score and verdict update after all judges evaluate your edit.</p>
                    </div>
                  )}
                  {revoteDone && revisedAgg.score !== null && originalAgg.score !== null && revisedAgg.score < originalAgg.score && (
                    <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">The revised copy scored lower than the original. The result is shown as measured.</p>
                  )}
                  <RedlineView original={e.copy} rewrite={e.rewrite} />
                  <DecisionShift original={e.original} revised={e.revised} />
                </>
              ) : (
                <section className="rounded-2xl border border-line bg-card p-5">
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Original copy</h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{e.copy}</p>
                </section>
              )}
            </div>
          </>
        );
      }}
    </EvalGuard>
  );
}
