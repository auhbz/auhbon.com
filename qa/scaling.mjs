// Checks the milestone/unlock scaling in src/lib/fun.ts for several secret counts: node qa/scaling.mjs
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../src/lib/fun.ts", import.meta.url), "utf8");
// Pull the two functions straight from the source (strip types) so the test checks the real code.
const grab = (name) => { const i = src.indexOf(`export function ${name}`); let d = 0, j = src.indexOf("{", i); for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; if (src[k] === "}" && --d === 0) return src.slice(i, k + 1); } };
let code = grab("scaledThreshold") + "\n" + grab("scaledMilestones");
code = code.replace(/export /g, "").replace(/: number = liveSecretCount\(\)/g, "").replace(/\(at: number, n\)/, "(at, n)").replace(/\(n\)/, "(n)").replace(/: number/g, "").replace(/\(at, n\)/, "(at, n)");
const MILESTONES = [5, 10, 15, 25, 40, 65, 97, 100].map((at) => ({ at }));
const SECRET_GOAL = 100;
const f = new Function("MILESTONES", "SECRET_GOAL", code + "; return { scaledThreshold, scaledMilestones };")(MILESTONES, SECRET_GOAL);
let ok = true;
for (const n of [10, 12, 20, 35, 36, 50, 60, 75, 90, 99, 100]) {
  const c = f.scaledMilestones(n).map((m) => m.count);
  const inc = c.every((v, i) => i === 0 || v > c[i - 1]) && c[0] >= 1 && c.at(-1) === n;
  if (!inc) ok = false;
  console.log(String(n).padStart(3), c.join(" "), inc ? "" : "  <-- BAD", "| unlock at 1..10:", [1,2,3,4,5,6,7,8,10].map((a) => f.scaledThreshold(a, n)).join(" "));
}
const exact = f.scaledMilestones(100).every((m) => m.count === m.at) && [0,1,7,33,100].every((a) => f.scaledThreshold(a, 100) === a);
console.log("N=100 identity:", exact, "all increasing:", ok);
