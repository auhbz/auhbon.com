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
import { useSyncExternalStore } from "react";
import { FUN_EVENT, getFun, subscribeFun, type FunState } from "@/lib/fun";

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
  /** Optional: unlocked by finding this specific secret instead of a count. */
  secret?: string;
};

/** Every unlockable fun feature. Workstreams append their own entries here. */
export const UNLOCKS: UnlockDef[] = [
  // THEMES (MP5)
  { id: "theme:pho", kind: "theme", label: "Pho theme", at: 20 },
  { id: "extra:climber", kind: "extra", label: "Pico-8 climber", at: 12 },
  { id: "game:flabby", kind: "game", label: "Flabby", at: 0, secret: "flabby" },
];

/** Placeholder until CORE lands: everything is unlocked. */
export function isUnlocked(id: string, s: FunState = getFun()): boolean {
  void id;
  void s;
  return true;
}

/** Placeholder until CORE lands: always "fun" so features stay testable. */
export function funMode(s: FunState = getFun()): FunMode {
  void s;
  return "fun";
}

const server = () => getFun();
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
