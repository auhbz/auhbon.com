/**
 * Unlocks: which fun features a visitor can use, and whether the site is in
 * Fun or Boring mode. (MP5 contract: the API below is stable; the CORE
 * workstream fills in the logic. Other code should only call these exports.)
 *
 * Vocabulary
 * - Fun mode / Boring mode: the toggle at the top. Boring is the default and
 *   is a plain portfolio: no panel, no secrets, no goblin hunts, no toys.
 * - Fun features: everything that can be unlocked. Kinds: effect options,
 *   themes, mini games, Wild & Wondrous modes, toys, and extras (visual or
 *   interactive elements such as the portal gun, skeleton or Pico-8 climber).
 * - Secrets: achievements. Milestones: secret counts with a celebration.
 * - Cheats: per-feature unlock overrides, decoupled from secrets found.
 */
import { isAvailable } from "@/lib/availability";
import { useSyncExternalStore } from "react";
import {
  DEFAULT_FUN,
  FUN_EVENT,
  getFun,
  isFunMode,
  liveSecretCount,
  registerLockCheck,
  scaledMilestones,
  scaledThreshold,
  subscribeFun,
  type FunState,
} from "@/lib/fun";

export type FunMode = "boring" | "fun";

export type UnlockKind = "effect" | "theme" | "game" | "wild" | "toy" | "extra";

export type UnlockDef = {
  /** Stable id, e.g. "effect:dots:bubbles", "theme:pho", "game:keepy", "wild:monkeys", "toy:paintbrush", "extra:portal". */
  id: string;
  kind: UnlockKind;
  label: string;
  /**
   * Secrets needed on the full 100-secret scale. 0 = available from the start.
   * The live threshold is scaled down while fewer than 100 secrets exist (see scaledThreshold).
   * Use `secret` instead for features unlocked by one specific secret.
   */
  at: number;
  /**
   * Optional: unlocked by finding this specific secret. With `secret` set, an
   * `at` of 0 means "only the secret"; a higher `at` also unlocks it by count.
   */
  secret?: string;
};

/** The kinds in display order, with their plural names (used by the panel's Cheats and /dev). */
export const UNLOCK_KINDS: { id: UnlockKind; label: string }[] = [
  { id: "effect", label: "Effects" },
  { id: "theme", label: "Themes" },
  { id: "game", label: "Mini games" },
  { id: "wild", label: "Wild & Wondrous" },
  { id: "toy", label: "Toys" },
  { id: "extra", label: "Extras" },
];

/**
 * Every unlockable fun feature. Workstreams append their own entries here.
 *
 * Progression (100 scale; today's values are scaled down, see /dev/milestones):
 * two styles per effect to start, then about two more with each secret found,
 * so every effect and theme is open by about 8 secrets. Mini games open one at
 * a time, early: 3, 6 and 10.
 */
const unlockDefinitions: UnlockDef[] = [
  // Effects: i-dots
  { id: "effect:dots:fruit", kind: "effect", label: "Fruit i-dots", at: 0 },
  { id: "effect:dots:slingshot", kind: "effect", label: "Slingshot i-dots", at: 0 },
  { id: "effect:dots:bubbles", kind: "effect", label: "Bubbles i-dots", at: 1 },
  { id: "effect:dots:farm", kind: "effect", label: "Farm i-dots", at: 4 },
  { id: "effect:dots:hamsters", kind: "effect", label: "Hamsters i-dots", at: 7 },
  // Effects: buttons
  { id: "effect:buttons:rainbow", kind: "effect", label: "Rainbow buttons", at: 0 },
  { id: "effect:buttons:electric", kind: "effect", label: "Electric buttons", at: 0 },
  { id: "effect:buttons:mercury", kind: "effect", label: "Mercury buttons", at: 2 },
  { id: "effect:buttons:cookie", kind: "effect", label: "Cookie buttons", at: 6 },
  // Effects: cursor trail
  { id: "effect:trail:sparkle", kind: "effect", label: "Sparkle trail", at: 0 },
  { id: "effect:trail:flow", kind: "effect", label: "Flow trail", at: 0 },
  { id: "effect:trail:fire", kind: "effect", label: "Fire trail", at: 2 },
  { id: "effect:trail:cursed", kind: "effect", label: "Cursed trail", at: 4 },
  { id: "effect:trail:car", kind: "effect", label: "Car trail", at: 8 },
  // Effects: sound
  { id: "effect:sound:chimes", kind: "effect", label: "Bells & whistles sounds", at: 0 },
  { id: "effect:sound:cereal", kind: "effect", label: "Cereal sounds", at: 0 },
  { id: "effect:sound:clown", kind: "effect", label: "Clown sounds", at: 3 },
  { id: "effect:sound:birds", kind: "effect", label: "Birds sounds", at: 5 },
  { id: "effect:sound:jungle", kind: "effect", label: "Jungle sounds", at: 6 },
  { id: "effect:sound:chiptune", kind: "effect", label: "Chiptune sounds", at: 8 },
  { id: "effect:sound:tabletop", kind: "effect", label: "Tabletop sounds", at: 7 },
  // Themes (Classic is always available)
  { id: "theme:classic", kind: "theme", label: "Classic theme", at: 0 },
  { id: "theme:terminal", kind: "theme", label: "Terminal theme", at: 1 },
  { id: "theme:pico8", kind: "theme", label: "Pico-8 theme", at: 3 },
  { id: "theme:nature", kind: "theme", label: "Nature theme", at: 5 },
  { id: "theme:spooky", kind: "theme", label: "Spooky theme", at: 7 },
  // Mini games: one at a time, early
  { id: "game:asteroids", kind: "game", label: "Asteroids", at: 3 },
  { id: "game:keepy", kind: "game", label: "Keepy Uppy", at: 6 },
  { id: "game:stacker", kind: "game", label: "Stacker", at: 10 },
  // EFFECTS (MP5): small hidden extras that wander or hide around the page.
  { id: "extra:chicken", kind: "extra", label: "Wandering chicken", at: 12 },
  { id: "extra:pots", kind: "extra", label: "Clay pots", at: 15 },
  { id: "extra:leaflings", kind: "extra", label: "Leaflings", at: 18 },
  // THEMES (MP5): the Pho theme, Flabby the Pico-8 climber, and Flabby's mini game (found in Selected work).
  { id: "theme:pho", kind: "theme", label: "Pho theme", at: 8 },
  { id: "theme:boardgames", kind: "theme", label: "Board games theme", at: 8 },
  { id: "extra:climber", kind: "extra", label: "Pico-8 climber", at: 12 },
  { id: "game:flabby", kind: "game", label: "Flabby", at: 0, secret: "flabby" },
  // WILD workstream: Wild & Wondrous modes, the toy box and its toys, the portal device.
  { id: "toy:box", kind: "toy", label: "Toy box", at: 2 },
  { id: "toy:brush", kind: "toy", label: "Paint brush", at: 4 },
  { id: "wild:monkeys", kind: "wild", label: "Monkey Mode", at: 5 },
  { id: "toy:notes", kind: "toy", label: "Sticky notes", at: 8 },
  { id: "toy:plane", kind: "toy", label: "Paper airplane", at: 12 },
  { id: "wild:gravity", kind: "wild", label: "Gravity Mode", at: 15 },
  { id: "toy:smoke", kind: "toy", label: "Smoke bombs", at: 18 },
  { id: "extra:portal", kind: "extra", label: "Portal device", at: 20 },
];

export const UNLOCKS = unlockDefinitions.filter(({ id }) => isAvailable(id));

export const unlockDef = (id: string) => UNLOCKS.find((u) => u.id === id);

/** Today's threshold for an unlock (scaled to the live secret count). */
export const liveThreshold = (def: UnlockDef, n: number = liveSecretCount()) => scaledThreshold(def.at, n);

/** Unlocked by secrets alone (no cheats): its secret is found, or enough secrets are. */
export function unlockedBySecrets(def: UnlockDef, s: FunState): boolean {
  if (def.secret) return s.secrets.includes(def.secret) || (def.at > 0 && s.secrets.length >= liveThreshold(def));
  return s.secrets.length >= liveThreshold(def);
}

/** Unlocked if a cheat says so, its secret is found, or enough secrets are found. Unknown ids are unlocked. */
export function isUnlocked(id: string, s: FunState = getFun()): boolean {
  if (!isAvailable(id)) return false;
  const def = unlockDef(id);
  if (!def) return true;
  if (s.cheats.enabled && s.cheats.unlocked.includes(id)) return true;
  return unlockedBySecrets(def, s);
}
registerLockCheck(isUnlocked);

/**
 * Why something is locked, for the panel: how many more secrets it needs, or
 * that one particular secret opens it. Null when it's unlocked.
 */
export function lockInfo(id: string, s: FunState = getFun()): { more: number | null; bySecret: boolean } | null {
  if (isUnlocked(id, s)) return null;
  const def = unlockDef(id);
  if (!def) return null;
  const more = def.secret && def.at === 0 ? null : Math.max(1, liveThreshold(def) - s.secrets.length);
  return { more, bySecret: Boolean(def.secret) };
}

/** "Find 3 more secrets" (or the one-secret version), for locked fun features. */
export function lockText(id: string, s: FunState = getFun()): string {
  const info = lockInfo(id, s);
  if (!info) return "";
  if (info.more === null) return "Unlocked by a particular secret";
  return `Find ${info.more} more ${info.more === 1 ? "secret" : "secrets"}`;
}

/** Every unlock id open in this state (for "Unlocked: …" toasts). */
export const unlockedIds = (s: FunState) => UNLOCKS.filter((u) => isUnlocked(u.id, s)).map((u) => u.id);

/** Fun or Boring (the toggle at the top). */
export function funMode(s: FunState = getFun()): FunMode {
  return isFunMode(s) ? "fun" : "boring";
}

export { scaledMilestones, scaledThreshold };

// The server (and hydration) always renders Boring with nothing unlocked, matching the HTML.
const server = () => DEFAULT_FUN;
export function useUnlocked(id: string): boolean {
  return useSyncExternalStore(subscribeFun, () => isUnlocked(id), () => false);
}
export function useFunMode(): FunMode {
  const s = useSyncExternalStore(subscribeFun, getFun, server);
  return funMode(s);
}
export { FUN_EVENT };

/*
 * Extras visibility: unlocked toys and extras (toy box, portal gun, climber,
 * skeleton…) can be hidden to declutter the page, from the panel section
 * "Unlocked toys, features & elements". Hidden ≠ locked: hiding never
 * changes secrets or unlocks. Stored separately so it can't disturb fun.ts.
 */
const HIDDEN_KEY = "fun-extras-hidden-v1";
const HIDDEN_EVENT = "portfolio:extras";
let hiddenCache: string[] | null = null;
const EMPTY: string[] = [];

function readHidden(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
export function hiddenExtras(): string[] {
  if (typeof window === "undefined") return EMPTY;
  if (!hiddenCache) hiddenCache = readHidden();
  return hiddenCache;
}
export function setExtraVisible(id: string, visible: boolean) {
  const cur = hiddenExtras();
  hiddenCache = visible ? cur.filter((x) => x !== id) : cur.includes(id) ? cur : [...cur, id];
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenCache));
  } catch {
    // Applied for this visit even if it can't be saved.
  }
  window.dispatchEvent(new Event(HIDDEN_EVENT));
}
function subscribeHidden(onChange: () => void) {
  window.addEventListener(HIDDEN_EVENT, onChange);
  return () => window.removeEventListener(HIDDEN_EVENT, onChange);
}
/** True when an extra/toy is unlocked, not hidden by the visitor, and the site is in Fun mode. */
export function useExtraVisible(id: string): boolean {
  const unlocked = useUnlocked(id);
  const mode = useFunMode();
  const hidden = useSyncExternalStore(subscribeHidden, hiddenExtras, () => EMPTY);
  return unlocked && mode === "fun" && !hidden.includes(id);
}
