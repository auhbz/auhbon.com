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

export const DRAFT_AS_OF = "2026-11-13";

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
    id: "boardgames",
    feature: "Board games theme",
    where: "Theme picker, draft section",
    status: "testing",
    notes: "The public version has the original three games. Draft adds Knucklebones, instructions for Pig, and secrets for finishing games. Free roll earns no draft secrets.",
  },
  {
    id: "monkey-frenzy",
    feature: "Monkey Mode frenzy",
    where: "Wild & Wondrous on Preview Draft",
    status: "testing",
    notes: "More bananas and monkeys, more contested bananas, a gorilla pile-on, and a subtler bowling ball hint.",
  },
  {
    id: "celebrations",
    feature: "Celebration ideas",
    where: "Bottom of Preview Draft",
    status: "testing",
    notes: "Try Disco floor, Confetti storm, and Dancing suns before choosing milestone order.",
  },
];
