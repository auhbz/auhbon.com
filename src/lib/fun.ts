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
      { id: "farm", label: "Farm", description: "A little story: feed the chick and see what happens" },
      { id: "hamsters", label: "Hamsters", description: "Hamsters in wheels. Click fast and see how far they go" },
    ],
  },
  {
    id: "buttons",
    label: "Buttons",
    description: "Buttons and project tags react to you",
    options: [
      { id: "rainbow", label: "Rainbow", description: "A spinning rainbow outline on hover" },
      { id: "electric", label: "Electric", description: "Lightning crackles around them; sparks when pressed" },
      { id: "mercury", label: "Mercury", description: "Liquid metal, magnetically drawn to your cursor" },
      { id: "cookie", label: "Cookie", description: "Chocolate chip. Click to take a bite" },
    ],
  },
  {
    id: "trail",
    label: "Cursor trail",
    description: "What follows your cursor (or finger)",
    options: [
      { id: "sparkle", label: "Sparkle", description: "A little glitter; hold still for a rainbow ring" },
      { id: "flow", label: "Flow", description: "Water: it streams, drips when you wait, and splashes when you click" },
      { id: "fire", label: "Fire", description: "Flames that scorch the words they pass, and grow if you wait" },
      { id: "cursed", label: "Cursed", description: "Something follows you. Don’t stand still." },
      { id: "car", label: "Car", description: "A tiny car chases you, drifts the corners, does donuts when you wait; click for nitro" },
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
      { id: "jungle", label: "Jungle", description: "Monkeys, frogs, toucans, bongos, and an elephant when a rock hits" },
      { id: "chiptune", label: "Chiptune", description: "Retro game blips, coins, jumps and power-ups, with a victory jingle for secrets" },
      { id: "tabletop", label: "Tabletop", description: "Board game night: dice, card shuffles, wooden pieces and poker chips" },
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
 * visitor can reveal one, then ask for a one-word hint.
 *
 * `category` groups them on /dev/secrets; `difficulty` is a rough estimate of
 * how hard each is to stumble on or work out (1 easy, 2 medium, 3 hard).
 */
export const SECRET_CATEGORIES = ["Hidden", "Typing", "Combos", "Effects", "Farm", "Games", "Misc"] as const;
export type SecretCategory = (typeof SECRET_CATEGORIES)[number];

/** Where a secret lives (CORE adds this to every secret; MP5). */
export type SecretArea = "site" | "effects" | "themes" | "games" | "wild" | "toys" | "extras";
type SecretDef = { id: string; title: string; icon: string; how: string; hint: string; category: SecretCategory; difficulty: 1 | 2 | 3; area?: SecretArea };

export const SECRET_LIST = [
  { id: "name", title: "High five", icon: "🖐️", how: "Clicked my name five times in a row", hint: "Name", category: "Hidden", difficulty: 2 },
  { id: "konami", title: "Cheat code", icon: "🎮", how: "Entered the Konami code (on a keyboard, or the little gamepad on phones)", hint: "Arrows", category: "Typing", difficulty: 2 },
  { id: "hire", title: "Great idea", icon: "💼", how: "Typed “hire”", hint: "Employ", category: "Typing", difficulty: 2 },
  { id: "diamond", title: "Shine bright", icon: "💎", how: "Clicked my current job on the timeline", hint: "Timeline", category: "Hidden", difficulty: 2 },
  { id: "sudo", title: "Superuser", icon: "🥪", how: "Asked Quick actions for a sandwich, with sudo", hint: "Sandwich", category: "Typing", difficulty: 3 },
  { id: "bat", title: "Batter up", icon: "🦇", how: "Hit a bat with a slingshot rock in the Spooky theme", hint: "Slingshot", category: "Effects", difficulty: 3 },
  { id: "egg", title: "In plain sight", icon: "🥚", how: "Selected all the text and found the egg", hint: "Select", category: "Hidden", difficulty: 3 },
  { id: "elements", title: "Elementalist", icon: "⚗️", how: "Electric buttons, Fire trail and Bubbles together", hint: "Elements", category: "Combos", difficulty: 2 },
  { id: "wild", title: "Back to nature", icon: "🌳", how: "Nature theme with Birds and Fruit", hint: "Birdsong", category: "Combos", difficulty: 2 },
  { id: "haunted", title: "Creepy clown", icon: "🤡", how: "Spooky theme with the Cursed trail and Clown sounds", hint: "Clown", category: "Combos", difficulty: 2 },
  { id: "bunny", title: "Easter egg easter egg", icon: "🐰", how: "Farm story: had the painter paint the egg", hint: "Painter", category: "Farm", difficulty: 2 },
  { id: "golden", title: "The golden egg", icon: "🥇", how: "Farm story: kept the hen's egg warm and waited", hint: "Patience", category: "Farm", difficulty: 2 },
  { id: "road", title: "Why did the chicken…", icon: "🚗", how: "Farm story: crossed the road and asked why", hint: "Crossing", category: "Farm", difficulty: 1 },
  { id: "overeasy", title: "Over easy", icon: "🍳", how: "Cooked the hidden egg with the Fire trail", hint: "Cook", category: "Effects", difficulty: 3 },
  { id: "sunny", title: "Sunny side up", icon: "🌞", how: "Cooked an egg in the Farm story with the Fire trail", hint: "Sizzle", category: "Farm", difficulty: 3 },
  { id: "eyes", title: "Eye spy", icon: "👀", how: "Clicked the googly o's in Contact", hint: "Contact", category: "Hidden", difficulty: 1 },
  { id: "goblin", title: "Hide and seek", icon: "👺", how: "Found the goblin in all three of his hiding places", hint: "Seek", category: "Hidden", difficulty: 2 },
  { id: "cookie", title: "Cookie monster", icon: "🍪", how: "Ate a whole cookie: four bites of one Cookie button", hint: "Crumbs", category: "Effects", difficulty: 1 },
  { id: "oldmac", title: "Old MacDonald", icon: "🐄", how: "Nature theme with Farm i-dots and Jungle sounds", hint: "EIEIO", category: "Combos", difficulty: 2 },
  { id: "double", title: "Double trouble", icon: "🏐", how: "Reached 40 in Keepy Uppy", hint: "Forty", category: "Games", difficulty: 3 },
  { id: "perfect", title: "Perfectionist", icon: "📐", how: "Three perfect drops in a row in Stacker", hint: "Aligned", category: "Games", difficulty: 3 },
  { id: "cadet", title: "Space cadet", icon: "🚀", how: "Cleared the first wave in Asteroids", hint: "Wave", category: "Games", difficulty: 2 },
  { id: "nightowl", title: "Night owl", icon: "🦉", how: "Had Bells & whistles on between midnight and 4 a.m.", hint: "Midnight", category: "Misc", difficulty: 2 },
  { id: "keys", title: "Keyboard warrior", icon: "⌨️", how: "Pressed any key with Bells & whistles on", hint: "Keyboard", category: "Typing", difficulty: 1 },
  { id: "whatsthis", title: "Curiosity", icon: "❓", how: "Ran “What's this?” in Quick actions", hint: "Curious", category: "Misc", difficulty: 1 },
  { id: "auhbon", title: "Name drop", icon: "📛", how: "Typed “auhbon”", hint: "Myself", category: "Typing", difficulty: 2 },
  { id: "pho", title: "Pho real", icon: "🍜", how: "Typed “pho”", hint: "Noodles", category: "Typing", difficulty: 3 },
  { id: "meeple", title: "Meeple people", icon: "🎲", how: "Typed “meeple”", hint: "Tabletop", category: "Typing", difficulty: 3 },
  { id: "podbay", title: "Pod bay doors", icon: "🔴", how: "Asked Contact to open the pod bay doors", hint: "Odyssey", category: "Hidden", difficulty: 1 },
  { id: "leaf", title: "Golden leaf", icon: "🍁", how: "Caught the rare golden leaf in the Nature theme", hint: "Gold", category: "Effects", difficulty: 2 },
  { id: "skeleton", title: "Possessed", icon: "💀", how: "Let the Cursed ghost possess the skeleton (hold still over it, or long-press it)", hint: "Bones", category: "Effects", difficulty: 3 },
  { id: "breakfast", title: "Breakfast of champions", icon: "🥣", how: "Cookie buttons, Cereal sounds and Fruit i-dots together", hint: "Cereal", category: "Combos", difficulty: 2 },
  { id: "hacker", title: "Hacker", icon: "💻", how: "Terminal theme with Electric buttons and the Sparkle trail", hint: "Phosphor", category: "Combos", difficulty: 2 },
  { id: "arcade", title: "Insert coin", icon: "🕹️", how: "Pico-8 theme with Rainbow buttons and the Slingshot", hint: "Retro", category: "Combos", difficulty: 2 },
  { id: "bigtop", title: "Big top", icon: "🎪", how: "Clown sounds, Rainbow buttons and Bubbles together", hint: "Circus", category: "Combos", difficulty: 2 },
  // MP5 (EFFECTS): effects, visits, hidden extras and the mini games.
  { id: "breakaway", title: "Breakaway", icon: "🐹", how: "Clicked a hamster wheel so fast it broke off and rolled away", hint: "Faster", category: "Effects", difficulty: 2, area: "effects" },
  { id: "sweep", title: "Clean sweep", icon: "💨", how: "Kept the screen clear of bubbles for a whole second", hint: "Spotless", category: "Effects", difficulty: 3, area: "effects" },
  { id: "clicky", title: "Click happy", icon: "🖱️", how: "Clicked or tapped 100 times in one visit", hint: "Hundred", category: "Misc", difficulty: 1, area: "site" },
  { id: "shuffling", title: "Every day I'm…", icon: "🔀", how: "Shuffled Bells & whistles five times in one visit", hint: "Shuffle", category: "Effects", difficulty: 1, area: "effects" },
  { id: "back", title: "Welcome back", icon: "👋", how: "Left and came back (another day, or after a break of 20 seconds or more)", hint: "Return", category: "Misc", difficulty: 1, area: "site" },
  { id: "earlybird", title: "Early bird", icon: "🐦", how: "Had Fun mode on between 5 and 8 a.m.", hint: "Sunrise", category: "Misc", difficulty: 2, area: "site" },
  { id: "sleepy", title: "Forty winks", icon: "😴", how: "Sat still for 45 seconds and let the page doze off", hint: "Idle", category: "Misc", difficulty: 1, area: "site" },
  { id: "fowl", title: "Fowl play", icon: "🐔", how: "Bothered the wandering chicken until its friends showed up", hint: "Cluck", category: "Hidden", difficulty: 2, area: "extras" },
  { id: "gems", title: "Pot luck", icon: "🏺", how: "Broke clay pots and collected 10 glimmers", hint: "Smash", category: "Hidden", difficulty: 2, area: "extras" },
  { id: "leaflings", title: "Hide and leaf", icon: "🍃", how: "Found all three leaflings hiding around the page", hint: "Peek", category: "Hidden", difficulty: 3, area: "extras" },
  { id: "overload", title: "Short circuit", icon: "⚡", how: "Pressed Electric buttons so fast they overloaded", hint: "Overload", category: "Effects", difficulty: 2, area: "effects" },
  { id: "scorched", title: "Scorched earth", icon: "🔥", how: "Ran the Fire trail over every section heading", hint: "Headings", category: "Effects", difficulty: 2, area: "effects" },
  { id: "shakeoff", title: "Shake it off", icon: "👻", how: "Shook the Cursed ghost off by wiggling the cursor hard", hint: "Wiggle", category: "Effects", difficulty: 2, area: "effects" },
  { id: "donuts", title: "Donut shop", icon: "🍩", how: "Let the Car trail do donuts for eight seconds straight", hint: "Spin", category: "Effects", difficulty: 1, area: "effects" },
  { id: "deepspace", title: "Deep space", icon: "🌌", how: "Reached wave 4 in Asteroids", hint: "Waves", category: "Games", difficulty: 3, area: "games" },
  { id: "pacifist", title: "Pacifist", icon: "🕊️", how: "Survived 30 seconds of Asteroids without firing a shot", hint: "Peace", category: "Games", difficulty: 2, area: "games" },
  { id: "warmup", title: "Warmed up", icon: "👟", how: "Reached 15 in Keepy Uppy", hint: "Fifteen", category: "Games", difficulty: 1, area: "games" },
  { id: "skyhigh", title: "Sky high", icon: "☁️", how: "Bounced the Keepy Uppy ball off the ceiling three times in one game", hint: "Ceiling", category: "Games", difficulty: 2, area: "games" },
  { id: "tower", title: "Tower", icon: "🗼", how: "Stacked 10 blocks in Stacker", hint: "Ten", category: "Games", difficulty: 1, area: "games" },
  { id: "skyscraper", title: "Skyscraper", icon: "🏙️", how: "Stacked 20 blocks in Stacker", hint: "Twenty", category: "Games", difficulty: 3, area: "games" },
] as const satisfies readonly SecretDef[];
export type Secret = (typeof SECRET_LIST)[number]["id"];
export const SECRETS: readonly Secret[] = SECRET_LIST.map((s) => s.id);

/** Words that are secrets when typed (on the page, or into Quick actions). */
export const TYPED_SECRETS: { word: string; id: Secret }[] = [
  { word: "hire", id: "hire" },
  { word: "auhbon", id: "auhbon" },
  { word: "meeple", id: "meeple" },
  { word: "pho", id: "pho" },
];

/** The long-term goal. Progress counts toward it, with a celebration at each milestone. */
export const SECRET_GOAL = 100;
export const MILESTONES = [
  { at: 5, name: "Animal parade", icon: "🐘" },
  { at: 10, name: "Fireworks", icon: "🎆" },
  { at: 15, name: "Lantern festival", icon: "🏮" },
  { at: 25, name: "Disco", icon: "🕺" },
  { at: 40, name: "Marching band", icon: "🥁" },
  { at: 65, name: "Fireworks disco", icon: "🎇" },
  { at: 97, name: "Almost there", icon: "🎊" },
  { at: 100, name: "Grand finale", icon: "🏆" },
] as const;

/** How many places the goblin hides before he gives up. */
export const HIDE_SPOTS = 3;

/** `hover` only applies to sound effects: whether hovering plays sounds. */
export type Effect = { on: boolean; variant: string; hover?: boolean };
export type FunState = {
  on: boolean;
  effects: Record<Category, Effect>;
  look: Look;
  secrets: string[];
  /** Locked secrets whose hint icon the visitor chose to reveal. */
  peeked: string[];
  /** Locked secrets whose one-word hint the visitor asked for (after revealing the icon). */
  hinted: string[];
  /** Has the visitor ever opened Bells & whistles? Until then, the goblin points at it. */
  welcomed: boolean;
  /** Which hiding place the goblin is in (HIDE_SPOTS once he's been found everywhere). */
  hideSpot: number;
  /** Milestones already celebrated. */
  celebrated: number[];
  /** Phones: tilt steers bubbles and aims the slingshot; a shake shuffles. Off by default (iOS asks permission). */
  motion: boolean;
  /** Phones that can vibrate: a light buzz on presses while Bells & whistles is on. */
  haptics: boolean;
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

export const DEFAULT_FUN: FunState = { on: false, effects: ALL_OFF, look: "classic", secrets: [], peeked: [], hinted: [], welcomed: false, hideSpot: 0, celebrated: [], motion: false, haptics: true };

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
      hinted: Array.isArray(p.hinted) ? p.hinted.filter((s) => SECRETS.includes(s as Secret)) : [],
      // Anyone who used bells & whistles before this existed has already been welcomed.
      welcomed: p.welcomed === true || master || (Array.isArray(p.secrets) && p.secrets.length > 0),
      hideSpot: Number.isInteger(p.hideSpot) ? Math.min(HIDE_SPOTS, Math.max(0, p.hideSpot as number)) : 0,
      celebrated: Array.isArray(p.celebrated) ? p.celebrated.filter((n) => MILESTONES.some((m) => m.at === n)) : [],
      motion: p.motion === true,
      haptics: p.haptics !== false,
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

/** The "Motion controls" switch (phones). Touches nothing else. */
export const setMotion = (motion: boolean) => updateFun((s) => ({ ...s, motion }));

/** The "Haptics" switch (phones that can vibrate). Touches nothing else. */
export const setHaptics = (haptics: boolean) => updateFun((s) => ({ ...s, haptics }));

/** Picking a look (shown as "Theme" in the panel). Touches nothing else. */
export const setLook = (look: Look) => updateFun((s) => ({ ...s, look }));

/** Fired after each shuffle (a secret counts them). */
export const SHUFFLE_EVENT = "portfolio:shuffle";

/** Everything on with random options; the look stays Classic. Returns the picks. */
export function shuffle() {
  const effects = {} as Record<Category, Effect>;
  for (const c of CATEGORIES) {
    const pick = c.options[Math.floor(Math.random() * c.options.length)];
    effects[c.id] = { on: true, variant: pick.id, ...(c.id === "sound" ? { hover: true } : {}) };
  }
  updateFun((s) => ({ ...s, effects, look: "classic" }));
  window.dispatchEvent(new Event(SHUFFLE_EVENT));
  return CATEGORIES.map((c) => c.options.find((o) => o.id === effects[c.id].variant)!.label);
}

/** Reveal a locked secret's hint icon (its title stays hidden until found). */
export const peekSecret = (id: Secret) =>
  updateFun((s) => (s.peeked.includes(id) ? s : { ...s, peeked: [...s.peeked, id] }));

/** Show a revealed badge's one-word hint (it stays under the icon). */
export const hintSecret = (id: Secret) =>
  updateFun((s) =>
    s.hinted.includes(id) ? s : { ...s, hinted: [...s.hinted, id], peeked: s.peeked.includes(id) ? s.peeked : [...s.peeked, id] },
  );

/** The first time the visitor opens Bells & whistles, the guide goblin runs off to hide. */
export const markWelcomed = () => updateFun((s) => (s.welcomed ? s : { ...s, welcomed: true }));

/** The goblin was found: he moves to the next hiding place. Returns the new spot. */
export function advanceHide() {
  updateFun((s) => ({ ...s, hideSpot: Math.min(HIDE_SPOTS, s.hideSpot + 1) }));
  return getFun().hideSpot;
}

/** The favorite-number unlock: every secret found at once. */
export const unlockAllSecrets = () => updateFun((s) => ({ ...s, secrets: [...SECRETS] }));

/** Back to square one: secrets, peeks, hints, milestone parties and the goblin's hiding place. */
export const resetSecrets = () => updateFun((s) => ({ ...s, secrets: [], peeked: [], hinted: [], celebrated: [], hideSpot: 0 }));

/**
 * Game modes open up once every secret hidden so far has been found, except the
 * ones inside the games themselves (those can only be found once the modes are open).
 */
export const modesUnlocked = (s: FunState) => SECRET_LIST.every((x) => x.category === "Games" || s.secrets.includes(x.id));

/** Milestones reached but not yet celebrated (normally zero or one). */
export function dueMilestones(s: FunState) {
  return MILESTONES.filter((m) => s.secrets.length >= m.at && !s.celebrated.includes(m.at));
}
export const markCelebrated = (at: number) =>
  updateFun((s) => (s.celebrated.includes(at) ? s : { ...s, celebrated: [...s.celebrated, at] }));

/** Every combination secret the current settings unlock (usually none or one). */
export function comboSecrets(s: FunState): Secret[] {
  const v = (c: Category) => (s.effects[c].on ? s.effects[c].variant : null);
  const out: Secret[] = [];
  if (v("buttons") === "electric" && v("trail") === "fire" && v("dots") === "bubbles") out.push("elements");
  if (s.look === "nature" && v("sound") === "birds" && v("dots") === "fruit") out.push("wild");
  if (s.look === "spooky" && v("trail") === "cursed" && v("sound") === "clown") out.push("haunted");
  if (s.look === "nature" && v("dots") === "farm" && v("sound") === "jungle") out.push("oldmac");
  if (v("buttons") === "cookie" && v("sound") === "cereal" && v("dots") === "fruit") out.push("breakfast");
  if (s.look === "terminal" && v("buttons") === "electric" && v("trail") === "sparkle") out.push("hacker");
  if (s.look === "pico8" && v("buttons") === "rainbow" && v("dots") === "slingshot") out.push("arcade");
  if (v("sound") === "clown" && v("buttons") === "rainbow" && v("dots") === "bubbles") out.push("bigtop");
  return out;
}

/** The first combination secret the current settings unlock, if any. */
export const comboSecret = (s: FunState): Secret | null => comboSecrets(s)[0] ?? null;

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
