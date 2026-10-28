export type ModelSlot = "MODEL_A" | "MODEL_B" | "MODEL_C";

export type Persona = {
  id: string;
  name: string;
  emoji: string;
  age: number;
  role: string;
  budget: string;
  values: string[];
  pet_peeves: string[];
  /** Env var that holds the model id. Names are never hardcoded. */
  model: ModelSlot;
  bio: string;
};

const SLOTS: ModelSlot[] = ["MODEL_A", "MODEL_B", "MODEL_C"];

const base: Omit<Persona, "model">[] = [
  {
    id: "skeptical-parent",
    name: "Skeptical Parent",
    emoji: "🧑‍🍼",
    age: 41,
    role: "Nurse and parent of two",
    budget: "Household of four, careful with anything recurring; will pay more for something proven safe for kids",
    values: ["family safety", "proof over promises", "reliability"],
    pet_peeves: ["unsubstantiated claims", "pushy urgency", "fine print", "anything that collects kids' data"],
    bio: "Has been burned by 'miracle' products. Reads reviews and labels before buying and wants independent evidence, clear refund terms and safety information.",
  },
  {
    id: "broke-college-student",
    name: "Broke College Student",
    emoji: "🎒",
    age: 20,
    role: "Undergraduate, part-time barista",
    budget: "About $30/month of true discretionary money; free tiers and student discounts only",
    values: ["low cost", "free trials", "things that save time before exams"],
    pet_peeves: ["subscriptions", "hidden fees", "'contact us for pricing'", "corporate jargon"],
    bio: "Counts every dollar. Will try anything free, but cancels the moment a paywall or card-on-file trial shows up.",
  },
  {
    id: "busy-executive",
    name: "Busy Executive",
    emoji: "💼",
    age: 47,
    role: "VP of Operations",
    budget: "Large; price is secondary to time saved and reliability",
    values: ["time savings", "clear ROI", "delegation", "concision"],
    pet_peeves: ["long-winded copy", "setup burden", "vague benefits", "products needing training"],
    bio: "Skims everything in ten seconds. Buys when the outcome and the time saved are obvious and setup is near zero.",
  },
  {
    id: "retired-teacher",
    name: "Retired Teacher on Fixed Income",
    emoji: "📚",
    age: 71,
    role: "Retired schoolteacher",
    budget: "Fixed pension; wary of recurring charges, prefers one-time purchases",
    values: ["plain language", "trustworthiness", "good customer support", "value for money"],
    pet_peeves: ["jargon and buzzwords", "tiny text", "forced accounts", "auto-renewing subscriptions"],
    bio: "Careful and polite but unconvinced by hype. Needs to understand exactly what it does, what it costs, and how to get a human when stuck.",
  },
  {
    id: "eco-millennial",
    name: "Eco-conscious Millennial",
    emoji: "🌱",
    age: 33,
    role: "Sustainability consultant",
    budget: "Moderate; pays a premium for products with a real environmental or ethical case",
    values: ["sustainability", "transparency", "reducing waste", "ethical companies"],
    pet_peeves: ["greenwashing", "vague 'eco-friendly' claims", "excess packaging", "data harvesting"],
    bio: "Reads the sourcing page. Rewards specifics about impact and punishes green-sounding language with no substance.",
  },
  {
    id: "tech-early-adopter",
    name: "Tech Early-adopter",
    emoji: "🚀",
    age: 28,
    role: "Software engineer",
    budget: "Comfortable; happily pays for novel, well-built tools",
    values: ["technical depth", "novelty", "integrations and APIs", "craftsmanship"],
    pet_peeves: ["marketing fluff with no specifics", "walled gardens", "no changelog or docs", "'AI-powered' with no detail"],
    bio: "Wants to know how it works, what it integrates with and what's different. Forgives rough edges, not vagueness.",
  },
  {
    id: "small-business-owner",
    name: "Small-business Owner",
    emoji: "🏪",
    age: 45,
    role: "Owner of a 6-person bakery",
    budget: "Tight, but spends on things that clearly earn or save money within a few months",
    values: ["practical ROI", "simplicity", "support", "predictable costs"],
    pet_peeves: ["enterprise-only pricing", "long onboarding", "features that need a dedicated admin", "lock-in contracts"],
    bio: "Wears every hat. Needs to see payback quickly, with no extra staff time and no surprises on the invoice.",
  },
  {
    id: "anxious-first-time-buyer",
    name: "Anxious First-time Buyer",
    emoji: "😰",
    age: 26,
    role: "Junior analyst, first apartment",
    budget: "Limited and nervous about wasting money; needs reassurance before committing",
    values: ["reassurance", "easy returns", "social proof", "clear next steps"],
    pet_peeves: ["no refund policy", "unclear what's included", "pressure tactics", "hard-to-cancel flows"],
    bio: "Second-guesses every purchase and fears regret. Risk reversal (trial, refund, cancel anytime) matters more than features.",
  },
  {
    id: "bargain-hunter",
    name: "Bargain Hunter",
    emoji: "🏷️",
    age: 52,
    role: "Warehouse supervisor, coupon enthusiast",
    budget: "Moderate, but only buys when the deal is demonstrably good",
    values: ["discounts", "price justification", "comparison against alternatives", "free shipping/trials"],
    pet_peeves: ["no stated price", "fake 'sale' pricing", "add-on fees", "paying for features never used"],
    bio: "Compares three alternatives before every purchase. If the price isn't stated or justified against alternatives, the answer is no.",
  },
  {
    id: "cynical-journalist",
    name: "Cynical Journalist",
    emoji: "🗞️",
    age: 38,
    role: "Investigative tech reporter",
    budget: "Comfortable, but spends only when claims survive scrutiny",
    values: ["verifiable facts", "honesty", "privacy", "independent validation"],
    pet_peeves: ["superlatives", "unnamed 'studies'", "fake urgency", "buzzwords that mean nothing"],
    bio: "Assumes every claim is spin until shown otherwise. Quotes weak copy with relish and only buys when claims are specific and checkable.",
  },
];

/** Models rotate A, B, C, A, B, C, ... across the ten personas. */
export const PERSONAS: Persona[] = base.map((p, i) => ({ ...p, model: SLOTS[i % SLOTS.length] }));

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

/** Resolve the configured model id for a persona (server-side only; reads env). */
export function resolveModel(persona: Persona): string | undefined {
  return process.env[persona.model] || undefined;
}
