/**
 * Hand-maintained data for the /dev working-notes pages (not linked from the
 * main site). Update this file each round and bump DEV_AS_OF. Implemented
 * secrets and version notes are NOT kept here: they come from SECRET_LIST in
 * src/lib/fun.ts and from CHANGELOG.md, so they can't drift.
 */

/** The date this file was last brought up to date (YYYY-MM-DD). */
export const DEV_AS_OF = "2026-11-10";

export type RoadmapStatus = "Shipped" | "Waiting on Auhbon" | "WIP" | "Planned" | "Skipped";

export type RoadmapItem = {
  item: string;
  status: RoadmapStatus;
  notes?: string;
  /** When set and the version is in CHANGELOG.md, the item links to its notes on /dev/versions. */
  version?: string;
};

export const roadmap: RoadmapItem[] = [
  {
    item: "1.15.0: Feedback fixes, round 3",
    version: "1.15.0",
    status: "Shipped",
    notes:
      "Chip always visible, goblin right of the badge, reactive electricity and centering fix, reset secrets, 137 confirm, clown G/D/B clicks, ghost pushed away, emoji compatibility.",
  },
  { item: "1.14.0: Game modes & leaderboards", version: "1.14.0", status: "Shipped" },
  { item: "1.13.0: Jungle sounds", version: "1.13.0", status: "Shipped" },
  { item: "1.12.0: The farm story", version: "1.12.0", status: "Shipped" },
  { item: "1.11.0: Secrets beside the badge", version: "1.11.0", status: "Shipped" },
  { item: "1.10.0: Goblin guide, hide-and-seek & milestones", version: "1.10.0", status: "Shipped" },
  { item: "1.9.0: Feedback fixes", version: "1.9.0", status: "Shipped" },
  { item: "1.8.1: Content fixes", version: "1.8.1", status: "Shipped" },
  { item: "1.16.0: Farm adventure & cooking secrets", version: "1.16.0", status: "Shipped", notes: "16 endings, 3 special; 5 new secrets (17 total)." },
  { item: "1.17.0: These /dev pages", version: "1.17.0", status: "Shipped" },
  { item: "1.17.1: CV sync", version: "1.17.1", status: "Shipped" },
  { item: "1.18.0: CV & About me downloads", version: "1.18.0", status: "Shipped" },
  { item: "1.18.1: Roomier intro", version: "1.18.1", status: "Shipped" },
  { item: "1.22.0: Effects, polish & phone fixes", version: "1.22.0", status: "Shipped", notes: "Car trail, Chiptune and Tabletop sounds, hamster i-dots, quieter goblin, smoother cursed click, Electric and Cookie fixes on phones." },
  { item: "1.21.0: Draft sandbox & visuals", version: "1.21.0", status: "Shipped", notes: "/dev/draft, /dev/draft/diff and /dev/visuals. Draft features stay off the live site." },
  { item: "1.20.0: Secrets batch", version: "1.20.0", status: "Shipped", notes: "18 new secrets (35 total), badge hints, new milestones, touch gamepad." },
  { item: "1.19.0: Mobile experience", version: "1.19.0", status: "Shipped", notes: "All seven mobile ideas below, now live." },
  { item: "Copy editing", status: "Waiting on Auhbon", notes: "60 suggestions awaiting approval (re-checked against the CV on Nov 10)." },
  { item: "Global leaderboards", status: "Waiting on Auhbon", notes: "Needs Upstash Redis connected in Vercel." },
  {
    item: "Version URLs",
    status: "Shipped",
    notes: "Resolved as /dev/versions (every version's notes plus branch links) instead of hosting every old build.",
  },
  { item: "More effects, options and categories (#11)", status: "WIP" },
  { item: "100 secrets", status: "WIP" },
  { item: "More secrets", status: "WIP" },
  { item: "GitHub activity graph", status: "Planned" },
  { item: "Outcome numbers in the copy", status: "Planned" },
  {
    item: "Recorded sounds and clown laughter",
    status: "Skipped",
    notes: "Laughter doesn't synthesize well, and the site ships no audio files.",
  },
];

/** Shipped in 1.19.0. */
export const mobileIdeas: string[] = [
  "Bottom-sheet Bells & whistles panel",
  "One-row header with icon-only buttons",
  "Long-press as “hold still”",
  "Tilt controls for slingshot and bubbles (iOS asks permission)",
  "Haptics on Android",
  "Shake to shuffle, and swipe the name to fling letters",
  "Touch-first game controls (bigger Asteroids buttons, tap-to-thrust)",
];

export type TaskType = "decide" | "do";
export type TaskStatus = "To do" | "WIP" | "Done";

export type HandsOnTask = {
  task: string;
  type: TaskType;
  status: TaskStatus;
  details?: string;
};

export const handsOnTasks: HandsOnTask[] = [
  { task: "Review copy edits", type: "decide", status: "To do", details: "60 suggestions in the Copy Review doc, including 20 against the CV." },
  { task: "Connect GitHub Desktop", type: "do", status: "To do", details: "Clone auhbz/auhbon.com." },
  { task: "Pin the overview issue (#185) on GitHub", type: "do", status: "To do" },
  { task: "Pick which /dev/draft features go live", type: "decide", status: "To do", details: "Also: a nudge for Hot dice? Flabby outside Pico-8?" },
  { task: "Finish the typing-secret words list", type: "decide", status: "To do", details: "Live now: auhbon, pho, meeple. Issue #154." },
  { task: "Original Celeste-style climber instead of Celeste's character?", type: "decide", status: "To do", details: "Issue #174." },
  {
    task: "Turn on global leaderboards",
    type: "do",
    status: "To do",
    details: "Vercel → Storage → Upstash for Redis → connect to auhbon-com → redeploy.",
  },
  { task: "Keep or revert the trophy chip location", type: "decide", status: "To do" },
  { task: "Send the list of new effects (#11)", type: "decide", status: "To do" },
  {
    task: "Send outcome numbers",
    type: "do",
    status: "To do",
    details: "MGM, Groomer.io, EstateDiamondJewelry (Copy Review S9, S10).",
  },
  { task: "Try the mobile preview and approve it", type: "decide", status: "Done", details: "Shipped as 1.19.0." },
  { task: "Add the BeeSafe and Off-Top slideshows to the site?", type: "decide", status: "To do" },
  { task: "Remove the old resume from LinkedIn Featured", type: "do", status: "Done", details: "Verified Nov 10." },
  {
    task: "Update the resume and portfolio PDFs on LinkedIn",
    type: "do",
    status: "To do",
    details: "After copy approval.",
  },
  {
    task: "Update the GitHub profile",
    type: "do",
    status: "To do",
    details: "Bio and website are done; name and pins after copy approval.",
  },
  { task: "www.auhbon.com redirect", type: "do", status: "Done", details: "Nov 1." },
  { task: "Fix the “TypeScrpt” repo typo", type: "do", status: "Done" },
  { task: "BeeSafe: LA Hacks vs Cloud Jam", type: "decide", status: "Done", details: "Fine as is." },
  { task: "Remove the storefront line from LinkedIn About", type: "do", status: "Done" },
  { task: "Hide the “me” repo", type: "do", status: "Done" },
  { task: "Space Panic video link", type: "do", status: "Done" },
];

export type SecretIdea = { title: string; how: string };

/** Not built yet. Implemented secrets come from SECRET_LIST in src/lib/fun.ts. */
export const roughSecretIdeas: SecretIdea[] = [
  { title: "Roll the dice", how: "A board game or dice secret" },
  { title: "Superuser hint", how: "Show a sudo hint once Keyboard warrior is found" },
];
