import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const out = process.argv[2];
const url = process.env.BASE ?? "http://localhost:3000/";
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/google/chrome/chrome" });

const configs = [
  { name: "desktop-light", viewport: { width: 1280, height: 900 }, colorScheme: "light" },
  { name: "desktop-dark", viewport: { width: 1280, height: 900 }, colorScheme: "dark" },
  { name: "mobile-light", viewport: { width: 375, height: 812 }, colorScheme: "light" },
  { name: "mobile-dark", viewport: { width: 375, height: 812 }, colorScheme: "dark" },
];

let total = 0;
for (const c of configs) {
  const ctx = await browser.newContext({ viewport: c.viewport, colorScheme: c.colorScheme, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const cspErrors = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) cspErrors.push(m.text()); });
  await page.goto(url, { waitUntil: "networkidle" });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  total += results.violations.length;
  console.log(`\n[${c.name}] axe violations: ${results.violations.length}, passes: ${results.passes.length}, CSP errors: ${cspErrors.length}`);
  for (const v of results.violations) {
    console.log(`  - ${v.id} (${v.impact}): ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.target.join(" ")}`);
  }
  for (const e of cspErrors) console.log("  CSP:", e.slice(0, 200));

  const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (hScroll) { console.log("  horizontal scroll detected"); total++; }

  await page.screenshot({ path: `${out}/${c.name}-top.png` });
  await page.screenshot({ path: `${out}/${c.name}-full.png`, fullPage: true });

  if (c.name === "desktop-light") {
    // Keyboard check: first Tab lands on the skip link and it becomes visible.
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => ({ text: document.activeElement?.textContent, visible: document.activeElement?.getBoundingClientRect().width > 1 }));
    console.log("  first Tab:", JSON.stringify(first));
    await page.screenshot({ path: `${out}/skip-link-focus.png` });
    await page.keyboard.press("Enter");
    const afterSkip = await page.evaluate(() => document.activeElement?.id);
    console.log("  focus after skip link:", afterSkip);
    const order = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      order.push(await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 30)));
    }
    console.log("  tab order after skip:", order.join(" | "));
    await page.screenshot({ path: `${out}/focus-ring.png` });
  }
  await ctx.close();
}
await browser.close();
console.log(`\nTotal issues: ${total}`);
process.exit(total ? 1 : 0);
