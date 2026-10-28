import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function PageHeader({ crumbs, title, subtitle, actions }: { crumbs: Crumb[]; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6">
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {c.href ? <Link href={c.href} className="hover:text-white">{c.label}</Link> : <span className="text-zinc-300">{c.label}</span>}
            {i < crumbs.length - 1 && <span aria-hidden>/</span>}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-zinc-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-40";
export const btnGhost =
  "inline-flex items-center gap-2 rounded-xl border border-line bg-card2 px-4 py-2 text-sm text-zinc-200 transition hover:border-accent disabled:pointer-events-none disabled:opacity-40";
