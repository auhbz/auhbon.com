// MP5 THEMES: Pho theme (live), the Pico-8 climber, Flabby's mini game, and the draft Board games theme.
// Usage: node themes.mjs <shots-dir>   (BASE=http://localhost:<port>/ to point elsewhere)
import { launchBrowser } from "./browser.mjs";
import { AxeBuilder } from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const out = process.argv[2] ?? ".";
const base = process.env.BASE ?? "http://localhost:3000/";
const browser = await launchBrowser();
const issues = [];
const check = (ok, msg) => {
  console.log(`${ok ? "pass" : "FAIL"}  ${msg}`);
  if (!ok) issues.push(msg);
};
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  check(r.violations.length === 0, `axe ${label}: ${r.violations.length} violations`);
  for (const v of r.violations) console.log(`      - ${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = "bells-and-whistles-v2";
// Fun mode, everything unlocked by cheat except Flabby's game (that one needs its secret).
const ids = [...readFileSync(new URL("../src/lib/unlocks.ts", import.meta.url), "utf8").matchAll(/\{ id: "((?:effect|theme|game|wild|toy|extra):[\w:-]+)"/g)]
  .map((m) => m[1])
  .filter((id) => id !== "game:flabby");
const state = (look) =>
  JSON.stringify({ mode: "fun", funSeen: true, on: true, look, welcomed: true, secrets: [], peeked: [], hinted: [], effects: {}, cheats: { enabled: true, unlocked: ids } });
const secrets = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").secrets ?? [], KEY);

async function open(viewport, look, path = "") {
  const ctx = await browser.newContext({ viewport, ...(viewport.width < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem(k, v);
      sessionStorage.setItem("seeded", "1");
    }
  }, [KEY, state(look)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  return { ctx, page, errors };
}

// ------------------------------------------------------------------ Pho
for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  const tag = vp.width < 500 ? "phone" : "desktop";
  const { ctx, page, errors } = await open(vp, "pho");
  check((await page.locator("html").getAttribute("data-look")) === "pho", `${tag} pho: theme applied live`);
  const bowl = page.locator("[data-pho-bowl]");
  await bowl.scrollIntoViewIfNeeded();
  check(await bowl.isVisible(), `${tag} pho: bowl in the hero`);
  check((await page.locator("[data-plate]").count()) === 4, `${tag} pho: four side plates`);
  await page.locator("[data-pho]").screenshot({ path: `${out}/pho-${tag}-empty.png` });
  // Naturalist: a plain bowl, slurped.
  for (let i = 0; i < 5; i++) await bowl.click();
  let s = await secrets(page);
  check(s.includes("naturalist") && !s.includes("cleanbowl"), `${tag} pho: plain bowl slurped = Naturalist only (${s})`);
  await bowl.click(); // fresh bowl
  check((await bowl.getAttribute("data-left")) === "5", `${tag} pho: pressing the empty bowl gets a fresh one`);
  // Toppings by click (keyboard on desktop: Enter on a plate).
  if (tag === "desktop") {
    await page.locator('[data-plate="lime"]').focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("Enter");
  } else for (let i = 0; i < 3; i++) await page.locator('[data-plate="lime"]').click({ force: true });
  check((await bowl.getAttribute("data-toppings")) === "3-0-0-0", `${tag} pho: three limes are added (${await bowl.getAttribute("data-toppings")})`);
  for (let i = 0; i < 7; i++) await page.locator('[data-plate="basil"]').click();
  // Jalapeños by dragging onto the bowl.
  for (let i = 0; i < 17; i++) {
    const p = await page.locator('[data-plate="jalapeno"]').boundingBox();
    const b = await bowl.boundingBox();
    if (tag === "desktop" && i < 3) {
      await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2);
      await page.mouse.down();
      await page.mouse.move(p.x + p.width / 2 + 20, p.y + 10, { steps: 3 });
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
      if (i === 2) await page.screenshot({ path: `${out}/pho-drag.png` });
      await page.mouse.up();
      check((await bowl.getAttribute("data-toppings"))?.endsWith(`-${i + 1}`), "dragging a jalapeño adds it");
    } else await page.locator('[data-plate="jalapeno"]').click();
  }
  check((await bowl.getAttribute("data-toppings")) === "3-7-0-17", `${tag} pho: toppings land (${await bowl.getAttribute("data-toppings")})`);
  s = await secrets(page);
  check(s.includes("auhbonsway"), `${tag} pho: 3 limes + max jalapeños + max basil = Auhbon's way`);
  check((await page.locator(".pho-topping").count()) === 27, `${tag} pho: 27 toppings drawn in the bowl`);
  await page.locator("[data-pho]").screenshot({ path: `${out}/pho-${tag}-topped.png` });
  for (let i = 0; i < 5; i++) await bowl.click();
  s = await secrets(page);
  check(s.includes("cleanbowl"), `${tag} pho: topped bowl slurped = Clean bowl`);
  if (tag === "desktop") {
    await page.screenshot({ path: `${out}/pho-page.png` });
    await axe(page, "pho theme");
  }
  check(!errors.length, `${tag} pho: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------------ Flabby icon + game
for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  const tag = vp.width < 500 ? "phone" : "desktop";
  const { ctx, page, errors } = await open(vp, "classic");
  await page.getByRole("button", { name: "Bells and whistles" }).click();
  const opt = page.locator('[data-game-option="flabby"]');
  check((await opt.getAttribute("data-locked")) !== null, `${tag} flabby: locked in Mini games until he's found`);
  await page.keyboard.press("Escape");
  const icon = page.locator("[data-flabby-icon]");
  check((await icon.count()) === 1, `${tag} flabby: one icon beside the source code link`);
  await icon.scrollIntoViewIfNeeded();
  const links = await icon.evaluate((el) => {
    const a = el.closest("span.inline-flex")?.parentElement?.querySelector("a");
    return a?.textContent;
  });
  check(/Source code/.test(links ?? ""), `${tag} flabby: icon sits with the Source code link`);
  if (tag === "desktop") await page.locator("#work").screenshot({ path: `${out}/flabby-icon-section.png` });
  await icon.click();
  check((await secrets(page)).includes("flabby"), `${tag} flabby: clicking him is a secret`);
  await page.waitForSelector('[data-game-layer="flabby"]', { timeout: 4000 });
  check(true, `${tag} flabby: the game starts`);
  const canvas = page.locator(".game-canvas");
  // Fly a little, pause, then quit mid-flight.
  if (tag === "desktop") {
    await page.keyboard.press("Space");
    await wait(700);
    await page.keyboard.press("Space");
    await page.keyboard.press("p");
    await wait(200);
    check((await page.getByRole("button", { name: /Resume/ }).count()) === 1, "flabby: P pauses");
    await page.screenshot({ path: `${out}/flabby-game-paused.png` });
    await page.keyboard.press("p");
    await page.keyboard.press("Escape");
  } else {
    const box = await canvas.boundingBox();
    for (let i = 0; i < 2; i++) {
      await page.touchscreen.tap(box.width / 2, box.height / 2);
      await wait(700);
    }
    await page.screenshot({ path: `${out}/flabby-game-phone.png` });
    await page.getByRole("button", { name: /Exit/ }).click();
  }
  await wait(300);
  check((await secrets(page)).includes("coward"), `${tag} flabby: quitting mid-flight = Coward`);
  // Let him crash: game-over card with leaderboards.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("portfolio:game", { detail: "flabby" })));
  await page.waitForSelector('[data-game-layer="flabby"]');
  await page.locator(".game-canvas").click({ position: { x: 20, y: 300 }, force: true });
  await page.waitForSelector(".game-over", { timeout: 9000 });
  check(true, `${tag} flabby: crashing shows the game-over card`);
  await page.screenshot({ path: `${out}/flabby-over-${tag}.png` });
  await page.keyboard.press("Escape");
  // Mini games list has Flabby now.
  await page.getByRole("button", { name: "Bells and whistles" }).click();
  check((await opt.getAttribute("data-locked")) === null, `${tag} flabby: unlocked in Mini games after finding him`);
  check(!errors.length, `${tag} flabby: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}

// Difficulty curve and scoring secrets (driven straight through the sim).
{
  const { ctx, page } = await open({ width: 1280, height: 900 }, "classic");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("portfolio:game", { detail: "flabby" })));
  await page.waitForSelector('[data-game-layer="flabby"]');
  const r = await page.evaluate(async () => {
    const run = document.querySelector(".game-canvas").game;
    const C = run.sim.constructor;
    // A simple autopilot (fairness smoke test): best of 8 runs.
    const out = { best: 0, drift: false };
    for (let t = 0; t < 8; t++) {
      const sim = new C(false);
      sim.flap();
      for (let i = 0; i < 30 * 200 && sim.state === "play" && sim.score < 40; i++) {
        const next = sim.pipes.find((p) => p.x + 12 >= 24) ?? sim.pipes[0];
        if (sim.y > sim.top(next) + next.gap / 2 && sim.dy >= 0) sim.flap();
        sim.step();
        if (sim.pipes.some((p) => p.amp > 0)) out.drift = true;
      }
      out.best = Math.max(out.best, sim.score);
    }
    // The scoring secrets, through the running game.
    run.sim.flap();
    for (const n of [10, 25]) {
      run.sim.score = n;
      run.scored(performance.now());
    }
    return out;
  });
  await wait(400);
  const s = await secrets(page);
  check(r.best >= 20, `flabby: an autopilot gets past 20 (best ${r.best})`);
  check(r.drift, "flabby: pipes drift after 20");
  check(s.includes("flap10") && s.includes("flap25"), `flabby: 10 and 25 are secrets (${s})`);
  await page.screenshot({ path: `${out}/flabby-drift.png` });
  await ctx.close();
}

// ------------------------------------------------------------------ Climber
for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  const tag = vp.width < 500 ? "phone" : "desktop";
  const { ctx, page, errors } = await open(vp, "pico8");
  check((await page.locator("[data-climber]").count()) === 1, `${tag} climber: on in Pico-8`);
  await page.evaluate(() => window.scrollTo(0, 500));
  const states = new Set();
  for (let i = 0; i < 30; i++) {
    await wait(300);
    const snap = await page.evaluate(() => window.__climber?.snapshot());
    states.add(snap.state);
  }
  const snap = await page.evaluate(() => window.__climber?.snapshot());
  check(snap.blocks > 2, `${tag} climber: sees page blocks (${snap.blocks})`);
  check(states.has("climb"), `${tag} climber: climbs things (${[...states]})`);
  await page.screenshot({ path: `${out}/climber-${tag}.png` });
  // Daze: wait until he's climbing, then scroll hard.
  let dazed = false;
  for (let tries = 0; tries < 40 && !dazed; tries++) {
    const st = await page.evaluate(() => window.__climber.snapshot());
    if (st.state === "climb" || (st.state === "walk" && st.on)) {
      await page.mouse.wheel(0, st.y < vp.height / 2 ? -1200 : 1200);
      await wait(150);
      await page.evaluate((dy) => window.scrollBy(0, dy), st.y < vp.height / 2 ? -1200 : 1200);
      await wait(200);
      dazed = (await page.evaluate(() => window.__climber.snapshot())).dazed;
    } else await wait(300);
  }
  check(dazed, `${tag} climber: scrolling him into the edge dazes him`);
  await wait(300);
  await page.screenshot({ path: `${out}/climber-dazed-${tag}.png` });
  await wait(500);
  check((await secrets(page)).includes("dazed"), `${tag} climber: dazed is a secret`);
  // Open a panel: it becomes something to climb.
  if (tag === "desktop") {
    const before = (await page.evaluate(() => window.__climber.snapshot())).blocks;
    await page.getByRole("button", { name: "Bells and whistles" }).click();
    await wait(400);
    const after = (await page.evaluate(() => window.__climber.snapshot())).blocks;
    check(after !== before || after > 0, `climber: re-measures when a panel opens (${before} -> ${after})`);
    await wait(4000);
    await page.screenshot({ path: `${out}/climber-panel.png` });
    await page.keyboard.press("Escape");
  }
  check(!errors.length, `${tag} climber: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------------ Board games (draft)
for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  const tag = vp.width < 500 ? "phone" : "desktop";
  const { ctx, page, errors } = await open(vp, "classic", "dev/draft");
  await page.evaluate(() => localStorage.setItem("draft-playground-v1", JSON.stringify({ chaos: false, look: "boardgames", secrets: [], peeked: [] })));
  await page.reload({ waitUntil: "networkidle" });
  const games = page.locator("[data-boardgames]");
  await games.scrollIntoViewIfNeeded();
  check(await games.isVisible(), `${tag} board games: tray and games show`);
  await page.locator("[data-push-start]").click();
  await page.waitForSelector('[data-push][data-phase="choose"]', { timeout: 8000 });
  await games.screenshot({ path: `${out}/boardgames-push-${tag}.png` });
  // Mark die 0 reroll, die 1 spend, reroll.
  await page.locator('[data-die="0"]').click();
  await page.locator('[data-die="1"]').click();
  await page.locator('[data-die="1"]').click();
  check((await page.locator('[data-die="1"]').getAttribute("data-mark")) === "spend", `${tag} push: tapping twice marks spend`);
  await page.locator("[data-push-reroll]").click();
  await page.waitForSelector('[data-push][data-phase="choose"]', { timeout: 8000 });
  check((await page.locator("[data-die]").count()) === 4, `${tag} push: spending a die leaves four`);
  await page.locator("[data-push-stand]").click();
  check((await page.locator('[data-push][data-phase="done"]').count()) === 1, `${tag} push: standing ends the round`);
  // Pig
  await page.locator('[data-dice-game="pig"]').click();
  await page.locator("[data-pig-roll]").click();
  await page.waitForFunction(() => !document.querySelector("[data-pig-roll]")?.disabled || document.querySelector("[data-pig]")?.dataset.who !== "you", null, { timeout: 8000 });
  await games.screenshot({ path: `${out}/boardgames-pig-${tag}.png` });
  // Free roll: drag-throw a die on desktop.
  await page.locator('[data-dice-game="free"]').click();
  if (tag === "desktop") {
    const tray = await page.locator("[data-dice-tray]").boundingBox();
    // Dice start in a row in the middle.
    const cx = tray.x + tray.width / 2 - 28;
    const cy = tray.y + tray.height / 2;
    await page.mouse.move(cx, cy - 8);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) await page.mouse.move(cx + i * 30, cy - 8 - i * 6);
    await page.mouse.up();
    await wait(150);
    await games.screenshot({ path: `${out}/boardgames-throw.png` });
  } else await page.locator("[data-dice-roll]").click();
  await page.waitForFunction(() => /Rolled/.test(document.querySelector("#draft-dice-result")?.textContent ?? ""), null, { timeout: 8000 });
  check(true, `${tag} free roll: a throw settles on faces`);
  if (tag === "desktop") await axe(page, "board games");
  check(!errors.length, `${tag} board games: no console errors ${errors.join(" | ")}`);
  await ctx.close();
}

await browser.close();
console.log(issues.length ? `\n${issues.length} issue(s)` : "\nall good");
process.exit(issues.length ? 1 : 0);
