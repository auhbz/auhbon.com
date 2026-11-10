// Draft playground (/dev/draft), /dev/draft/diff and /dev/visuals.
// Usage: node draft.mjs <shots-dir>   (BASE=http://localhost:<port>/ to point elsewhere)
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const out = process.argv[2] ?? ".";
const base = process.env.BASE ?? "http://localhost:3000/";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/google/chrome/chrome" });
const issues = [];
const check = (ok, msg) => {
  console.log(`${ok ? "pass" : "FAIL"}  ${msg}`);
  if (!ok) issues.push(msg);
};
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  check(r.violations.length === 0, `axe ${label}: ${r.violations.length} violations`);
  for (const v of r.violations) console.log(`      - ${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const liveSecrets = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2") || "{}").secrets ?? []);
const draftState = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("draft-playground-v1") || "{}"));
const chaos = (page) => page.evaluate(() => window.__draftChaos?.snapshot());
async function openPanel(page) {
  await page.getByRole("button", { name: "Bells and whistles" }).click();
  await page.getByRole("dialog", { name: "Bells and whistles" }).waitFor();
}
async function closePanel(page) {
  await page.keyboard.press("Escape");
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

// --- Live vs draft content ------------------------------------------------------
await page.goto(base, { waitUntil: "networkidle" });
const liveHeadings = await page.locator("main h2").allInnerTexts();
await openPanel(page);
check((await page.locator("[data-draft-panel]").count()) === 0, "live panel has no draft section");
await closePanel(page);
await page.goto(`${base}dev/draft`, { waitUntil: "networkidle" });
const draftHeadings = await page.locator("main h2").allInnerTexts();
check(liveHeadings.every((h) => draftHeadings.includes(h)), `draft renders every live section (${liveHeadings.join(", ")})`);
check(await page.getByText("Draft playground: ideas being tested before they go live").isVisible(), "draft banner shows");
check((await page.locator(".draft-banner a[href='/']").count()) === 1 && (await page.locator(".draft-banner a[href='/dev/draft/diff']").count()) === 1, "banner links to the live site and the diff");
check((await page.locator("html").getAttribute("data-draft")) === "on", "html carries data-draft");
const robots = await page.locator('meta[name="robots"]').getAttribute("content");
check(/noindex/.test(robots ?? ""), `draft is noindex (${robots})`);
check(await page.locator("#loves-heading").isVisible(), "I ❤️ section present");
const rows = await page.locator(".draft-loves-row").evaluateAll((els) => els.map((e) => ({ text: e.textContent.length, w: e.getBoundingClientRect().width })));
check(rows.every((r, i) => i === 0 || r.text > rows[i - 1].text), "each love line is longer than the one above (text)");
const narrower = rows.map((r, i) => (i && r.w <= rows[i - 1].w ? `${i}: ${Math.round(rows[i - 1].w)}→${Math.round(r.w)}` : null)).filter(Boolean);
check(!narrower.length, `each love line is wider than the one above (rendered) ${narrower.join(", ")}`);
check((await page.locator("#loves ul.sr-only li").count()) === 55, "screen readers get a plain list of all 55 loves");
await page.locator("#loves").screenshot({ path: `${out}/draft-loves.png` });
await page.screenshot({ path: `${out}/draft-top.png` });
await axe(page, "/dev/draft 1280");

// --- Panel: draft items only here -------------------------------------------------
await openPanel(page);
const draftPanel = page.locator("[data-draft-panel]");
check(await draftPanel.isVisible(), "draft section appears in the panel on /dev/draft");
check((await draftPanel.locator(".draft-tag").count()) >= 3, "draft items carry a draft tag");
await draftPanel.scrollIntoViewIfNeeded();
await page.getByRole("dialog", { name: "Bells and whistles" }).screenshot({ path: `${out}/draft-panel.png` });
await axe(page, "/dev/draft panel open");

// --- Chaos: monkeys -----------------------------------------------------------------
await draftPanel.getByRole("switch", { name: /Chaos/ }).click();
await closePanel(page);
await page.waitForFunction(() => window.__draftChaos?.snapshot().monkeys.length >= 2);
check(true, "monkeys spawn");
let thief = null;
for (let i = 0; i < 60 && !thief; i++) {
  await wait(500);
  thief = (await chaos(page)).monkeys.find((m) => m.carrying && m.state !== "dizzy" && m.state !== "leave");
}
check(!!thief, "a monkey steals something");
check((await page.locator("[data-draft-stolen]").count()) >= 1, "the stolen element is marked (and stays in the DOM)");
await page.screenshot({ path: `${out}/draft-monkeys.png` });
if (thief) {
  const live = (await chaos(page)).monkeys.find((m) => m.id === thief.id);
  await page.mouse.click(live.x, live.y - 6);
  await wait(800);
  const after = await chaos(page);
  check(after.bonks >= 1, `clicking a monkey bonks it (${after.bonks} bonks)`);
  check((await page.locator("[data-draft-stolen]").count()) === after.monkeys.filter((m) => m.carrying).length, "the bonked monkey's item returns");
}
// Bananas from the crate (keyboard toss).
await page.locator("[data-chaos-crate]").focus();
await page.keyboard.press("Enter");
await wait(100);
check((await chaos(page)).bananas >= 1, "the crate tosses a banana");
// Gorilla glass: 4 hits.
const glass = page.locator('[data-glass="gorilla"]');
for (let i = 1; i <= 4; i++) {
  await glass.click();
  if (i < 4) check((await chaos(page)).gorilla === null, `glass hit ${i}: still intact`);
}
check((await glass.getAttribute("data-cracks")) === "4", "glass shatters after 4 hits");
await wait(400);
check((await chaos(page)).gorilla !== null, `the gorilla is out (${(await chaos(page)).gorilla})`);
await wait(1400);
await page.screenshot({ path: `${out}/draft-gorilla.png` });
// Hammer glass, then the crate.
const hglass = page.locator('[data-glass="hammer"]');
for (let i = 0; i < 4; i++) await hglass.click();
check((await page.locator("html").getAttribute("data-draft-hammer")) === "on", "holding the peanut hammer");
await page.mouse.move(640, 450);
await wait(100);
await page.screenshot({ path: `${out}/draft-hammer.png` });
await page.locator("[data-chaos-crate]").click();
await wait(300);
check((await chaos(page)).bananas >= 10, `crate knocked over: bananas everywhere (${(await chaos(page)).bananas})`);
await page.screenshot({ path: `${out}/draft-frenzy.png` });
let ds = await draftState(page);
check(ds.secrets.includes("d-gorilla") && ds.secrets.includes("d-frenzy"), `chaos draft secrets found (${ds.secrets})`);
check((await liveSecrets(page)).length === 0, "draft secrets don't touch the live secrets");
check(await page.getByRole("button", { name: /^Secrets: 0 of 100 found/ }).isVisible(), "live trophy count still 0");
await openPanel(page);
await page.locator("[data-draft-panel]").getByRole("switch", { name: /Chaos/ }).click();
await closePanel(page);
check((await page.locator("[data-draft-stolen]").count()) === 0 && !(await page.evaluate(() => !!window.__draftChaos)), "switching Chaos off returns everything");

// --- Board games: dice ---------------------------------------------------------------
await openPanel(page);
await page.locator("[data-draft-panel] label", { hasText: "Board games" }).click();
await closePanel(page);
check((await page.locator("html").getAttribute("data-draft-look")) === "boardgames", "board games theme applied");
const roll = page.locator("[data-dice-roll]");
const before = await roll.getAttribute("data-faces");
await page.evaluate(() => {
  window.__rand = Math.random;
  Math.random = () => 0;
});
await roll.click();
check((await roll.getAttribute("data-faces")) === "1-1" && before !== "1-1", "the dice roll (snake eyes when the dice say so)");
await roll.click();
await roll.click();
await page.evaluate(() => (Math.random = window.__rand));
ds = await draftState(page);
check(ds.secrets.includes("d-snake") && ds.secrets.includes("d-hot"), "snake eyes and three doubles in a row are draft secrets");
await roll.click();
await page.screenshot({ path: `${out}/draft-boardgames.png` });
await axe(page, "board games theme");

// --- Pho -----------------------------------------------------------------------------
await openPanel(page);
await page.locator("[data-draft-panel] label", { hasText: "Pho" }).click();
await closePanel(page);
check((await page.locator("html").getAttribute("data-draft-look")) === "pho", "pho theme applied");
const bowl = page.locator("[data-pho-bowl]");
for (let i = 0; i < 5; i++) await bowl.click();
check((await bowl.getAttribute("data-left")) === "0" && (await draftState(page)).secrets.includes("d-slurp"), "slurping the whole bowl is a draft secret");
await bowl.click();
await page.screenshot({ path: `${out}/draft-pho.png` });
await page.locator("#work").screenshot({ path: `${out}/draft-pho-section.png` });
await axe(page, "pho theme");

// --- Portals -------------------------------------------------------------------------
const gun = page.locator("[data-portal-gun]");
await gun.scrollIntoViewIfNeeded();
await gun.click();
check((await page.locator("[data-portal-hud]").count()) === 1, "picking up the device shows the portal HUD");
const panel = (id) => page.locator(`[data-portal-surface="${id}"]`);
const clear = () => page.getByRole("button", { name: "Clear portals" }).click();
await panel("word-shelf").click();
check((await panel("word-shelf").getAttribute("data-portal")) === "orange", "first portal is orange");
await panel("blank").click();
check((await panel("blank").getAttribute("data-portal")) === "blue", "second portal is blue");
check(/hello/.test(await panel("blank").innerText()), "chamber 1: the word moves through the portals");
await panel("blank").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${out}/draft-portal-word.png` });
await clear();
await panel("ledge").click();
await panel("panel-c").click();
await clear();
await panel("vault-shelf").click(); // locked: no portal sticks
check((await panel("vault-shelf").getAttribute("data-portal")) === null, "the vault glass refuses portals until it's open");
await panel("ledge").click();
await panel("over-button").click();
check((await panel("vault-shelf").getAttribute("data-locked")) === null, "chamber 3: the rock on the button opens the vault");
await clear();
await panel("vault-shelf").click();
await panel("over-plate").click();
await wait(200);
const toast = await page.locator("[role=status] .toast").innerText().catch(() => "");
check(/It was a lie\./.test(toast), `the cake: toast says "It was a lie." (${toast})`);
check((await draftState(page)).secrets.includes("d-cake"), "Cake is a draft secret");
await page.locator("[data-portal-hud]").screenshot({ path: `${out}/draft-portal-hud.png` });

// --- Pico-8: climber and Flabby -----------------------------------------------------
await openPanel(page);
await page.getByRole("dialog", { name: "Bells and whistles" }).locator("label", { hasText: "Pico-8" }).click();
await closePanel(page);
check(!(await page.locator("html").getAttribute("data-draft-look")), "a live look clears the draft theme");
check((await page.locator("[data-climber]").count()) === 1, "the climber runs in Pico-8");
const flabby = page.locator("[data-flabby]");
await flabby.scrollIntoViewIfNeeded();
await wait(600);
await page.screenshot({ path: `${out}/draft-pico.png` });
await flabby.click();
const game = page.locator("dialog[data-flabby-game]");
check(await game.isVisible(), "clicking Flabby opens his game");
check((await game.getAttribute("data-flabby-game")) === "ready", "game starts ready");
await game.locator("canvas").click();
await wait(150);
check((await game.getAttribute("data-flabby-game")) === "play", "a tap starts the game");
for (let i = 0; i < 2; i++) {
  await page.keyboard.press("ArrowUp");
  await wait(700);
}
await game.screenshot({ path: `${out}/draft-flabby-game.png` });
await game.getByRole("button", { name: "Pause" }).click();
check(/paused/.test(await game.innerText()), "pause works");
await game.getByRole("button", { name: "Resume" }).click();
await game.getByRole("button", { name: "Exit" }).click();
await wait(150);
check(!(await game.isVisible().catch(() => false)), "Exit closes the game");
check(await flabby.evaluate((el) => el === document.activeElement), "focus returns to Flabby");
check((await draftState(page)).secrets.includes("d-coward"), "quitting mid-flight is the Coward secret");
// Let a run end on its own: never flap.
await flabby.click();
await game.locator("canvas").click();
await page.waitForFunction(() => document.querySelector("dialog[data-flabby-game]")?.dataset.flabbyGame === "over", null, { timeout: 8000 });
check(true, "the game ends (game over)");
await wait(800);
await game.screenshot({ path: `${out}/draft-flabby-over.png` });
await page.keyboard.press("Escape");

// Keyboard warrior (live) fires on any key while Bells & whistles is on, so it is allowed here.
const stray = (await liveSecrets(page)).filter((id) => id !== "keys");
check(stray.length === 0, `after every draft secret, no draft play counted as a live secret (${stray})`);
await openPanel(page);
check(/^\s*\d+ of 10/.test(await page.locator("[data-draft-secret-count]").innerText()), "draft secrets have their own counter");
check(await page.locator("[data-modes='locked']").isVisible(), "game modes stay locked");
await closePanel(page);

// Leaving the draft cleans up.
await page.locator(".draft-banner a[href='/']").click();
await page.waitForURL(base);
await wait(300);
const html = await page.evaluate(() => ({ ...document.documentElement.dataset }));
check(!html.draft && !html.draftLook && !html.draftChaos, `no draft attributes on the live site (${JSON.stringify(html)})`);
await openPanel(page);
check((await page.locator("[data-draft-panel]").count()) === 0, "draft panel items gone after navigating to the live site");
await closePanel(page);
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(" | ")})`);
await ctx.close();

// --- Fresh contexts: axe at 375px, reduced motion, diff and visuals ----------------
for (const [w, h] of [[375, 812], [1280, 900]]) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  const p = await c.newPage();
  await p.goto(`${base}dev/draft`, { waitUntil: "networkidle" });
  await axe(p, `/dev/draft ${w}px reduced motion`);
  const hs = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check(!hs, `/dev/draft ${w}px: no horizontal scroll`);
  if (w === 375) {
    await p.locator("#loves").screenshot({ path: `${out}/draft-loves-375.png` });
    await p.evaluate(() => localStorage.setItem("draft-playground-v1", JSON.stringify({ chaos: true, look: "pho" })));
    await p.reload({ waitUntil: "load" });
    await wait(1200);
    const s = await p.evaluate(() => window.__draftChaos?.snapshot());
    check(s && s.monkeys.length <= 3, `reduced motion: calm chaos (${s?.monkeys.length} monkeys)`);
    await p.screenshot({ path: `${out}/draft-375-pho-chaos.png` });
    await axe(p, "/dev/draft 375px pho + chaos");
  }
  for (const path of ["dev/draft/diff", "dev/visuals"]) {
    await p.goto(`${base}${path}`, { waitUntil: "networkidle" });
    await axe(p, `/${path} ${w}px`);
    const hs2 = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check(!hs2, `/${path} ${w}px: no horizontal scroll`);
    await p.screenshot({ path: `${out}/${path.replaceAll("/", "-")}-${w}.png`, fullPage: true });
  }
  await c.close();
}

// The visuals: the farm tree comes from STORY.
{
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  await p.goto(`${base}dev/visuals`, { waitUntil: "networkidle" });
  check((await p.locator(".viz-node.is-secret").count()) === 3, "farm tree marks 3 secret endings");
  check((await p.locator(".viz-node.is-common").count()) === 13, "farm tree shows 13 common endings");
  check((await p.locator("a[href='/dev/visuals']").count()) === 0, "(visuals page loads)");
  await p.goto(`${base}dev`, { waitUntil: "networkidle" });
  check((await p.locator("a[href='/dev/visuals']").count()) === 1 && (await p.locator("a[href='/dev/draft']").count()) === 1, "/dev links to the draft and visuals");
  await c.close();
}

await browser.close();
console.log(`\n${issues.length ? `${issues.length} FAILED` : "All draft checks passed"}`);
process.exit(issues.length ? 1 : 0);
