"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { aggOf, useEvaluations } from "@/lib/evaluations";

type Item = { href: string; label: string; icon: string; active: boolean; disabled?: boolean };

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const params = useParams<{ id?: string }>();
  const { evaluations, mock } = useEvaluations();
  // Insights/Rewrite are per-evaluation: follow the one in the URL, else the latest.
  const currentId = (typeof params?.id === "string" ? params.id : undefined) ?? evaluations[0]?.id;

  const items: Item[] = [
    { href: "/", label: "Overview", icon: "▦", active: path === "/" },
    { href: "/evaluate", label: "New Evaluation", icon: "＋", active: path === "/evaluate" },
    { href: "/personas", label: "Personas", icon: "◉", active: path.startsWith("/personas") },
    { href: currentId ? `/insights/${currentId}` : "#", label: "Insights", icon: "◔", active: path.startsWith("/insights"), disabled: !currentId },
    { href: currentId ? `/rewrite/${currentId}` : "#", label: "Rewrite Studio", icon: "✎", active: path.startsWith("/rewrite"), disabled: !currentId },
    { href: "/api-docs", label: "API Docs", icon: "</>", active: path.startsWith("/api-docs") },
  ];

  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="mb-6 flex items-center gap-3 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-fuchsia-500 text-lg font-bold text-white">P</span>
        <span>
          <span className="block text-lg font-semibold leading-none tracking-tight">Panel</span>
          <span className="text-[11px] text-zinc-500">Synthetic Customer Intelligence</span>
        </span>
      </Link>

      <nav className="space-y-1" aria-label="Main">
        {items.map((i) => (
          <Link
            key={i.label}
            href={i.href}
            onClick={onNavigate}
            aria-current={i.active ? "page" : undefined}
            aria-disabled={i.disabled}
            tabIndex={i.disabled ? -1 : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              i.active ? "bg-accent/20 text-white" : i.disabled ? "pointer-events-none text-zinc-600" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="w-5 text-center text-xs" aria-hidden>{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Recent evaluations</div>
        {evaluations.length === 0 && <p className="px-3 text-xs text-zinc-600">None yet.</p>}
        <ul className="space-y-1">
          {evaluations.slice(0, 6).map((e) => {
            const score = aggOf(e.original).score;
            const on = params?.id === e.id;
            return (
              <li key={e.id}>
                <Link href={`/evaluate/${e.id}`} onClick={onNavigate} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs transition ${on ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
                  <span className="truncate">{e.copy.slice(0, 28)}…</span>
                  <span className="shrink-0 font-semibold tabular-nums text-zinc-300">{e.active !== null && e.completed < 3 ? "…" : score === null ? "—" : `${score}%`}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {mock !== null && (
        <div className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${mock ? "border-amber-500/40 text-amber-300" : "border-emerald-500/40 text-emerald-300"}`}>
          <span className={`h-2 w-2 rounded-full ${mock ? "bg-amber-400" : "bg-emerald-400"}`} />
          {mock ? "Demo Mode (mock data)" : "Live Mode"}
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-card/60 p-4 backdrop-blur lg:block">
        <Nav />
      </aside>

      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-fuchsia-500 text-sm font-bold text-white">P</span>Panel
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-lg border border-line px-3 py-1.5 text-sm" aria-label="Open menu">☰ Menu</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-line bg-card p-4">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 text-zinc-400" aria-label="Close menu">✕</button>
            <Nav onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
