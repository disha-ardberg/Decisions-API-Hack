"use client";

import { SAMPLES } from "@/lib/samples";
import { COPY_MAX, COPY_MIN, validateCopy } from "@/lib/schemas";

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
    <section className="rounded-2xl border border-line bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-400">Try a sample:</span>
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => onChange(s.copy)}
            className="rounded-full border border-line px-3 py-1 text-sm text-zinc-300 transition hover:border-accent hover:text-white disabled:opacity-40"
          >
            {s.label}
          </button>
        ))}
      </div>
      <textarea
        value={copy}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
        rows={7}
        placeholder="Paste your product pitch, ad copy or landing page text…"
        className="w-full resize-y rounded-xl border border-line bg-bg p-3 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-accent disabled:opacity-60"
        aria-label="Marketing copy"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs">
          <span className={len > COPY_MAX || (len > 0 && len < COPY_MIN) ? "text-red-400" : "text-zinc-500"}>
            {len.toLocaleString()} / {COPY_MAX.toLocaleString()} characters (min {COPY_MIN})
          </span>
          {message && <p className="mt-1 text-red-400" role="alert">{message}</p>}
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={busy || len === 0 || !!problem}
          className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,108,255,.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? "Running…" : "Run Panel"}
        </button>
      </div>
    </section>
  );
}
