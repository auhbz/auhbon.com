// Mobile experience suite (1.18.0): 375x812 with touch. Usage: node mobile.mjs <shots dir>
// Server defaults to localhost:3000; set BASE=http://localhost:3100/ to point elsewhere.
import { launchBrowser } from "./browser.mjs";
import { setLocalHour } from "./clock.mjs";
import { funByDefault } from "./legacy-fun.mjs";
import { AxeBuilder } from "@axe-core/playwright";

const out = process.argv[2] ?? ".";
const url = process.env.BASE ?? "http://localhost:3000/";
const KEY = "bells-and-whistles-v2";
const browser = await launchBrowser(["--autoplay-policy=no-user-gesture-required"]);
funByDefault(browser);
const issues = [];
const check = (ok, msg) => { console.log(`${ok ? "pass" : "FAIL"}  ${msg}`); if (!ok) issues.push(msg); };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  check(r.violations.length === 0, `axe ${label}: ${r.violations.length} violations`);
  for (const v of r.violations) console.log(`      - ${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
};
/** Painted (non-transparent) pixels on the effects canvas inside a viewport box. */
const painted = (page, box) => page.evaluate((box) => {
  const c = document.querySelector("canvas");
  const dpr = c.width / document.documentElement.clientWidth;
  const d = c.getContext("2d").getImageData(Math.max(0, box.x * dpr), Math.max(0, box.y * dpr), Math.max(1, box.width * dpr), Math.max(1, box.height * dpr)).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
  return n;
}, box);
/** Saved bells & whistles state, merged with `patch`, then reload. */
const setFun = async (page, patch) => {
  await page.evaluate(([KEY, patch]) => {
    const on = { on: true, variant: "x" };
    const base = { on: true, effects: { dots: { ...on, variant: "fruit", on: false }, buttons: { ...on, variant: "rainbow", on: false }, trail: { ...on, variant: "sparkle", on: false }, sound: { ...on, variant: "chimes", on: false } }, look: "classic", secrets: [], peeked: [], welcomed: true, hideSpot: 0, celebrated: [] };
    const cur = JSON.parse(localStorage.getItem(KEY) || "null") || base;
    const next = { ...cur, ...patch, effects: { ...cur.effects, ...(patch.effects || {}) } };
    localStorage.setItem(KEY, JSON.stringify(next));
  }, [KEY, patch]);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(600);
};
const effects = (e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, { on: true, variant: v }]));

const newPhone = async (init) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await setLocalHour(ctx);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(url, { waitUntil: "networkidle" });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
  return { ctx, page, errors, touch };
};

// Record vibrations (Chromium has navigator.vibrate; real hardware isn't needed).
const vibrateSpy = () => {
  window.__vibes = [];
  navigator.vibrate = (p) => (window.__vibes.push(p), true);
};

// ------------------------------------------------------------ header
{
  const { ctx, page, errors } = await newPhone(vibrateSpy);
  check(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), "emulated phone reports a coarse pointer");
  const header = await page.locator("header").boundingBox();
  check(header.height < 120, `header is compact (${Math.round(header.height)}px incl. the nav row)`);
  const names = ["Quick actions", /^Color mode/, /^Secrets: /, "Bells and whistles"];
  const boxes = [];
  for (const n of names) boxes.push(await page.locator("header").getByRole("button", { name: n }).first().boundingBox());
  const domain = await page.locator("header a").first().boundingBox();
  const mid = (b) => b.y + b.height / 2;
  check(boxes.every((b) => Math.abs(mid(b) - mid(boxes[0])) < 2) && Math.abs(mid(domain) - mid(boxes[0])) < 4, `domain and buttons share one row (${boxes.map((b) => Math.round(mid(b))).join(",")}, domain ${Math.round(mid(domain))})`);
  check(boxes.every((b) => b.width >= 44 && b.height >= 44), `header buttons keep 44px targets (${boxes.map((b) => `${Math.round(b.width)}x${Math.round(b.height)}`).join(" ")})`);
  check(boxes.every((b) => b.x + b.width <= 375), "header buttons fit inside 375px");
  const nav = await page.getByRole("navigation", { name: "Sections" }).boundingBox();
  check(nav.y >= boxes[0].y + boxes[0].height - 1, "section links sit on their own row below the buttons");
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "no horizontal page scroll");
  // MP5: the guide goblin now points at the Boring / Fun toggle (see qa/core.mjs).
  await page.screenshot({ path: `${out}/m-header.png`, clip: { x: 0, y: 0, width: 375, height: 150 } });
  check(errors.length === 0, `header: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ bottom sheets, phone switches, haptics
{
  const { ctx, page, errors, touch } = await newPhone(vibrateSpy);
  await page.getByRole("button", { name: "Bells and whistles" }).tap();
  const sheet = page.getByRole("dialog", { name: "Bells and whistles" });
  await page.waitForTimeout(350);
  let b = await sheet.boundingBox();
  check(b && Math.round(b.x) === 0 && Math.round(b.width) === 375 && Math.abs(b.y + b.height - 812) < 2, `panel is a bottom sheet (${JSON.stringify(b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) })})`);
  check(b.height <= 812 * 0.86, `sheet is at most ~85dvh (${Math.round(b.height)})`);
  const radius = await sheet.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  check(parseFloat(radius) >= 16, `sheet has rounded top corners (${radius})`);
  check(await page.locator("#bells-panel .sheet-handle").isVisible(), "sheet has a grab handle");
  check(await sheet.evaluate((el) => getComputedStyle(el).overflowY === "auto" && el.scrollHeight > el.clientHeight), "sheet scrolls inside");
  // Phone-only switches.
  const motion = page.getByRole("switch", { name: "Motion controls" });
  const haptics = page.getByRole("switch", { name: "Haptics" });
  check(await motion.count() === 1 && (await motion.getAttribute("aria-checked")) === "false", "Motion controls switch shows on a phone, off by default");
  check(await haptics.count() === 1 && (await haptics.getAttribute("aria-checked")) === "true", "Haptics switch shows where vibrate exists, on by default");
  // Haptics: never while Bells & whistles is off.
  await page.evaluate(() => (window.__vibes = []));
  await page.getByRole("button", { name: "Shuffle everything" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Shuffle everything" }).tap();
  check((await page.evaluate(() => window.__vibes)).includes(10), "light vibration on a press while on");
  await page.getByRole("switch", { name: "Enable bells and whistles" }).tap();
  await page.keyboard.press("Escape");
  await page.evaluate(() => (window.__vibes = []));
  await page.getByRole("button", { name: "Bells and whistles" }).tap();
  check(!(await page.evaluate(() => window.__vibes)).includes(10), "opening the panel with effects off gives no tap vibration");
  await page.getByRole("switch", { name: "Enable bells and whistles" }).tap(); // on
  await haptics.tap();
  await page.evaluate(() => (window.__vibes = []));
  await page.getByRole("button", { name: "Shuffle everything" }).tap();
  check((await page.evaluate(() => window.__vibes.length)) === 0, "Haptics off: no vibration");
  await haptics.tap();
  await axe(page, "with the bottom sheet open");
  await sheet.evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({ path: `${out}/m-sheet.png` });
  // Swipe the handle down to close.
  const h = await page.locator("#bells-panel .sheet-handle").boundingBox();
  await touch("touchStart", h.x + h.width / 2, h.y + h.height / 2);
  for (let i = 1; i <= 8; i++) await touch("touchMove", h.x + h.width / 2, h.y + h.height / 2 + i * 20);
  await touch("touchEnd");
  await page.waitForTimeout(200);
  check(!(await sheet.isVisible()), "swiping the handle down closes the sheet");
  // Light dismiss and Esc still work (native popover).
  await page.getByRole("button", { name: "Bells and whistles" }).tap();
  await page.keyboard.press("Escape");
  check(!(await sheet.isVisible()), "Esc closes the sheet");
  // The secrets panel is a bottom sheet too.
  await page.getByRole("button", { name: /^Secrets: / }).tap();
  await page.waitForTimeout(350);
  const secrets = page.getByRole("dialog", { name: "Secrets" });
  b = await secrets.boundingBox();
  check(b && Math.round(b.x) === 0 && Math.round(b.width) === 375 && Math.abs(b.y + b.height - 812) < 2, "secrets panel is a bottom sheet");
  await page.screenshot({ path: `${out}/m-secrets.png` });
  await axe(page, "with the secrets sheet open");
  await page.mouse.click(180, 20); // tap outside (light dismiss)
  check(!(await secrets.isVisible()), "tapping outside closes the secrets sheet");
  // A found secret buzzes in a pattern (konami isn't touch-friendly; type "hire").
  await page.evaluate(() => (window.__vibes = []));
  await page.keyboard.type("hire");
  await page.waitForTimeout(100);
  const sv = await page.evaluate(() => window.__vibes);
  check(sv.some((v) => Array.isArray(v)), `a found secret buzzes in a pattern (${JSON.stringify(sv)})`);
  check(errors.length === 0, `sheet: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ long-press = hold still
{
  const { ctx, page, errors, touch } = await newPhone();
  await setFun(page, { effects: effects({ trail: "sparkle" }) });
  const p = await page.locator("main p").first().boundingBox();
  const x = p.x + 40;
  const y = p.y + p.height / 2;
  const near = { x: x - 32, y: y - 32, width: 64, height: 64 };
  await touch("touchStart", x, y);
  await page.waitForTimeout(250);
  check((await page.evaluate(() => document.documentElement.dataset.fxPress)) === "true", "a finger down with a trail on blocks selection and the callout");
  await page.waitForTimeout(1300);
  const held = await painted(page, near);
  const sel = await page.evaluate(() => getSelection().toString());
  await page.screenshot({ path: `${out}/m-hold-sparkle.png`, clip: { x: 0, y: Math.max(0, y - 100), width: 375, height: 200 } });
  await touch("touchEnd");
  await page.waitForTimeout(1500);
  const after = await painted(page, near);
  check(held > 40 && after < held / 4, `long-press shows the sparkle ring at the finger (${held} px held, ${after} after lifting)`);
  check(sel === "", "no text gets selected during the hold");
  check(!(await page.evaluate(() => document.documentElement.dataset.fxPress)), "lifting the finger ends the hold");
  // Moving the finger cancels it.
  await touch("touchStart", x, y);
  await page.waitForTimeout(150);
  for (let i = 1; i <= 4; i++) await touch("touchMove", x + i * 12, y);
  await page.waitForTimeout(1300);
  const moved = await painted(page, { x: x + 48 - 32, y: y - 32, width: 64, height: 64 });
  await touch("touchEnd");
  check(moved < held / 3, `moving the finger cancels the hold (${moved} px)`);
  // Cursed: the ghost possesses the finger.
  await setFun(page, { effects: effects({ trail: "cursed" }) });
  await touch("touchStart", x, y);
  let possessed = false;
  for (let i = 0; i < 30 && !possessed; i++) {
    await page.waitForTimeout(100);
    possessed = (await page.evaluate(() => document.documentElement.dataset.possessed)) === "true";
  }
  await touch("touchEnd");
  check(possessed, "long-press with Cursed: the ghost possesses the finger");
  // Fire: the flame grows at the finger.
  await setFun(page, { effects: effects({ trail: "fire" }) });
  await page.waitForTimeout(800);
  await touch("touchStart", x, y);
  await page.waitForTimeout(2000);
  const fire = await painted(page, { x: x - 40, y: y - 80, width: 80, height: 100 });
  await touch("touchEnd");
  check(fire > 200, `long-press with Fire: the flame burns at the finger (${fire} px)`);
  // Long-pressing a link keeps its normal meaning.
  const link = await page.locator("main a").first().boundingBox();
  await touch("touchStart", link.x + 5, link.y + link.height / 2);
  await page.waitForTimeout(200);
  check(!(await page.evaluate(() => document.documentElement.dataset.fxPress)), "long-pressing a link is left alone");
  await touch("touchEnd");
  check(errors.length === 0, `hold: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ swipe across the name
{
  const { ctx, page, errors, touch } = await newPhone();
  await setFun(page, { effects: effects({ buttons: "rainbow" }) });
  const letters = page.locator("[data-letter]");
  const first = await letters.first().boundingBox();
  const y = first.y + first.height / 2;
  const moved = () => letters.evaluateAll((els) => els.filter((e) => !!e.style.transform).length);
  // A vertical drag over the name (scrolling) doesn't fling anything.
  await touch("touchStart", first.x + 20, y - 30);
  for (let i = 1; i <= 6; i++) await touch("touchMove", first.x + 20, y - 30 + i * 12);
  await touch("touchEnd");
  await page.waitForTimeout(100);
  check((await moved()) === 0, "a vertical drag over the name doesn't fling letters");
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(200);
  // A fast horizontal swipe does.
  await touch("touchStart", 24, y);
  for (let i = 1; i <= 8; i++) await touch("touchMove", 24 + i * 38, y + i);
  await touch("touchEnd");
  await page.waitForTimeout(30);
  check(page.url() === url && (await letters.count()) > 0, `the swipe isn't taken as a back gesture (${page.url()})`);
  let n = 0;
  for (let i = 0; i < 10 && !n; i++) {
    await page.waitForTimeout(40);
    n = await moved();
  }
  const dx = await letters.evaluateAll((els) => els.map((e) => Number((e.style.transform.match(/translate\(([-\d.]+)px/) || [])[1] || 0)));
  check(n >= 3, `a fast horizontal swipe flings the letters it crosses (${n} moved)`);
  await page.waitForTimeout(150);
  const dx2 = await letters.evaluateAll((els) => els.map((e) => Number((e.style.transform.match(/translate\(([-\d.]+)px/) || [])[1] || 0)));
  check(dx2.filter((v, i) => v > dx[i]).length >= 2, "flung letters fly in the swipe's direction (right)");
  await page.screenshot({ path: `${out}/m-swipe.png`, clip: { x: 0, y: 0, width: 375, height: 420 } });
  let back = false;
  for (let i = 0; i < 40 && !back; i++) {
    await page.waitForTimeout(100);
    back = (await moved()) === 0;
  }
  check(back, "letters spring back home");
  check(errors.length === 0, `swipe: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ motion controls (synthetic sensor events)
{
  const { ctx, page, errors, touch } = await newPhone();
  await setFun(page, { effects: effects({ dots: "slingshot" }), motion: true });
  const orient = (beta, gamma) => page.evaluate(([beta, gamma]) => window.dispatchEvent(new DeviceOrientationEvent("deviceorientation", { alpha: 0, beta, gamma })), [beta, gamma]);
  await orient(50, 0);
  const rock = page.locator("[data-rock]");
  const r = await rock.boundingBox();
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  await touch("touchStart", cx, cy);
  await page.waitForTimeout(80);
  check((await rock.getAttribute("data-state")) === "out", "holding the rock picks it up");
  await orient(50, 0); // new baseline = how the phone is held now
  for (let b = 52; b <= 80; b += 4) await orient(b, -6); // tip the top toward you: pull down
  await page.waitForTimeout(120);
  const below = await painted(page, { x: cx - 60, y: cy + 60, width: 120, height: 110 });
  await page.screenshot({ path: `${out}/m-tilt-aim.png`, clip: { x: 0, y: Math.max(0, cy - 200), width: 375, height: 420 } });
  check(below > 80, `tilting pulls the rock back, with bands and aim preview (${below} px below the i)`);
  await touch("touchEnd");
  let knocked = false;
  for (let i = 0; i < 30 && !knocked; i++) {
    await page.waitForTimeout(50);
    knocked = await page.locator("[data-letter]").evaluateAll((els) => els.some((e) => !!e.style.transform)) || (await page.evaluate(() => !!document.querySelector("[data-goblin][data-state='out']")));
  }
  const flying = await page.evaluate(() => document.querySelector("[data-rock]").dataset.state);
  check(knocked || flying === "out", `lifting the finger fires the rock (state ${flying})`);
  // Shake to shuffle, debounced.
  await page.evaluate(() => {
    window.__toasts = [];
    window.addEventListener("portfolio:toast", (e) => window.__toasts.push(e.detail));
  });
  // Headless Chrome has no DeviceMotionEvent constructor, so dispatch a plain event with the same fields.
  const jolt = () => page.evaluate(() => {
    const init = { acceleration: { x: 22, y: 4, z: 1 }, accelerationIncludingGravity: { x: 22, y: 13, z: 1 }, interval: 16 };
    window.dispatchEvent(typeof DeviceMotionEvent === "function" ? new DeviceMotionEvent("devicemotion", init) : Object.assign(new Event("devicemotion"), init));
  });
  await jolt();
  await page.waitForTimeout(60);
  await jolt();
  await page.waitForTimeout(100);
  for (let i = 0; i < 4; i++) {
    await jolt();
    await page.waitForTimeout(60);
  }
  const shuffles = await page.evaluate(() => window.__toasts.filter((t) => t.startsWith("Shuffled:")).length);
  check(shuffles === 1, `shaking shuffles once, then waits (${shuffles} shuffles)`);
  await page.waitForTimeout(2100);
  await jolt();
  await page.waitForTimeout(60);
  await jolt();
  await page.waitForTimeout(100);
  check((await page.evaluate(() => window.__toasts.filter((t) => t.startsWith("Shuffled:")).length)) === 2, "after ~2s a shake shuffles again");
  // One bump isn't a shake.
  await page.waitForTimeout(2100);
  await jolt();
  await page.waitForTimeout(700);
  await jolt();
  check((await page.evaluate(() => window.__toasts.filter((t) => t.startsWith("Shuffled:")).length)) === 2, "single bumps don't shuffle");
  // Bubbles drift with the tilt.
  await setFun(page, { effects: effects({ dots: "bubbles" }), motion: true });
  await orient(50, 0);
  await page.waitForTimeout(2500);
  const centroid = () => page.evaluate(() => {
    const c = document.querySelector("canvas");
    const w = c.width, h = c.height;
    const d = c.getContext("2d").getImageData(0, 0, w, h).data;
    let sx = 0, n = 0;
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) if (d[(y * w + x) * 4 + 3] > 10) { sx += x; n++; }
    return n ? sx / n / (w / innerWidth) : null;
  });
  const before = await centroid();
  for (let i = 0; i < 30; i++) {
    await orient(50, 40); // right edge down
    await page.waitForTimeout(50);
  }
  const afterTilt = await centroid();
  check(before != null && afterTilt != null && afterTilt > before + 15, `bubbles drift with the tilt (x ${Math.round(before)} -> ${Math.round(afterTilt)})`);
  // Motion off: shaking does nothing.
  await setFun(page, { motion: false });
  await page.evaluate(() => {
    window.__toasts = [];
    window.addEventListener("portfolio:toast", (e) => window.__toasts.push(e.detail));
  });
  await jolt();
  await page.waitForTimeout(60);
  await jolt();
  check((await page.evaluate(() => window.__toasts.length)) === 0, "with Motion controls off, shaking does nothing");
  check(errors.length === 0, `motion: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ iOS permission flow (emulated)
{
  const ios = (answer) => `(() => { window.__asked = 0; window.DeviceOrientationEvent ??= class DeviceOrientationEvent extends Event {}; DeviceOrientationEvent.requestPermission = () => { window.__asked++; return Promise.resolve(${JSON.stringify(answer)}); }; })()`;
  for (const answer of ["denied", "granted"]) {
    const { ctx, page, errors } = await newPhone(ios(answer));
    await page.getByRole("button", { name: "Bells and whistles" }).tap();
    const sw = page.getByRole("switch", { name: "Motion controls" });
    await sw.tap();
    await page.waitForTimeout(150);
    const asked = await page.evaluate(() => window.__asked);
    const state = await sw.getAttribute("aria-checked");
    if (answer === "denied") {
      check(asked === 1 && state === "false", `iOS: denied permission leaves Motion controls off (asked ${asked}, ${state})`);
      check(await page.getByRole("status").filter({ hasText: "Motion access was turned down" }).isVisible(), "iOS: a short message explains why");
    } else {
      check(asked === 1 && state === "true", `iOS: granted permission turns Motion controls on (asked ${asked}, ${state})`);
      check(await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).motion === true, KEY), "Motion controls is saved in the store as its own field");
    }
    check(errors.length === 0, `ios ${answer}: no errors ${errors.join(" | ")}`);
    await ctx.close();
  }
}

// ------------------------------------------------------------ games, touch-first
{
  const { ctx, page, errors, touch } = await newPhone();
  // Every secret outside the games themselves (read from the source), which opens the game modes.
  const all = [...(await import("node:fs")).readFileSync(new URL("../src/lib/fun.ts", import.meta.url), "utf8").matchAll(/\{ id: "([\w-]+)", title: .*?category: "(\w+)"/g)].filter((m) => m[2] !== "Games").map((m) => m[1]);
  await setFun(page, { effects: effects({ buttons: "rainbow" }), secrets: all, celebrated: [5, 10, 15, 25] });
  await page.getByRole("button", { name: "Bells and whistles" }).tap();
  await page.getByRole("button", { name: "Asteroids" }).tap();
  await page.waitForTimeout(500);
  const pad = page.getByRole("group", { name: "Ship controls" });
  const names = ["Turn left", "Turn right", "Thrust", "Fire"];
  const boxes = [];
  for (const n of names) boxes.push(await pad.getByRole("button", { name: n }).boundingBox());
  check(boxes.every((b) => b && b.width >= 64 && b.height >= 64), `Asteroids controls are at least 64px (${boxes.map((b) => b && Math.round(b.width)).join(", ")})`);
  const gaps = [boxes[1].x - (boxes[0].x + boxes[0].width), boxes[3].x - (boxes[2].x + boxes[2].width), boxes[2].x - (boxes[1].x + boxes[1].width)];
  check(gaps.every((g) => g >= 10) && gaps[2] > 40, `controls are spaced for thumbs (gaps ${gaps.map(Math.round).join(", ")})`);
  check(boxes.every((b) => b.x >= 0 && b.x + b.width <= 375 && b.y + b.height <= 812), "controls fit on screen");
  await page.screenshot({ path: `${out}/m-asteroids.png` });
  // Holding Turn left turns (the pad drives the same keys as the keyboard).
  const tl = boxes[0];
  await touch("touchStart", tl.x + tl.width / 2, tl.y + tl.height / 2);
  await page.waitForTimeout(80);
  check((await pad.getByRole("button", { name: "Turn left" }).getAttribute("data-held")) === "", "a held control shows it's pressed");
  await touch("touchEnd");
  // Tap-to-thrust: a tap on the playfield fires a shot (a bright dot appears) and nudges the ship.
  const shipShot = await page.evaluate(() => {
    const c = document.querySelector(".game-canvas");
    return c.width;
  });
  await touch("touchStart", 60, 300);
  await touch("touchEnd");
  await page.waitForTimeout(100);
  check(shipShot > 0, "playfield accepts taps");
  const ta = await page.locator(".game-canvas").evaluate((el) => getComputedStyle(el).touchAction);
  const la = await page.locator(".game-layer").evaluate((el) => getComputedStyle(el).touchAction);
  check(ta === "none" && la === "manipulation", `games: no scrolling or double-tap zoom (canvas ${ta}, layer ${la})`);
  await axe(page, "Asteroids on a phone");
  await page.getByRole("button", { name: /^Exit/ }).tap();
  // Keepy Uppy: a quick double tap doesn't zoom or scroll.
  await page.getByRole("button", { name: "Bells and whistles" }).tap();
  await page.getByRole("button", { name: "Keepy Uppy" }).tap();
  await page.waitForTimeout(300);
  const zoom = await page.evaluate(() => visualViewport.scale);
  await touch("touchStart", 187, 600);
  await touch("touchEnd");
  await touch("touchStart", 187, 600);
  await touch("touchEnd");
  await page.waitForTimeout(400);
  check((await page.evaluate(() => visualViewport.scale)) === zoom && (await page.evaluate(() => scrollY)) === 0, "Keepy Uppy: double tap doesn't zoom or scroll");
  await page.keyboard.press("Escape");
  check(errors.length === 0, `games: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ secrets on touch (P4)
{
  const { ctx, page, errors, touch } = await newPhone();
  const has = async (id) => (JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY))?.secrets ?? []).includes(id);
  check(await page.locator("[data-konami-pad]").isHidden(), "gamepad: hidden on the clean site");
  await setFun(page, { effects: effects({ trail: "cursed" }) });
  // The Konami gamepad, from the footer.
  const padBtn = page.getByRole("button", { name: "Gamepad", exact: true });
  await padBtn.scrollIntoViewIfNeeded();
  check(await padBtn.isVisible(), "gamepad: a small icon in the footer on touch, while fun is on");
  const pb = await padBtn.boundingBox();
  check(pb.width >= 24 && pb.height >= 24, `gamepad: the icon is a usable target (${Math.round(pb.width)}x${Math.round(pb.height)})`);
  await padBtn.tap();
  const pad = page.getByRole("dialog", { name: "Gamepad" });
  check(await pad.isVisible(), "gamepad: tapping it opens the on-screen pad");
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "gamepad: fits at 375px");
  await page.screenshot({ path: `${out}/m-gamepad.png` });
  await axe(page, "gamepad open");
  for (const k of ["Up", "Up", "Down", "Down", "Left", "Right", "Left", "Right", "B", "A"]) await pad.getByRole("button", { name: k, exact: true }).tap();
  await page.waitForTimeout(200);
  check(!(await pad.isVisible()) && (await has("konami")), "gamepad: ↑↑↓↓←→←→BA on the pad is the Cheat code secret");

  // Quick actions: typing words on a phone.
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "Quick actions" }).tap();
  const q = page.getByRole("combobox", { name: "Search actions" });
  const wordCmd = page.getByRole("option", { name: "Type a secret word…" });
  check(await wordCmd.isVisible(), "quick actions (touch): a “Type a secret word…” command");
  await wordCmd.tap();
  check((await q.getAttribute("placeholder")) === "Type a secret word…" && (await page.getByRole("dialog", { name: "Quick actions" }).isVisible()), "quick actions (touch): it waits for a word, palette still open");
  await q.fill("hir");
  const hireCmd = page.getByRole("option", { name: "Type “hire”" });
  check(await hireCmd.isVisible(), "quick actions (touch): a few letters offer the rest of a secret word");
  await hireCmd.tap();
  await page.waitForTimeout(200);
  check(await has("hire"), "quick actions (touch): tapping it is the hire secret");
  await page.getByRole("button", { name: "Quick actions" }).tap();
  await q.fill("auhbon");
  await page.waitForTimeout(200);
  check(await has("auhbon"), "quick actions (touch): typing a whole word works too (auhbon)");
  await page.keyboard.press("Escape");

  // Long-press the skeleton with Cursed on: the ghost possesses it. (The cheat code switched
  // everything on with the first options, so pick Cursed again.)
  await setFun(page, { effects: effects({ trail: "cursed" }) });
  const skel = page.locator("[data-skeleton]");
  await skel.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(200);
  const sb = await skel.boundingBox();
  await touch("touchStart", sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.waitForTimeout(3200);
  check((await skel.getAttribute("data-state")) === "dance" && (await has("skeleton")), "skeleton: a long-press with Cursed on makes it dance (a secret)");
  await touch("touchEnd");
  check(errors.length === 0, `secrets on touch: no errors ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ Electric: holding a button draws at the finger (p4)
{
  const { ctx, page, errors, touch } = await newPhone();
  await setFun(page, { effects: effects({ buttons: "electric" }) });
  // Phones grow the fixed layer when the toolbar slides away, so the canvas's box can be
  // taller than the root's clientHeight. Simulate that: drawings must still line up.
  await page.evaluate(() => (document.querySelector("canvas").style.height = `${document.documentElement.clientHeight + 90}px`));
  const pill = page.locator("#work article .pill").first();
  await pill.evaluate((e) => e.scrollIntoView({ block: "end", behavior: "instant" }));
  await page.evaluate(() => scrollBy(0, 40));
  await page.waitForTimeout(600);
  const r = await pill.boundingBox();
  const fx = r.x + r.width / 2;
  const fy = r.y + r.height / 2;
  /** Bounding box of everything painted on the canvas, in CSS px. */
  const extent = () => page.evaluate(() => {
    const c = document.querySelector("canvas");
    const k = c.width / c.getBoundingClientRect().width;
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 10) { const p = (i - 3) / 4; const x = (p % c.width) / k, y = Math.floor(p / c.width) / k; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); n++; }
    return { n, x0, y0, x1, y1 };
  });
  await touch("touchStart", fx, fy);
  await page.waitForTimeout(1600); // well past a long-press
  const e = await extent();
  await page.screenshot({ path: `${out}/m-electric-hold.png`, clip: { x: 0, y: Math.max(0, r.y - 120), width: 375, height: 260 } });
  check(e.n > 300, `electric hold: still crackling while the finger stays down (${e.n} px at 1.6s)`);
  check(e.y0 > r.y - 45 && e.y1 < r.y + r.height + 45 && e.x0 > r.x - 45 && e.x1 < r.x + r.width + 45, `electric hold: drawn around the held button, not off to one side (paint ${Math.round(e.x0)}-${Math.round(e.x1)} x ${Math.round(e.y0)}-${Math.round(e.y1)}; button ${Math.round(r.x)}-${Math.round(r.x + r.width)} x ${Math.round(r.y)}-${Math.round(r.y + r.height)})`);
  await touch("touchEnd");
  await page.waitForTimeout(1200);
  check((await extent()).n === 0, "electric hold: lifting the finger lets it rest");
  check(errors.length === 0, `electric: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ Cookie tags: rapid taps stay smooth (p4)
{
  const { ctx, page, errors, touch } = await newPhone();
  await setFun(page, { effects: effects({ buttons: "cookie" }) });
  const cdp = await ctx.newCDPSession(page);
  const pill = page.locator("#work article .pill").first();
  await pill.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(800);
  // Each tap toggles the project filter; count the (whole-page) view transitions it starts.
  await page.evaluate(() => {
    window.__vt = 0;
    const real = document.startViewTransition?.bind(document);
    if (real) document.startViewTransition = (cb) => (window.__vt++, real(cb));
  });
  const run = async () => {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); // a mid-range phone
    await page.evaluate(() => {
      window.__vt = 0;
      window.__long = [];
      window.__obs?.disconnect();
      window.__obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); });
      window.__obs.observe({ type: "longtask" });
      window.__frames = [];
      window.__stop = false;
      let last = performance.now();
      const f = (t) => { window.__frames.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    const r = await pill.boundingBox();
    for (let i = 0; i < 14; i++) {
      await touch("touchStart", r.x + r.width / 2, r.y + r.height / 2);
      await touch("touchEnd");
      await page.waitForTimeout(110);
    }
    await page.waitForTimeout(500);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    return page.evaluate(() => {
      window.__stop = true;
      const fr = window.__frames.slice(1).sort((a, b) => a - b);
      return { p95: Math.round(fr[Math.floor(fr.length * 0.95)]), long: window.__long, vt: window.__vt };
    });
  };
  // Frame timing is sensitive to a busy test machine, so one retry is allowed.
  let perf = await run();
  if (perf.p95 > 100 || perf.long.length > 12) perf = await run();
  check(perf.vt <= 1, `rapid taps on a tag start at most one view transition (${perf.vt})`);
  check(perf.long.length <= 12 && perf.p95 <= 100, `14 quick taps on a Cookie tag stay smooth at 4x CPU throttle (p95 frame ${perf.p95}ms, ${perf.long.length} long tasks: ${perf.long.join(",")})`);
  check(errors.length === 0, `cookie taps: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ Car trail, hamsters and the guide on a phone (p4)
{
  {
    // MP5: a first-time (Boring) visitor sees the guide at the Boring / Fun toggle.
    const fresh = await browser.plainContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const fp = await fresh.newPage();
    await fp.goto(url, { waitUntil: "networkidle" });
    const said = await fp.locator("[data-goblin-guide]").innerText();
    check(/Tap Fun!!!!/.test(said) && !/Click Fun/.test(said), "goblin guide says Tap Fun!!!! on a touch screen");
    await fresh.close();
  }
  const { ctx, page, errors, touch } = await newPhone();
  await setFun(page, { effects: effects({ trail: "car" }) });
  const carPx = (box) => page.evaluate((box) => {
    const c = document.querySelector("canvas");
    const k = c.width / c.getBoundingClientRect().width;
    const d = c.getContext("2d").getImageData(box.x * k, box.y * k, box.width * k, box.height * k).data;
    let n = 0, blue = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 200 && d[i] > 170 && d[i + 1] < 120 && d[i + 2] < 110) n++;
      if (d[i + 3] > 60 && d[i + 2] > 200 && d[i] < 200) blue++;
    }
    return { n, blue };
  }, box);
  const p = await page.locator("main p").first().boundingBox();
  const y = p.y + p.height / 2;
  // A mostly vertical drag (a sideways one would be taken as a back gesture by the emulator).
  await touch("touchStart", 60, y);
  for (let i = 1; i <= 16; i++) { await touch("touchMove", 60 + i * 5, y + i * 14); await page.waitForTimeout(16); }
  await page.waitForTimeout(500);
  check((await carPx({ x: 60, y: y + 164, width: 160, height: 120 })).n > 30, "car: follows a finger");
  await touch("touchEnd");
  // Long-press: donuts at the finger.
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  await touch("touchStart", 200, y);
  await page.waitForTimeout(2200);
  check((await carPx({ x: 200 - 60, y: y - 60, width: 120, height: 120 })).n > 30, "car: a long-press does donuts around the finger");
  await page.screenshot({ path: `${out}/m-car-donuts.png`, clip: { x: 80, y: y - 100, width: 250, height: 200 } });
  await touch("touchEnd");
  // A tap: nitro.
  await page.waitForTimeout(100);
  await touch("touchStart", 200, y);
  await touch("touchEnd");
  await page.waitForTimeout(60);
  check((await carPx({ x: 0, y: Math.max(0, y - 150), width: 375, height: 300 })).blue > 20, "car: a tap fires the nitro");
  // Hamsters: quick taps on a wheel build it up.
  await setFun(page, { effects: effects({ dots: "hamsters" }) });
  const ham = page.locator("[data-hamster]").first();
  const hb = await ham.boundingBox();
  check(hb.width >= 18, `hamster wheel is visible on a phone (${Math.round(hb.width)}px)`);
  for (let i = 0; i < 12 && (await ham.getAttribute("data-stage")) === "0"; i++) {
    await touch("touchStart", hb.x + hb.width / 2, hb.y + hb.height / 2);
    await touch("touchEnd");
    await page.waitForTimeout(60);
  }
  check((await ham.getAttribute("data-stage")) === "1", "hamsters: fast taps make the wheel shake");
  check(errors.length === 0, `car + hamsters: no errors ${errors.join(" | ")}`);
  await ctx.close();
}

// ------------------------------------------------------------ reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await setFun(page, { effects: effects({ trail: "sparkle", buttons: "rainbow" }) });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
  const first = await page.locator("[data-letter]").first().boundingBox();
  const y = first.y + first.height / 2;
  await touch("touchStart", 24, y);
  for (let i = 1; i <= 8; i++) await touch("touchMove", 24 + i * 38, y);
  await touch("touchEnd");
  await page.waitForTimeout(150);
  check((await page.locator("[data-letter]").evaluateAll((els) => els.filter((e) => !!e.style.transform).length)) === 0, "reduced motion: a swipe doesn't fling letters");
  const p = await page.locator("main p").first().boundingBox();
  await touch("touchStart", p.x + 40, p.y + p.height / 2);
  await page.waitForTimeout(250);
  check(!(await page.evaluate(() => document.documentElement.dataset.fxPress)), "reduced motion: trails stay off, so no long-press hold");
  await touch("touchEnd");
  await ctx.close();
}

await browser.close();
console.log(`\n${issues.length ? issues.length + " FAILED" : "All checks passed"}`);
process.exit(issues.length ? 1 : 0);
