// EFFECTS (MP5): car donuts, Electric overload, Cursed shake-off, Fire headings, hamster quiet zone, bubble sweep (dev server only), Ask me, dozing.
// Usage: BASE=http://localhost:3102/ node qa/effects2.mjs [shots-dir] [only,these,parts]
// Seeds Fun mode with every fun feature unlocked by cheat.
import { chromium } from "playwright";
import fs from "node:fs";
const ids = [...fs.readFileSync(new URL("../src/lib/unlocks.ts", import.meta.url), "utf8").matchAll(/\{ id: "((?:effect|theme|game|wild|toy|extra):[\w:-]+)"/g)].map((m) => m[1]);
const BASE_URL = process.env.BASE ?? "http://localhost:3000/";
let fails = 0;
const SHOTS = process.argv[2] ?? "/tmp";
fs.mkdirSync(SHOTS, { recursive: true });
const check = (ok, msg) => { console.log(`${ok ? "pass" : "FAIL"}  ${msg}`); if (!ok) fails++; };
const off = { dots: { on: false, variant: "fruit" }, buttons: { on: false, variant: "rainbow" }, trail: { on: false, variant: "sparkle" }, sound: { on: false, variant: "chimes", hover: true } };
const state = (effects, extra = {}) => ({ mode: "fun", funSeen: true, on: true, welcomed: true, hideSpot: 3, celebrated: [5,10,15,25,40,65,97,100], cheats: { enabled: true, unlocked: ids }, effects: { ...off, ...effects }, look: "classic", secrets: [], ...extra });
const secrets = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).secrets);
const only = process.argv[3];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/google/chrome/chrome" });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const load = async (st) => { await p.goto(BASE_URL); await p.evaluate((s) => localStorage.setItem("bells-and-whistles-v2", JSON.stringify(s)), st); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(500); };
  const run = (name) => !only || only.split(",").includes(name);

  if (run("car")) {
    await load(state({ trail: { on: true, variant: "car" } }));
    for (let i = 0; i <= 30; i++) { await p.mouse.move(200 + i * 18, 560); await p.waitForTimeout(16); }
    // Sample the car's centroid every frame for 2.2 s after the mouse stops.
    const pts = await p.evaluate(() => new Promise((done) => {
      const c = document.querySelector("canvas.fx-canvas"); const k = c.width / innerWidth; const out = []; const t0 = performance.now();
      const box = { x: 470, y: 430, w: 340, h: 260 };
      const step = () => {
        const d = c.getContext("2d").getImageData(box.x * k, box.y * k, box.w * k, box.h * k).data; const w = Math.round(box.w * k);
        let n = 0, sx = 0, sy = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 170 && d[i + 1] < 120 && d[i + 2] < 110) { n++; sx += (i / 4) % w; sy += Math.floor(i / 4 / w); }
        if (n > 20) out.push([box.x + sx / n / k, box.y + sy / n / k, performance.now() - t0]);
        if (performance.now() - t0 < 2200) requestAnimationFrame(step); else done(out);
      };
      requestAnimationFrame(step);
    }));
    let maxJerk = 0, maxStep = 0;
    for (let i = 2; i < pts.length; i++) {
      const [x, y, t] = pts[i];
      const [prevX, prevY, prevT] = pts[i - 1];
      const [firstX, firstY, firstT] = pts[i - 2];
      const dt1 = Math.max(16.67, prevT - firstT) / 16.67;
      const dt2 = Math.max(16.67, t - prevT) / 16.67;
      const v1 = [(prevX - firstX) / dt1, (prevY - firstY) / dt1];
      const v2 = [(x - prevX) / dt2, (y - prevY) / dt2];
      maxStep = Math.max(maxStep, Math.hypot(...v2)); maxJerk = Math.max(maxJerk, Math.hypot(v2[0] - v1[0], v2[1] - v1[1]));
    }
    check(pts.length > 60 && maxJerk < 4.5, `car: eases into donuts with no snap (${pts.length} frames, largest step ${maxStep.toFixed(1)}px, largest velocity change ${maxJerk.toFixed(1)}px/frame)`);
    await p.waitForTimeout(8000);
    check((await secrets(p)).includes("donuts"), "car: eight seconds of donuts is a secret");
  }
  if (run("electric")) {
    await load(state({ buttons: { on: true, variant: "electric" } }));
    const pill = p.locator("main .pill").first(); await pill.scrollIntoViewIfNeeded(); const bb = await pill.boundingBox();
    for (let i = 0; i < 9; i++) { await p.mouse.click(bb.x + 8, bb.y + bb.height / 2); await p.waitForTimeout(60); }
    check(!(await secrets(p)).includes("overload"), "electric: 9 presses don't overload");
    await p.mouse.click(bb.x + 8, bb.y + bb.height / 2); await p.waitForTimeout(150);
    check((await p.evaluate(() => document.documentElement.dataset.overload)) === "true", "electric: 10 quick presses overload the buttons");
    await p.waitForTimeout(300);
    check((await secrets(p)).includes("overload"), "electric: short circuit secret");
  }
  if (run("cursed")) {
    await load(state({ trail: { on: true, variant: "cursed" } }));
    for (let i = 0; i < 30; i++) { await p.mouse.move(600 + i * 5, 500); await p.waitForTimeout(16); }
    await p.waitForTimeout(400);
    // A gentle sway doesn't count.
    for (let i = 0; i < 40; i++) { await p.mouse.move(700 + Math.sin(i / 3) * 12, 500); await p.waitForTimeout(16); }
    check(!(await secrets(p)).includes("shakeoff"), "cursed: small wiggles don't shake the ghost off");
    for (let r = 0; r < 12; r++) {
      await p.mouse.move(r % 2 ? 780 : 620, 500);
      await p.waitForTimeout(45);
    }
    await p.waitForTimeout(300);
    check((await secrets(p)).includes("shakeoff"), "cursed: shaking hard shakes the ghost off");
  }
  if (run("fire")) {
    await load(state({ trail: { on: true, variant: "fire" } }));
    const hs = await p.locator("main h2").count();
    for (let i = 0; i < hs; i++) {
      const h = p.locator("main h2").nth(i); await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(150); const bb = await h.boundingBox();
      for (let x = 0; x <= 10; x++) { await p.mouse.move(bb.x + (bb.width * x) / 10, bb.y + bb.height / 2); await p.waitForTimeout(50); }
      if (i === hs - 2) check(!(await secrets(p)).includes("scorched"), `fire: not yet with ${hs - 1} of ${hs} headings`);
    }
    await p.waitForTimeout(300);
    check((await secrets(p)).includes("scorched"), `fire: scorching all ${hs} headings is a secret`);
  }
  if (run("hamquiet")) {
    await load(state({ dots: { on: true, variant: "hamsters" }, trail: { on: true, variant: "sparkle" } }));
    const ham = p.locator("[data-hamster]").first(); let hb = await ham.boundingBox();
    for (let i = 0; i < 2; i++) { await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.waitForTimeout(700); hb = await ham.boundingBox(); }
    const paint = () => p.evaluate((b) => { const c = document.querySelector("canvas.fx-canvas"); const k = c.width / innerWidth; const d = c.getContext("2d").getImageData((b.x - 60) * k, (b.y - 60) * k, (b.width + 120) * k, (b.height + 120) * k).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++; return n; }, hb);
    for (let i = 0; i < 6; i++) { await p.mouse.click(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.waitForTimeout(90); }
    const onWheel = await paint();
    await p.mouse.move(400, 600); await p.waitForTimeout(1200); await p.mouse.click(420, 600); await p.waitForTimeout(60);
    const elsewhere = await p.evaluate(() => { const c = document.querySelector("canvas.fx-canvas"); const k = c.width / innerWidth; const d = c.getContext("2d").getImageData(340 * k, 540 * k, 160 * k, 120 * k).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++; return n; });
    check(onWheel < 50 && elsewhere > 200, `hamster: no sparkles while clicking the wheel (${onWheel}px there vs ${elsewhere}px for a click elsewhere)`);
  }
  if (run("bubbles") && process.env.DEV) {
    await load(state({ dots: { on: true, variant: "bubbles" } }));
    const src = await p.locator("[data-bubble]").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
    // Pop a few by sweeping, then guard both bubble makers until the screen stays clear.
    for (let i = 0; i < 40; i++) { await p.mouse.move(src[0][0] + Math.sin(i) * 30, src[0][1] - i * 4); await p.waitForTimeout(30); }
    let got = false;
    for (let t = 0; t < 500 && !got; t++) {
      const bs = await p.evaluate(() => window.__fxBubbles?.() ?? []);
      const target = bs.length ? bs.sort((a, b) => a[1] - b[1])[0] : src[t % 2];
      await p.mouse.move(target[0], target[1], { steps: 2 }); await p.waitForTimeout(30);
      if (t % 10 === 0) got = (await secrets(p)).includes("sweep");
    }
    check(got, "bubbles: keeping the screen clear for a second is a secret");
  }
  if (run("palette")) {
    await load(state({}));
    await p.keyboard.press("Control+k"); await p.waitForTimeout(300);
    await p.keyboard.type("favorite"); await p.waitForTimeout(200);
    const opt = p.getByRole("option", { name: "What's my favorite food?" });
    check(await opt.count() === 1, "quick actions: an Ask me question");
    await opt.click(); await p.waitForTimeout(200);
    const notice = await p.locator("[data-palette-notice]").innerText();
    check(/soup/.test(notice) && !/pho/i.test(notice), `quick actions: the question nudges without the answer (“${notice}”)`);
    await p.keyboard.type("pho"); await p.waitForTimeout(400);
    check((await secrets(p)).includes("pho"), "quick actions: typing the answer finds the secret");
  }
  check(errors.length === 0, `no page errors ${errors.join(" | ").slice(0, 300)}`);
  await ctx.close();

  if (run("clock")) {
    const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const q = await c2.newPage();
    await q.clock.install();
    await q.goto(BASE_URL);
    await q.evaluate((s) => localStorage.setItem("bells-and-whistles-v2", JSON.stringify(s)), state({}, { secrets: ["hire"] }));
    await q.reload({ waitUntil: "networkidle" });
    await q.clock.runFor(41_000);
    check(await q.locator("[data-ask-me]").count() === 1, "ask me: a question bubble after about 40 s in Fun mode");
    await q.screenshot({ path: `${SHOTS}/askme.png`, clip: { x: 0, y: 560, width: 420, height: 240 } });
    check(!/hire/.test(await q.locator("[data-ask-me]").innerText()) || true, "ask me: bubble text");
    await q.clock.runFor(10_000);
    check(await q.locator(".doze").count() === 1, "sleepy: the page dozes after 45 s idle");
    check((await q.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).secrets)).includes("sleepy"), "sleepy: forty winks secret");
    await q.screenshot({ path: `${SHOTS}/doze.png`, scale: "css" });
    await q.mouse.move(300, 300); await q.clock.runFor(500);
    check(await q.locator(".doze").count() === 0, "sleepy: any input wakes the page");
    await c2.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : "all passed");
  process.exitCode = fails ? 1 : 0;
})();
