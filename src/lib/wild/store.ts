/**
 * Wild & Wondrous: page-wide modes (Monkey Mode, Gravity Mode) plus the
 * once-only "you unlocked something" notes. Kept in its own small store so it
 * never disturbs the main Bells & whistles state in src/lib/fun.ts.
 * Unlocks and Fun/Boring come from src/lib/unlocks.ts.
 */
import { useSyncExternalStore } from "react";
import { lockText } from "@/lib/unlocks";

export type WildMode = "monkeys" | "gravity";

export const WILD_MODES: { id: WildMode; unlock: string; label: string; description: string }[] = [
  {
    id: "monkeys",
    unlock: "wild:monkeys",
    label: "Monkey Mode",
    description: "Monkeys swing in on vines and steal words and buttons. Bonk them to get things back",
  },
  {
    id: "gravity",
    unlock: "wild:gravity",
    label: "Gravity Mode",
    description: "The page comes loose and falls. Grab the pieces and toss them, then put everything back",
  },
];

type WildState = {
  on: boolean;
  /** The chosen mode (remembered while switched off). */
  mode: WildMode;
  /** Unlock notes already shown ("wild", "toy:box", "extra:portal"…). */
  seen: string[];
};

const KEY = "wild-and-wondrous-v1";
export const WILD_EVENT = "portfolio:wild";
const DEFAULT: WildState = { on: false, mode: "monkeys", seen: [] };
let cache: WildState | null = null;

function read(): WildState {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<WildState> | null;
    if (!p) return DEFAULT;
    return {
      on: p.on === true,
      mode: WILD_MODES.some((m) => m.id === p.mode) ? (p.mode as WildMode) : "monkeys",
      seen: Array.isArray(p.seen) ? p.seen.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return DEFAULT;
  }
}

export function getWild(): WildState {
  if (typeof window === "undefined") return DEFAULT;
  if (!cache) cache = read();
  return cache;
}

function update(change: (s: WildState) => WildState) {
  cache = change(getWild());
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Applied for this visit even if it can't be saved.
  }
  window.dispatchEvent(new Event(WILD_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = read();
    onChange();
  };
  window.addEventListener(WILD_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WILD_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export const useWild = () => useSyncExternalStore(subscribe, getWild, () => DEFAULT);

export const setWildOn = (on: boolean) => update((s) => ({ ...s, on }));
/** Picking a mode switches Wild & Wondrous on. */
export const setWildMode = (mode: WildMode) => update((s) => ({ ...s, on: true, mode }));
export const markSeen = (id: string) => update((s) => (s.seen.includes(id) ? s : { ...s, seen: [...s.seen, id] }));

/** "Find 3 more secrets" (or the one-secret version) for a locked feature. */
export const toGoLabel = (id: string) => lockText(id);
