/**
 * MOCK_MODE data. Canned, heuristic responses so the app can be demonstrated without credentials.
 * Nothing here talks to a model, and mock results are labelled with "mock-*" model ids.
 */
import type { Persona } from "./personas";
import type { Change, ObjectionInput, Rewrite, VoteResult } from "./schemas";

type Category = "price" | "evidence" | "vague" | "risk" | "privacy" | "audience";

const HYPE =
  /revolutionary|game-changing|next-generation|cutting-edge|transform your life|unlock your|ultimate|amazing|world-class|best[- ]in[- ]class|don't miss out|join the future/gi;

export type Signals = {
  price: boolean;
  risk: boolean;
  concrete: boolean;
  privacy: boolean;
  audience: boolean;
  benefit: boolean;
  hype: number;
  long: boolean;
  proof: boolean;
  compat: boolean;
};

export function signals(copy: string): Signals {
  return {
    price: /\$\s?\d|\d+\s?(usd|dollars)|per (month|year)|\/mo\b|\bfree\b/i.test(copy),
    risk: /refund|guarantee|cancel|trial/i.test(copy),
    concrete: (copy.match(/\d+/g) ?? []).length >= 3,
    privacy: /privacy|never uploaded|on your phone|on-device|encrypt|your data/i.test(copy),
    audience: /famil|student|owner|teams?\b|household|beginner|professional|if you/i.test(copy),
    benefit: /help|save|plan|reduce|faster|less|easier|stop/i.test(copy),
    hype: (copy.match(HYPE) ?? []).length,
    long: copy.length >= 120,
    proof: /independent|tested|review|audit|certified|study|studies/i.test(copy),
    compat: /works with|integrat|compatible/i.test(copy),
  };
}

/** 0..1 heuristic of how convincing the copy is. */
export function quality(copy: string): number {
  const s = signals(copy);
  const q =
    0.05 +
    (s.price ? 0.22 : 0) +
    (s.risk ? 0.17 : 0) +
    (s.concrete ? 0.17 : 0) +
    (s.privacy ? 0.07 : 0) +
    (s.audience ? 0.08 : 0) +
    (s.benefit ? 0.25 : 0) +
    (s.compat ? 0.08 : 0) +
    (s.proof ? 0.1 : 0) +
    (s.long ? 0.04 : 0) -
    Math.min(0.4, s.hype * 0.07);
  return Math.max(0, Math.min(1, q));
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const BASE_OBJECTION: Record<Category, string> = {
  price: "No clear price or cost information",
  evidence: "No evidence or proof behind the claims",
  vague: "Vague, generic marketing language",
  risk: "No refund, trial or cancellation terms",
  privacy: "Unclear how my data is handled",
  audience: "Unclear who this is for and what it does",
};

const BASE_CONVINCE: Record<Category | "minor", string> = {
  price: "A clear price and exactly what is included",
  evidence: "Independent proof or concrete specifics backing the claims",
  vague: "Plain statements of what it does and who it is for",
  risk: "A free trial or refund policy I can use risk-free",
  privacy: "A clear statement of how my data is handled",
  audience: "A clear description of who it is for and how it works",
  minor: "Reviews from real, independent users",
};

type Profile = {
  voice: string;
  lean: number;
  priority: Category[];
  objections?: Partial<Record<Category, string>>;
  adjust?: (s: Signals) => number;
};

const PROFILES: Record<string, Profile> = {
  "skeptical-parent": {
    voice: "As a parent,",
    lean: -0.08,
    priority: ["evidence", "privacy", "risk", "vague", "price", "audience"],
    objections: { evidence: "No proof the claims are safe or tested", privacy: "Unclear whether my family's data is protected" },
    adjust: (s) => (s.proof ? 0 : -0.2),
  },
  "broke-college-student": {
    voice: "On my budget,",
    lean: -0.04,
    priority: ["price", "risk", "vague", "evidence", "audience", "privacy"],
    objections: { price: "No price or cost given, so I can't tell if there's a free tier" },
    adjust: (s) => (s.price ? 0 : -0.14),
  },
  "busy-executive": {
    voice: "Skimming this,",
    lean: 0.05,
    priority: ["vague", "audience", "evidence", "price", "risk", "privacy"],
    adjust: (s) => (s.benefit && s.hype === 0 ? 0.06 : 0),
  },
  "retired-teacher": {
    voice: "In plain terms,",
    lean: -0.04,
    priority: ["vague", "price", "risk", "audience", "evidence", "privacy"],
    adjust: (s) => -Math.min(0.14, s.hype * 0.04),
  },
  "eco-millennial": {
    voice: "Looking at the impact,",
    lean: 0,
    priority: ["evidence", "vague", "privacy", "price", "risk", "audience"],
    objections: { evidence: "No evidence for the claims about real impact" },
    adjust: (s) => (s.benefit ? 0.06 : 0) - (s.proof ? 0 : 0.1),
  },
  "tech-early-adopter": {
    voice: "Technically speaking,",
    lean: 0.06,
    priority: ["evidence", "vague", "audience", "privacy", "price", "risk"],
    objections: { evidence: "No evidence or detail backing the claims" },
    adjust: (s) => (s.concrete ? 0.05 : -0.04),
  },
  "small-business-owner": {
    voice: "For my shop,",
    lean: 0,
    priority: ["price", "audience", "evidence", "risk", "vague", "privacy"],
    objections: { price: "No price or cost, so I can't judge the payback", audience: "Unclear if this works for a small business like mine" },
  },
  "anxious-first-time-buyer": {
    voice: "Honestly I'm nervous,",
    lean: -0.04,
    priority: ["risk", "price", "evidence", "audience", "vague", "privacy"],
    objections: { risk: "No refund, trial or cancel-anytime reassurance" },
    adjust: (s) => (s.risk ? 0.05 : -0.1),
  },
  "bargain-hunter": {
    voice: "Price-wise,",
    lean: -0.06,
    priority: ["price", "risk", "evidence", "vague", "audience", "privacy"],
    objections: { price: "Price and cost aren't stated or justified against alternatives" },
    adjust: (s) => (s.price ? 0.03 : -0.14),
  },
  "cynical-journalist": {
    voice: "Reading this skeptically,",
    lean: -0.1,
    priority: ["evidence", "vague", "privacy", "price", "risk", "audience"],
    objections: { evidence: "No independent evidence or proof for the claims" },
    adjust: (s) => -Math.min(0.14, s.hype * 0.05) - (s.proof ? 0 : 0.2),
  },
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function applicable(s: Signals): Set<Category> {
  const set = new Set<Category>();
  if (!s.price) set.add("price");
  if (!s.concrete) set.add("evidence");
  if (s.hype > 0 || !s.benefit) set.add("vague");
  if (!s.risk) set.add("risk");
  if (!s.privacy) set.add("privacy");
  if (!s.audience) set.add("audience");
  return set;
}

/** Contiguous snippet of the copy (always a true substring). */
function pickTrigger(copy: string, category: Category | null, positive: boolean, seed: number): string {
  const take = (start: number) => {
    const slice = copy.slice(start, start + 70);
    const cut = start + 70 < copy.length ? slice.replace(/\s+\S*$/, "") : slice;
    return cut.replace(/[\s,;:.!?"']+$/, "").trim();
  };
  const patterns: Record<Category, RegExp> = {
    price: /\$\s?\d[\d.,]*[^.]*|free[^.]*/i,
    evidence: /\d+[- ]\w+/,
    vague: new RegExp(HYPE.source, "i"),
    risk: /refund|cancel|trial|guarantee/i,
    privacy: /never uploaded|on your phone|data/i,
    audience: /famil\w*|household\w*|students?|owners?/i,
  };
  const order: Category[] = positive ? ["price", "risk", "privacy", "evidence"] : category ? [category] : [];
  for (const c of order) {
    const m = patterns[c].exec(copy);
    if (m) {
      const t = take(m.index);
      if (t) return t;
    }
  }
  const sentences = copy.match(/[^.!?]+[.!?]*/g)?.filter((x) => x.trim()) ?? [];
  if (!sentences.length) return "";
  const sentence = sentences[Math.floor(seed * sentences.length) % sentences.length];
  const start = copy.indexOf(sentence) + (sentence.length - sentence.trimStart().length);
  return take(start);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockVote(copy: string, persona: Persona, isRetry = false): Promise<VoteResult> {
  const started = Date.now();
  await delay(200 + Math.random() * 700);

  const slot = persona.model.replace("MODEL_", "");
  const model = `mock-${slot}`;
  const s = signals(copy);
  const q = quality(copy);

  // Deterministic demo of a failing persona: only ambiguous-quality copy, only on the first attempt.
  if (persona.id === "bargain-hunter" && !isRetry && q > 0.3 && q < 0.65) {
    return {
      error: true,
      personaId: persona.id,
      model,
      latencyMs: Date.now() - started,
      message: "Mock: simulated gateway timeout. Retry to get this persona's evaluation.",
    };
  }

  const profile = PROFILES[persona.id];
  const seed = hash(persona.id + copy);
  const noise = (seed - 0.5) * 0.12;
  // Mid-quality copy makes the three "models" read it differently, to exercise model disagreement.
  const midness = 1 - Math.abs(q - 0.5) * 2;
  const modelBias = slot === "B" ? 0.14 * midness : slot === "C" ? -0.14 * midness : 0;

  const likelihood = Math.max(
    0,
    Math.min(1, Math.round((0.1 + q * 0.75 + profile.lean * 1.5 + (profile.adjust?.(s) ?? 0) + modelBias + noise) * 100) / 100),
  );
  const decision = likelihood >= 0.6 ? "buy" : likelihood >= 0.3 ? "maybe" : "pass";

  const open = applicable(s);
  const category = profile.priority.find((c) => open.has(c)) ?? null;
  const objection = category
    ? profile.objections?.[category] ?? BASE_OBJECTION[category]
    : "Nothing major, but I'd want independent reviews first";
  const convince = BASE_CONVINCE[category ?? "minor"];

  const reasoning =
    decision === "buy"
      ? `${profile.voice} this fits my situation and the terms feel low-risk. I'd give it a try.`
      : decision === "maybe"
        ? `${profile.voice} it sounds useful, but ${lowerFirst(objection)}. I'd want that sorted before paying.`
        : `${profile.voice} the copy doesn't earn my money: ${lowerFirst(objection)}. As written I'd skip it.`;

  return {
    decision,
    purchase_likelihood: likelihood,
    top_objection: objection,
    trigger_phrase: pickTrigger(copy, category, decision === "buy", seed),
    what_would_convince_me: convince,
    reasoning,
    personaId: persona.id,
    model,
    latencyMs: Date.now() - started,
  };
}

const REPLACEMENT: Record<Category, string> = {
  price: "Pricing is shown up front: one monthly price, no hidden fees, and free to start.",
  evidence: "Every claim is backed by specifics you can check, with sample plans and independent review.",
  vague: "It does one clear job and says plainly what it does: plan dinners from what you already have.",
  risk: "Try it with a free trial and a clear refund and cancel-anytime policy.",
  privacy: "Your data stays on your phone, and the privacy policy explains how it is handled.",
  audience: "Built for busy households that want to plan meals around what they already have.",
};

function categorize(objection: string): Category {
  const o = objection.toLowerCase();
  if (/price|cost|pricing|expensive|free tier|payback/.test(o)) return "price";
  if (/proof|evidence|claim|tested|independent|detail|specific|impact|review/.test(o)) return "evidence";
  if (/refund|trial|risk|guarantee|cancel/.test(o)) return "risk";
  if (/privacy|data|safe|protected/.test(o)) return "privacy";
  if (/who|audience|small business|works for/.test(o)) return "audience";
  return "vague";
}

export async function mockRewrite(copy: string, objections: ObjectionInput[]): Promise<Rewrite> {
  await delay(600 + Math.random() * 600);
  const sentences = (copy.match(/[^.!?]+[.!?]*\s*/g) ?? [copy]).map((x) => x.trim()).filter(Boolean);
  const categories = objections.map((o) => ({ cat: categorize(o.objection), label: o.objection }));
  const changes: Change[] = [];
  const out = [...sentences];
  const used = new Set<Category>();

  // Replace hype / filler sentences first; otherwise extend the last sentence.
  const weakIdx = sentences
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => new RegExp(HYPE.source, "i").test(s) || /what's possible|available\.?$/i.test(s));

  categories.forEach(({ cat, label }, n) => {
    if (used.has(cat)) return;
    used.add(cat);
    const target = weakIdx[n];
    if (target) {
      out[target.i] = REPLACEMENT[cat];
      changes.push({ before: target.s, after: REPLACEMENT[cat], objection_addressed: label });
    } else {
      const last = out.length - 1;
      const before = sentences[last];
      const after = `${out[last]} ${REPLACEMENT[cat]}`;
      if (!changes.some((c) => c.before === before)) {
        out[last] = after;
        changes.push({ before, after, objection_addressed: label });
      } else {
        out.push(REPLACEMENT[cat]);
      }
    }
  });

  return { revised_copy: out.join(" "), changes_made: changes };
}
