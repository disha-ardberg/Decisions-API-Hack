"use client";

import { diffWords } from "diff";
import { useMemo, useState } from "react";
import type { Rewrite } from "@/lib/schemas";

const TABS = ["Before", "After", "Changes"] as const;
type Tab = (typeof TABS)[number];

const Del = ({ children }: { children: React.ReactNode }) => <del className="rounded bg-red-500/20 text-red-300">{children}</del>;
const Ins = ({ children }: { children: React.ReactNode }) => <ins className="rounded bg-emerald-500/20 text-emerald-300 no-underline">{children}</ins>;

export default function RedlineView({ original, rewrite }: { original: string; rewrite: Rewrite }) {
  const [tab, setTab] = useState<Tab>("Changes");
  const parts = useMemo(() => diffWords(original, rewrite.revised_copy), [original, rewrite.revised_copy]);
  const body = "whitespace-pre-wrap rounded-xl border border-line bg-bg p-4 text-sm leading-relaxed text-zinc-300";

  const before = parts.map((p, i) => (p.added ? null : p.removed ? <Del key={i}>{p.value}</Del> : <span key={i}>{p.value}</span>));
  const after = parts.map((p, i) => (p.removed ? null : p.added ? <Ins key={i}>{p.value}</Ins> : <span key={i}>{p.value}</span>));

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${tab === t ? "border-accent text-white" : "border-transparent text-zinc-400 hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Before" && <p className={body}>{before}</p>}
      {tab === "After" && <p className={body}>{after}</p>}

      {tab === "Changes" && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div><div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Original copy</div><p className={body}>{before}</p></div>
            <div><div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Revised copy</div><p className={body}>{after}</p></div>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Changes made</div>
            {rewrite.changes_made.length === 0 && (
              <p className="text-sm text-zinc-500">No individually matchable changes were reported; the highlighting above shows everything that differs.</p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {rewrite.changes_made.map((c, i) => (
                <div key={i} className="rounded-xl border border-line p-3 text-sm">
                  <span className="mb-2 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-xs text-indigo-200">Addresses: {c.objection_addressed}</span>
                  <p className="rounded bg-red-500/10 px-2 py-1 text-red-300 line-through decoration-red-400/50">{c.before}</p>
                  <p className="mt-1 rounded bg-emerald-500/10 px-2 py-1 text-emerald-300">{c.after}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
