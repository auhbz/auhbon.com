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
export const UNLOCKS: UnlockDef[] = [];

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
