/**
 * The draft playground (/dev/draft): what's being tried out before it goes
 * live. /dev/draft/diff is generated from DRAFT_FEATURES, so this list is the
 * single source of truth for "how is the draft different from the live site?".
 * Update it whenever a draft feature is added, changed, shipped or dropped.
 */

export type DraftStatus = "idea" | "testing" | "ready";

export type DraftFeature = {
  id: string;
  feature: string;
  /** Where it shows up on /dev/draft. */
  where: string;
  status: DraftStatus;
  notes?: string;
};

export const DRAFT_AS_OF = "2026-11-11";

export const DRAFT_FEATURES: DraftFeature[] = [
  {
    id: "banner",
    feature: "Draft banner",
    where: "Top of /dev/draft",
    status: "testing",
    notes: "Says it's a playground, links to the live site and to this page. Draft-only by design; never ships.",
  },
  {
    id: "panel",
    feature: "Draft section in Bells & whistles",
    where: "Bells & whistles panel, only on /dev/draft",
    status: "testing",
    notes: "Each draft option carries a small “draft” tag. Draft secrets are tracked separately and never count toward the live total, milestones, or mini games.",
  },
  {
    id: "chaos",
    feature: "Chaos: Unleash the monkeys",
    where: "New “Chaos” category in the panel; a dock at the bottom left",
    status: "testing",
    notes: "Monkeys multiply and steal pills, tags and headings; tap one to bonk it and get the item back. Banana crate (drag and throw), a gorilla behind emergency glass (4 hits), and a peanut-and-banana hammer that knocks the crate over. Calm version with reduced motion; at most 12 monkeys.",
  },
  {
    id: "boardgames",
    feature: "Board games theme",
    where: "Theme picker, draft section",
    status: "testing",
    notes:
      "Felt and walnut palette, a game-board track between sections, and pawn bullets. In the hero, a felt dice tray with physics (drag a die and let go to throw it; dice bounce off the rim and each other, tumble, and settle) and a switcher between three dice games: Push your luck (get close to a limit without going over; spend a die to reroll others), Pig against the house (first to 50), and Free roll. Draft secrets: Bullseye, Waste not, Hog wild, Snake eyes, and Hot dice. Reduced motion: throws settle at once.",
  },
  {
    id: "portal",
    feature: "Portal device and three test chambers",
    where: "Device hidden in Education; panels across the page",
    status: "testing",
    notes: "Pick up the device, then place orange and blue portals on panels. Chambers: return a lost word, drop a rock on a target, and deliver the cake.",
  },
  {
    id: "loves",
    feature: "“I ❤️” list",
    where: "New section after Contact",
    status: "ready",
    notes: "Every line a little longer than the one above. Screen readers get a plain list.",
  },
  {
    id: "visuals",
    feature: "/dev/visuals",
    where: "Dev notes",
    status: "ready",
    notes: "Farm story tree, site architecture, releases and the effects catalog. Dev-only, so nothing to ship to the home page.",
  },
];

/**
 * The "I ❤️" list as a staircase: each line is a little longer than the one
 * above (checked by qa/draft.mjs). Every item from Auhbon's list appears once.
 */
export const LOVES: string[][] = [
  ["cats"],
  ["goats"],
  ["plants"],
  ["pickles"],
  ["raccoons"],
  ["cucumbers"],
  ["spicy food"],
  ["blueberries"],
  ["Anime-Planet"],
  ["Steam & Valve"],
  ["Arnold Palmers"],
  ["beans", "popcorn"],
  ["making playlists"],
  ["Muay Thai", "music"],
  ["fresh herbs", "yoga"],
  ["hosting game nights"],
  ["teaching board games"],
  ["The Lord of the Rings"],
  ["logic and word puzzles"],
  ["philosophy", "psychology"],
  ["weird little indie games"],
  ["mathematics", "game design"],
  ["humor", "making people laugh"],
  ["hikes", "running", "bouldering"],
  ["inventorying", "helping people"],
  ["writing poetry", "books", "koans"],
  ["cold weather", "playing in grass"],
  ["meeting people", "friends & family"],
  ["Love on the Spectrum", "Nicolas Cage"],
  ["dogs", "kiwis", "eating pho", "volleyball"],
  ["Nintendo", "animation", "Survivor", "cowboys"],
  ["singing", "physics", "Letterboxd", "petrichor"],
];

export const LOVE_SEPARATOR = " · ";
