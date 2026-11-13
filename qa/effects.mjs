// EFFECTS (MP5): hamster breakaway, passive secrets, chicken, pots, leaflings, Boring mode, fireworks and lanterns.
// Usage: BASE=http://localhost:3102/ node qa/effects.mjs [shots-dir]
// Seeds Fun mode with every fun feature unlocked by cheat.
import { launchBrowser } from "./browser.mjs";
import fs from "node:fs";
const ids = [...fs.readFileSync(new URL("../src/lib/unlocks.ts", import.meta.url), "utf8").matchAll(/\{ id: "((?:effect|theme|game|wild|toy|extra):[\w:-]+)"/g)].map((m) => m[1]);
const BASE_URL = process.env.BASE ?? "http://localhost:3000/";
let fails = 0;
const SHOTS = process.argv[2] ?? "/tmp";
fs.mkdirSync(SHOTS, { recursive: true });
const check = (ok, msg) => { console.log(`${ok ? "pass" : "FAIL"}  ${msg}`); if (!ok) fails++; };
const state = (effects, extra = {}) => ({ mode: "fun", funSeen: true, on: true, welcomed: true, hideSpot: 3, celebrated: [5,10,15,25,40,65,97,100], cheats: { enabled: true, unlocked: ids }, effects: { dots: { on: false, variant: "fruit" }, buttons: { on: false, variant: "rainbow" }, trail: { on: false, variant: "sparkle" }, sound: { on: false, variant: "chimes", hover: true }, ...effects }, look: "classic", secrets: [], ...extra });
const secrets = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).secrets);
(async () => {
  const b = await launchBrowser();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const load = async (st) => { await p.goto(BASE_URL); await p.evaluate((s) => localStorage.setItem("bells-and-whistles-v2", JSON.stringify(s)), st); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(400); };

  // Hamster: break free, secret
  await load(state({ dots: { on: true, variant: "hamsters" }, trail: { on: true, variant: "sparkle" } }));
  const ham = p.locator("[data-hamster]").first();
  let hb = await ham.boundingBox();
  for (let i = 0; i < 2; i++) { await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.waitForTimeout(250); hb = await ham.boundingBox(); }
  let st = 0;
  for (let i = 0; i < 80 && st < 4; i++) { await p.mouse.click(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.waitForTimeout(110); st = Number(await ham.getAttribute("data-stage")); }
  check(st === 4, `hamster: ~8 clicks/s breaks the wheel free (stage ${st})`);
  await p.waitForTimeout(600);
  check((await secrets(p)).includes("breakaway"), "hamster: breakaway secret");

  // Bubbles: interactivity + no early sweep
  await load(state({ dots: { on: true, variant: "bubbles" } }));
  await p.waitForTimeout(3000);
  check(!(await secrets(p)).includes("sweep"), "bubbles: sweep not found on load");

  // Shuffle x5 via fun.ts shuffle, fired from the panel button if present
  await load(state({}));
  const shuffled = await p.evaluate(async () => { for (let i = 0; i < 5; i++) window.dispatchEvent(new Event("portfolio:shuffle")); await new Promise((r) => setTimeout(r, 300)); return JSON.parse(localStorage.getItem("bells-and-whistles-v2")).secrets; });
  check(shuffled.includes("shuffling"), "shuffle x5: Every day I'm… secret");

  // Clicks x100
  await load(state({}));
  for (let i = 0; i < 99; i++) await p.mouse.click(30, 700);
  check(!(await secrets(p)).includes("clicky"), "clicks: not at 99");
  await p.mouse.click(30, 700); await p.waitForTimeout(200);
  check((await secrets(p)).includes("clicky"), "clicks: 100 clicks is a secret");

  // Return visit: yesterday recorded
  await p.evaluate(() => localStorage.setItem("fun-visits-v1", JSON.stringify({ last: "2000-01-01" })));
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(3000);
  check((await secrets(p)).includes("back"), "welcome back: a visit on a later day");

  // Chicken, pots, leaflings visible; chicken swarm
  await load(state({}));
  check(await p.locator("[data-chicken]").count() === 1, "chicken is on the page");
  check(await p.locator(".pot").count() === 3, "three clay pots");
  check(await p.locator("[data-leafling]").count() === 1, "one leafling hiding");
  const chicken = p.locator("[data-chicken]");
  await chicken.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${SHOTS}/chicken.png`, clip: { ...(await chicken.boundingBox()), x: (await chicken.boundingBox()).x - 150, y: (await chicken.boundingBox()).y - 60, width: 360, height: 140 } });
  for (let i = 0; i < 4; i++) { await chicken.click({ force: true }); await p.waitForTimeout(150); }
  check(await p.locator("[data-chicken-swarm]").count() === 1, "chicken: four pokes bring the swarm");
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${SHOTS}/swarm.png`, scale: "css" });
  check((await secrets(p)).includes("fowl"), "chicken: fowl play secret");
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  check(await p.locator("[data-chicken-swarm]").count() === 0, "chicken: Esc makes peace");
  // pots
  for (let k = 0; k < 3; k++) { const pot = p.locator(".pot").first(); await pot.scrollIntoViewIfNeeded(); await pot.click(); await p.waitForTimeout(250); }
  const g = await p.evaluate(() => Number(localStorage.getItem("fun-glimmers-v1")));
  check(g >= 6 && g <= 12, `pots: breaking three gave ${g} glimmers`);
  await p.locator(".pot-broken").first().scrollIntoViewIfNeeded();
  // leafling
  const leaf = p.locator(".leafling-cover");
  await leaf.scrollIntoViewIfNeeded();
  const lb = await leaf.boundingBox();
  await leaf.click(); await p.waitForTimeout(500);
  await p.screenshot({ path: `${SHOTS}/leafling.png`, clip: { x: Math.max(0, lb.x - 120), y: lb.y - 120, width: 300, height: 200 } });
  check((await p.evaluate(() => JSON.parse(localStorage.getItem("fun-leaflings-v1")))).length === 1, "leafling: found one");

  // Boring mode: none of the extras
  await load({ ...state({}), mode: "boring" });
  check(await p.locator("[data-chicken], .pot, [data-leafling]").count() === 0, "boring mode: no chicken, pots or leaflings");

  // Fireworks render
  await load(state({}));
  await p.evaluate(() => window.dispatchEvent(new CustomEvent("portfolio:celebrate", { detail: 10 })));
  await p.waitForTimeout(2600);
  check(await p.locator("[data-fireworks]").count() === 1, "fireworks: canvas show runs");
  await p.screenshot({ path: `${SHOTS}/fireworks.png`, scale: "css" });
  await p.evaluate(() => window.dispatchEvent(new CustomEvent("portfolio:celebrate", { detail: 15 })));
  await p.waitForTimeout(3500);
  check(await p.locator(".lantern").count() > 5, "lanterns: festival runs");
  await p.screenshot({ path: `${SHOTS}/lanterns.png`, scale: "css" });
  await p.waitForTimeout(8000);
  check(await p.locator("[data-fireworks]").count() === 0, "fireworks: canvas removed after the show");

  check(errors.length === 0, `no page errors ${errors.join(" | ")}`);
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all passed");
  process.exitCode = fails ? 1 : 0;
})();
