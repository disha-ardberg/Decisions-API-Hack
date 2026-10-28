"use client";

import { PERSONAS } from "@/lib/personas";
import type { Round } from "@/lib/useFocusGroup";
import PersonaNode from "./PersonaNode";

export default function ReactionMap({ round, onSelect }: { round: Round; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-5">
      {PERSONAS.map((p) => (
        <PersonaNode key={p.id} persona={p} state={round[p.id]} onClick={() => onSelect(p.id)} />
      ))}
    </div>
  );
}
