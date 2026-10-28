"use client";

import { useEffect, useState } from "react";
import { SAMPLES } from "@/lib/samples";
import { COPY_MAX, validateCopy } from "@/lib/schemas";

export default function ApiTab({ initialCopy }: { initialCopy?: string }) {
  const [copy, setCopy] = useState(initialCopy ?? SAMPLES[0].copy);
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [withRewrite, setWithRewrite] = useState(false);
  const [raw, setRaw] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [latency, setLatency] = useState<{ id: string; ms: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const sample = copy.trim() || "Your marketing copy here (20 to 3,000 characters)";
  const body = JSON.stringify({ copy: sample, rewrite: withRewrite }, null, 2);
  const curl = `curl -X POST ${origin}/api/decide \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ copy: sample, rewrite: withRewrite }).replace(/'/g, "'\\''")}'`;
  const invalid = validateCopy(copy);

  async function send() {
    setLoading(true);
    setStatus(null);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ copy, rewrite: withRewrite }) });
      const data = await res.json();
      setStatus(`HTTP ${res.status} in ${Date.now() - t0} ms`);
      setRaw(JSON.stringify(data, null, 2));
      const votes = [...(data.votes ?? []), ...(data.revote?.votes ?? [])];
      setLatency(votes.map((v: { personaId: string; latencyMs: number }) => ({ id: v.personaId, ms: v.latencyMs })));
    } catch {
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function copyJson() {
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const pre = "overflow-x-auto rounded-xl border border-line bg-bg p-3 text-xs leading-relaxed text-zinc-300";

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
      <div>
        <h3 className="font-semibold"><code className="rounded bg-bg px-2 py-0.5 text-accent">POST /api/decide</code></h3>
        <p className="mt-1 text-sm text-zinc-400">Runs the full panel server-side (concurrency 5) and returns score, split, votes, objections, and optionally the rewrite and re-vote.</p>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs uppercase tracking-wide text-zinc-500"><span>Copy to send</span><span>{copy.trim().length}/{COPY_MAX}</span></div>
        <textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={4} className="w-full resize-y rounded-xl border border-line bg-bg p-3 text-sm text-zinc-200 outline-none focus:border-accent" aria-label="Copy to send to the API" />
      </div>
      <div><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Request</div><pre className={pre}>{body}</pre></div>
      <div><div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">curl</div><pre className={pre}>{curl}</pre></div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={withRewrite} onChange={(e) => setWithRewrite(e.target.checked)} /> rewrite: true
        </label>
        <button onClick={send} disabled={loading || !!invalid} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {loading ? "Calling…" : "Send with current copy"}
        </button>
        {invalid && <span className="text-xs text-zinc-500">{invalid}</span>}
        {status && <span className="text-xs text-zinc-400">{status}</span>}
      </div>

      {raw && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Last response</span>
            <button onClick={copyJson} className="rounded-lg border border-line px-2 py-1 text-xs text-zinc-300 hover:text-white">{copied ? "Copied" : "Copy JSON"}</button>
          </div>
          <pre className={`${pre} max-h-96`}>{raw}</pre>
          {latency.length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">Per-call latency (ms): {latency.map((l) => `${l.id} ${l.ms}`).join(" · ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
