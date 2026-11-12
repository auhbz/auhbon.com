/**
 * The draft playground's own settings store, kept apart from the live
 * Bells & whistles store (src/lib/fun.ts) on purpose: nothing here can change
 * the live site, its secrets count, its milestones or its game-mode unlock.
 *
 * Like fun.ts, state is mirrored onto <html> data-* attributes, but only while
 * the draft page is mounted (DraftRoot sets data-draft="on").
 */
import { burst, sound, toast } from "@/lib/fx";

export type DraftLook = "boardgames";

export const DRAFT_LOOKS: { id: DraftLook; label: string; description: string }[] = [
  { id: "boardgames", label: "Board games", description: "Felt, walnut, game pieces, and a tray of dice games" },
];

/**
 * Draft-only secrets. Never part of SECRET_LIST, so they can't count toward
 * the live total (fun.ts read() drops ids it doesn't know, and modesUnlocked
 * only looks at SECRET_LIST).
 */
export const DRAFT_SECRETS = [
  { id: "d-bonk", title: "Monkey business", icon: "🐒", how: "Bonked 10 monkeys", feature: "chaos" },
  { id: "d-troop", title: "Barrel of monkeys", icon: "🙈", how: "Let the troop grow to its full size", feature: "chaos" },
  { id: "d-gorilla", title: "Release the gorilla", icon: "🦍", how: "Broke the gorilla's emergency glass", feature: "chaos" },
  { id: "d-frenzy", title: "Banana frenzy", icon: "🍌", how: "Knocked the banana crate over with the peanut hammer", feature: "chaos" },
  { id: "d-snake", title: "Snake eyes", icon: "🐍", how: "Rolled two ones in Free roll (Board games theme)", feature: "boardgames" },
  { id: "d-hot", title: "Hot dice", icon: "🎲", how: "Rolled doubles three times in a row in Free roll", feature: "boardgames" },
  { id: "d-bullseye", title: "Bullseye", icon: "🎯", how: "Stood on exactly the limit in Push your luck", feature: "boardgames" },
  { id: "d-thrifty", title: "Waste not", icon: "💰", how: "Stood on exactly the limit in Push your luck after spending at most one die", feature: "boardgames" },
  { id: "d-pig", title: "Hog wild", icon: "🐷", how: "Beat the house at Pig", feature: "boardgames" },
  { id: "d-cake", title: "Cake", icon: "🎂", how: "Solved the last portal test chamber", feature: "portal" },
] as const;
export type DraftSecret = (typeof DRAFT_SECRETS)[number]["id"];
const DRAFT_SECRET_IDS: readonly string[] = DRAFT_SECRETS.map((s) => s.id);

export type DraftState = {
  chaos: boolean;
  look: DraftLook | null;
  secrets: DraftSecret[];
  peeked: DraftSecret[];
};

export const DEFAULT_DRAFT: DraftState = { chaos: false, look: null, secrets: [], peeked: [] };
export const DRAFT_EVENT = "portfolio:draft";
const KEY = "draft-playground-v1";

let cache: DraftState | null = null;

function read(): DraftState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_DRAFT;
    const p = JSON.parse(raw) as Partial<DraftState>;
    const ids = (v: unknown) => (Array.isArray(v) ? (v.filter((s) => DRAFT_SECRET_IDS.includes(s)) as DraftSecret[]) : []);
    return {
      chaos: p.chaos === true,
      look: DRAFT_LOOKS.some((l) => l.id === p.look) ? (p.look as DraftLook) : null,
      secrets: ids(p.secrets),
      peeked: ids(p.peeked),
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

export function getDraft(): DraftState {
  if (!cache) cache = read();
  return cache;
}

export function subscribeDraft(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = read();
    applyDraftAttributes(cache);
    onChange();
  };
  window.addEventListener(DRAFT_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(DRAFT_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateDraft(change: (s: DraftState) => DraftState) {
  cache = change(getDraft());
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Applied for this visit even if it can't be saved.
  }
  applyDraftAttributes(cache);
  window.dispatchEvent(new Event(DRAFT_EVENT));
}

export const setChaos = (chaos: boolean) => updateDraft((s) => ({ ...s, chaos }));
export const setDraftLook = (look: DraftLook | null) => updateDraft((s) => ({ ...s, look }));
export const peekDraftSecret = (id: DraftSecret) =>
  updateDraft((s) => (s.peeked.includes(id) ? s : { ...s, peeked: [...s.peeked, id] }));
export const resetDraftSecrets = () => updateDraft((s) => ({ ...s, secrets: [], peeked: [] }));

/** Celebrate a draft secret. Separate from the live reveal(): no live count, no milestones. */
export function revealDraft(id: DraftSecret, message: string) {
  const first = !getDraft().secrets.includes(id);
  if (first) updateDraft((s) => ({ ...s, secrets: [...s.secrets, id] }));
  const def = DRAFT_SECRETS.find((s) => s.id === id)!;
  const n = getDraft().secrets.length;
  toast(first ? `${message} Draft secret: ${def.title} (${n} of ${DRAFT_SECRETS.length}).` : message);
  sound(first ? "secret" : "pop");
  if (first) burst("confetti");
}

/** Only on /dev/draft: mirror the draft state onto <html> for CSS. */
export function applyDraftAttributes(s: DraftState) {
  const d = document.documentElement.dataset;
  const live = d.draft === "on";
  const set = (key: string, value: string | null | false) => {
    if (live && value) d[key] = value;
    else delete d[key];
  };
  set("draftLook", s.look);
  set("draftChaos", s.chaos && "on");
}
