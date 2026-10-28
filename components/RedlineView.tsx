"use client";

import { diffWords } from "diff";
import { useMemo, useState } from "react";
import type { Rewrite } from "@/lib/schemas";

const TABS = ["Before", "After", "Changes"] as const;

export default function RedlineView({ original, rewrite }: { original: string; rewrite: Rewrite }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Changes");
  const parts = useMemo(() => diffWords(original, rewrite.revised_copy), [original, rewrite.revised_copy]);

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-3 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-sm ${tab === t ? "border-accent bg-accent/20 text-white" : "border-line text-zinc-400 hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="whitespace-pre-wrap rounded-xl border border-line bg-bg p-3 text-sm leading-relaxed text-zinc-300">
        {parts.map((p, i) => {
          if (p.added) {
            return tab === "Before" ? null : <ins key={i} className="rounded bg-emerald-500/20 text-emerald-300 no-underline">{p.value}</ins>;
          }
          if (p.removed) {
            return tab === "After" ? null : <del key={i} className="rounded bg-red-500/20 text-red-300">{p.value}</del>;
          }
          return <span key={i}>{p.value}</span>;
        })}
      </p>

      {tab === "Changes" && (
        <div className="mt-4 space-y-3">
          {rewrite.changes_made.length === 0 && (
            <p className="text-sm text-zinc-500">No individually matchable changes were reported; the diff above shows everything that differs.</p>
          )}
          {rewrite.changes_made.map((c, i) => (
            <div key={i} className="rounded-xl border border-line p-3 text-sm">
              <span className="mb-2 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">Addresses: {c.objection_addressed}</span>
              <p className="rounded bg-red-500/10 px-2 py-1 text-red-300 line-through decoration-red-400/50">{c.before}</p>
              <p className="mt-1 rounded bg-emerald-500/10 px-2 py-1 text-emerald-300">{c.after}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
