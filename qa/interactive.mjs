import { chromium } from "playwright";
import { funByDefault } from "./legacy-fun.mjs";
import { AxeBuilder } from "@axe-core/playwright";

const out = process.argv[2];
const url = process.env.BASE ?? "http://localhost:3000/";
const browser = await chromium.launch({ executablePath: "/opt/google/chrome/chrome" });
funByDefault(browser);
const issues = [];
const check = (ok, msg) => { console.log(`${ok ? "pass" : "FAIL"}  ${msg}`); if (!ok) issues.push(msg); };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  check(r.violations.length === 0, `axe ${label}: ${r.violations.length} violations`);
  for (const v of r.violations) console.log(`      - ${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url, { waitUntil: "networkidle" });
await axe(page, "page (default dark)");

// --- Reactive hero -------------------------------------------------------
const letters = page.locator("[data-letter]");
const first = await letters.first().boundingBox();
await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
await page.waitForTimeout(400);
const weights = await letters.evaluateAll((els) => els.map((e) => +getComputedStyle(e).fontWeight));
check(weights[0] > 750 && weights[weights.length - 1] < 500, `hero spotlight: first letter ${weights[0]}, last ${weights.at(-1)}`);
await page.screenshot({ path: `${out}/hero-spotlight.png`, clip: { x: 0, y: 0, width: 1280, height: 520 } });
await page.mouse.move(640, 880);
await page.waitForTimeout(500);
const reset = await letters.evaluateAll((els) => els.every((e) => getComputedStyle(e).fontWeight === "700"));
check(reset, "hero resets to 700 when pointer leaves");
check((await page.locator("h1").innerText()).includes("Auhbon Amiri"), "h1 accessible text is the plain name");

// --- Project filter ------------------------------------------------------
const javaChip = page.getByRole("group", { name: "Filter projects by technology" }).getByRole("button", { name: "Java 1 project", exact: true });
await javaChip.click();
await page.waitForTimeout(500);
const javaNames = await page.locator("#work article h3").allInnerTexts();
check(javaNames.length === 1 && javaNames[0] === "Off-Top", `Java filter shows Off-Top only: ${JSON.stringify(javaNames)}`);
check((await javaChip.getAttribute("aria-pressed")) === "true", "Java chip aria-pressed=true");
check(page.url().includes("stack=Java"), `URL updated: ${page.url()}`);
const status = await page.locator("#work [role=status]").innerText();
check(/Showing 1 project built with Java/.test(status), `live status: "${status}"`);
await page.locator("#work").screenshot({ path: `${out}/filter-java.png` });
// Card chip toggles filter
await page.getByRole("button", { name: "Flutter: show projects built with Flutter" }).first().click().catch(() => {});
await page.getByRole("group", { name: "Filter projects by technology" }).getByRole("button", { name: "All" }).click();
await page.waitForTimeout(400);
check((await page.locator("#work article h3").count()) === 5, "All restores 5 featured projects");
// Deep link
await page.goto(url + "?stack=Python#work", { waitUntil: "networkidle" });
const py = await page.locator("#work article h3, #work li p.font-medium").allInnerTexts();
check(py.includes("DomDom") && py.includes("Discord Motivator Bot") && !py.includes("BeeSafe"), `deep link ?stack=Python: ${JSON.stringify(py)}`);
await page.goto(url, { waitUntil: "networkidle" });

// --- Theme toggle (dark by default; cycles Dark -> Light -> System) -----------
const toggle = page.getByRole("button", { name: /^Color mode:/ });
const themeNow = () => page.evaluate(() => document.documentElement.dataset.theme);
const bgNow = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check((await themeNow()) === "dark" && (await bgNow()) === "rgb(15, 28, 34)", `default is dark: ${await themeNow()}, ${await bgNow()}`);
check(/Color mode: Dark/.test(await toggle.getAttribute("aria-label")), "toggle label announces Dark");
await page.screenshot({ path: `${out}/default-dark.png`, clip: { x: 0, y: 0, width: 1280, height: 700 } });
await toggle.click(); // dark -> light
check((await themeNow()) === "light" && (await bgNow()) === "rgb(244, 247, 246)", `toggle to light: ${await themeNow()}`);
await axe(page, "page (light)");
await page.reload({ waitUntil: "networkidle" });
check((await themeNow()) === "light", `light persists across reload: ${await themeNow()}`);
await toggle.click(); // light -> system
check((await themeNow()) === undefined, "system clears data-theme (follows the OS)");
await toggle.click(); // system -> dark
check((await themeNow()) === "dark", "back to dark");
// --- Command palette -----------------------------------------------------
await page.locator("body").click({ position: { x: 5, y: 600 } });
const before = await page.evaluate(() => document.activeElement?.tagName);
await page.keyboard.press("Control+k");
await page.waitForTimeout(250);
check(await page.locator("dialog.palette[open]").isVisible(), "Ctrl+K opens palette");
check((await page.evaluate(() => document.activeElement?.getAttribute("role"))) === "combobox", "focus moves to search input");
await page.screenshot({ path: `${out}/palette-open.png` });
await axe(page, "palette open");
await page.keyboard.type("java");
await page.waitForTimeout(150);
const opts = await page.locator("[role=option]").allInnerTexts();
check(opts[0] === "Show Java projects", `search "java" ranks Java first: ${JSON.stringify(opts)}`);
await page.keyboard.press("Enter");
await page.waitForTimeout(900);
check(!(await page.locator("dialog.palette[open]").count()), "Enter runs command and closes palette");
check(new URL(page.url()).searchParams.get("stack") === "Java", `palette command filtered to Java: ${page.url()}`);
check((await page.evaluate(() => document.activeElement?.id)) === "work-heading", "focus moved to Selected work heading");
// Esc closes
await page.keyboard.press("Control+k");
await page.keyboard.type("exp");
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
check(!(await page.locator("dialog.palette[open]").count()), "Esc closes palette");
// Arrow nav + no-results
await page.getByRole("button", { name: /^Quick actions/ }).click();
await page.waitForTimeout(200);
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowDown");
const sel = await page.locator("[role=option][aria-selected=true]").innerText();
check(sel === "Experience", `ArrowDown x2 selects third item: ${sel}`);
await page.keyboard.type("zzzz");
check(await page.getByText(/No actions match/).isVisible(), "empty state shows guidance");
await page.keyboard.press("Escape");
// Copy email -> toast
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
await page.keyboard.press("Control+k");
await page.keyboard.type("copy email");
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
const clip = await page.evaluate(() => navigator.clipboard.readText());
check(clip === "auhbon@gmail.com", `clipboard: ${clip}`);
check(await page.getByText("Email address copied").isVisible(), "toast confirms copy");
await page.screenshot({ path: `${out}/toast.png`, clip: { x: 0, y: 700, width: 1280, height: 200 } });

check(errors.length === 0, `no console/page errors (${errors.length}) ${errors.slice(0, 3).join(" | ")}`);
await ctx.close();

// --- Reduced motion: hero must not react -----------------------------------
const rm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const p2 = await rm.newPage();
await p2.goto(url, { waitUntil: "networkidle" });
const b = await p2.locator("[data-letter]").first().boundingBox();
await p2.mouse.move(b.x + 5, b.y + 5);
await p2.waitForTimeout(300);
const still = await p2.locator("[data-letter]").evaluateAll((els) => els.every((e) => getComputedStyle(e).fontWeight === "700"));
check(still, "reduced motion: hero stays static");
await rm.close();

// --- Mobile: header layout + no horizontal scroll ---------------------------
const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, colorScheme: "dark" });
const p3 = await mob.newPage();
await p3.goto(url, { waitUntil: "networkidle" });
const hs = await p3.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
check(!hs, "mobile: no horizontal scroll");
check(!(await p3.locator("header kbd").count()), "mobile: no keyboard hint on touch");
await p3.screenshot({ path: `${out}/mobile-dark-top.png` });
await new AxeBuilder({ page: p3 }).analyze().then((r) => check(r.violations.length === 0, `axe mobile dark: ${r.violations.length}`));
await mob.close();

await browser.close();
console.log(`\n${issues.length ? issues.length + " FAILED" : "All checks passed"}`);
process.exit(issues.length ? 1 : 0);
