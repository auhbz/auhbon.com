/**
 * "Bells and whistles": one opt-in store for every playful feature.
 *
 * Off by default, so first-time visitors get the clean site. Effects are
 * grouped into categories; each category has an on/off switch and a variant.
 * State is mirrored onto <html> data-* attributes so CSS, the canvas engine
 * and components all read the same source of truth and can't contradict.
 */
import { prefersReducedMotion } from "@/lib/events";

export type Look = "classic" | "terminal" | "pico8" | "nature" | "spooky" | "pho";
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
  { id: "pho", label: "Pho", description: "A steaming bowl with limes, basil, bean sprouts, and jalapeños on the side" },
];

/**
 * Secrets work like video-game achievements. Each has a title (hidden until
 * found) and an icon that doubles as a hint: locked icons are blurred, and a
 * visitor can reveal one, then ask for a one-word hint.
 *
 * `category` groups them on /dev/secrets; `difficulty` is a rough estimate of
 * how hard each is to stumble on or work out (1 easy, 2 medium, 3 hard).
 * `area` says which part of the site it belongs to (counted on /dev/goals).
 */
export const SECRET_CATEGORIES = ["Hidden", "Typing", "Combos", "Effects", "Farm", "Games", "Misc"] as const;
export type SecretCategory = (typeof SECRET_CATEGORIES)[number];

export const SECRET_AREAS = ["site", "effects", "themes", "games", "wild", "toys", "extras"] as const;
export type SecretArea = (typeof SECRET_AREAS)[number];
export const SECRET_AREA_LABELS: Record<SecretArea, string> = {
  site: "The site itself",
  effects: "Effects",
  themes: "Themes",
  games: "Mini games",
  wild: "Wild & Wondrous",
  toys: "Toys",
  extras: "Extras",
};

export type SecretDef = {
  id: string;
  title: string;
  icon: string;
  how: string;
  hint: string;
  category: SecretCategory;
  difficulty: 1 | 2 | 3;
  area: SecretArea;
};

export const SECRET_LIST = [
  { id: "name", title: "High five", icon: "🖐️", how: "Clicked my name five times in a row", hint: "Name", category: "Hidden", difficulty: 2, area: "site" },
  { id: "konami", title: "Cheat code", icon: "🎮", how: "Entered the Konami code (on a keyboard, or the little gamepad on phones)", hint: "Arrows", category: "Typing", difficulty: 2, area: "site" },
  { id: "hire", title: "Great idea", icon: "💼", how: "Typed “hire”", hint: "Employ", category: "Typing", difficulty: 2, area: "site" },
  { id: "diamond", title: "Shine bright", icon: "💎", how: "Clicked my current job on the timeline", hint: "Timeline", category: "Hidden", difficulty: 2, area: "site" },
  { id: "sudo", title: "Superuser", icon: "🥪", how: "Asked Quick actions for a sandwich, with sudo", hint: "Sandwich", category: "Typing", difficulty: 3, area: "site" },
  { id: "bat", title: "Batter up", icon: "🦇", how: "Hit a bat with a slingshot rock in the Spooky theme", hint: "Slingshot", category: "Effects", difficulty: 3, area: "effects" },
  { id: "egg", title: "In plain sight", icon: "🥚", how: "Selected all the text and found the egg", hint: "Select", category: "Hidden", difficulty: 3, area: "site" },
  { id: "elements", title: "Elementalist", icon: "⚗️", how: "Electric buttons, Fire trail and Bubbles together", hint: "Elements", category: "Combos", difficulty: 2, area: "effects" },
  { id: "wild", title: "Back to nature", icon: "🌳", how: "Nature theme with Birds and Fruit", hint: "Birdsong", category: "Combos", difficulty: 2, area: "themes" },
  { id: "haunted", title: "Creepy clown", icon: "🤡", how: "Spooky theme with the Cursed trail and Clown sounds", hint: "Clown", category: "Combos", difficulty: 2, area: "themes" },
  { id: "bunny", title: "Easter egg easter egg", icon: "🐰", how: "Farm story: had the painter paint the egg", hint: "Painter", category: "Farm", difficulty: 2, area: "effects" },
  { id: "golden", title: "The golden egg", icon: "🥇", how: "Farm story: kept the hen's egg warm and waited", hint: "Patience", category: "Farm", difficulty: 2, area: "effects" },
  { id: "road", title: "Why did the chicken…", icon: "🚗", how: "Farm story: crossed the road and asked why", hint: "Crossing", category: "Farm", difficulty: 1, area: "effects" },
  { id: "overeasy", title: "Over easy", icon: "🍳", how: "Cooked the hidden egg with the Fire trail", hint: "Cook", category: "Effects", difficulty: 3, area: "effects" },
  { id: "sunny", title: "Sunny side up", icon: "🌞", how: "Cooked an egg in the Farm story with the Fire trail", hint: "Sizzle", category: "Farm", difficulty: 3, area: "effects" },
  { id: "eyes", title: "Eye spy", icon: "👀", how: "Clicked the googly o's in Contact", hint: "Contact", category: "Hidden", difficulty: 1, area: "site" },
  { id: "goblin", title: "Hide and seek", icon: "👺", how: "Found the goblin in all three of his hiding places", hint: "Seek", category: "Hidden", difficulty: 2, area: "site" },
  { id: "cookie", title: "Cookie monster", icon: "🍪", how: "Ate a whole cookie: four bites of one Cookie button", hint: "Crumbs", category: "Effects", difficulty: 1, area: "effects" },
  { id: "oldmac", title: "Old MacDonald", icon: "🐄", how: "Nature theme with Farm i-dots and Jungle sounds", hint: "EIEIO", category: "Combos", difficulty: 2, area: "themes" },
  { id: "double", title: "Double trouble", icon: "🏐", how: "Reached 40 in Keepy Uppy", hint: "Forty", category: "Games", difficulty: 3, area: "games" },
  { id: "perfect", title: "Perfectionist", icon: "📐", how: "Three perfect drops in a row in Stacker", hint: "Aligned", category: "Games", difficulty: 3, area: "games" },
  { id: "cadet", title: "Space cadet", icon: "🚀", how: "Cleared the first wave in Asteroids", hint: "Wave", category: "Games", difficulty: 2, area: "games" },
  { id: "nightowl", title: "Night owl", icon: "🦉", how: "Had Bells & whistles on between midnight and 4 a.m.", hint: "Midnight", category: "Misc", difficulty: 2, area: "site" },
  { id: "keys", title: "Keyboard warrior", icon: "⌨️", how: "Pressed any key with Bells & whistles on", hint: "Keyboard", category: "Typing", difficulty: 1, area: "site" },
  { id: "whatsthis", title: "Curiosity", icon: "❓", how: "Ran “What's this?” in Quick actions", hint: "Curious", category: "Misc", difficulty: 1, area: "site" },
  { id: "auhbon", title: "Name drop", icon: "📛", how: "Typed “auhbon”", hint: "Myself", category: "Typing", difficulty: 2, area: "site" },
  { id: "pho", title: "Pho real", icon: "🍜", how: "Typed “pho”", hint: "Noodles", category: "Typing", difficulty: 3, area: "site" },
  { id: "meeple", title: "Meeple people", icon: "🎲", how: "Typed “meeple”", hint: "Tabletop", category: "Typing", difficulty: 3, area: "site" },
  { id: "podbay", title: "Pod bay doors", icon: "🔴", how: "Asked Contact to open the pod bay doors", hint: "Odyssey", category: "Hidden", difficulty: 1, area: "site" },
  { id: "leaf", title: "Golden leaf", icon: "🍁", how: "Caught the rare golden leaf in the Nature theme", hint: "Gold", category: "Effects", difficulty: 2, area: "themes" },
  { id: "skeleton", title: "Possessed", icon: "💀", how: "Let the Cursed ghost possess the skeleton (hold still over it, or long-press it)", hint: "Bones", category: "Effects", difficulty: 3, area: "extras" },
  { id: "breakfast", title: "Breakfast of champions", icon: "🥣", how: "Cookie buttons, Cereal sounds and Fruit i-dots together", hint: "Cereal", category: "Combos", difficulty: 2, area: "effects" },
  { id: "hacker", title: "Hacker", icon: "💻", how: "Terminal theme with Electric buttons and the Sparkle trail", hint: "Phosphor", category: "Combos", difficulty: 2, area: "themes" },
  { id: "arcade", title: "Insert coin", icon: "🕹️", how: "Pico-8 theme with Rainbow buttons and the Slingshot", hint: "Retro", category: "Combos", difficulty: 2, area: "themes" },
  { id: "bigtop", title: "Big top", icon: "🎪", how: "Clown sounds, Rainbow buttons and Bubbles together", hint: "Circus", category: "Combos", difficulty: 2, area: "effects" },
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
  // THEMES (MP5): the Pho theme's bowl, the Pico-8 climber, and Flabby's mini game.
  { id: "auhbonsway", title: "Auhbon's way", icon: "🌶️", how: "Pho theme: topped the bowl with exactly 3 limes, all the jalapeños, and all the basil", hint: "Spicy", category: "Effects", difficulty: 3, area: "themes" },
  { id: "naturalist", title: "Naturalist", icon: "🌿", how: "Pho theme: slurped a whole bowl without adding a single topping", hint: "Plain", category: "Effects", difficulty: 2, area: "themes" },
  { id: "cleanbowl", title: "Clean bowl", icon: "🥢", how: "Pho theme: slurped a whole bowl you'd topped", hint: "Slurp", category: "Effects", difficulty: 1, area: "themes" },
  { id: "dazed", title: "Dazed and confused", icon: "💫", how: "Pico-8 theme: scrolled the little climber into the edge of the screen while he was climbing", hint: "Bonk", category: "Effects", difficulty: 2, area: "extras" },
  { id: "flabby", title: "Found Flabby", icon: "🐤", how: "Clicked the tiny Flabby beside his project's source code link in Selected work", hint: "Source", category: "Hidden", difficulty: 2, area: "games" },
  { id: "flap10", title: "Flap happy", icon: "🎈", how: "Scored 10 in Flabby", hint: "Ten", category: "Games", difficulty: 2, area: "games" },
  { id: "flap25", title: "Frequent flapper", icon: "🏅", how: "Scored 25 in Flabby", hint: "Drift", category: "Games", difficulty: 3, area: "games" },
  { id: "coward", title: "Coward", icon: "🏳️", how: "Quit Flabby mid-flight (he says so himself)", hint: "Quit", category: "Games", difficulty: 1, area: "games" },
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

/**
 * The long-term goal: 100 secrets. Fewer exist today (SECRET_LIST.length, "N"),
 * so every milestone and unlock threshold is written on the 100 scale and
 * scaled down to N (see scaledThreshold), which keeps them all reachable.
 */
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

/** How many secrets are live today (draft secrets never count). */
export const liveSecretCount = () => SECRET_LIST.length;

/**
 * A 100-scale threshold scaled down to `n` live secrets. Small values barely
 * move, far ones are pulled back much more, 100 becomes exactly n, and with
 * n = 100 every value is unchanged: f(m) = round(100·n·m / (100·n + m·(100 − n))).
 */
export function scaledThreshold(at: number, n: number = liveSecretCount()): number {
  if (at <= 0) return 0;
  if (n >= SECRET_GOAL) return Math.round(at);
  const v = Math.round((100 * n * at) / (100 * n + at * (100 - n)));
  return Math.max(1, Math.min(n, v));
}

/**
 * Every milestone with its scaled count (`count`), kept distinct and increasing:
 * scaled, then walked down from the top so each is at most the next minus one
 * (and at least 1). The last one is always n ("100%" becomes all live secrets).
 */
export function scaledMilestones(n: number = liveSecretCount()) {
  const counts = MILESTONES.map((m) => scaledThreshold(m.at, n));
  counts[counts.length - 1] = n;
  for (let i = counts.length - 2; i >= 0; i--) counts[i] = Math.max(1, Math.min(counts[i], counts[i + 1] - 1));
  return MILESTONES.map((m, i) => ({ ...m, count: counts[i] }));
}

/** How many places the goblin hides before he gives up. */
export const HIDE_SPOTS = 3;

/** The toggle at the top: Boring is the plain portfolio (the default), Fun is the playground. */
export type SiteMode = "boring" | "fun";

/** Cheats (behind my favorite number): unlock fun features without finding secrets. */
export type Cheats = { enabled: boolean; unlocked: string[] };

/** `hover` only applies to sound effects: whether hovering plays sounds. */
export type Effect = { on: boolean; variant: string; hover?: boolean };
export type FunState = {
  /** Fun or Boring. Boring hides every fun feature and secret, whatever the settings below say. */
  mode: SiteMode;
  /** Has the visitor ever switched to Fun? Until then, the goblin points at the toggle. */
  funSeen: boolean;
  on: boolean;
  effects: Record<Category, Effect>;
  look: Look;
  secrets: string[];
  /** Locked secrets whose hint icon the visitor chose to reveal. */
  peeked: string[];
  /** Locked secrets whose one-word hint the visitor asked for (after revealing the icon). */
  hinted: string[];
  /** Has the visitor ever opened Bells & whistles? (Kept for older saves; the goblin now goes by funSeen.) */
  welcomed: boolean;
  /** Which hiding place the goblin is in (HIDE_SPOTS once he's been found everywhere). */
  hideSpot: number;
  /** Milestones already celebrated, keyed by their 100-scale `at`. */
  celebrated: number[];
  /** Phones: tilt steers bubbles and aims the slingshot; a shake shuffles. Off by default (iOS asks permission). */
  motion: boolean;
  /** Phones that can vibrate: a light buzz on presses while Bells & whistles is on. */
  haptics: boolean;
  cheats: Cheats;
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

export const NO_CHEATS: Cheats = { enabled: false, unlocked: [] };

export const DEFAULT_FUN: FunState = {
  mode: "boring",
  funSeen: false,
  on: false,
  effects: ALL_OFF,
  look: "classic",
  secrets: [],
  peeked: [],
  hinted: [],
  welcomed: false,
  hideSpot: 0,
  celebrated: [],
  motion: false,
  haptics: true,
  cheats: NO_CHEATS,
};

/** Fun mode (whatever the effects are set to). */
export const isFunMode = (s: FunState) => s.mode === "fun";
/** Fun mode with at least one effect or theme on: the playground is actually running. */
export const funActive = (s: FunState) => s.mode === "fun" && s.on;

/*
 * Locks. The rules live in src/lib/unlocks.ts (which imports this file), so it
 * registers them here rather than this file importing it back. Until it does,
 * everything counts as unlocked.
 */
type LockCheck = (id: string, s: FunState) => boolean;
let lockCheck: LockCheck = () => true;
export function registerLockCheck(check: LockCheck) {
  lockCheck = check;
  if (cache) cache = withLocks(cache);
}
export const effectId = (c: Category, variant: string) => `effect:${c}:${variant}`;
export const themeId = (look: Look) => `theme:${look}`;
export const optionUnlocked = (c: Category, variant: string, s: FunState) => lockCheck(effectId(c, variant), s);
export const lookUnlocked = (look: Look, s: FunState) => look === "classic" || lockCheck(themeId(look), s);

/** A saved choice that's locked (secrets reset, cheats off) falls back to an unlocked one. */
function withLocks(s: FunState): FunState {
  let changed = false;
  const effects = { ...s.effects };
  for (const c of CATEGORIES) {
    const e = s.effects[c.id];
    if (optionUnlocked(c.id, e.variant, s)) continue;
    const fallback = c.options.find((o) => optionUnlocked(c.id, o.id, s)) ?? c.options[0];
    effects[c.id] = { ...e, variant: fallback.id };
    changed = true;
  }
  const look = lookUnlocked(s.look, s) ? s.look : "classic";
  if (look !== s.look) changed = true;
  return changed ? withSummary({ ...s, effects, look }) : s;
}

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

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

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
    const cheats = p.cheats && typeof p.cheats === "object" ? p.cheats : NO_CHEATS;
    return withLocks(
      withSummary({
        // No saved choice means Boring (older saves included).
        mode: p.mode === "fun" ? "fun" : "boring",
        funSeen: p.funSeen === true,
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
        cheats: { enabled: cheats.enabled === true, unlocked: strings(cheats.unlocked) },
      }),
    );
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
  const prev = getFun();
  const next = change(prev);
  if (next === prev) return;
  cache = withLocks(withSummary(next));
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Applied for this visit even if it can't be saved.
  }
  applyFunAttributes(cache);
  window.dispatchEvent(new Event(FUN_EVENT));
}

/**
 * Fun or Boring. The first switch to Fun also turns the default effects on (if
 * none were on), so the difference is obvious; after that, switching only shows
 * or hides whatever the visitor had. Never touches secrets, unlocks, milestones,
 * cheats or scores.
 */
export const setMode = (mode: SiteMode) =>
  updateFun((s) => {
    if (s.mode === mode) return s;
    if (mode === "fun" && !s.funSeen) {
      const anyOn = CATEGORIES.some((c) => s.effects[c.id].on);
      return { ...s, mode, funSeen: true, welcomed: true, effects: anyOn ? s.effects : ALL_ON };
    }
    return { ...s, mode };
  });

/**
 * The master switch. On: every effect on with its first option (look unchanged).
 * Off: every effect off and the look back to Classic, which is the clean site.
 */
export const setFunOn = (on: boolean) =>
  updateFun((s) => (on ? { ...s, effects: ALL_ON } : { ...s, effects: ALL_OFF, look: "classic" }));

/** One effect's switch. Touches nothing else. */
export const setEffectOn = (c: Category, on: boolean) =>
  updateFun((s) => ({ ...s, effects: { ...s.effects, [c]: { ...s.effects[c], on } } }));

/** Picking a style switches that one effect on. Touches nothing else. Locked styles are ignored. */
export const setVariant = (c: Category, variant: string) =>
  updateFun((s) => (optionUnlocked(c, variant, s) ? { ...s, effects: { ...s.effects, [c]: { ...s.effects[c], on: true, variant } } } : s));

/** The "hover sounds" sub-switch inside Sound effects. Touches nothing else. */
export const setSoundHover = (hover: boolean) =>
  updateFun((s) => ({ ...s, effects: { ...s.effects, sound: { ...s.effects.sound, hover } } }));

/** The "Motion controls" switch (phones). Touches nothing else. */
export const setMotion = (motion: boolean) => updateFun((s) => ({ ...s, motion }));

/** The "Haptics" switch (phones that can vibrate). Touches nothing else. */
export const setHaptics = (haptics: boolean) => updateFun((s) => ({ ...s, haptics }));

/** Picking a look (shown as "Theme" in the panel). Touches nothing else. Locked themes are ignored. */
export const setLook = (look: Look) => updateFun((s) => (lookUnlocked(look, s) ? { ...s, look } : s));

/** Fired after each shuffle (a secret counts them). */
export const SHUFFLE_EVENT = "portfolio:shuffle";

/** Everything on with random unlocked options; the look stays Classic. Returns the picks. */
export function shuffle() {
  const s = getFun();
  const effects = {} as Record<Category, Effect>;
  for (const c of CATEGORIES) {
    const open = c.options.filter((o) => optionUnlocked(c.id, o.id, s));
    const pool = open.length ? open : c.options.slice(0, 1);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    effects[c.id] = { on: true, variant: pick.id, ...(c.id === "sound" ? { hover: true } : {}) };
  }
  updateFun((st) => ({ ...st, effects, look: "classic" }));
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

/** The first time the visitor opens Bells & whistles. */
export const markWelcomed = () => updateFun((s) => (s.welcomed ? s : { ...s, welcomed: true }));

/** The goblin was found: he moves to the next hiding place. Returns the new spot. */
export function advanceHide() {
  updateFun((s) => ({ ...s, hideSpot: Math.min(HIDE_SPOTS, s.hideSpot + 1) }));
  return getFun().hideSpot;
}

/** The "Unlock all secrets" cheat: every secret marked found at once. */
export const unlockAllSecrets = () => updateFun((s) => ({ ...s, secrets: [...SECRETS] }));

/** Back to square one: secrets, peeks, hints, milestone parties and the goblin's hiding place. Cheats stay. */
export const resetSecrets = () => updateFun((s) => ({ ...s, secrets: [], peeked: [], hinted: [], celebrated: [], hideSpot: 0 }));

/** Cheats: switched on with my favorite number; off clears every cheat unlock (secrets stay as they are). */
export const setCheatsEnabled = (enabled: boolean) => updateFun((s) => ({ ...s, cheats: enabled ? { ...s.cheats, enabled: true } : NO_CHEATS }));

/** Unlock (or lock again) fun features by cheat. Only while cheats are on. */
export const setCheatUnlocked = (ids: string[], unlocked: boolean) =>
  updateFun((s) => {
    if (!s.cheats.enabled) return s;
    const rest = s.cheats.unlocked.filter((x) => !ids.includes(x));
    return { ...s, cheats: { enabled: true, unlocked: unlocked ? [...rest, ...ids] : rest } };
  });

/** Milestones reached (on today's scale) but not yet celebrated (normally zero or one). */
export function dueMilestones(s: FunState) {
  return scaledMilestones().filter((m) => s.secrets.length >= m.count && !s.celebrated.includes(m.at));
}
export const markCelebrated = (at: number) =>
  updateFun((s) => (s.celebrated.includes(at) ? s : { ...s, celebrated: [...s.celebrated, at] }));

/** Every combination secret the current settings unlock (usually none or one). Never in Boring mode. */
export function comboSecrets(s: FunState): Secret[] {
  if (!funActive(s)) return [];
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

/** Returns true the first time a secret is found. Secrets can't be found in Boring mode. */
export function findSecret(id: Secret): boolean {
  const s = getFun();
  if (!isFunMode(s) || s.secrets.includes(id)) return false;
  updateFun((st) => ({ ...st, secrets: [...st.secrets, id] }));
  return true;
}

/** Motion-heavy effects stay off for people who ask for less motion. */
export function blockedByMotion(c: Category, variant: string) {
  return prefersReducedMotion() && (c === "trail" || (c === "dots" && variant === "bubbles"));
}

/** The variant in use for a category, or null if that effect is off (always null in Boring mode). */
export function activeVariant(s: FunState, c: Category): string | null {
  const e = s.effects[c];
  if (!funActive(s) || !e.on || blockedByMotion(c, e.variant)) return null;
  return e.variant;
}

/** The theme in use: always Classic in Boring mode. */
export const lookActive = (s: FunState): Look => (funActive(s) ? s.look : "classic");

/** Mirrors the state onto <html> so CSS can respond without extra JavaScript. */
export function applyFunAttributes(s: FunState) {
  const d = document.documentElement.dataset;
  const set = (key: string, value: string | null | false) => {
    if (value) d[key] = value;
    else delete d[key];
  };
  set("mode", isFunMode(s) && "fun");
  set("fun", funActive(s) && "on");
  set("fxButtons", activeVariant(s, "buttons"));
  set("fxDots", activeVariant(s, "dots"));
  set("look", lookActive(s) !== "classic" && s.look);
}

/**
 * Inline, pre-hydration version of applyFunAttributes (keep the two in sync),
 * so the saved mode and look paint correctly on the first frame. No saved
 * choice (or Boring) sets nothing: the plain portfolio.
 */
export const funInitScript = `try{var f=JSON.parse(localStorage.getItem("${KEY}")||"null");if(f&&f.mode==="fun"){var d=document.documentElement.dataset;d.mode="fun";if(f.on===true){var e=f.effects||{};d.fun="on";var b=e.buttons;if(!b||b.on!==false)d.fxButtons=(b&&b.variant)||"rainbow";if(${JSON.stringify(LOOKS.map((l) => l.id).filter((id) => id !== "classic"))}.indexOf(f.look)>-1)d.look=f.look}}}catch(e){}`;
