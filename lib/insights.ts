import type { Aggregate } from "./aggregate";
import { getPersona } from "./personas";
import { isOk, type VoteResult } from "./schemas";

export type Insight = { tone: "good" | "warn" | "bad" | "info"; text: string };

const names = (ids: string[]) => {
  const n = ids.map((id) => getPersona(id)?.name ?? id);
  return n.length > 3 ? `${n.slice(0, 3).join(", ")} +${n.length - 3} more` : n.join(", ");
};

/** Plain-language takeaways, derived only from the actual votes and aggregate. */
export function deriveInsights(votes: VoteResult[], agg: Aggregate): Insight[] {
  const ok = votes.filter(isOk);
  if (ok.length === 0) return [];
  const out: Insight[] = [];
  const by = (d: string) => ok.filter((v) => v.decision === d).map((v) => v.personaId);
  const buy = by("buy"), pass = by("pass");
  if (buy.length) out.push({ tone: "good", text: `Interest from ${names(buy)}` });
  if (pass.length) out.push({ tone: "bad", text: `Pass from ${names(pass)}` });
  const top = agg.top_objections[0];
  if (top) out.push({ tone: "warn", text: `Most common concern: ${top.objection} (${top.count} of ${agg.successful})` });
  if (agg.model_disagreement.contested) {
    out.push({ tone: "warn", text: `Models disagree by ${Math.round(agg.model_disagreement.spread * 100)} pts, so treat this result as contested` });
  }
  const sorted = [...ok].sort((a, b) => b.purchase_likelihood - a.purchase_likelihood);
  const hi = sorted[0], lo = sorted[sorted.length - 1];
  if (hi && lo && hi.personaId !== lo.personaId) {
    out.push({ tone: "info", text: `Widest gap: ${getPersona(hi.personaId)?.name} (${Math.round(hi.purchase_likelihood * 100)}%) vs ${getPersona(lo.personaId)?.name} (${Math.round(lo.purchase_likelihood * 100)}%)` });
  }
  const failed = votes.length - ok.length;
  if (failed > 0) out.push({ tone: "info", text: `${failed} persona${failed === 1 ? "" : "s"} failed and ${failed === 1 ? "is" : "are"} excluded from the score` });
  return out;
}
