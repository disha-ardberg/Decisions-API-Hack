"use client";

import { useState } from "react";
import { PERSONAS } from "@/lib/personas";
import type { Round } from "@/lib/evaluations";
import PersonaNode from "./PersonaNode";

type Props = { round: Round; selected: string | null; onSelect: (id: string) => void; right?: React.ReactNode };

export default function ReactionMap({ round, selected, onSelect, right }: Props) {
  const [list, setList] = useState(false);
  const done = Object.values(round).filter((n) => n.status === "done" || n.status === "error").length;

  const toggle = (label: string, on: boolean) => (
    <button onClick={() => setList(label === "List View")} className={`px-3 py-1 text-xs ${on ? "bg-accent text-white" : "text-zinc-400 hover:text-white"}`}>{label}</button>
  );

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Customer Reaction Map</h2>
          <p className="text-xs text-zinc-400">10 synthetic customer personas · {done}/10 evaluated</p>
        </div>
        <div className="flex items-center gap-3">
          {right}
          <div className="flex overflow-hidden rounded-lg border border-line">{toggle("Grid View", !list)}{toggle("List View", list)}</div>
        </div>
      </div>
      <div className={list ? "flex flex-col gap-2" : "grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-5"}>
        {PERSONAS.map((p) => (
          <PersonaNode key={p.id} persona={p} state={round[p.id]} selected={selected === p.id} onClick={() => onSelect(p.id)} list={list} />
        ))}
      </div>
    </section>
  );
}
