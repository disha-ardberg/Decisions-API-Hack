import { isOk, type VoteOk, type VoteResult } from "./schemas";

export const EXPECTED_PERSONAS = 10;
export const CONTESTED_SPREAD = 0.25;

export type Split = { buy: number; maybe: number; pass: number };
export type RankedObjection = { objection: string; count: number; personaIds: string[] };
export type ModelDisagreement = {
  spread: number;
  contested: boolean;
  modelAverages: Record<string, number>;
};
export type Aggregate = {
  /** null when no persona produced a valid evaluation. Missing responses are never counted as 0. */
  score: number | null;
  successful: number;
  expected: number;
  split: Split;
  model_disagreement: ModelDisagreement;
  top_objections: RankedObjection[];
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function validVotes(votes: VoteResult[]): VoteOk[] {
  return votes.filter(isOk);
}

export function conversionScore(votes: VoteResult[]): number | null {
  const ok = validVotes(votes);
  if (ok.length === 0) return null;
  return Math.round(mean(ok.map((v) => v.purchase_likelihood)) * 100);
}

export function decisionSplit(votes: VoteResult[]): Split {
  const split: Split = { buy: 0, maybe: 0, pass: 0 };
  for (const v of validVotes(votes)) split[v.decision]++;
  return split;
}

export function modelDisagreement(votes: VoteResult[]): ModelDisagreement {
  const groups = new Map<string, number[]>();
  for (const v of validVotes(votes)) {
    groups.set(v.model, [...(groups.get(v.model) ?? []), v.purchase_likelihood]);
  }
  const modelAverages: Record<string, number> = {};
  for (const [m, xs] of groups) modelAverages[m] = mean(xs);
  const avgs = Object.values(modelAverages);
  // Fewer than two model groups cannot disagree.
  const spread = avgs.length < 2 ? 0 : Math.max(...avgs) - Math.min(...avgs);
  return { spread, contested: spread > CONTESTED_SPREAD, modelAverages };
}

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "be", "to", "of", "and", "or", "for", "in", "on", "it", "its",
  "this", "that", "with", "as", "at", "by", "not", "no", "any", "i", "my", "me", "does", "do", "doesn",
  "t", "s", "but", "from", "about", "your", "you", "what", "how", "much", "more", "than", "too", "so",
  "there", "their", "they", "have", "has", "had", "being", "been", "if", "up", "out",
]);

export function normalizeObjection(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    // crude stemming so "claims"/"claim", "prices"/"price" overlap
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w));
  return [...new Set(words)];
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size) >= 0.5;
}

export function rankObjections(votes: VoteResult[], top = 3): RankedObjection[] {
  type Cluster = { keywords: Set<string>; texts: Map<string, number>; personaIds: string[] };
  const clusters: Cluster[] = [];

  for (const v of validVotes(votes)) {
    const raw = v.top_objection.trim();
    if (!raw) continue;
    const kw = new Set(normalizeObjection(raw));
    let cluster = clusters.find((c) => overlaps(c.keywords, kw));
    if (!cluster) {
      cluster = { keywords: new Set(), texts: new Map(), personaIds: [] };
      clusters.push(cluster);
    }
    kw.forEach((w) => cluster!.keywords.add(w));
    cluster.texts.set(raw, (cluster.texts.get(raw) ?? 0) + 1);
    cluster.personaIds.push(v.personaId);
  }

  return clusters
    .map((c) => ({
      // Most frequently phrased variant; ties resolved by first seen.
      objection: [...c.texts.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count: c.personaIds.length,
      personaIds: c.personaIds,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}

export function aggregate(votes: VoteResult[], expected = EXPECTED_PERSONAS): Aggregate {
  return {
    score: conversionScore(votes),
    successful: validVotes(votes).length,
    expected,
    split: decisionSplit(votes),
    model_disagreement: modelDisagreement(votes),
    top_objections: rankObjections(votes),
  };
}
