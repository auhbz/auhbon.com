// MP5 WILD: Wild & Wondrous (Monkey Mode, Gravity Mode), the toy box and its toys, the portal device,
// the unlock announcements and the "Unlocked toys, features, & elements" panel section.
// Usage: node wild.mjs <shots-dir>   (BASE=http://localhost:<port>/ to point elsewhere)
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const out = process.argv[2] ?? ".";
const base = process.env.BASE ?? "http://localhost:3000/";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/google/chrome/chrome" });
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
const ids = [...readFileSync(new URL("../src/lib/unlocks.ts", import.meta.url), "utf8").matchAll(/\{ id: "((?:effect|theme|game|wild|toy|extra):[\w:-]+)"/g)].map((m) => m[1]);
const SECRET_IDS = [...readFileSync(new URL("../src/lib/fun.ts", import.meta.url), "utf8").matchAll(/\{ id: "([\w-]+)", title:/g)].map((m) => m[1]);
const cheatState = JSON.stringify({ mode: "fun", funSeen: true, on: true, welcomed: true, secrets: [], peeked: [], hinted: [], effects: {}, cheats: { enabled: true, unlocked: ids } });
const secrets = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}").secrets ?? [], KEY);

async function open(viewport, { fun = cheatState, wild = null, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: reduced ? "reduce" : "no-preference", ...(viewport.width < 500 ? { hasTouch: true, isMobile: true } : {}) });
  await ctx.addInitScript(
    ([k, v, w]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(k, v);
        if (w) localStorage.setItem("wild-and-wondrous-v1", w);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [KEY, fun, wild],
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.goto(base, { waitUntil: "networkidle" });
  return { ctx, page, errors };
}
const mainText = (page) => page.evaluate(() => document.querySelector("main").innerText);
const wildState = (mode, on = true) => JSON.stringify({ on, mode, seen: ["wild", "toy:box", "extra:portal"] });

// --- Panel: Wild & Wondrous and the extras section --------------------------------
{
  const { ctx, page, errors } = await open({ width: 1280, height: 900 }, { wild: wildState("monkeys", false) });
  await page.getByRole("button", { name: "Bells and whistles" }).click();
  const panel = page.getByRole("dialog", { name: "Bells and whistles" });
  check(await panel.locator("[data-wild-section]").isVisible(), "Wild & Wondrous row in the panel");
  await panel.getByRole("switch", { name: "Wild & Wondrous" }).click();
  check((await panel.locator("[data-wild-option]").count()) === 2, "two Wild & Wondrous modes");
  const extras = panel.locator("[data-extras-section]");
  check(/Unlocked toys, features, & elements/.test(await extras.innerText()), "extras section title (Oxford comma)");
  const names = await extras.getByRole("switch").allInnerTexts().catch(() => []);
  const labels = await extras.locator("[role=switch]").evaluateAll((els) => els.map((e) => document.getElementById(e.getAttribute("aria-labelledby")).textContent));
  check(["Toy box", "Portal device", "Wandering chicken", "Pico-8 climber"].every((l) => labels.includes(l)), `extras listed automatically (${labels.join(", ")})`);
  void names;
  await extras.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: `${out}/wild-panel.png` });
  await axe(page, "panel with Wild & Wondrous");
  // Hide the toy box from the panel.
  await extras.getByRole("switch", { name: "Toy box" }).click();
  check((await page.locator("[data-toy-box]").count()) === 0, "hiding the toy box removes it");
  await extras.getByRole("switch", { name: "Toy box" }).click();
  await wait(300);
  check((await page.locator("[data-toy-box]").count()) === 1, "showing it again brings it back");
  check(errors.length === 0, `panel: no page errors (${errors.slice(0, 2)})`);
  await ctx.close();
}

// --- Monkey Mode ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open({ width: 1280, height: 900 });
  const before = await mainText(page);
  await page.evaluate((w) => localStorage.setItem("wild-and-wondrous-v1", w), wildState("monkeys"));
  await page.reload({ waitUntil: "networkidle" });
  const snap = () => page.evaluate(() => window.__wildMonkeys?.snapshot());
  await page.waitForFunction(() => window.__wildMonkeys?.snapshot().monkeys.length >= 2);
  const s0 = await snap();
  check(s0.vines >= 3, `vines hang from the top (${s0.vines})`);
  check(new Set(s0.monkeys.map((m) => m.speed)).size > 1, `monkeys have different speeds (${s0.monkeys.map((m) => m.speed)})`);
  let thief = null;
  for (let i = 0; i < 80 && !thief; i++) {
    await wait(400);
    thief = (await snap()).monkeys.find((m) => m.carrying && !["dizzy", "leave", "fly"].includes(m.state));
  }
  check(!!thief, "a monkey steals something");
  const gone = await page.locator("[data-wild-gone]").evaluateAll((els) => els.map((e) => ({ tag: e.tagName, vis: getComputedStyle(e).visibility, text: e.textContent })));
  check(gone.length >= 1 && gone.every((g) => g.vis === "hidden"), `stolen pieces leave a gap (${JSON.stringify(gone.slice(0, 3))})`);
  const ghost = await page.locator(".wild-ghost").first().evaluate((g) => ({ op: getComputedStyle(g).opacity, filter: getComputedStyle(g).filter, inner: getComputedStyle(g.firstElementChild).opacity }));
  check(ghost.op === "1" && ghost.filter === "none" && ghost.inner === "1", `the carried piece looks the same (${JSON.stringify(ghost)})`);
  await page.screenshot({ path: `${out}/wild-monkeys.png`, scale: "css" });
  if (thief) {
    const live = (await snap()).monkeys.find((m) => m.id === thief.id);
    if (live) await page.mouse.click(live.x, live.y - 6);
    await wait(900);
    check((await snap()).bonks >= 1, "clicking a monkey bonks it");
  }
  // Swinging on vines (they choose to; give them time).
  let swung = false;
  for (let i = 0; i < 40 && !swung; i++) {
    await wait(300);
    swung = (await snap()).swinging > 0;
  }
  check(swung, "a monkey swings on a vine");
  // The gorilla.
  const glass = page.locator('[data-glass="gorilla"]');
  for (let i = 0; i < 4; i++) await glass.press("Enter"); // keys: a monkey in the way would take a click as a bonk
  await wait(1200);
  check((await snap()).gorilla !== null, `the gorilla is out (${(await snap()).gorilla})`);
  let shook = false;
  for (let i = 0; i < 20 && !shook; i++) {
    shook = !!(await page.evaluate(() => document.documentElement.dataset.wildShake));
    await wait(100);
  }
  check(shook, "the gorilla shakes the page");
  await page.screenshot({ path: `${out}/wild-gorilla.png`, scale: "css" });
  await page.getByRole("button", { name: "Calm the gorilla" }).click();
  await wait(4000);
  check((await snap()).gorilla === null, "calming the gorilla sends him home");
  // The bowling ball knocks over the crate (keyboard: press the ball).
  const bglass = page.locator('[data-glass="ball"]');
  for (let i = 0; i < 4; i++) await bglass.press("Enter");
  await wait(900);
  check((await page.locator("[data-bowling-ball]").count()) === 1, "breaking the second glass gives a bowling ball");
  await page.screenshot({ path: `${out}/wild-ball.png`, scale: "css" });
  await page.locator("[data-bowling-ball]").focus();
  await page.keyboard.press("Enter");
  await wait(1500);
  check((await snap()).frenzy && (await page.locator("[data-monkey-crate][data-tipped]").count()) === 1, "the ball knocks the crate over: banana frenzy");
  await page.screenshot({ path: `${out}/wild-frenzy.png`, scale: "css" });
  const found = await secrets(page);
  check(["monkey-gorilla", "monkey-frenzy"].every((id) => found.includes(id)), `monkey secrets (${found})`);
  // Off: everything back exactly.
  await page.evaluate((w) => localStorage.setItem("wild-and-wondrous-v1", w), wildState("monkeys", false));
  await page.evaluate(() => window.dispatchEvent(new StorageEvent("storage", { key: "wild-and-wondrous-v1" })));
  await wait(400);
  check((await page.locator("[data-wild-gone], .wild-ghost").count()) === 0, "turning Monkey Mode off returns everything");
  check((await mainText(page)) === before, "the page text is exactly as it was");
  check(errors.length === 0, `monkeys: no page errors (${errors.slice(0, 2)})`);
  await ctx.close();
}

// --- Gravity Mode --------------------------------------------------------------------
{
  const { ctx, page, errors } = await open({ width: 1280, height: 900 });
  const before = await mainText(page);
  await page.evaluate((w) => localStorage.setItem("wild-and-wondrous-v1", w), wildState("gravity"));
  await page.reload({ waitUntil: "networkidle" });
  await wait(2600);
  const s = await page.evaluate(() => window.__wildGravity?.snapshot());
  check(s && s.bodies.length >= 8, `pieces came loose (${s?.bodies.length})`);
  check(s.bodies.some((b) => b.name), "my name fell too");
  const low = s.bodies.filter((b) => b.y > 600).length;
  check(low >= s.bodies.length * 0.6, `they fell to the bottom (${low} of ${s.bodies.length} low)`);
  await page.screenshot({ path: `${out}/wild-gravity.png`, scale: "css" });
  // Fling the name upward.
  const name = s.bodies.find((b) => b.name);
  await page.mouse.move(name.x, name.y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(name.x, name.y - i * 70);
    await wait(12);
  }
  await page.mouse.up();
  await wait(1500);
  const found = await secrets(page);
  check(found.includes("gravity-name"), `tossing my name is a secret (${found})`);
  check(found.includes("gravity-toss"), "a hard throw hits the top of the screen");
  await page.getByRole("button", { name: "Put everything back" }).click();
  await wait(1400);
  check((await page.locator("[data-wild-gone], .wild-ghost").count()) === 0, "Put everything back restores the page");
  check((await mainText(page)) === before, "the page text is exactly as it was");
  await axe(page, "gravity mode dock");
  check(errors.length === 0, `gravity: no page errors (${errors.slice(0, 2)})`);
  await ctx.close();
}

// --- Toys ----------------------------------------------------------------------------
{
  const { ctx, page, errors } = await open({ width: 1280, height: 900 }, { wild: wildState("monkeys", false) });
  const box = page.locator("[data-toy-box]");
  await box.click();
  check((await page.locator("[data-toy-slot]").count()) === 4, "the toy box holds four toys");
  await page.locator("#toy-box-panel").screenshot({ path: `${out}/wild-toybox.png` });
  await axe(page, "toy box open");
  // Paint brush: paint over the whole intro.
  await page.locator('[data-toy-slot="brush"]').click();
  await page.getByRole("radio", { name: "Thick brush" }).click();
  const hero = await page.locator('section[aria-labelledby="hero-name"]').boundingBox();
  for (let y = hero.y + 10; y < hero.y + hero.height; y += 26) {
    await page.mouse.move(hero.x + 5, y);
    await page.mouse.down();
    await page.mouse.move(hero.x + hero.width - 5, y, { steps: 12 });
    await page.mouse.up();
  }
  check((await secrets(page)).includes("toy-paint"), "painting over the intro is a secret");
  await page.screenshot({ path: `${out}/wild-paint.png`, scale: "css" });
  await page.getByRole("button", { name: "Wash it off" }).click();
  await wait(400);
  await page.screenshot({ path: `${out}/wild-wash.png`, scale: "css" });
  await wait(1200);
  const painted = await page.locator("[data-paint-canvas]").evaluate((c) => {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 400) if (d[i]) return true;
    return false;
  });
  check(!painted, "washing clears the paint");
  // Put the brush back: clicks go through again.
  await page.getByRole("button", { name: "Put back" }).click();
  check((await page.locator("[data-paint-canvas]").evaluate((c) => getComputedStyle(c).pointerEvents)) === "none", "with the brush away the canvas lets clicks through");
  // Sticky notes.
  await box.click();
  await page.locator('[data-toy-slot="notes"]').click();
  await page.getByRole("button", { name: "New note" }).click();
  await page.keyboard.type("Hire Auhbon!");
  const note = page.locator("[data-sticky-note]").first();
  const nb = await note.boundingBox();
  const target = await page.locator("#hero-name").boundingBox();
  await page.mouse.move(nb.x + 20, nb.y + 12);
  await page.mouse.down();
  await page.mouse.move(target.x + 40, target.y + 20, { steps: 8 });
  await page.mouse.up();
  await wait(500);
  check((await secrets(page)).includes("toy-note"), "a note stuck on my name is a secret");
  await page.screenshot({ path: `${out}/wild-notes.png`, scale: "css" });
  await page.reload({ waitUntil: "networkidle" });
  check(/Hire Auhbon!/.test(await page.locator("[data-sticky-note] textarea").first().inputValue()), "notes persist for the visit");
  // Paper airplane.
  await page.locator("[data-toy-box]").click();
  await page.locator('[data-toy-slot="plane"]').click();
  await wait(900);
  const plane = page.locator("[data-paper-plane]");
  const pb = await plane.boundingBox();
  await page.mouse.move(pb.x + 26, pb.y + 15);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(pb.x + 26 - i * 60, pb.y + 15 - i * 30);
    await wait(12);
  }
  await page.mouse.up();
  await wait(500);
  await page.screenshot({ path: `${out}/wild-plane.png`, scale: "css" });
  check((await plane.getAttribute("data-paper-plane")) === "flying", "the airplane flies");
  // Fly it home: aim at the toy box from right above it.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Fold a new one" }).click();
  await wait(900);
  const bb = await page.locator("[data-toy-box]").boundingBox();
  const p2 = await plane.boundingBox();
  await page.mouse.move(p2.x + 26, p2.y + 15);
  await page.mouse.down();
  await page.mouse.move(bb.x + 24, bb.y - 60, { steps: 4 });
  await page.mouse.move(bb.x + 24, bb.y - 40);
  await wait(30);
  await page.mouse.move(bb.x + 24, bb.y - 20);
  await page.mouse.up();
  await wait(1500);
  check((await secrets(page)).includes("toy-plane"), "landing the plane in the toy box is a secret");
  // Smoke bombs: vanish my name.
  await page.locator("[data-toy-box]").click();
  await page.locator('[data-toy-slot="smoke"]').click();
  const nm = await page.locator("#hero-name").boundingBox();
  await page.mouse.click(nm.x + nm.width / 3, nm.y + nm.height / 2);
  await wait(800);
  check((await page.locator("#hero-name[data-wild-vanish]").count()) === 1, "a smoke bomb makes my name vanish");
  await page.screenshot({ path: `${out}/wild-smoke.png`, scale: "css" });
  await wait(1600);
  check((await page.locator("[data-wild-vanish]").count()) === 0, "…and it's back within two seconds");
  check((await secrets(page)).includes("toy-smoke"), "vanishing my name is a secret");
  await page.keyboard.press("Escape");
  check((await page.locator("[data-smoke-catcher]").count()) === 0, "Esc puts the toy back");
  check(errors.length === 0, `toys: no page errors (${errors.slice(0, 2)})`);
  await ctx.close();
}

// --- Portal device -------------------------------------------------------------------
{
  const { ctx, page, errors } = await open({ width: 1280, height: 900 }, { wild: wildState("monkeys", false) });
  const gun = page.locator("[data-portal-gun]");
  await gun.scrollIntoViewIfNeeded();
  await gun.click();
  const panel = (id) => page.locator(`[data-portal-surface="${id}"]`);
  const clear = () => page.getByRole("button", { name: "Clear portals" }).click();
  await panel("word-shelf").click();
  await panel("blank").click();
  check(/hello/.test(await panel("blank").innerText()), "chamber 1: the word moves through the portals");
  await clear();
  await panel("ledge").click();
  await panel("over-button").click();
  await clear();
  await panel("vault-shelf").click();
  await panel("over-plate").click();
  await wait(300);
  check((await secrets(page)).includes("portal-cake"), "the cake is a live secret");
  await page.locator("[data-portal-hud]").screenshot({ path: `${out}/wild-portal-hud.png` });
  await page.getByRole("button", { name: "Put it down" }).click();
  check((await page.locator("[data-portal-surface]").count()) === 0, "putting the device down clears the chambers");
  check(errors.length === 0, `portal: no page errors (${errors.slice(0, 2)})`);
  await ctx.close();
}

// --- Unlocks earned with secrets: announcements, silhouettes ------------------------
{
  const earned = (n) => JSON.stringify({ mode: "fun", funSeen: true, on: false, welcomed: true, secrets: SECRET_IDS.slice(0, n), peeked: [], hinted: [], effects: {}, celebrated: Array.from({ length: 100 }, (_, i) => i + 1) });
  const { ctx, page, errors } = await open({ width: 1280, height: 900 }, { fun: earned(1) });
  await page.waitForSelector("[data-unlock-note]", { timeout: 8000 }).catch(() => null);
  const noteShown = await page.locator("[data-unlock-note]").count();
  const boxShown = await page.locator("[data-toy-box]").count();
  check(boxShown === noteShown, `the toy box note appears with the box (${boxShown}, ${noteShown})`);
  if (boxShown) {
    await page.locator("[data-unlock-note]").screenshot({ path: `${out}/wild-note.png` });
    await page.getByRole("button", { name: "Got it" }).click();
    await page.locator("[data-toy-box]").click();
    const locked = await page.locator("[data-toy-slot][data-locked]").allInnerTexts();
    check(locked.length >= 1 && locked.every((t) => /Find \d+ more secrets?/.test(t)), `locked toys are silhouettes with a count (${locked})`);
    await page.locator("#toy-box-panel").screenshot({ path: `${out}/wild-toybox-locked.png` });
  }
  await ctx.close();
  // Enough secrets for Wild & Wondrous: the herald monkey (the parade is already done here).
  const r = await open({ width: 1280, height: 900 }, { fun: JSON.stringify({ ...JSON.parse(earned(8)), celebrated: Array.from({ length: 100 }, (_, i) => i + 1) }) });
  await r.page.waitForSelector("[data-wild-herald]", { timeout: 12000 }).catch(() => null);
  check((await r.page.locator("[data-wild-herald]").count()) === 1, "a monkey announces Wild & Wondrous");
  await wait(1600);
  await r.page.screenshot({ path: `${out}/wild-herald.png`, scale: "css" });
  await r.page.getByRole("button", { name: "Later" }).click();
  await wait(1500);
  await r.page.reload({ waitUntil: "networkidle" });
  await wait(3000);
  check((await r.page.locator("[data-wild-herald]").count()) === 0, "the herald only comes once");
  check(errors.length + r.errors.length === 0, `unlocks: no page errors (${[...errors, ...r.errors].slice(0, 2)})`);
  await r.ctx.close();
}

// --- Phone and reduced motion --------------------------------------------------------
{
  const { ctx, page, errors } = await open({ width: 390, height: 844 }, { wild: wildState("monkeys"), reduced: true });
  await wait(1500);
  const s = await page.evaluate(() => window.__wildMonkeys?.snapshot());
  check(s && s.monkeys.length <= 3, `reduced motion: calm monkeys (${s?.monkeys.length})`);
  const hs = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check(!hs, "390px: no horizontal scroll");
  await page.screenshot({ path: `${out}/wild-390-monkeys.png` });
  await page.locator("[data-toy-box]").click();
  await page.locator('[data-toy-slot="brush"]').click();
  await page.screenshot({ path: `${out}/wild-390-brush.png` });
  await axe(page, "390px monkeys + brush");
  await page.evaluate((w) => localStorage.setItem("wild-and-wondrous-v1", w), wildState("gravity"));
  await page.reload({ waitUntil: "networkidle" });
  await wait(2000);
  await page.screenshot({ path: `${out}/wild-390-gravity-reduced.png` });
  await page.getByRole("button", { name: "Put everything back" }).click();
  await wait(800);
  check((await page.locator("[data-wild-gone], .wild-ghost").count()) === 0, "reduced motion: put back restores the page");
  check(errors.length === 0, `phone: no page errors (${errors.slice(0, 2)})`);
  await ctx.close();
}

await browser.close();
console.log(`\n${issues.length ? `${issues.length} FAILED` : "All WILD checks passed"}`);
process.exit(issues.length ? 1 : 0);
