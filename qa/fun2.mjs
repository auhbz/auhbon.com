import { chromium } from "playwright";
import { setLocalHour } from "./clock.mjs";
import { funByDefault } from "./legacy-fun.mjs";
import { AxeBuilder } from "@axe-core/playwright";

const out = process.argv[2];
const url = process.env.BASE ?? "http://localhost:3000/";
// Every secret (id and category), read from the source so the counts stay in step.
const SECRET_DEFS = [...(await import("node:fs")).readFileSync(new URL("../src/lib/fun.ts", import.meta.url), "utf8").matchAll(/\{ id: "([\w-]+)", title: .*?category: "(\w+)"/g)].map((m) => ({ id: m[1], category: m[2] }));
const SECRET_COUNT = SECRET_DEFS.length;
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/google/chrome/chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
funByDefault(browser);
const issues = [];
const check = (ok, msg) => { console.log(`${ok ? "pass" : "FAIL"}  ${msg}`); if (!ok) issues.push(msg); };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  check(r.violations.length === 0, `axe ${label}: ${r.violations.length} violations`);
  for (const v of r.violations) console.log(`      - ${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
};
const attrs = (page) => page.evaluate(() => ({ ...document.documentElement.dataset }));
/** Count painted canvas pixels, optionally inside a viewport box. */
const painted = (page, box) => page.evaluate((box) => {
  const c = document.querySelector("canvas");
  const dpr = c.width / innerWidth;
  const [x, y, w, h] = box ? [box.x, box.y, box.width, box.height] : [0, 0, innerWidth, innerHeight];
  const d = c.getContext("2d").getImageData(Math.max(0, x * dpr), Math.max(0, y * dpr), Math.max(1, w * dpr), Math.max(1, h * dpr)).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
  return n;
}, box);

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await setLocalHour(ctx);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url, { waitUntil: "networkidle" });

// --- Defaults -----------------------------------------------------------------
let a = await attrs(page);
check(a.theme === "dark" && !a.fun && !a.look, `default: dark, no fun (${JSON.stringify(a)})`);
const bell = page.getByRole("button", { name: "Bells and whistles" });
check(await bell.isVisible(), "bells & whistles button present");
check(await page.getByRole("button", { name: /^Secrets: 0 of \d+ found/ }).isVisible(), "secrets chip shows in Fun mode from the first visit");
// MP5: the guide goblin now points at the Boring / Fun toggle (see qa/core.mjs).
const orbit = await bell.evaluate((el) => getComputedStyle(el, "::after").animationName);
check(orbit === "orbit", `orbiting light animates (${orbit})`);
await page.screenshot({ path: `${out}/header.png`, clip: { x: 700, y: 0, width: 580, height: 64 } });

// --- External links open in new tabs ----------------------------------------
const gh = page.locator("section").first().getByRole("link", { name: /^GitHub/ });
check((await gh.getAttribute("target")) === "_blank" && /noopener/.test(await gh.getAttribute("rel")), "external links: target=_blank rel=noopener");
check(/opens in a new tab/.test(await gh.innerText() + (await gh.textContent())), "external links announce new tab to screen readers");
const mail = page.locator("section").first().getByRole("link", { name: "Email me" });
check((await mail.getAttribute("target")) === null, "mailto link stays in place");

// --- Panel + master switch -----------------------------------------------------
await bell.click();
const panel = page.getByRole("dialog", { name: "Bells and whistles" });
check(await panel.isVisible(), "panel opens");
await page.getByRole("switch", { name: "Enable bells and whistles" }).click();
await page.waitForTimeout(300);
a = await attrs(page);
check(a.fun === "on" && a.fxButtons === "rainbow" && a.fxDots === "fruit", `master on: everything on, first options (${JSON.stringify(a)})`);
for (const [label, first] of [["i-dots", "Fruit"], ["Buttons", "Rainbow"], ["Cursor trail", "Sparkle"], ["Sound effects", "Bells & whistles"]]) {
  const on = await page.getByRole("switch", { name: label }).getAttribute("aria-checked");
  const sel = await page.getByRole("radiogroup", { name: `${label} style` }).getByRole("radio", { checked: true }).innerText();
  check(on === "true" && sel === first, `${label}: on, "${first}" selected (${on}, ${sel})`);
}
await axe(page, "panel open, everything on");
await page.screenshot({ path: `${out}/panel.png`, clip: { x: 830, y: 50, width: 450, height: 850 } });

const choose = async (label, option) => {
  if (!(await panel.isVisible())) await bell.click();
  await page.getByRole("radiogroup", { name: `${label} style` }).getByRole("radio", { name: option }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
};

// --- i-dots: slingshot -----------------------------------------------------------
await choose("i-dots", "Slingshot");
check((await page.locator("[data-rock]").count()) === 1 && (await page.locator("[data-goblin]").count()) === 1, "slingshot: a rock on one i, the goblin on the other");
await page.evaluate(() => scrollTo(0, 0));
let rock = await page.locator("[data-rock]").boundingBox();
await page.mouse.move(rock.x + rock.width / 2, rock.y + rock.height / 2);
await page.mouse.down();
await page.mouse.move(rock.x + 140, rock.y - 40, { steps: 8 }); // pull right: fires left through the name
await page.waitForTimeout(100);
check((await page.locator("[data-rock]").getAttribute("data-state")) === "out", "slingshot: rock picked up");
check((await painted(page)) > 100, "slingshot: bands + aim preview drawn");
await page.screenshot({ path: `${out}/slingshot-aim.png`, clip: { x: 0, y: 60, width: 1280, height: 520 } });
await page.mouse.up();
let knocked = false;
for (let i = 0; i < 20 && !knocked; i++) {
  await page.waitForTimeout(50);
  knocked = await page.locator("[data-letter]").evaluateAll((els) => els.some((e) => e.style.transform && e.style.transform !== "none" && e.style.transform !== ""));
}
check(knocked, "slingshot: rock knocks letters of the name");
await page.screenshot({ path: `${out}/slingshot-hit.png`, clip: { x: 0, y: 60, width: 1280, height: 520 } });
let goblinOut = false;
for (let i = 0; i < 70 && !goblinOut; i++) {
  await page.waitForTimeout(100);
  goblinOut = (await page.locator("[data-goblin]").getAttribute("data-state")) === "out";
}
check(goblinOut, "slingshot: the rock lands and the goblin runs out to fetch it");
// The landed rock sits on the bottom edge; clicking it rolls it toward the goblin.
const floorY = 900 - 9;
const rockX = await page.evaluate((fy) => {
  const c = document.querySelector("canvas");
  const d = c.width / innerWidth;
  const row = c.getContext("2d").getImageData(0, Math.round((fy - 4) * d), c.width, Math.round(8 * d)).data;
  const w = c.width;
  let sum = 0, n = 0;
  for (let i = 0; i < row.length / 4; i++) if (row[i * 4 + 3] > 40) { sum += (i % w) / d; n++; }
  return n ? sum / n : null;
}, floorY);
let rolled = false;
if (rockX !== null) {
  await page.mouse.click(rockX, floorY);
  await page.waitForTimeout(800); // let the trail's sparkles from the click fade
  rolled = (await painted(page, { x: rockX - 10, y: floorY - 10, width: 20, height: 20 })) < 30;
}
check(rolled, `slingshot: clicking the landed rock rolls it toward the goblin (rock at ${rockX})`);
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/goblin.png` });
let back = false;
for (let i = 0; i < 120 && !back; i++) {
  await page.waitForTimeout(100);
  back = (await page.locator("[data-rock]").getAttribute("data-state")) === "ready" && (await page.locator("[data-goblin]").getAttribute("data-state")) === "home";
}
check(back, "slingshot: the goblin brings the rock back and goes home");
const settled = await page.locator("[data-letter]").evaluateAll((els) => els.every((e) => !e.style.transform));
check(settled, "slingshot: knocked letters spring back home");

// Aim down at the intro text: words get knocked (painted on the canvas, page text untouched).
rock = await page.locator("[data-rock]").boundingBox();
const introBefore = await page.locator("section").first().locator("p").nth(1).innerText();
await page.mouse.move(rock.x + rock.width / 2, rock.y + rock.height / 2);
await page.mouse.down();
await page.mouse.move(rock.x - 10, rock.y - 120, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/slingshot-words.png`, clip: { x: 0, y: 60, width: 1280, height: 700 } });
check((await page.locator("section").first().locator("p").nth(1).innerText()) === introBefore, "slingshot: real page text is never modified");

// --- i-dots: bubbles ---------------------------------------------------------------
await choose("i-dots", "Bubbles");
check((await page.locator("[data-bubble]").count()) === 2, "bubbles: two bubble makers");
await page.mouse.move(5, 890);
await page.waitForTimeout(2600);
const hero = await page.locator("h1").boundingBox();
check((await painted(page, { x: hero.x, y: 0, width: hero.width, height: hero.y + 80 })) > 200, "bubbles: bubbles float up from the i's");
await page.screenshot({ path: `${out}/bubbles.png`, clip: { x: 0, y: 0, width: 1280, height: 420 } });
// Sweep the mouse through the bubble column to pop them.
const src = await page.locator("[data-bubble]").last().boundingBox();
for (let y = src.y; y > 0; y -= 12) await page.mouse.move(src.x + 2, y);
check(errors.length === 0, "bubbles: popping causes no errors");

// --- Buttons ---------------------------------------------------------------------
await choose("Buttons", "Electric");
check((await attrs(page)).fxButtons === "electric", "buttons: electricity on");
const ghBox = await gh.boundingBox();
await gh.hover();
await page.waitForTimeout(150);
const bolt = await painted(page, { x: ghBox.x - 14, y: ghBox.y - 14, width: ghBox.width + 28, height: ghBox.height + 28 });
check(bolt > 150, `electricity: lightning drawn around hovered button (${bolt}px)`);
await page.screenshot({ path: `${out}/electric.png`, clip: { x: ghBox.x - 160, y: ghBox.y - 50, width: 460, height: 150 } });

await choose("Buttons", "Mercury");
await page.mouse.move(ghBox.x + ghBox.width / 2, ghBox.y + ghBox.height + 60); // near, not on
await page.waitForTimeout(250);
const m = await gh.evaluate((el) => ({ m: +el.style.getPropertyValue("--m"), ring: +getComputedStyle(el, "::before").opacity, t: getComputedStyle(el).transform }));
check(m.m > 0.3 && m.ring > 0.3, `mercury: ring wakes up from a distance (m=${m.m.toFixed(2)}, ring=${m.ring.toFixed(2)})`);
check(m.t !== "none", `mercury: button leans toward the cursor (${m.t})`);
await page.screenshot({ path: `${out}/mercury.png`, clip: { x: ghBox.x - 160, y: ghBox.y - 50, width: 460, height: 150 } });

// --- Cookie buttons (1.8.0) ---------------------------------------------------------
await choose("Buttons", "Cookie");
const pal = page.locator("#work .pill").first();
await pal.scrollIntoViewIfNeeded();
for (let i = 1; i <= 4; i++) {
  await pal.click();
  const bites = await pal.getAttribute("data-bites");
  check(bites === String(i), `cookie: press ${i} -> ${i} bites (${bites})`);
  if (i === 4) {
    // The fourth bite finishes the cookie (Cookie monster), then a fresh one appears.
    check(await pal.evaluate((el) => getComputedStyle(el).opacity !== "1" || el.getAnimations().length > 0), "cookie: the fourth bite eats it all");
    check(JSON.parse(await page.evaluate(() => localStorage.getItem("bells-and-whistles-v2"))).secrets.includes("cookie"), "cookie monster: eating a whole cookie is a secret");
    await page.waitForTimeout(800);
    check((await pal.getAttribute("data-bites")) === "0" && (await pal.evaluate((el) => getComputedStyle(el).opacity)) === "1", "cookie: then a fresh cookie");
  }
  if (i === 3) {
    check(await pal.evaluate((el) => getComputedStyle(el).maskImage !== "none"), "cookie: bites are masked out");
    const b = await pal.boundingBox();
    await page.screenshot({ path: `${out}/cookie.png`, clip: { x: b.x - 140, y: b.y - 20, width: b.width + 160, height: b.height + 40 } });
  }
}
await page.keyboard.press("Shift+Tab");
await page.keyboard.press("Tab");
const kf = await pal.evaluate((el) => ({ fv: el.matches(":focus-visible"), mask: getComputedStyle(el).maskImage }));
await page.evaluate(() => scrollTo(0, 0));
check(kf.fv && kf.mask === "none", `cookie: keyboard focus shows the whole button (${JSON.stringify(kf)})`);

// --- Flow trail (1.8.0) -------------------------------------------------------------
await choose("Cursor trail", "Flow");
for (let i = 0; i < 20; i++) await page.mouse.move(300 + i * 12, 600);
await page.waitForTimeout(60);
check((await painted(page, { x: 250, y: 560, width: 360, height: 120 })) > 60, "flow: water streams behind the cursor");
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(120);
check((await painted(page, { x: 470, y: 520, width: 140, height: 110 })) > 120, "flow: a click splashes");
await page.screenshot({ path: `${out}/flow.png`, clip: { x: 300, y: 480, width: 400, height: 200 } });
await page.waitForTimeout(1500);
check((await painted(page, { x: 520, y: 600, width: 50, height: 120 })) > 6, "flow: holding still drips");

// --- Every trail reacts to clicks (1.9.0) -------------------------------------------
for (const [trail, label] of [["Sparkle", "sparkle burst"], ["Fire", "fire puff"], ["Cursed", "ghost lunges"]]) {
  await choose("Cursor trail", trail);
  await page.waitForTimeout(400);
  await page.mouse.move(900, 620);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(140);
  const px = await painted(page, { x: 840, y: 560, width: 120, height: 120 });
  check(px > 200, `${trail.toLowerCase()} click: ${label} (${px}px)`);
  await page.screenshot({ path: `${out}/click-${trail.toLowerCase()}.png`, clip: { x: 820, y: 540, width: 160, height: 160 } });
}

// --- Project tags inherit button effects (1.9.0) -------------------------------------
check((await page.locator("#work article ul button.pill").count()) > 5, "tags: project tags get button effects");
// --- Cursor trails -------------------------------------------------------------------
await choose("Cursor trail", "Fire");
const intro = await page.locator("section").first().locator("p").nth(1).boundingBox();
for (let x = intro.x + 10; x < intro.x + 380; x += 8) await page.mouse.move(x, intro.y + 12);
await page.mouse.move(5, 890);
await page.waitForTimeout(1200);
const scorch = await painted(page, { x: intro.x, y: intro.y, width: 400, height: 26 });
check(scorch > 300, `fire: scorch marks remain on the words (${scorch}px)`);
await page.screenshot({ path: `${out}/fire.png`, clip: { x: 0, y: intro.y - 60, width: 900, height: 160 } });

await choose("Cursor trail", "Cursed");
for (let i = 0; i < 30; i++) await page.mouse.move(400 + i * 10, 500 + Math.sin(i / 3) * 40);
await page.waitForTimeout(600);
check((await painted(page, { x: 300, y: 400, width: 800, height: 300 })) > 300, "cursed: something follows the cursor");
await page.screenshot({ path: `${out}/cursed.png`, clip: { x: 300, y: 380, width: 800, height: 300 } });

// --- Still states (1.7.0) --------------------------------------------------------------
await page.mouse.move(640, 520);
await page.waitForTimeout(3200);
check((await attrs(page)).possessed === "true", "cursed still: ghost possesses the cursor");
check(await page.evaluate(() => getComputedStyle(document.body).cursor) === "none", "cursed still: real cursor hidden");
await page.screenshot({ path: `${out}/possessed.png`, clip: { x: 540, y: 440, width: 200, height: 160 } });
await page.mouse.move(660, 530);
check(!(await attrs(page)).possessed, "cursed: moving takes the cursor back");
await choose("Cursor trail", "Sparkle");
await page.mouse.move(640, 520);
await page.waitForTimeout(1300);
const ring = await painted(page, { x: 610, y: 490, width: 60, height: 60 });
check(ring > 80, `sparkle still: rainbow ring around cursor (${ring}px)`);
await page.screenshot({ path: `${out}/ring.png`, clip: { x: 580, y: 460, width: 120, height: 120 } });
await choose("Cursor trail", "Fire");
await page.mouse.move(640, 520);
await page.waitForTimeout(800);
const small = await painted(page, { x: 600, y: 400, width: 80, height: 130 });
await page.waitForTimeout(3500);
const big = await painted(page, { x: 600, y: 400, width: 80, height: 130 });
check(big > small * 1.3 && big > 600, `fire still: flame grows on the cursor (${small} -> ${big}px)`);
await page.screenshot({ path: `${out}/flame.png`, clip: { x: 560, y: 380, width: 160, height: 170 } });
await choose("Cursor trail", "Cursed");

// --- Style pickers handle 5+ options (p4) -------------------------------------------------
{
  if (!(await panel.isVisible())) await bell.click();
  for (const [label, n, firstRow] of [["i-dots", 5, 3], ["Cursor trail", 5, 3], ["Sound effects", 7, 4]]) {
    const group = page.getByRole("radiogroup", { name: `${label} style` });
    const gb2 = await group.boundingBox();
    const boxes = await group.getByRole("radio").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    const rows = [...new Set(boxes.map((b) => Math.round(b.top)))];
    const inRow1 = boxes.filter((b) => Math.round(b.top) === rows[0]).length;
    const right = Math.max(...boxes.map((b) => b.right));
    check(boxes.length === n && rows.length === 2 && inRow1 === firstRow && Math.abs(right - (gb2.x + gb2.width)) < 2, `${label}: ${n} styles in two balanced, full-width rows (${boxes.length} styles, ${rows.length} rows, ${inRow1} in the first, right edge ${Math.round(right)} of ${Math.round(gb2.x + gb2.width)})`);
  }
  await page.keyboard.press("Escape");
}

// --- Car trail (p4) ------------------------------------------------------------------------
{
  /** Red car-body pixels inside a box, and their centroid. */
  const carPx = (box) => page.evaluate((box) => {
    const c = document.querySelector("canvas");
    const k = c.width / innerWidth;
    const d = c.getContext("2d").getImageData(box.x * k, box.y * k, box.width * k, box.height * k).data;
    let n = 0, sx = 0, sy = 0, blue = 0;
    const w = Math.round(box.width * k);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 200 && d[i] > 170 && d[i + 1] < 120 && d[i + 2] < 110) { n++; sx += (i / 4) % w; sy += Math.floor(i / 4 / w); }
      if (d[i + 3] > 60 && d[i + 2] > 200 && d[i] < 200) blue++;
    }
    return { n, blue, x: n ? box.x + sx / n / k : null, y: n ? box.y + sy / n / k : null };
  }, box);
  await choose("Cursor trail", "Car");
  await page.evaluate(() => scrollTo(0, 0));
  for (let i = 0; i <= 30; i++) { await page.mouse.move(200 + i * 18, 560); await page.waitForTimeout(16); }
  await page.waitForTimeout(250);
  const drive = await carPx({ x: 560, y: 480, width: 280, height: 160 });
  check(drive.n > 40, `car: a little car chases the cursor (${drive.n} body px at ${Math.round(drive.x)},${Math.round(drive.y)})`);
  // A sharp U-turn leaves skid marks.
  for (let i = 0; i <= 12; i++) { await page.mouse.move(740 - i * 40, 560 + (i < 3 ? i * 30 : 90)); await page.waitForTimeout(16); }
  await page.waitForTimeout(500);
  const skid = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    // Skid marks are drawn in the ink color at low alpha.
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 15 && d[i + 3] < 110 && Math.abs(d[i] - d[i + 2]) < 30) n++;
    return n;
  });
  check(skid > 150, `car: sharp turns leave skid marks (${skid}px)`);
  await page.screenshot({ path: `${out}/car-drive.png`, clip: { x: 150, y: 420, width: 800, height: 280 } });
  // Nitro on click: a burst of blue-hot flame and speed.
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(60);
  const nitro = await carPx({ x: 150, y: 420, width: 800, height: 280 });
  check(nitro.blue > 30, `car click: nitro flames from the exhaust (${nitro.blue} blue px)`);
  await page.screenshot({ path: `${out}/car-nitro.png`, clip: { x: 150, y: 420, width: 800, height: 280 } });
  // Still: donuts around the cursor.
  await page.mouse.move(640, 600);
  await page.waitForTimeout(2200);
  const at = [];
  for (let i = 0; i < 3; i++) { at.push(await carPx({ x: 560, y: 520, width: 160, height: 160 })); await page.waitForTimeout(230); }
  const near = at.every((p) => p.n > 30 && Math.hypot(p.x - 640, p.y - 600) < 55);
  const moved = Math.hypot(at[0].x - at[1].x, at[0].y - at[1].y) + Math.hypot(at[1].x - at[2].x, at[1].y - at[2].y);
  check(near && moved > 20, `car still: donuts around the resting cursor (moved ${Math.round(moved)}px, ${at.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ")})`);
  await page.screenshot({ path: `${out}/car-donuts.png`, clip: { x: 540, y: 500, width: 200, height: 200 } });
}

// --- Cursed click is smooth (p4) ----------------------------------------------------------
{
  await choose("Cursor trail", "Cursed");
  for (let i = 0; i < 30; i++) { await page.mouse.move(400 + i * 10, 520); await page.waitForTimeout(16); }
  await page.waitForTimeout(350);
  // Track the ghost's dark eyes (nothing else on the canvas is that dark) every frame while a click shoos it.
  const track = page.evaluate(() => new Promise((done) => {
    const c = document.querySelector("canvas");
    const k = c.width / innerWidth;
    const pts = [];
    const t0 = performance.now();
    const step = () => {
      const d = c.getContext("2d").getImageData(0, 300 * k, c.width, 450 * k).data;
      let n = 0, sx = 0, sy = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 90 && d[i] + d[i + 1] + d[i + 2] < 380) { n++; sx += (i / 4) % c.width; sy += Math.floor(i / 4 / c.width); }
      if (n > 6) pts.push([sx / n / k, 300 + sy / n / k, performance.now()]);
      if (performance.now() - t0 < 750) requestAnimationFrame(step);
      else done(pts);
    };
    requestAnimationFrame(step);
  }));
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.mouse.up();
  const pts = await track;
  let maxStep = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x, y, time] = pts[i];
    const [prevX, prevY, prevTime] = pts[i - 1];
    maxStep = Math.max(maxStep, Math.hypot(x - prevX, y - prevY) * 16.67 / Math.max(16.67, time - prevTime));
  }
  // How far the push carried it (it then drifts back toward the cursor).
  const travel = Math.max(0, ...pts.map((q) => Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1])));
  check(pts.length > 10 && maxStep < 9 && travel > 15, `cursed click: the ghost glides back smoothly (largest frame step ${maxStep.toFixed(1)}px, moved ${Math.round(travel)}px over ${pts.length} frames)`);
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${out}/cursed-shoo.png`, clip: { x: 500, y: 400, width: 380, height: 260 } });
}

// --- Hamsters i-dots (p4) ------------------------------------------------------------------
{
  await choose("i-dots", "Hamsters");
  await page.evaluate(() => scrollTo(0, 0));
  const ham = page.locator("[data-hamster]").first();
  check((await page.locator("[data-hamster]").count()) === 2, "hamsters: a hamster wheel on each i");
  const stageOf = async () => Number(await ham.getAttribute("data-stage"));
  // Aim after hovering: the name's letters thicken under the cursor and nudge the dot.
  let hb = await ham.boundingBox();
  for (let i = 0; i < 2; i++) { await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.waitForTimeout(200); hb = await ham.boundingBox(); }
  const cx = hb.x + hb.width / 2;
  const cy = hb.y + hb.height / 2;
  const secretsBefore = (await page.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).secrets)).length;
  // Slow clicking (2 per second) keeps it a happy jog.
  for (let i = 0; i < 6; i++) { await page.mouse.click(cx, cy); await page.waitForTimeout(500); }
  check((await stageOf()) === 0, "hamsters: slow clicks never escalate");
  await page.waitForTimeout(1200);
  // Fast clicks (about 12 per second), recording when each stage begins.
  const reached = {};
  let n = 0;
  for (; n < 80 && !reached[4]; n++) {
    await page.mouse.click(cx, cy);
    const s = await stageOf();
    if (s && !reached[s]) {
      reached[s] = n + 1;
      if (s < 4) await page.screenshot({ path: `${out}/hamster-${s}.png`, clip: { x: cx - 160, y: cy - 70, width: 320, height: 170 } });
    }
    await page.waitForTimeout(40);
  }
  const order = Object.keys(reached).join("");
  check(order === "1234", `hamsters: stages go shake, sparks, fire, break in order (${order})`);
  check(reached[1] >= 3 && reached[2] - reached[1] >= 8 && reached[3] - reached[2] >= 15 && reached[4] - reached[3] >= 14, `hamsters: each stage needs enough clicks since the last (${JSON.stringify(reached)})`);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${out}/hamster-4.png`, clip: { x: cx - 160, y: cy - 70, width: 360, height: 170 } });
  const hamSecrets = await page.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).secrets);
  check(hamSecrets.filter((s) => s !== "breakaway").length === secretsBefore, "hamsters: clicking a wheel isn't counted as clicking the name");
  check(hamSecrets.includes("breakaway"), "hamsters: breaking the wheel free is a secret");
  let back = false;
  for (let i = 0; i < 60 && !back; i++) { await page.waitForTimeout(100); back = (await stageOf()) === 0; }
  check(back, "hamsters: the broken wheel rolls back after a few seconds");
  // Cool down: build to sparks, stop clicking, and it settles back down.
  for (let i = 0; i < 16 && (await stageOf()) < 2; i++) { await page.mouse.click(cx, cy); await page.waitForTimeout(40); }
  const peak = await stageOf();
  await page.waitForTimeout(3500);
  check(peak >= 2 && (await stageOf()) === 0, `hamsters: they cool down when the clicking stops (${peak} -> ${await stageOf()})`);
  check(errors.length === 0, `hamsters: no errors ${errors.join(" | ")}`);
}

// --- Guide goblin restyle (p4) ---------------------------------------------------------------
{
  // MP5: a first-time visitor is in Boring mode, and the guide points at the Boring / Fun toggle.
  const gctx = await browser.plainContext({ viewport: { width: 1280, height: 900 } });
  await setLocalHour(gctx);
  const gp = await gctx.newPage();
  await gp.goto(url, { waitUntil: "networkidle" });
  const g = gp.locator("[data-goblin-guide]");
  const art = await gp.locator(".goblin-guide-art").boundingBox();
  const badge = await gp.locator("[data-fun-toggle]").boundingBox();
  check(art.width <= 44 && art.x - (badge.x + badge.width) < 4, `goblin guide: smaller and tucked against the toggle (${Math.round(art.width)}px, gap ${Math.round(art.x - badge.x - badge.width)}px)`);
  const look = await gp.evaluate(() => {
    const bubble = getComputedStyle(document.querySelector(".goblin-bubble"));
    const probe = document.createElement("div");
    probe.style.background = "var(--surface)";
    document.body.append(probe);
    const surface = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { bg: bubble.backgroundColor, surface, skin: getComputedStyle(document.querySelector(".goblin-guide-art circle")).fill };
  });
  check(look.bg === look.surface && look.skin !== "rgb(108, 180, 71)", `goblin guide: drawn in the site's tokens, not neon (${JSON.stringify(look)})`);
  check(/Click Fun!!!!/.test(await g.innerText()) && !/Tap Fun/.test(await g.innerText()), "goblin guide: says Click on desktop");
  await gp.screenshot({ path: `${out}/guide-1280.png`, clip: { x: 780, y: 0, width: 500, height: 130 } });
  await gctx.close();
}

// --- Sound packs (no audible check in CI; must not throw) ------------------------------
for (const pack of ["Bells & whistles", "Cereal", "Clown", "Birds", "Jungle", "Chiptune", "Tabletop"]) {
  await choose("Sound effects", pack);
  await gh.hover();
  await page.getByRole("button", { name: /^Color mode:/ }).hover();
}
check(errors.length === 0, `sound packs play without errors ${errors.join(" | ")}`);

// --- New sound packs are audible and level-matched (p4): render into an OfflineAudioContext ---
{
  const lp = await browser.newPage();
  await setLocalHour(lp.context());
  await lp.addInitScript(() => {
    class Rec extends OfflineAudioContext {
      constructor() { super(1, 44100 * 2, 44100); window.__rec = this; }
      resume() { return Promise.resolve(); }
      get state() { return "running"; }
    }
    window.AudioContext = Rec;
  });
  await lp.goto(url);
  const measure = async (pack, ev) => {
    await lp.evaluate((pack) => localStorage.setItem("bells-and-whistles-v2", JSON.stringify({ on: true, look: "classic", welcomed: true, secrets: [], peeked: [], effects: { dots: { on: false, variant: "fruit" }, buttons: { on: false, variant: "rainbow" }, trail: { on: false, variant: "sparkle" }, sound: { on: true, variant: pack, hover: true } } })), pack);
    await lp.reload({ waitUntil: "load" });
    await lp.waitForTimeout(250);
    await lp.evaluate((ev) => window.dispatchEvent(new CustomEvent("portfolio:sound", { detail: ev })), ev);
    return lp.evaluate(async () => {
      if (!window.__rec) return { peak: 0, rms: 0 };
      const d = (await window.__rec.startRendering()).getChannelData(0);
      let peak = 0, sum = 0, n = 0;
      for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); peak = Math.max(peak, a); if (a > 0.001) { sum += a * a; n++; } }
      return { peak, rms: Math.sqrt(sum / Math.max(1, n)) };
    });
  };
  const ref = [];
  for (const pack of ["chimes", "cereal", "clown", "birds", "jungle"]) ref.push((await measure(pack, "press")).rms);
  ref.sort((a, b) => a - b);
  const median = ref[2];
  for (const pack of ["chiptune", "tabletop"]) {
    const res = {};
    for (const ev of ["hover", "press", "toggle", "pop", "launch", "hit", "secret"]) res[ev] = await measure(pack, ev);
    const audible = Object.values(res).every((r) => r.peak > 0.015 && r.peak < 0.6);
    const ratio = res.press.rms / median;
    check(audible, `${pack}: every event is audible and unclipped (peaks ${Object.entries(res).map(([k, r]) => `${k} ${r.peak.toFixed(3)}`).join(", ")})`);
    check(ratio > 0.5 && ratio < 2, `${pack}: press level matches the other packs (rms ${res.press.rms.toFixed(4)} vs median ${median.toFixed(4)})`);
  }
  await lp.close();
}

// --- Hover sounds sub-switch ---------------------------------------------------------
if (!(await panel.isVisible())) await bell.click();
const hov = page.getByRole("switch", { name: "Hover sounds" });
check(await hov.isVisible() && (await hov.getAttribute("aria-checked")) === "true", "hover sounds: switch shown, on by default");
await hov.click();
const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).effects.sound);
check(st2.on && st2.hover === false, `hover sounds off keeps sound effects on (${JSON.stringify(st2)})`);
await hov.click();
await page.keyboard.press("Escape");

// --- Shuffle --------------------------------------------------------------------------
await bell.click();
await page.getByRole("button", { name: "Shuffle everything" }).click();
await page.waitForTimeout(250);
const st = await page.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")));
check(st.on && st.look === "classic" && Object.values(st.effects).every((e) => e.on), `shuffle: everything on, look stays Classic (${JSON.stringify(st.effects)})`);
check(await page.getByText(/^Shuffled:/).isVisible(), "shuffle: toast lists the picks");

// --- Looks ----------------------------------------------------------------------------
for (const look of ["Nature", "Spooky"]) {
  if (!(await panel.isVisible())) await bell.click();
  await page.getByText(look, { exact: true }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check((await attrs(page)).look === look.toLowerCase(), `${look} look applied`);
  check(await page.getByRole("button", { name: /^Color mode:/ }).isDisabled(), `${look}: theme toggle paused`);
  await page.evaluate(() => scrollTo(0, 0));
  await page.mouse.move(5, 890);
  await page.waitForTimeout(2500);
  await axe(page, `${look} look`);
  await page.screenshot({ path: `${out}/look-${look.toLowerCase()}.png` });
  await page.evaluate(() => scrollTo(0, document.querySelector("#experience").offsetTop - 200));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/look-${look.toLowerCase()}-2.png` });
}
await bell.click();
await page.getByText("Classic", { exact: true }).click();
await page.keyboard.press("Escape");

// --- #9: switches are independent ------------------------------------------------
if (!(await panel.isVisible())) await bell.click();
const master = page.getByRole("switch", { name: "Enable bells and whistles" });
if ((await master.getAttribute("aria-checked")) === "true") await master.click(); // everything off
const sw = (n) => page.getByRole("switch", { name: n });
await sw("Cursor trail").click();
const states = async () => Object.fromEntries(await Promise.all(["i-dots", "Buttons", "Cursor trail", "Sound effects"].map(async (n) => [n, await sw(n).getAttribute("aria-checked")])));
let s9 = await states();
check(s9["Cursor trail"] === "true" && s9["i-dots"] === "false" && s9["Buttons"] === "false" && s9["Sound effects"] === "false", `one switch on leaves the others off (${JSON.stringify(s9)})`);
check((await master.getAttribute("aria-checked")) === "true", "master shows on while something is on");
await sw("Cursor trail").click();
check((await master.getAttribute("aria-checked")) === "false", "master shows off when nothing is on");
await page.getByText("Nature", { exact: true }).click();
s9 = await states();
check(Object.values(s9).every((v) => v === "false") && (await attrs(page)).look === "nature", `picking a look changes only the look (${JSON.stringify(s9)})`);
await page.getByText("Classic", { exact: true }).click();
await page.keyboard.press("Escape");

// --- 1.6.0 Secrets & achievements -----------------------------------------------------
const found = () => page.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).secrets);
if (!(await panel.isVisible())) await bell.click();
const m3 = page.getByRole("switch", { name: "Enable bells and whistles" });
if ((await m3.getAttribute("aria-checked")) === "false") await m3.click();
const chip = page.getByRole("button", { name: /^Secrets: \d+ of \d+ found/ });
check(await chip.isVisible(), "secrets chip appears beside the badge once enabled (1.11.0)");
check((await page.getByRole("dialog", { name: "Bells and whistles" }).getByRole("button", { name: /Secrets found/ }).count()) === 0, "secrets moved out of the bells panel");
await page.keyboard.press("Escape");
await chip.click();
const prog = page.getByRole("button", { name: /Secrets found/ });
check(await prog.isVisible(), "achievements: progress opens from the chip, already expanded");
const badges = page.getByRole("list", { name: "Secrets" }).getByRole("button");
check((await badges.count()) === SECRET_COUNT, `achievements: ${SECRET_COUNT} badges (${await badges.count()})`);
check((await page.locator("[data-notch]").count()) === 7, `achievements: 7 milestone notches on the bar (${await page.locator("[data-notch]").count()})`);
check(!(await page.locator("[data-goblin-guide]").count()), "no goblin guide once Fun mode has been tried");
// Badge hints: hover asks "Reveal badge?", a click reveals the icon; hover again asks
// "One-word hint?", and a second click shows the word under the icon.
const firstLocked = page.locator('[data-badge="locked"]').first();
const lockedName = await firstLocked.getAttribute("aria-label");
check(/Reveal badge\?$/.test(lockedName), `badge hints: a locked badge's name offers to reveal it (${lockedName})`);
await firstLocked.hover();
check(await firstLocked.locator("[data-badge-ask]").isVisible() && (await firstLocked.innerText()).includes("Reveal badge?"), "badge hints: hovering a locked badge shows “Reveal badge?”");
await firstLocked.click();
const revealed = page.locator('[data-badge="revealed"]').first();
check(/One-word hint\?$/.test(await revealed.getAttribute("aria-label")), `badge hints: clicking reveals the icon (${await revealed.getAttribute("aria-label")})`);
await page.mouse.move(10, 600);
await revealed.hover();
check((await revealed.innerText()).includes("One-word hint?"), "badge hints: hovering a revealed badge offers a one-word hint");
check(/again for a one-word hint/.test(await page.locator('[aria-live="polite"]').filter({ hasText: /Badge revealed/ }).innerText()), "badge hints: the live region says how to get the hint");
await revealed.click();
const hintedBadge = page.locator('[data-badge="hinted"]').first();
const hintWord = await hintedBadge.locator("[data-badge-hint]").innerText();
check(hintWord.length > 1 && !/\s/.test(hintWord) && /hint: /.test(await hintedBadge.getAttribute("aria-label")), `badge hints: a second click shows a one-word hint under the icon (${hintWord})`);
check(JSON.parse(await page.evaluate(() => localStorage.getItem("bells-and-whistles-v2"))).hinted.length === 1, "badge hints: the hints shown are saved (hinted)");
check(await page.getByText(`Hint: “${hintWord}”`).isVisible(), "badge hints: the live region reads the hint");
// Keyboard: focusing a locked badge shows the same question.
await hintedBadge.focus();
await page.keyboard.press("Tab");
const focusedAsk = await page.evaluate(() => { const el = document.activeElement; const ask = el?.querySelector("[data-badge-ask]"); return ask ? getComputedStyle(ask).display : "none"; });
check(focusedAsk === "flex", `badge hints: keyboard focus shows the question too (${focusedAsk})`);
await axe(page, "achievements open");
await page.screenshot({ path: `${out}/achievements.png`, clip: { x: 800, y: 0, width: 480, height: 520 } });
await page.keyboard.press("Escape");
// Combo: Electric + Fire + Bubbles
await choose("Buttons", "Electric");
await choose("Cursor trail", "Fire");
await choose("i-dots", "Bubbles");
await page.waitForTimeout(800);
check((await found()).includes("elements") && (await page.getByText(/Elementalist/).isVisible()), "combo secret: Elementalist");
// The egg: invisible and unclickable until selected.
await page.keyboard.press("Escape");
const egg = page.locator("[data-hidden-egg]");
await egg.scrollIntoViewIfNeeded();
const eb = await egg.boundingBox();
await page.mouse.click(eb.x + eb.width / 2, eb.y + eb.height / 2);
check(!(await found()).includes("egg"), "egg: a stray click finds nothing");
await page.keyboard.press("Control+a");
await page.waitForTimeout(250);
check((await egg.evaluate((e) => getComputedStyle(e).opacity)) === "1", "egg: appears when everything is selected");
await egg.evaluate((e) => e.scrollIntoView({ block: "center" })); // it wobbles, so skip Playwright's stability wait
await page.waitForTimeout(150);
const eb2 = await egg.boundingBox();
await page.screenshot({ path: `${out}/egg.png`, clip: { x: 0, y: Math.max(0, eb2.y - 300), width: 1280, height: 420 } });
// The Fire trail is on (from the Elementalist combo): hold it over the egg to cook it.
for (let i = 0; i < 30; i++) {
  await page.mouse.move(eb2.x + eb2.width / 2 + (i % 2 ? 3 : -3), eb2.y + eb2.height / 2);
  await page.waitForTimeout(50);
}
check((await egg.innerText()) === "🍳" && (await found()).includes("overeasy"), "egg: the Fire trail cooks it (Over easy)");
await page.mouse.click(eb2.x + eb2.width / 2, eb2.y + eb2.height / 2);
await page.waitForTimeout(600);
check((await found()).includes("egg"), "egg: clicking it while selected finds the secret");
check((await egg.evaluate((e) => getComputedStyle(e).opacity)) === "0", "egg: hides again afterwards");
// The counter keeps up.
await page.evaluate(() => scrollTo(0, 0));
await chip.click();
check(new RegExp(`^Secrets: ${(await found()).length} of ${SECRET_COUNT}`).test(await chip.getAttribute("aria-label")), "chip count keeps up");
const label = await page.getByRole("button", { name: /Secrets found/ }).innerText();
check(new RegExp(`${(await found()).length} of ${SECRET_COUNT}`).test(label), `progress shows ${(await found()).length} of ${SECRET_COUNT} live secrets (${label.replace(/\s+/g, " ")})`);
await page.keyboard.press("Escape");

// --- Hide and seek (1.10.0) --------------------------------------------------------------
for (let spot = 0; spot < 3; spot++) {
  const g = page.locator(`[data-goblin-spot="${spot}"]`);
  await g.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(100);
  check(await g.isVisible(), `hide and seek: goblin hiding in spot ${spot + 1}`);
  if (spot === 0) {
    const b = await g.boundingBox();
    if (b) await page.screenshot({ path: `${out}/goblin-spot.png`, clip: { x: b.x - 200, y: b.y - 60, width: 300, height: 160 } });
  }
  await g.click({ force: true });
  await page.waitForTimeout(150);
}
check((await found()).includes("goblin"), "hide and seek: finding him three times is a secret");

// --- Milestones (1.10.0) ---------------------------------------------------------------
await page.evaluate(() => {
  const k = "bells-and-whistles-v2";
  const f = JSON.parse(localStorage.getItem(k));
  // Four found (Keyboard warrior among them), plus a stale 20 from the old milestones.
  f.secrets = ["name", "konami", "diamond", "keys"];
  f.celebrated = [20];
  localStorage.setItem(k, JSON.stringify(f));
});
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(500);
await page.keyboard.type("hire");
await page.waitForTimeout(1800);
check(await page.locator("[data-parade]").isVisible(), "milestone 5: the animal parade runs");
const celebratedNow = await page.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).celebrated);
check(JSON.stringify(celebratedNow) === "[5]", `milestones: 5 is marked celebrated and old milestones are dropped (${JSON.stringify(celebratedNow)})`);
// The parade: the strip lets clicks through, the animals catch them and do a trick.
const paradeCss = await page.evaluate(() => ({ strip: getComputedStyle(document.querySelector("[data-parade]")).pointerEvents, animal: getComputedStyle(document.querySelector("[data-parade-animal]")).pointerEvents }));
check(paradeCss.strip === "none" && paradeCss.animal === "auto", `parade: only the animals catch clicks (${JSON.stringify(paradeCss)})`);
const animal = page.locator("[data-parade-animal]").first();
await animal.dispatchEvent("pointerdown");
check((await animal.getAttribute("data-trick")) === "true", "parade: clicking an animal makes it jump and spin");
await page.screenshot({ path: `${out}/parade.png`, clip: { x: 0, y: 780, width: 1280, height: 120 } });
await page.waitForTimeout(900);
check((await animal.getAttribute("data-trick")) === null, "parade: the trick ends and the animal walks on");
await chip.click();
check(/Next celebration at \d+/.test(await page.getByRole("button", { name: /Secrets found/ }).innerText()), "milestones: names the next (scaled) celebration after the first party");
await page.keyboard.press("Escape");

// --- Farm adventure (1.16.0) -------------------------------------------------------------
await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
await choose("i-dots", "Farm");
const farmDots = page.locator("[data-farm-dot]");
const dotsNow = async () => (await farmDots.allInnerTexts()).join("");
const story = page.locator("[data-farm-story]");
const pickStory = async (...labels) => { for (const l of labels) await story.getByRole("button", { name: l, exact: true }).click(); };
check((await dotsNow()) === "🐣🐛", `farm: a chick and a worm (${await dotsNow()})`);
await farmDots.first().click();
check((await dotsNow()) === "🐥👨‍🌾", "farm: clicking a dot takes the first choice (eat the worm; the farmer arrives)");
await pickStory("Wander toward the road", "Cross the road", "Ask her why");
check((await found()).includes("road") && /Special ending/.test(await story.innerText()), "farm: special ending 'Why did the chicken…' awards a secret");
await pickStory("Start over");
await pickStory("Befriend the worm", "Visit the art studio", "Offer to help", "Paint it chocolate brown");
check((await found()).includes("bunny"), "farm: the chocolate egg is still the Easter egg easter egg secret");
await page.screenshot({ path: `${out}/farm-bunny.png`, clip: { x: 0, y: 60, width: 1280, height: 420 } });
await pickStory("Start over");
await pickStory("Befriend the worm", "Visit the kitchen", "Ask what's for dinner");
await farmDots.first().click();
check(/Are you sure/.test(await story.innerText()), "farm: a dot click can't answer 'are you sure?'");
await pickStory("Yes, tell me");
check(/A common ending/.test(await story.innerText()) && (await farmDots.first().innerText()) === "😱", "farm: most paths reach the common ending");
await pickStory("Start over");
await pickStory("Eat the worm", "Follow the farmer", "Keep it warm", "Wait patiently");
check((await found()).includes("golden"), "farm: special ending 'The golden egg'");
await pickStory("Start over");
// Cook the farm egg with the Fire trail.
await choose("Cursor trail", "Fire");
await pickStory("Eat the worm", "Follow the farmer", "Take it to market");
const eggDot = farmDots.first();
const ed = await eggDot.boundingBox();
for (let i = 0; i < 30; i++) {
  await page.mouse.move(ed.x + ed.width / 2 + (i % 2 ? 2 : -2), ed.y + ed.height / 2);
  await page.waitForTimeout(50);
}
await page.waitForTimeout(200);
check((await eggDot.innerText()) === "🍳" && (await found()).includes("sunny"), "farm: holding the Fire trail over the egg cooks it (Sunny side up)");
await axe(page, "farm adventure");
// Googly o's in Contact.
const googly = page.locator("[data-googly]").first();
await googly.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
await page.waitForTimeout(150);
const gbx = await googly.boundingBox();
await page.mouse.move(gbx.x + 200, gbx.y - 80);
await page.waitForTimeout(150);
check((await googly.evaluate((e) => e.style.getPropertyValue("--gx"))) !== "", "googly o's: pupils follow the cursor");
await page.screenshot({ path: `${out}/googly.png`, clip: { x: Math.max(0, gbx.x - 150), y: gbx.y - 30, width: 400, height: 90 } });
await googly.click();
check((await found()).includes("eyes"), "googly o's: clicking one is the Eye spy secret");
await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));

// --- Game modes, 137 and leaderboards (1.14.0) ------------------------------------------
await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
if (!(await panel.isVisible())) await bell.click();
// MP5: 137 now enables cheats (in the panel); "Unlock all secrets" is one of them.
await panel.locator("[data-cheat='off']").click();
check(await panel.getByRole("switch", { name: "Enable cheats" }).isVisible(), "cheats off: the Enable cheats switch is back");
await panel.getByRole("switch", { name: "Enable cheats" }).click();
const pad = page.getByRole("dialog", { name: "What's my favorite number?" });
check(await pad.isVisible(), "137: the switch asks for my favorite number on a numpad");
for (const d of ["4", "2"]) await pad.getByRole("button", { name: d, exact: true }).click();
await pad.getByRole("button", { name: "Enter" }).click();
check(/Nope/.test(await pad.locator("output").innerText()), "137: a wrong number is refused");
await page.keyboard.type("137");
await page.keyboard.press("Enter");
const sure = page.getByRole("dialog", { name: /Enable cheats\?/ });
check(await sure.isVisible() && /don.t find secrets for you/.test(await sure.innerText()), "137: says exactly what cheats do");
await sure.getByRole("button", { name: "Enable cheats" }).click();
await panel.locator("[data-cheat='everything']").click(); // later checks use every feature, even after a reset
await panel.locator("[data-cheat='secrets']").click();
await panel.getByRole("group", { name: "Unlock all secrets?" }).getByRole("button", { name: "Unlock all secrets" }).click();
await page.waitForTimeout(300);
check((await found()).length === SECRET_COUNT, `cheat: unlocks every secret (${(await found()).length})`);
await page.waitForTimeout(1600);
const celebrated137 = await page.evaluate(() => JSON.parse(localStorage.getItem("bells-and-whistles-v2")).celebrated);
check(celebrated137.length >= 4 && /Milestone: \d+ secrets/.test(await page.locator(".toast").innerText()), `137: every milestone passed is marked, and only the biggest party plays (${JSON.stringify(celebrated137)})`);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
if (!(await panel.isVisible())) await bell.click();
check((await page.locator('[data-modes="unlocked"]').count()) === 1, "modes: unlocked");
await axe(page, "modes unlocked");
// Asteroids
await panel.getByRole("button", { name: "Asteroids" }).click();
await page.waitForTimeout(400);
check((await attrs(page)).game === "asteroids" && (await page.locator("[data-game-layer]").isVisible()), "asteroids: the game starts over a blurred page");
await page.keyboard.down("ArrowLeft");
await page.keyboard.down(" ");
await page.waitForTimeout(1500);
await page.keyboard.up("ArrowLeft");
await page.keyboard.up(" ");
await page.screenshot({ path: `${out}/asteroids.png` });
const astPx = await page.evaluate(() => { const c = document.querySelector(".game-canvas"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 10) n++; return n; });
check(astPx > 2000, `asteroids: page pieces and the ship are drawn (${astPx})`);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
check(!(await attrs(page)).game && !(await page.locator("[data-game-layer]").count()), "asteroids: Esc returns to the site");
// Stacker
if (!(await panel.isVisible())) await bell.click();
await panel.getByRole("button", { name: "Stacker" }).click();
await page.waitForTimeout(500);
for (let i = 0; i < 3; i++) {
  await page.keyboard.press(" ");
  await page.waitForTimeout(350);
}
await page.screenshot({ path: `${out}/stacker.png` });
const stackScore = Number((await page.locator(".game-hud strong").innerText()) || 0);
check(stackScore >= 1 || (await page.getByRole("dialog", { name: "Game over" }).isVisible()), `stacker: dropping blocks scores or ends the game (score ${stackScore})`);
await page.keyboard.press("Escape");
// Keepy Uppy: don't touch the ball, and it's game over.
if (!(await panel.isVisible())) await bell.click();
await panel.getByRole("button", { name: "Keepy Uppy" }).click();
const over = page.getByRole("dialog", { name: "Game over" });
await over.waitFor({ timeout: 8000 });
check(await over.isVisible(), "keepy uppy: dropping the ball ends the game");
await page.waitForTimeout(600);
check(/isn.t connected yet|No scores yet|\d/.test(await over.innerText()), "leaderboards: global board says it isn't connected (no storage locally)");
await axe(page, "game over");
await over.getByRole("tab", { name: "This browser" }).click();
await page.screenshot({ path: `${out}/game-over.png` });
await over.getByRole("button", { name: "Back to the site" }).click();
check(!(await attrs(page)).game, "game over: back to the site");
// Reset all secrets (1.15.0)
await chip.click();
await page.getByRole("button", { name: "Reset all secrets" }).click();
const resetBox = page.getByRole("group", { name: "Reset all secrets?" });
check(/lock again \(cheats stay as they are\)/.test(await resetBox.innerText()), "reset: explains what it clears");
await resetBox.getByRole("button", { name: "Reset everything" }).click();
await page.waitForTimeout(200);
check((await found()).length === 0 && (await chip.getAttribute("aria-label")).startsWith("Secrets: 0"), "reset: every secret cleared");
await page.keyboard.press("Escape");

// --- Master off returns to the clean site ---------------------------------------------
await bell.click();
const m2 = page.getByRole("switch", { name: "Enable bells and whistles" });
if ((await m2.getAttribute("aria-checked")) === "false") await m2.click(); // on: everything
await page.getByText("Spooky", { exact: true }).click();
await m2.click(); // off: everything, look back to Classic
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
a = await attrs(page);
check(!a.fun && !a.fxButtons && !a.fxDots && !a.look, `master off: clean site (${JSON.stringify(a)})`);
check(errors.length === 0, `no console/page errors (${errors.length}) ${errors.slice(0, 3).join(" | ")}`);
await ctx.close();

// --- Secrets batch (P4) ---------------------------------------------------------------
const KEY = "bells-and-whistles-v2";
const desk = async (hour) => {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setLocalHour(c, hour);
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(url, { waitUntil: "networkidle" });
  const has = async (id) => (JSON.parse(await p.evaluate((k) => localStorage.getItem(k), KEY))?.secrets ?? []).includes(id);
  const bellsPanel = p.getByRole("dialog", { name: "Bells and whistles" });
  const openPanel = async () => { if (!(await bellsPanel.isVisible())) await p.getByRole("button", { name: "Bells and whistles" }).click(); };
  const pick = async (look, picks) => {
    await openPanel();
    if (look) await bellsPanel.getByText(look, { exact: true }).click();
    for (const [label, option] of picks) await p.getByRole("radiogroup", { name: `${label} style` }).getByRole("radio", { name: option }).click();
    await p.waitForTimeout(250);
  };
  return { c, p, errs, has, openPanel, pick, bellsPanel };
};
{
  const { c, p, errs, has, openPanel, pick, bellsPanel } = await desk(12);
  // Clean site: none of the extras exist, and keys find nothing.
  check(!(await p.locator("[data-pod-bay]").isVisible()) && !(await p.locator("[data-skeleton]").isVisible()) && !(await p.locator("[data-konami-pad]").isVisible()), "clean site: no pod bay doors, skeleton or gamepad");
  await p.keyboard.press("Shift");
  await p.waitForTimeout(100);
  check(!(await has("keys")), "keyboard warrior: nothing happens on the clean site");
  await openPanel();
  await p.getByRole("switch", { name: "Enable bells and whistles" }).click();
  await p.keyboard.press("Escape"); // the first key with fun on
  await p.waitForTimeout(200);
  check((await has("keys")) && /more secrets that need the keyboard/.test(await p.locator(".toast").innerText()), "keyboard warrior: any key is a secret, and the toast hints at more");
  check(!(await has("nightowl")), "night owl: not at noon");
  check(await p.locator("[data-konami-pad]").isHidden(), "gamepad: hidden on desktop (touch only)");

  // Quick actions: placeholder hint, typed words, What's this?, the sandwich nudge.
  await p.keyboard.press("Control+k");
  const q = p.getByRole("combobox", { name: "Search actions" });
  check(/secret word/.test(await q.getAttribute("placeholder")), `quick actions: the placeholder hints at secrets after Keyboard warrior (${await q.getAttribute("placeholder")})`);
  check((await p.getByRole("option", { name: "Type a secret word…" }).count()) === 0, "quick actions: the touch-only word commands stay off on desktop");
  await q.pressSequentially("hire");
  await p.waitForTimeout(200);
  check((await has("hire")) && /Excellent idea/.test(await p.locator("[data-palette-notice]").innerText()), "hire: typing it in Quick actions works, announced inside the dialog");
  await q.fill("sandwich");
  check(await p.getByRole("option", { name: "make me a sandwich" }).isVisible(), "sudo nudge: a plain sandwich request is offered (and refused)");
  await q.fill("what");
  await p.getByRole("option", { name: "What's this?" }).click();
  await p.waitForTimeout(200);
  check(await has("whatsthis"), "what's this: running the command is a secret");

  // Typing words on the page.
  for (const w of ["auhbon", "meeple", "pho"]) {
    await p.keyboard.type(w);
    await p.waitForTimeout(120);
  }
  check((await has("auhbon")) && (await has("meeple")) && (await has("pho")), "typing: auhbon, meeple and pho are secrets");

  // Pod bay doors.
  const pod = p.locator("[data-pod-bay]");
  await pod.scrollIntoViewIfNeeded();
  const podStyle = await pod.evaluate((el) => { const s = getComputedStyle(el); const link = getComputedStyle(el.closest("ul").querySelector("a")); return { u: s.textDecorationLine, same: s.color === link.color && s.fontSize === link.fontSize }; });
  check((await pod.isVisible()) && podStyle.u === "underline" && podStyle.same, `pod bay doors: looks like the other Contact links (${JSON.stringify(podStyle)})`);
  await pod.click();
  await p.waitForTimeout(150);
  check((await has("podbay")) && /I'm sorry, Dave\. I'm afraid I can't do that\./.test(await p.locator(".toast").innerText()), "pod bay doors: HAL refuses, and it's a secret");
  await p.screenshot({ path: `${out}/pod-bay.png`, clip: { x: 0, y: Math.max(0, (await pod.boundingBox()).y - 160), width: 1280, height: 240 } });

  // The skeleton, possessed by the Cursed ghost.
  await pick(null, [["Cursor trail", "Cursed"]]);
  await p.keyboard.press("Escape");
  const skel = p.locator("[data-skeleton]");
  await skel.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await p.waitForTimeout(150);
  check(await skel.isVisible(), "skeleton: lying at the bottom of the timeline while fun is on");
  const sb = await skel.boundingBox();
  await p.screenshot({ path: `${out}/skeleton.png`, clip: { x: Math.max(0, sb.x - 120), y: sb.y - 120, width: 420, height: 180 } });
  for (let i = 8; i >= 0; i--) {
    await p.mouse.move(sb.x + sb.width / 2 + i * 12, sb.y + sb.height / 2 - i * 6);
    await p.waitForTimeout(30);
  }
  await p.waitForTimeout(3600);
  check((await skel.getAttribute("data-state")) === "dance" && (await has("skeleton")), "skeleton: idle over it with Cursed on, the ghost possesses it and it dances (a secret)");
  check(!(await p.evaluate(() => document.documentElement.dataset.possessed)), "skeleton: the ghost takes the skeleton, not the cursor");
  await p.screenshot({ path: `${out}/skeleton-dance.png`, clip: { x: Math.max(0, sb.x - 120), y: sb.y - 120, width: 420, height: 180 } });
  await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));

  // More combos.
  for (const [id, look, picks] of [
    ["oldmac", "Nature", [["i-dots", "Farm"], ["Sound effects", "Jungle"]]],
    ["hacker", "Terminal", [["Buttons", "Electric"], ["Cursor trail", "Sparkle"]]],
    ["breakfast", "Classic", [["Buttons", "Cookie"], ["Sound effects", "Cereal"], ["i-dots", "Fruit"]]],
    ["arcade", "Pico-8", [["Buttons", "Rainbow"], ["i-dots", "Slingshot"]]],
    ["bigtop", "Classic", [["Sound effects", "Clown"], ["Buttons", "Rainbow"], ["i-dots", "Bubbles"]]],
  ]) {
    await pick(look, picks);
    check(await has(id), `combo secret: ${id}`);
  }

  // Nature's golden leaf: a rare one falls on its own; this drops one now.
  await pick("Nature", []);
  await p.keyboard.press("Escape");
  await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await p.mouse.move(1200, 880);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent("portfolio:golden-leaf", { detail: { x: 300, y: 420 } })));
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}/golden-leaf.png`, clip: { x: 200, y: 340, width: 200, height: 160 } });
  const gold = await p.evaluate(() => { const cv = document.querySelector("canvas"); const k = cv.width / document.documentElement.clientWidth; const d = cv.getContext("2d").getImageData(260 * k, 390 * k, 80 * k, 70 * k).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 150 && d[i + 2] < 120 && d[i + 3] > 200) n++; return n; });
  check(gold > 40, `golden leaf: drawn gold (${gold}px)`);
  await p.mouse.click(300, 427);
  await p.waitForTimeout(200);
  check(await has("leaf"), "golden leaf: clicking it is a secret");

  // /dev/secrets: grouped by category, with difficulty and spoilers.
  await p.goto(new URL("dev/secrets", url).href, { waitUntil: "networkidle" });
  const cats = await p.locator("#implemented-heading ~ div h3").allInnerTexts();
  check(cats.length >= 5 && cats.some((t) => t.startsWith("Combos")) && cats.some((t) => t.startsWith("Typing")) && cats.some((t) => t.startsWith("Games")), `dev/secrets: grouped by category (${cats.map((t) => t.split(" ")[0]).join(", ")})`);
  check((await p.getByText(/^(Easy|Medium|Hard)$/).count()) >= SECRET_COUNT, "dev/secrets: every secret shows a difficulty");
  const spoiler = p.getByText("Typed “hire”", { exact: true });
  check(!(await spoiler.isVisible()), "dev/secrets: unlocked notes are hidden by default");
  await p.getByRole("checkbox", { name: "Reveal all" }).check();
  check(await spoiler.isVisible(), "dev/secrets: Reveal all shows the unlocked notes");
  await axe(p, "dev/secrets");
  check(errs.length === 0, `P4: no console/page errors ${errs.slice(0, 3).join(" | ")}`);
  await c.close();
}
// Night owl: Bells & whistles on between midnight and 4 a.m. local time.
{
  const { c, p, has, openPanel } = await desk(2);
  await openPanel();
  await p.getByRole("switch", { name: "Enable bells and whistles" }).click();
  await p.waitForTimeout(400);
  check(await has("nightowl"), "night owl: found at 2 a.m. local");
  await c.close();
}
{
  const { c, p, has } = await desk(6);
  await p.waitForTimeout(1600);
  check(await has("earlybird"), "Early bird: found in Fun mode at 6 a.m. local");
  await c.close();
}
// The in-game secrets (game modes open once every other secret is found).
{
  const { c, p, errs, has, openPanel, bellsPanel } = await desk(12);
  const others = SECRET_DEFS.filter((s) => s.category !== "Games").map((s) => s.id);
  await p.evaluate(([k, secrets]) => localStorage.setItem(k, JSON.stringify({ on: true, effects: { dots: { on: true, variant: "fruit" }, buttons: { on: true, variant: "rainbow" }, trail: { on: false, variant: "sparkle" }, sound: { on: false, variant: "chimes" } }, look: "classic", secrets, peeked: [], hinted: [], welcomed: true, hideSpot: 3, celebrated: [5, 10, 15, 25], motion: false, haptics: true })), [KEY, others]);
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(600);
  await openPanel();
  check((await p.locator('[data-modes="unlocked"]').count()) === 1, `modes: unlocked by every secret outside the games (${others.length} of ${SECRET_COUNT})`);
  const game = (f) => p.evaluate(f);
  // Keepy Uppy: reaching 40.
  await bellsPanel.getByRole("button", { name: "Keepy Uppy" }).click();
  await p.waitForTimeout(300);
  await game(() => { const g = document.querySelector(".game-canvas").game; g.score = 39; g.bump(g.balls[0], g.balls[0].x); });
  await p.waitForTimeout(200);
  check(await has("double"), "keepy uppy: reaching 40 is Double trouble");
  await p.keyboard.press("Escape");
  // Stacker: three perfect drops in a row.
  await openPanel();
  await bellsPanel.getByRole("button", { name: "Stacker" }).click();
  await p.waitForTimeout(300);
  const drops = await game(() => new Promise((done) => {
    const g = document.querySelector(".game-canvas").game;
    let n = 0;
    const t0 = performance.now();
    const step = () => {
      const top = g.stack[g.stack.length - 1];
      if (Math.abs(g.moving.x - top.x) < 2) { g.drop(); n++; }
      if (n >= 3 || performance.now() - t0 > 20000) done(n);
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
  await p.waitForTimeout(200);
  check(drops === 3 && (await has("perfect")), `stacker: three perfect drops in a row is Perfectionist (${drops})`);
  await p.keyboard.press("Escape");
  // Asteroids: clearing the first wave.
  await openPanel();
  await bellsPanel.getByRole("button", { name: "Asteroids" }).click();
  await p.waitForTimeout(300);
  check(!(await has("cadet")), "asteroids: Space cadet isn't given away at the start");
  await game(() => { const g = document.querySelector(".game-canvas").game; g.score = 10; g.rocks.length = 0; });
  await p.waitForTimeout(300);
  check(await has("cadet"), "asteroids: clearing the first wave is Space cadet");
  await p.keyboard.press("Escape");
  check(errs.length === 0, `games: no console/page errors ${errs.slice(0, 3).join(" | ")}`);
  await c.close();
}

// --- Reduced motion -------------------------------------------------------------------
const rm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
await setLocalHour(rm);
const p2 = await rm.newPage();
await p2.goto(url, { waitUntil: "networkidle" });
await p2.getByRole("button", { name: "Bells and whistles" }).click();
await p2.getByRole("switch", { name: "Enable bells and whistles" }).click();
check(await p2.getByText("Paused because your device asks for reduced motion").first().isVisible(), "reduced motion: trail explains it's paused");
await p2.getByRole("radiogroup", { name: "i-dots style" }).getByRole("radio", { name: "Bubbles" }).click();
check((await p2.locator("[data-bubble]").count()) === 0, "reduced motion: floating bubbles stay off");
await rm.close();

// --- Mobile (touch) ---------------------------------------------------------------------
const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
await setLocalHour(mob);
const p3 = await mob.newPage();
const merr = [];
p3.on("pageerror", (e) => merr.push(e.message));
await p3.goto(url, { waitUntil: "networkidle" });
await p3.screenshot({ path: `${out}/mobile-header.png`, clip: { x: 0, y: 0, width: 375, height: 120 } });
await p3.getByRole("button", { name: "Bells and whistles" }).tap();
await p3.getByRole("switch", { name: "Enable bells and whistles" }).tap();
await p3.getByRole("radiogroup", { name: "i-dots style" }).getByRole("radio", { name: "Slingshot" }).tap();
await p3.screenshot({ path: `${out}/mobile-panel.png` });
await p3.getByRole("button", { name: "Close" }).tap();
check(!(await p3.getByRole("dialog", { name: "Bells and whistles" }).isVisible()), "mobile: panel closes with the Close button");
check(!(await p3.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "mobile: no horizontal scroll");
// A real touch drag on a rock, via the DevTools protocol.
const cdp = await mob.newCDPSession(p3);
const r = await p3.locator("[data-rock]").last().boundingBox();
const tp = (x, y) => [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }];
const cx = r.x + r.width / 2;
const cy = r.y + r.height / 2;
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(cx, cy) });
for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: tp(cx - i * 6, cy + i * 14) });
await p3.waitForTimeout(80);
check((await p3.locator("[data-rock]").last().getAttribute("data-state")) === "out", "mobile: rock can be grabbed and pulled by touch");
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
let mk = false;
for (let i = 0; i < 20 && !mk; i++) {
  await p3.waitForTimeout(50);
  mk = await p3.locator("[data-letter]").evaluateAll((els) => els.some((e) => !!e.style.transform));
}
check(mk, "mobile: touch launch knocks letters");
await p3.screenshot({ path: `${out}/mobile-slingshot.png` });
// Bubbles pop on tap.
await p3.getByRole("button", { name: "Bells and whistles" }).tap();
await p3.getByRole("radiogroup", { name: "i-dots style" }).getByRole("radio", { name: "Bubbles" }).tap();
await p3.getByRole("button", { name: "Close" }).tap();
await p3.waitForTimeout(2500);
await p3.screenshot({ path: `${out}/mobile-bubbles.png` });
check(merr.length === 0, `mobile: no errors ${merr.join(" | ")}`);
await new AxeBuilder({ page: p3 }).analyze().then((res) => check(res.violations.length === 0, `axe mobile with fun on: ${res.violations.length}`));
await mob.close();

await browser.close();
console.log(`\n${issues.length ? issues.length + " FAILED" : "All checks passed"}`);
process.exit(issues.length ? 1 : 0);
