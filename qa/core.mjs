// CORE (MP5): Fun / Boring toggle, unlocks, cheats, scaled milestones, dev pages.
// Usage: BASE=http://localhost:3101/ node qa/core.mjs [shots-dir]
import { chromium } from "playwright";
import { setLocalHour } from "./clock.mjs";
import { AxeBuilder } from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const out = process.argv[2] ?? "/tmp";
const url = process.env.BASE ?? "http://localhost:3000/";
const N = [...readFileSync(new URL("../src/lib/fun.ts", import.meta.url), "utf8").matchAll(/\{ id: "([\w-]+)", title: .*?category: "(\w+)"/g)].length;
const KEY = "bells-and-whistles-v2";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/google/chrome/chrome" });
const issues = [];
const check = (ok, msg) => { console.log(`${ok ? "pass" : "FAIL"}  ${msg}`); if (!ok) issues.push(msg); };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  check(r.violations.length === 0, `axe ${label}: ${r.violations.length} violations`);
  for (const v of r.violations) console.log(`      - ${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
};
const state = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), KEY);
const attrs = (page) => page.evaluate(() => ({ ...document.documentElement.dataset }));
const toastText = (page) => page.locator(".toast").innerText().catch(() => "");

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await setLocalHour(ctx);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

// --- Boring by default: zero playground ---------------------------------------
let a = await attrs(page);
check(!a.mode && !a.fun && !a.look && !a.fxButtons, `boring default: no fun attributes (${JSON.stringify(a)})`);
check((await page.getByRole("radio", { name: "Boring" }).getAttribute("aria-checked")) === "true", "toggle: Boring is checked");
check((await page.locator(".bells-button").count()) === 0 && (await page.locator("[data-secrets-chip]").count()) === 0, "boring: no Bells & whistles button, no secrets chip");
check(await page.locator("[data-goblin-guide]").isVisible(), "boring: the goblin guide points at the toggle");
check(/Click Fun/.test(await page.locator("[data-goblin-guide]").innerText()), "goblin says to click Fun");
await page.keyboard.type("hire");
await page.locator("#hero-name").click({ clickCount: 1 });
for (let i = 0; i < 4; i++) await page.locator("#hero-name").click();
await page.keyboard.press("Control+a");
await page.waitForTimeout(200);
check(!(await page.locator("[data-hidden-egg].is-shown").count()), "boring: select-all doesn't show the hidden egg");
await page.mouse.click(5, 5);
check(((await state(page)).secrets ?? []).length === 0, "boring: typed words and name clicks find no secrets");
check(!(await page.locator("[data-pod-bay]").isVisible()) && !(await page.locator("[data-skeleton]").isVisible()), "boring: pod bay doors and skeleton hidden");
await page.keyboard.press("Control+k");
const pal = page.getByRole("dialog", { name: "Quick actions" });
check(await pal.getByRole("option", { name: "Switch to Fun mode" }).isVisible(), "boring palette: offers Switch to Fun mode");
check((await pal.getByText("Bells and whistles", { exact: true }).count()) === 0, "boring palette: no Bells & whistles actions");
await page.keyboard.press("Escape");
await axe(page, "boring home");
await page.screenshot({ path: `${out}/core-boring.png`, scale: "css" });

// --- Konami switches to Fun ---------------------------------------------------
for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) await page.keyboard.press(k);
await page.waitForTimeout(300);
a = await attrs(page);
let st = await state(page);
check(a.mode === "fun" && a.fun === "on" && st.funSeen === true, `konami: Fun mode, effects on (${JSON.stringify(a)})`);
check(/Fun mode is on\. Secret 1 of \d+ found/.test(await toastText(page)), `konami: says what happened (${await toastText(page)})`);
check(st.secrets.includes("konami"), "konami: the secret is found");
await page.waitForTimeout(2800);
check(/^Unlocked: .*Bubbles i-dots.*Terminal theme/.test(await toastText(page)), `first secret unlocks: toast (${await toastText(page)})`);
await page.waitForTimeout(1200);
check(await page.locator(".bells-button").isVisible() && await page.locator("[data-secrets-chip]").isVisible(), "fun: Bells & whistles and the chip are here");
check(!(await page.locator("[data-goblin-guide]").isVisible()), "fun: the goblin guide has left");

// --- Locks in the panel -------------------------------------------------------
await page.locator(".bells-button").click();
const panel = page.getByRole("dialog", { name: "Bells and whistles" });
const dots = panel.getByRole("radiogroup", { name: "i-dots style" });
check((await dots.getByRole("radio", { name: /^Bubbles$/ }).count()) === 1, "Bubbles unlocked after one secret");
const farm = dots.getByRole("radio", { name: /^Farm, locked\. Find \d+ more secrets?\./ });
check((await farm.count()) === 1 && (await farm.getAttribute("aria-disabled")) === "true", "Farm is shown locked, with what it needs");
await farm.click({ force: true });
check(/Farm: find \d+ more secrets? to unlock it\./.test(await panel.locator("[data-lock-caption]").first().innerText()), "tapping a locked style explains it");
check((await panel.locator("[data-game-option][data-locked]").count()) === 4, "all four mini games locked at 1 secret (Flabby needs his own secret)");
check(await panel.getByText("Mini games", { exact: true }).isVisible(), "panel legend says Mini games");
await page.keyboard.press("Escape");

// --- Boring and back: nothing lost --------------------------------------------
await page.locator("#hero-name").scrollIntoViewIfNeeded();
await page.evaluate((k) => {
  const s = JSON.parse(localStorage.getItem(k));
  s.effects.trail = { on: true, variant: "flow" };
  localStorage.setItem(k, JSON.stringify(s));
}, KEY);
await page.reload({ waitUntil: "networkidle" });
const before = await state(page);
await page.getByRole("radio", { name: "Boring" }).click();
await page.waitForTimeout(200);
a = await attrs(page);
check(!a.mode && !a.fun && !a.fxButtons && !a.look, "back to Boring: every effect off at once");
check((await page.locator(".bells-button").count()) === 0, "back to Boring: the button is gone");
await page.reload({ waitUntil: "networkidle" });
check(!(await attrs(page)).mode, "Boring persists across reloads");
await page.getByRole("radio", { name: "Fun" }).focus();
await page.keyboard.press("ArrowRight");
await page.waitForTimeout(200);
const after = await state(page);
check(after.mode === "fun" && after.effects.trail.variant === "flow" && JSON.stringify(after.secrets) === JSON.stringify(before.secrets) && JSON.stringify(after.celebrated) === JSON.stringify(before.celebrated), "Fun again (arrow keys): same secrets, milestones, and settings as before");

// --- No flash: the saved mode is on <html> before hydration --------------------
const flash = await ctx.newPage();
await flash.goto(url, { waitUntil: "commit" });
await flash.waitForSelector("header");
check((await flash.evaluate(() => document.documentElement.dataset.mode)) === "fun", "pre-hydration script sets data-mode=fun");
await flash.close();

// --- Cheats -------------------------------------------------------------------
await page.locator(".bells-button").click();
await panel.getByRole("switch", { name: "Enable cheats" }).click();
const pad = page.locator("dialog.numpad");
await page.keyboard.type("137");
await page.keyboard.press("Enter");
check(/Enable cheats\?/.test(await pad.innerText()), "137 asks to enable cheats");
await pad.getByRole("button", { name: "Enable cheats" }).click();
await page.waitForTimeout(300);
check(await panel.locator("[data-cheats='on']").isVisible(), "cheats section appears");
await panel.locator("[data-cheat='everything']").click();
await page.waitForTimeout(200);
check((await panel.locator("[data-game-option][data-locked]").count()) === 0 && (await panel.locator("[data-locked]").count()) === 0, "Unlock everything: nothing locked");
check(((await state(page)).secrets ?? []).length === before.secrets.length, "cheats don't find secrets");
await panel.getByRole("radiogroup", { name: "Cursor trail style" }).getByRole("radio", { name: "Car" }).click();
await panel.locator("summary", { hasText: "Pick fun features" }).click();
await panel.getByRole("switch", { name: "Stacker" }).click();
check((await panel.locator("[data-game-option='stacker'][data-locked]").count()) === 1, "a single cheat toggle locks one feature again");
await page.screenshot({ path: `${out}/core-cheats.png`, clip: { x: 860, y: 0, width: 420, height: 900 }, scale: "css" });
await axe(page, "panel with cheats");
// Reset secrets keeps cheats.
await page.keyboard.press("Escape");
await page.locator("[data-secrets-chip]").click();
await page.getByRole("button", { name: "Reset all secrets" }).click();
await page.getByRole("button", { name: "Reset everything" }).click();
st = await state(page);
check(st.secrets.length === 0 && st.cheats.enabled && st.cheats.unlocked.length > 10, "reset secrets keeps cheats");
await page.keyboard.press("Escape");
await page.locator(".bells-button").click();
await panel.locator("[data-cheat='off']").click();
await page.waitForTimeout(200);
st = await state(page);
check(!st.cheats.enabled && st.effects.trail.on && st.effects.trail.variant === "sparkle", `cheats off: the locked Car trail falls back to Sparkle (${st.effects.trail.variant})`);
check((await panel.locator("[data-game-option][data-locked]").count()) === 4, "cheats off: mini games lock again");
await page.keyboard.press("Escape");

// --- Scaled milestones: the first celebration at today's scale --------------
await page.evaluate((k) => {
  const s = JSON.parse(localStorage.getItem(k));
  s.secrets = ["name", "hire", "diamond", "egg"];
  s.celebrated = [];
  localStorage.setItem(k, JSON.stringify(s));
}, KEY);
await page.reload({ waitUntil: "networkidle" });
await page.keyboard.type("auhbon");
await page.waitForTimeout(1600);
st = await state(page);
check(st.celebrated.includes(5) && /Milestone: 5 secrets!/.test(await toastText(page)), `5th secret: milestone keyed 5 celebrates (${JSON.stringify(st.celebrated)})`);
const chipLabel = await page.locator("[data-secrets-chip]").getAttribute("aria-label");
check(chipLabel === `Secrets: ${st.secrets.length} of ${N} found`, `chip counts against live secrets (${chipLabel})`);
await page.locator("[data-secrets-chip]").click();
check((await page.locator("[data-live-marker]").count()) === 1 && (await page.locator("[data-coming-soon]").count()) === 1, "progress bar: live marker and coming-soon region");
await page.screenshot({ path: `${out}/core-secrets.png`, clip: { x: 900, y: 0, width: 380, height: 420 }, scale: "css" });
await page.keyboard.press("Escape");

// --- Phone: boring header ----------------------------------------------------
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await setLocalHour(phone);
const pp = await phone.newPage();
await pp.goto(url, { waitUntil: "networkidle" });
const navBox = await pp.locator("nav[aria-label='Sections'] li:last-child a").boundingBox();
const tgl = await pp.locator("[data-fun-toggle]").boundingBox();
check(navBox.x + navBox.width <= tgl.x + 1, `phone: section links end before the toggle (${Math.round(navBox.x + navBox.width)} vs ${Math.round(tgl.x)})`);
await pp.screenshot({ path: `${out}/core-phone-boring.png`, clip: { x: 0, y: 0, width: 390, height: 400 } });
await pp.getByRole("radio", { name: "Fun" }).tap();
await pp.waitForTimeout(300);
const dom = await pp.locator("header a[href='/']").evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
check(dom, "phone fun: the domain isn't truncated");
await phone.close();

// --- /dev pages -------------------------------------------------------------
await page.goto(new URL("/dev/milestones", url).href, { waitUntil: "networkidle" });
const slider = page.getByRole("slider", { name: "Total secrets implemented" });
check(Number(await slider.inputValue()) === Math.max(10, N), "milestones widget starts at today's count");
await slider.fill("100");
check((await page.locator("table").first().locator("tbody tr").nth(6).locator("td").nth(1).innerText()) === "97", "at 100 secrets, values equal the 100 scale");
await slider.fill(String(Math.max(10, N)));
await axe(page, "/dev/milestones");
await page.screenshot({ path: `${out}/core-dev-milestones.png`, fullPage: false, scale: "css" });
for (const path of ["/dev/secrets", "/dev/goals", "/dev"]) {
  await page.goto(new URL(path, url).href, { waitUntil: "networkidle" });
  await axe(page, path);
}
check(await page.getByRole("link", { name: /Milestones/ }).isVisible() && await page.getByRole("link", { name: /Goals/ }).isVisible(), "/dev links the new pages");

check(errors.length === 0, `no page errors (${errors.join(" | ")})`);
await browser.close();
console.log(issues.length ? `\n${issues.length} FAILED` : "\nall passed");
process.exit(issues.length ? 1 : 0);
