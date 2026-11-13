// MP5: the site now opens in Boring mode with most fun features locked. The
// older suites test the playground itself, so this starts each of their pages
// in Fun mode with every fun feature unlocked by cheat (only when nothing is
// saved yet, so suites that seed their own state still can). `on: true` with no
// effects reads as "off", but lets the suites' merge-style seeding switch effects on. qa/core.mjs tests
// Boring mode, locks, and cheats themselves.
import { readFileSync } from "node:fs";

const ids = [...readFileSync(new URL("../src/lib/unlocks.ts", import.meta.url), "utf8").matchAll(/\{ id: "((?:effect|theme|game|wild|toy|extra):[\w:-]+)"/g)].map((m) => m[1]);
const seed = (all) => {
  const k = "bells-and-whistles-v2";
  try {
    const cur = JSON.parse(localStorage.getItem(k) || "null");
    if (!cur) localStorage.setItem(k, JSON.stringify({ mode: "fun", funSeen: true, on: true, cheats: { enabled: true, unlocked: all } }));
    else if (!cur.mode) localStorage.setItem(k, JSON.stringify({ ...cur, mode: "fun", funSeen: true, cheats: cur.cheats ?? { enabled: true, unlocked: all } }));
  } catch {}
};

export function funByDefault(browser) {
  const newContext = browser.newContext.bind(browser);
  /** A first-time (Boring) visitor, without the Fun seed. */
  browser.plainContext = newContext;
  browser.newContext = async (opts) => {
    const c = await newContext(opts);
    await c.addInitScript(seed, ids);
    return c;
  };
  browser.newPage = async (opts) => (await browser.newContext(opts)).newPage();
  return browser;
}
