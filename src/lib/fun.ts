/**
 * "Bells and whistles": one opt-in store for every playful feature.
 *
 * Off by default, so first-time visitors get the clean site. Effects are
 * grouped into categories; each category has an on/off switch and a variant.
 * State is mirrored onto <html> data-* attributes so CSS, the canvas engine
 * and components all read the same source of truth and can't contradict.
 */
import { prefersReducedMotion } from "@/lib/events";

export type Look = "classic" | "terminal" | "pico8" | "nature" | "spooky";
export type Category = "dots" | "buttons" | "trail" | "sound";

type Option = { id: string; label: string; description: string };
type CategoryDef = { id: Category; label: string; description: string; options: Option[] };

export const CATEGORIES: CategoryDef[] = [
  {
    id: "dots",
    label: "i-dots",
    description: "The dots on the i's in my name",
    options: [
      { id: "emoji", label: "Emoji", description: "They shuffle as you get close" },
      { id: "slingshot", label: "Slingshot", description: "Pull a rock back, let go, knock words around" },
      { id: "bubbles", label: "Bubbles", description: "They float away; pop them" },
    ],
  },
  {
    id: "buttons",
    label: "Buttons",
    description: "The round buttons react to you",
    options: [
      { id: "rainbow", label: "Rainbow", description: "A spinning rainbow outline on hover" },
      { id: "electric", label: "Electricity", description: "Lightning crackles around them; sparks when pressed" },
      { id: "mercury", label: "Mercury", description: "Liquid metal, magnetically drawn to your cursor" },
    ],
  },
  {
    id: "trail",
    label: "Cursor trail",
    description: "What follows your cursor (or finger)",
    options: [
      { id: "sparkle", label: "Sparkle", description: "A little glitter" },
      { id: "fire", label: "Fire", description: "Flames that scorch the words they pass" },
      { id: "cursed", label: "Cursed", description: "Something follows you" },
    ],
  },
  {
    id: "sound",
    label: "Sound effects",
    description: "Synthesized, no audio files",
    options: [
      { id: "chimes", label: "Bells & whistles", description: "Wind chimes on hover, a whistle on press" },
      { id: "cereal", label: "Cereal", description: "Snap, crackle, pop" },
      { id: "clown", label: "Clown", description: "Slide whistles and honks" },
    ],
  },
];

export const LOOKS: { id: Look; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "The regular site" },
  { id: "terminal", label: "Terminal", description: "Green phosphor, monospace, blinking cursor" },
  { id: "pico8", label: "Pico-8", description: "The 16-color fantasy-console palette I made Flabby in" },
  { id: "nature", label: "Nature", description: "Moss, dappled canopy light, flowing water, falling leaves" },
  { id: "spooky", label: "Spooky", description: "Fog, flicker, and things that fly at night" },
];

/** Each secret is found once; the panel shows how many are left. */
export const SECRETS = ["konami", "hire", "name", "diamond", "sudo"] as const;
export type Secret = (typeof SECRETS)[number];

export type Effect = { on: boolean; variant: string };
export type FunState = {
  on: boolean;
  effects: Record<Category, Effect>;
  look: Look;
  secrets: string[];
};

export const FUN_EVENT = "portfolio:fun";
const KEY = "bells-and-whistles-v2";

const firstOption = (c: Category) => CATEGORIES.find((d) => d.id === c)!.options[0].id;

/** Turning bells and whistles on starts with everything enabled, first option of each. */
export const ALL_ON: Record<Category, Effect> = {
  dots: { on: true, variant: firstOption("dots") },
  buttons: { on: true, variant: firstOption("buttons") },
  trail: { on: true, variant: firstOption("trail") },
  sound: { on: true, variant: firstOption("sound") },
};

export const DEFAULT_FUN: FunState = { on: false, effects: ALL_ON, look: "classic", secrets: [] };

function validVariant(c: Category, v: unknown) {
  return CATEGORIES.find((d) => d.id === c)!.options.some((o) => o.id === v);
}

let cache: FunState | null = null;

function read(): FunState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_FUN;
    const p = JSON.parse(raw) as Partial<FunState>;
    const effects = { ...ALL_ON };
    for (const c of CATEGORIES) {
      const e = p.effects?.[c.id];
      if (e) effects[c.id] = { on: e.on !== false, variant: validVariant(c.id, e.variant) ? e.variant : firstOption(c.id) };
    }
    return {
      on: p.on === true,
      effects,
      look: LOOKS.some((l) => l.id === p.look) ? (p.look as Look) : "classic",
      secrets: Array.isArray(p.secrets) ? p.secrets.filter((s) => SECRETS.includes(s as Secret)) : [],
    };
  } catch {
    return DEFAULT_FUN;
  }
}

/** Stable snapshot for useSyncExternalStore. */
export function getFun(): FunState {
  if (!cache) cache = read();
  return cache;
}

export function subscribeFun(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = read();
    applyFunAttributes(cache);
    onChange();
  };
  window.addEventListener(FUN_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(FUN_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateFun(change: (s: FunState) => FunState) {
  cache = change(getFun());
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Applied for this visit even if it can't be saved.
  }
  applyFunAttributes(cache);
  window.dispatchEvent(new Event(FUN_EVENT));
}

/** Master switch. Turning on always starts from "everything on, first options". */
export const setFunOn = (on: boolean) =>
  updateFun((s) => ({ ...s, on, effects: on && !s.on ? ALL_ON : s.effects }));

export const setEffectOn = (c: Category, on: boolean) =>
  updateFun((s) => ({ ...s, on: true, effects: { ...s.effects, [c]: { ...s.effects[c], on } } }));

export const setVariant = (c: Category, variant: string) =>
  updateFun((s) => ({ ...s, on: true, effects: { ...s.effects, [c]: { on: true, variant } } }));

export const setLook = (look: Look) => updateFun((s) => ({ ...s, on: s.on || look !== "classic", look }));

/** Everything on with random options; the look stays Classic. Returns the picks. */
export function shuffle() {
  const effects = {} as Record<Category, Effect>;
  for (const c of CATEGORIES) {
    const pick = c.options[Math.floor(Math.random() * c.options.length)];
    effects[c.id] = { on: true, variant: pick.id };
  }
  updateFun((s) => ({ ...s, on: true, effects, look: "classic" }));
  return CATEGORIES.map((c) => c.options.find((o) => o.id === effects[c.id].variant)!.label);
}

/** Returns true the first time a secret is found. */
export function findSecret(id: Secret): boolean {
  if (getFun().secrets.includes(id)) return false;
  updateFun((s) => ({ ...s, secrets: [...s.secrets, id] }));
  return true;
}

/** Motion-heavy effects stay off for people who ask for less motion. */
export function blockedByMotion(c: Category, variant: string) {
  return prefersReducedMotion() && (c === "trail" || (c === "dots" && variant === "bubbles"));
}

/** The variant in use for a category, or null if that effect is off. */
export function activeVariant(s: FunState, c: Category): string | null {
  const e = s.effects[c];
  if (!s.on || !e.on || blockedByMotion(c, e.variant)) return null;
  return e.variant;
}

export const lookActive = (s: FunState): Look => (s.on ? s.look : "classic");

/** Mirrors the state onto <html> so CSS can respond without extra JavaScript. */
export function applyFunAttributes(s: FunState) {
  const d = document.documentElement.dataset;
  const set = (key: string, value: string | null | false) => {
    if (value) d[key] = value;
    else delete d[key];
  };
  set("fun", s.on && "on");
  set("fxButtons", activeVariant(s, "buttons"));
  set("fxDots", activeVariant(s, "dots"));
  set("look", lookActive(s) !== "classic" && s.look);
}

/**
 * Inline, pre-hydration version of applyFunAttributes (keep the two in sync),
 * so a saved look paints correctly on the first frame.
 */
export const funInitScript = `try{var f=JSON.parse(localStorage.getItem("${KEY}")||"null");if(f&&f.on===true){var d=document.documentElement.dataset,e=f.effects||{};d.fun="on";var b=e.buttons;if(!b||b.on!==false)d.fxButtons=(b&&b.variant)||"rainbow";if(["terminal","pico8","nature","spooky"].indexOf(f.look)>-1)d.look=f.look}}catch(e){}`;
