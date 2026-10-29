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
      { id: "fruit", label: "Fruit", description: "Fruit that changes as you get close" },
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
      { id: "electric", label: "Electric", description: "Lightning crackles around them; sparks when pressed" },
      { id: "mercury", label: "Mercury", description: "Liquid metal, magnetically drawn to your cursor" },
    ],
  },
  {
    id: "trail",
    label: "Cursor trail",
    description: "What follows your cursor (or finger)",
    options: [
      { id: "sparkle", label: "Sparkle", description: "A little glitter; hold still for a rainbow ring" },
      { id: "fire", label: "Fire", description: "Flames that scorch the words they pass, and grow if you wait" },
      { id: "cursed", label: "Cursed", description: "Something follows you. Don’t stand still." },
    ],
  },
  {
    id: "sound",
    label: "Sound effects",
    description: "Synthesized, no audio files",
    options: [
      { id: "chimes", label: "Bells & whistles", description: "Wind chimes on hover, a whistle on press" },
      { id: "cereal", label: "Cereal", description: "Finger snaps, bubble-wrap pops, and crunch" },
      { id: "clown", label: "Clown", description: "Honks, slide whistles, kazoos, applause (and the odd toot)" },
      { id: "birds", label: "Birds", description: "Chirps on hover, a whistled call on press" },
    ],
  },
];

export const LOOKS: { id: Look; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "The regular site" },
  { id: "terminal", label: "Terminal", description: "Green phosphor, monospace, blinking cursor" },
  { id: "pico8", label: "Pico-8", description: "The 16-color fantasy-console palette I made Flabby in" },
  { id: "nature", label: "Nature", description: "Moss, dappled canopy light, flowing water, falling leaves" },
  { id: "spooky", label: "Spooky", description: "Fog, flicker, and curious things that fly at night" },
];

/**
 * Secrets work like video-game achievements. Each has a title (hidden until
 * found) and an icon that doubles as a hint: locked icons are blurred, and a
 * visitor can tap one to peek at it.
 */
export const SECRET_LIST = [
  { id: "name", title: "High five", icon: "🖐️", how: "Clicked my name five times in a row" },
  { id: "konami", title: "Cheat code", icon: "🎮", how: "Entered the Konami code" },
  { id: "hire", title: "Great idea", icon: "💼", how: "Typed “hire”" },
  { id: "diamond", title: "Shine bright", icon: "💎", how: "Clicked my current job on the timeline" },
  { id: "sudo", title: "Superuser", icon: "🥪", how: "Asked Quick actions for a sandwich, with sudo" },
  { id: "bat", title: "Batter up", icon: "🦇", how: "Hit a bat with a slingshot rock in the Spooky theme" },
  { id: "egg", title: "In plain sight", icon: "🥚", how: "Selected all the text and found the egg" },
  { id: "elements", title: "Elementalist", icon: "⚗️", how: "Electric buttons, Fire trail and Bubbles together" },
  { id: "wild", title: "Back to nature", icon: "🌳", how: "Nature theme with Birds and Fruit" },
  { id: "haunted", title: "Creepy clown", icon: "🤡", how: "Spooky theme with the Cursed trail and Clown sounds" },
] as const;
export type Secret = (typeof SECRET_LIST)[number]["id"];
export const SECRETS: readonly Secret[] = SECRET_LIST.map((s) => s.id);

/** `hover` only applies to sound effects: whether hovering plays sounds. */
export type Effect = { on: boolean; variant: string; hover?: boolean };
export type FunState = {
  on: boolean;
  effects: Record<Category, Effect>;
  look: Look;
  secrets: string[];
  /** Locked secrets whose hint icon the visitor chose to reveal. */
  peeked: string[];
};

export const FUN_EVENT = "portfolio:fun";
const KEY = "bells-and-whistles-v2";

const firstOption = (c: Category) => CATEGORIES.find((d) => d.id === c)!.options[0].id;

/** Turning bells and whistles on starts with everything enabled, first option of each. */
export const ALL_ON: Record<Category, Effect> = {
  dots: { on: true, variant: firstOption("dots") },
  buttons: { on: true, variant: firstOption("buttons") },
  trail: { on: true, variant: firstOption("trail") },
  sound: { on: true, variant: firstOption("sound"), hover: true },
};

/** Everything off (each remembers its first option for when it's switched on). */
export const ALL_OFF: Record<Category, Effect> = {
  dots: { ...ALL_ON.dots, on: false },
  buttons: { ...ALL_ON.buttons, on: false },
  trail: { ...ALL_ON.trail, on: false },
  sound: { ...ALL_ON.sound, on: false },
};

export const DEFAULT_FUN: FunState = { on: false, effects: ALL_OFF, look: "classic", secrets: [], peeked: [] };

/**
 * The master switch is a summary, not a separate layer: it's "on" whenever any
 * effect is on or a non-Classic look is picked. That way no switch can change
 * another switch (only the master switch, which sets them all).
 */
function withSummary(s: FunState): FunState {
  const on = s.look !== "classic" || CATEGORIES.some((c) => s.effects[c.id].on);
  return on === s.on ? s : { ...s, on };
}

function validVariant(c: Category, v: unknown) {
  return CATEGORIES.find((d) => d.id === c)!.options.some((o) => o.id === v);
}

let cache: FunState | null = null;

function read(): FunState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_FUN;
    const p = JSON.parse(raw) as Partial<FunState>;
    const master = p.on === true;
    const effects = { ...ALL_OFF };
    for (const c of CATEGORIES) {
      const e = p.effects?.[c.id];
      if (e) {
        effects[c.id] = { on: master && e.on !== false, variant: validVariant(c.id, e.variant) ? e.variant : firstOption(c.id) };
        if (c.id === "sound") effects.sound.hover = e.hover !== false;
      }
    }
    return withSummary({
      on: master,
      effects,
      // Older saves kept a look while switched off; treat "off" as the clean site.
      look: master && LOOKS.some((l) => l.id === p.look) ? (p.look as Look) : "classic",
      secrets: Array.isArray(p.secrets) ? p.secrets.filter((s) => SECRETS.includes(s as Secret)) : [],
      peeked: Array.isArray(p.peeked) ? p.peeked.filter((s) => SECRETS.includes(s as Secret)) : [],
    });
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
  cache = withSummary(change(getFun()));
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Applied for this visit even if it can't be saved.
  }
  applyFunAttributes(cache);
  window.dispatchEvent(new Event(FUN_EVENT));
}

/**
 * The master switch. On: every effect on with its first option (look unchanged).
 * Off: every effect off and the look back to Classic, which is the clean site.
 */
export const setFunOn = (on: boolean) =>
  updateFun((s) => (on ? { ...s, effects: ALL_ON } : { ...s, effects: ALL_OFF, look: "classic" }));

/** One effect's switch. Touches nothing else. */
export const setEffectOn = (c: Category, on: boolean) =>
  updateFun((s) => ({ ...s, effects: { ...s.effects, [c]: { ...s.effects[c], on } } }));

/** Picking a style switches that one effect on. Touches nothing else. */
export const setVariant = (c: Category, variant: string) =>
  updateFun((s) => ({ ...s, effects: { ...s.effects, [c]: { ...s.effects[c], on: true, variant } } }));

/** The "hover sounds" sub-switch inside Sound effects. Touches nothing else. */
export const setSoundHover = (hover: boolean) =>
  updateFun((s) => ({ ...s, effects: { ...s.effects, sound: { ...s.effects.sound, hover } } }));

/** Picking a look (shown as "Theme" in the panel). Touches nothing else. */
export const setLook = (look: Look) => updateFun((s) => ({ ...s, look }));

/** Everything on with random options; the look stays Classic. Returns the picks. */
export function shuffle() {
  const effects = {} as Record<Category, Effect>;
  for (const c of CATEGORIES) {
    const pick = c.options[Math.floor(Math.random() * c.options.length)];
    effects[c.id] = { on: true, variant: pick.id, ...(c.id === "sound" ? { hover: true } : {}) };
  }
  updateFun((s) => ({ ...s, effects, look: "classic" }));
  return CATEGORIES.map((c) => c.options.find((o) => o.id === effects[c.id].variant)!.label);
}

/** Reveal a locked secret's hint icon (its title stays hidden until found). */
export const peekSecret = (id: Secret) =>
  updateFun((s) => (s.peeked.includes(id) ? s : { ...s, peeked: [...s.peeked, id] }));

/** Which combination secret, if any, the current settings unlock. */
export function comboSecret(s: FunState): Secret | null {
  const v = (c: Category) => (s.effects[c].on ? s.effects[c].variant : null);
  if (v("buttons") === "electric" && v("trail") === "fire" && v("dots") === "bubbles") return "elements";
  if (s.look === "nature" && v("sound") === "birds" && v("dots") === "fruit") return "wild";
  if (s.look === "spooky" && v("trail") === "cursed" && v("sound") === "clown") return "haunted";
  return null;
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
