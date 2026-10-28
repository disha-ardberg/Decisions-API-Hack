"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import PersonaDetailDrawer from "@/components/PersonaDetailPanel";
import { Avatar, statusOf } from "@/components/PersonaNode";
import { useEvaluations } from "@/lib/evaluations";
import { PERSONAS } from "@/lib/personas";

export default function Personas() {
  const { evaluations, retryPersona } = useEvaluations();
  const [selected, setSelected] = useState<string | null>(null);
  const latest = evaluations[0];

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Overview", href: "/" }, { label: "Personas" }]}
        title="Persona directory"
        subtitle={latest ? "The 10 synthetic customers. Reactions shown are from your latest evaluation." : "The 10 synthetic customers who evaluate your copy. Run an evaluation to see how each reacts."}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PERSONAS.map((p) => {
          const s = latest ? statusOf(latest.original[p.id]) : null;
          return (
            <button key={p.id} onClick={() => setSelected(p.id)} className={`flex flex-col gap-3 rounded-2xl border border-line bg-card p-5 text-left transition hover:border-accent ${selected === p.id ? "ring-2 ring-accent" : ""}`}>
              <div className="flex items-center gap-3">
                <Avatar persona={p} size={48} />
                <div className="min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-zinc-400">{p.role} · {p.age}</div>
                </div>
              </div>
              <p className="line-clamp-3 text-sm text-zinc-400">{p.bio}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.values.map((v) => <span key={v} className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-indigo-200">{v}</span>)}
              </div>
              <div className="mt-auto flex items-center justify-between pt-1 text-xs text-zinc-500">
                <span>{p.model.replace("MODEL_", "Model ")}</span>
                {s && s.label !== "Waiting" && <span className={`rounded-full border px-2 py-0.5 font-semibold ${s.pill}`}>{s.label}{s.pct !== null ? ` · ${s.pct}%` : ""}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <PersonaDetailDrawer
        personaId={selected}
        state={selected && latest ? latest.original[selected] : undefined}
        copy={latest?.copy ?? ""}
        profileOpen
        onClose={() => setSelected(null)}
        onRetry={(pid) => latest && retryPersona(latest.id, "original", pid)}
      />
    </>
  );
}
