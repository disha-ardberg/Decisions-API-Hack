import { SAMPLES } from "../lib/samples";
async function main() {
  for (const s of SAMPLES) {
    const r = await fetch("http://localhost:3111/api/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ copy: s.copy, rewrite: true }) });
    const d: any = await r.json();
    console.log(`\n== ${s.id}: score ${d.score} split ${JSON.stringify(d.split)} contested ${d.model_disagreement.contested} spread ${d.model_disagreement.spread.toFixed(2)}`);
    console.log(" objections:", d.top_objections.map((o: any) => `${o.objection} x${o.count}`).join(" | "));
    console.log(" votes:", d.votes.map((v: any) => `${v.personaId.slice(0,6)}:${v.decision[0]}${Math.round(v.purchase_likelihood*100)}`).join(" "));
    const bad = d.votes.filter((v: any) => v.trigger_phrase && !s.copy.includes(v.trigger_phrase));
    console.log(" triggers verbatim:", bad.length === 0);
    if (d.rewrite) {
      console.log(` revote: score ${d.revote.score} split ${JSON.stringify(d.revote.split)} | changes ${d.rewrite.changes_made.length} | len ${s.copy.length} -> ${d.rewrite.revised_copy.length}`);
    } else console.log(" rewrite_error:", d.rewrite_error);
    console.log(" meta:", JSON.stringify(d.meta));
  }
}
main();
