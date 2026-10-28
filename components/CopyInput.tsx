"use client";

import { SAMPLES } from "@/lib/samples";
import { COPY_MAX, COPY_MIN, validateCopy } from "@/lib/schemas";

const SAMPLE_DOT = { strong: "bg-emerald-400", weak: "bg-amber-400", ambiguous: "bg-indigo-400" } as const;

type Props = {
  copy: string;
  onChange: (v: string) => void;
  onRun: () => void;
  busy: boolean;
  serverError: string | null;
};

export default function CopyInput({ copy, onChange, onRun, busy, serverError }: Props) {
  const len = copy.trim().length;
  const problem = len > 0 ? validateCopy(copy) : null;
  const message = problem ?? serverError;

  return (
    <section className="flex flex-col rounded-2xl border border-line bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Your Marketing Copy</h2>
        <span className={`text-xs tabular-nums ${len > COPY_MAX || (len > 0 && len < COPY_MIN) ? "text-red-400" : "text-zinc-500"}`}>
          {len.toLocaleString()}/{COPY_MAX.toLocaleString()}
        </span>
      </div>
      <textarea
        value={copy}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
        rows={5}
        placeholder="Paste your product pitch, ad copy or landing page text (min 20 characters)…"
        className="w-full flex-1 resize-y rounded-xl border border-line bg-bg p-3 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-accent disabled:opacity-60"
        aria-label="Marketing copy"
      />
      {message && <p className="mt-2 text-xs text-red-400" role="alert">{message}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-400">Try sample copy:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => onChange(s.copy)}
              className="flex items-center gap-2 rounded-full border border-line bg-card2 px-3 py-1 text-sm text-zinc-200 transition hover:border-accent disabled:opacity-40"
            >
              <span className={`h-2 w-2 rounded-full ${SAMPLE_DOT[s.id]}`} />
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={busy || len === 0 || !!problem}
          className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <span aria-hidden>▶</span>}
          {busy ? "Running…" : "Run Panel"}
        </button>
      </div>
    </section>
  );
}
