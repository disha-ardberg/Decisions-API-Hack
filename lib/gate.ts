export type GatePolicy = {
  min_score: number;
  max_objection_share: number;
  min_custom_score: number;
  kill_below: number;
  min_responded_share: number;
};

export const DEFAULT_GATE_POLICY: Readonly<GatePolicy> = {
  min_score: 55,
  max_objection_share: 0.4,
  min_custom_score: 45,
  kill_below: 20,
  min_responded_share: 0.6,
};

export type GateInput = {
  score: number | null;
  votes: Array<{ error?: boolean }>;
  top_objections: Array<{ objection: string; count: number }>;
  group_scores?: { custom?: { score: number | null; count: number } };
};

export type GateRule = {
  id: "min_score" | "max_objection_share" | "min_custom_score" | "min_responded_share";
  label: string;
  passed: boolean;
  actual: number | null;
  threshold: number;
};

export type GateEvaluation = {
  verdict: "ship" | "revise" | "kill";
  rules: GateRule[];
  flip_hint: string;
  responded: string;
};

export function evaluate(result: GateInput, policy: Partial<GatePolicy> = {}): GateEvaluation {
  const p = { ...DEFAULT_GATE_POLICY, ...policy };
  const total = result.votes.length;
  const successful = result.votes.filter((vote) => !vote.error).length;
  const respondedShare = total === 0 ? 0 : successful / total;
  const highest = result.top_objections.reduce<{ objection: string; count: number } | null>(
    (current, objection) => !current || objection.count > current.count ? objection : current,
    null,
  );
  const objectionShare = successful === 0 ? 0 : (highest?.count ?? 0) / successful;
  const rules: GateRule[] = [
    { id: "min_score", label: "Score is at least the minimum", passed: result.score !== null && result.score >= p.min_score, actual: result.score, threshold: p.min_score },
    { id: "max_objection_share", label: "Top objection share is at most the maximum", passed: objectionShare <= p.max_objection_share, actual: objectionShare, threshold: p.max_objection_share },
    { id: "min_responded_share", label: "Responded share is at least the minimum", passed: respondedShare >= p.min_responded_share, actual: respondedShare, threshold: p.min_responded_share },
  ];
  const custom = result.group_scores?.custom;
  if (custom && custom.count > 0) {
    rules.push({ id: "min_custom_score", label: "Custom-persona score is at least the minimum", passed: custom.score !== null && custom.score >= p.min_custom_score, actual: custom.score, threshold: p.min_custom_score });
  }

  const hints: string[] = [];
  if (result.score === null || respondedShare < p.min_responded_share) {
    hints.push("Too few judges responded, re-run");
  }
  for (const rule of rules.filter((item) => !item.passed)) {
    if (rule.id === "min_score" && result.score !== null) hints.push(`Raise score by ${Math.ceil(p.min_score - result.score)} points`);
    if (rule.id === "max_objection_share" && highest) {
      const allowed = Math.floor(p.max_objection_share * successful);
      hints.push(`Reduce '${highest.objection}' objection from ${highest.count} to ${allowed} judges`);
    }
    if (rule.id === "min_custom_score" && custom?.score !== null && custom?.score !== undefined) {
      hints.push(`Raise custom-persona score by ${Math.ceil(p.min_custom_score - custom.score)} points`);
    }
  }

  // Verdict order is deliberate: insufficient evidence revises first; a reliable
  // score below kill_below kills; otherwise every hard rule must pass to ship.
  let verdict: GateEvaluation["verdict"];
  if (result.score === null || respondedShare < p.min_responded_share) verdict = "revise";
  else if (result.score < p.kill_below) verdict = "kill";
  else if (rules.every((rule) => rule.passed)) verdict = "ship";
  else verdict = "revise";

  return { verdict, rules, flip_hint: hints.join(" or "), responded: `${successful} of ${total}` };
}
