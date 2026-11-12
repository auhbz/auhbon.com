// Draft playground (/dev/draft), /dev/draft/diff and /dev/visuals.
// Usage: node draft.mjs <shots-dir>   (BASE=http://localhost:<port>/ to point elsewhere)
import { chromium } from "playwright";
import { funByDefault } from "./legacy-fun.mjs";
import { AxeBuilder } from "@axe-core/playwright";

const out = process.argv[2] ?? ".";
const base = process.env.BASE ?? "http://localhost:3000/";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/google/chrome/chrome" });
funByDefault(browser);
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

// Monkey Mode went live in MP5 (Wild & Wondrous): see qa/wild.mjs.

// --- Board games: dice ---------------------------------------------------------------
await openPanel(page);
await page.locator("[data-draft-panel] label", { hasText: "Board games" }).click();
await closePanel(page);
check((await page.locator("html").getAttribute("data-draft-look")) === "boardgames", "board games theme applied");
check(await page.locator("[data-boardgames]").isVisible(), "the dice tray and its games show");
await page.locator('[data-dice-game="free"]').click();
const roll = page.locator("[data-dice-roll]");
const result = page.locator("#draft-dice-result");
await page.evaluate(() => {
  window.__rand = Math.random;
  Math.random = () => 0;
});
for (let i = 0; i < 3; i++) {
  const prev = await result.innerText();
  await roll.click();
  await page.waitForFunction((p) => document.querySelector("#draft-dice-result")?.textContent !== p, prev, { timeout: 8000 });
}
await page.evaluate(() => (Math.random = window.__rand));
check(/Rolled 1 and 1/.test(await result.innerText()), "the dice settle on the rolled faces (snake eyes when the dice say so)");
ds = await draftState(page);
check(ds.secrets.includes("d-snake") && ds.secrets.includes("d-hot"), "snake eyes and three doubles in a row are draft secrets");
await page.locator('[data-dice-game="push"]').click();
await page.screenshot({ path: `${out}/draft-boardgames.png` });
await axe(page, "board games theme");

// The portal device went live in MP5 (an extra): see qa/wild.mjs.

// --- Pico-8 (live since MP5): a live look clears the draft theme ----------------------
await openPanel(page);
await page.getByRole("dialog", { name: "Bells and whistles" }).locator("label", { hasText: "Pico-8" }).click();
await closePanel(page);
check(!(await page.locator("html").getAttribute("data-draft-look")), "a live look clears the draft theme");
check((await page.locator("[data-flabby]").count()) === 0, "Flabby's draft perch is gone (he's live now)");

// Keyboard warrior (live) fires on any key while Bells & whistles is on, so it is allowed here.
const stray = (await liveSecrets(page)).filter((id) => id !== "keys");
check(stray.length === 0, `after every draft secret, no draft play counted as a live secret (${stray})`);
await openPanel(page);
check(/^\s*\d+ of \d+/.test(await page.locator("[data-draft-secret-count]").innerText()), "draft secrets have their own counter");
// MP5: mini games unlock by count or cheats; the live-secrets check above covers "draft never counts".
await closePanel(page);

// Leaving the draft cleans up.
await page.locator(".draft-banner a[href='/']").click();
await page.waitForURL(base);
await wait(300);
const html = await page.evaluate(() => ({ ...document.documentElement.dataset }));
check(!html.draft && !html.draftLook, `no draft attributes on the live site (${JSON.stringify(html)})`);
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
