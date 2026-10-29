/**
 * "Bells and whistles": one opt-in store for every playful feature.
 *
 * Off by default, so first-time visitors get the clean 1.0.0 site. Each effect
 * is an independent switch, and all of them reach the page through data-*
 * attributes on <html>, so CSS and components read the same source of truth
 * and features can't fight each other.
 */
import { prefersReducedMotion } from "@/lib/events";

export type Look = "classic" | "terminal" | "pico8";
export type Feature = "emojiDots" | "rainbow" | "sparkles" | "sound";

export type FunState = {
  on: boolean;
  features: Record<Feature, boolean>;
  look: Look;
  secrets: string[];
};

export const FEATURES: { id: Feature; label: string; description: string }[] = [
  { id: "emojiDots", label: "Emoji i-dots", description: "The dots on the i's in my name change as you get close" },
  { id: "rainbow", label: "Rainbow buttons", description: "Round buttons get a spinning rainbow outline on hover" },
  { id: "sparkles", label: "Sparkle trail", description: "Your cursor leaves a little glitter behind" },
  { id: "sound", label: "Sound effects", description: "Soft clicks and chimes when you press things" },
];

export const LOOKS: { id: Look; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "The regular site" },
  { id: "terminal", label: "Terminal", description: "Green phosphor, monospace, blinking cursor" },
  { id: "pico8", label: "Pico-8", description: "The 16-color fantasy-console palette I made Flabby in" },
];

/** Each secret is found once; the panel shows how many are left. */
export const SECRETS = ["konami", "hire", "name", "diamond", "sudo"] as const;
export type Secret = (typeof SECRETS)[number];

export const FUN_EVENT = "portfolio:fun";
const KEY = "bells-and-whistles";

export const DEFAULT_FUN: FunState = {
  on: false,
  features: { emojiDots: true, rainbow: true, sparkles: true, sound: false },
  look: "classic",
  secrets: [],
};

let cache: FunState | null = null;

function read(): FunState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_FUN;
    const parsed = JSON.parse(raw) as Partial<FunState>;
    return {
      on: parsed.on === true,
      features: { ...DEFAULT_FUN.features, ...parsed.features },
      look: LOOKS.some((l) => l.id === parsed.look) ? (parsed.look as Look) : "classic",
      secrets: Array.isArray(parsed.secrets) ? parsed.secrets.filter((s) => SECRETS.includes(s as Secret)) : [],
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

export const setFunOn = (on: boolean) => updateFun((s) => ({ ...s, on }));
export const setFeature = (id: Feature, value: boolean) =>
  updateFun((s) => ({ ...s, on: s.on || value, features: { ...s.features, [id]: value } }));
export const setLook = (look: Look) => updateFun((s) => ({ ...s, on: s.on || look !== "classic", look }));

/** Returns true the first time a secret is found. */
export function findSecret(id: Secret): boolean {
  if (getFun().secrets.includes(id)) return false;
  updateFun((s) => ({ ...s, secrets: [...s.secrets, id] }));
  return true;
}

export function isActive(state: FunState, feature: Feature) {
  if (!state.on || !state.features[feature]) return false;
  // Motion-heavy effects stay off for people who ask for less motion.
  if (feature === "sparkles" && prefersReducedMotion()) return false;
  return true;
}

/** Mirrors the state onto <html> so CSS can respond without extra JavaScript. */
export function applyFunAttributes(s: FunState) {
  const d = document.documentElement.dataset;
  const set = (key: string, value: string | false) => {
    if (value) d[key] = value;
    else delete d[key];
  };
  set("fun", s.on && "on");
  set("fxRainbow", s.on && s.features.rainbow && "on");
  set("look", s.on && s.look !== "classic" && s.look);
}

/**
 * Inline, pre-hydration version of applyFunAttributes (keep the two in sync),
 * so a saved look like Terminal paints correctly on the first frame.
 */
export const funInitScript = `try{var f=JSON.parse(localStorage.getItem("${KEY}")||"null");if(f&&f.on===true){var d=document.documentElement.dataset;d.fun="on";if(!f.features||f.features.rainbow!==false)d.fxRainbow="on";if(f.look==="terminal"||f.look==="pico8")d.look=f.look}}catch(e){}`;
