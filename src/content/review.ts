/**
 * The Review page (/dev/review): the one list to work through before sending
 * the next Major Push. Everything that needs Auhbon's eyes, a decision, or his
 * hands lives here, sorted by when it matters. Rewritten at the end of each MP.
 */

export const REVIEW_MP = "MP5";
export const REVIEW_AS_OF = "2026-11-12";
export const PREVIEW_URL = "https://auhbon-com-git-next-auhbon-3857.vercel.app";

export type ReviewKind = "review" | "decide" | "do";
export type ReviewArea = "Site" | "Copy" | "Accounts" | "Workflow" | "Career";
export type Effort = "2 min" | "10 min" | "30 min" | "1 hr+";

export type ReviewItem = {
  id: string;
  title: string;
  kind: ReviewKind;
  area: ReviewArea;
  effort: Effort;
  /** One line shown collapsed. */
  summary: string;
  /** Shown when expanded. Each string is a bullet. */
  details?: string[];
  /** My recommendation, when it's a decision. */
  recommend?: string;
  links?: { label: string; href: string }[];
};

export type ReviewTier = { id: string; title: string; intro: string; items: ReviewItem[] };

const p = (path: string) => `${PREVIEW_URL}${path}`;

export const REVIEW: ReviewTier[] = [
  {
    id: "now",
    title: "Now: before you send MP6",
    intro: "Quick or important. Work top to bottom; tick things off in your MP6 notes as you go.",
    items: [
      {
        id: "preview",
        title: "Try the MP5 preview",
        kind: "review",
        area: "Site",
        effort: "30 min",
        summary: "Everything new in MP5 is on the preview site, not the public one. Click through it in Boring and in Fun.",
        details: [
          "Boring is the default now: does it read as a clean, professional portfolio? The goblin should point at the toggle.",
          "Switch to Fun: burst, the Bells & whistles button and secrets chip arrive. Switching back never loses secrets or scores.",
          "Locks: most effects and themes start locked and open within about 7 secrets. Mini games open one at a time (3, 5, and 8 secrets today).",
          "Cheats: type 137 on the numpad. 'Unlock everything', 'Unlock all secrets', and a switch for every unlockable.",
          "Progress bar: solid to 35 (all live secrets today), hatched 'coming soon' to 100.",
          "Effects: easier hamster breakaway (and no cursor effects on the wheel), smooth car donuts, higher and more centered bubbles that drift in your cursor's breeze, a rare giant bubble that splits.",
          "Celebrations: new Fireworks at milestone 2 (rockets, six shell types), a Lantern festival at milestone 3, and a parade with only full-body animals.",
          "Pho theme: side plates of limes, basil, bean sprouts, and jalapeños; top your bowl.",
          "Pico-8 theme: the climber is now Flabby and climbs the page; scroll him into the screen edge to daze him.",
          "Flabby: a tiny Flabby sits by his 'Source code' link in Selected work. Clicking him unlocks the Flabby mini game (now harder, with drifting pipes after 20).",
          "Wild & Wondrous: Monkey Mode (steals words and headings, vines, variable speeds, bowling ball, a gorilla who goes bananas) and the new Gravity Mode.",
          "Toy box: paint brush, sticky notes, paper airplane, and smoke bombs. Portal gun is now an unlockable extra you can hide.",
          "Dev pages: /dev/secrets (hints, notes, areas, draft secrets, unlockables), /dev/goals, and /dev/milestones (the slider).",
        ],
        links: [
          { label: "Preview site", href: PREVIEW_URL },
          { label: "Milestone slider", href: p("/dev/milestones") },
          { label: "Secrets and unlockables", href: p("/dev/secrets") },
          { label: "Goals", href: p("/dev/goals") },
        ],
      },
      {
        id: "ship",
        title: "Approve MP5 for the public site",
        kind: "decide",
        area: "Site",
        effort: "2 min",
        summary: "When the preview looks right, merge the 'MP5 → live' pull request (or tell me what to change first).",
        details: [
          "One click on GitHub: open the pull request, press 'Merge pull request'. Vercel publishes it within a couple of minutes.",
          "Partial approval works too: say 'ship everything except X' and I'll hold X back.",
        ],
        recommend: "Ship Boring-by-default soon even if some fun parts need another pass: it's what recruiters see first.",
        links: [{ label: "Pull requests", href: "https://github.com/auhbz/auhbon.com/pulls" }],
      },
      {
        id: "copy-discuss",
        title: "Four copy items you marked Discuss",
        kind: "decide",
        area: "Copy",
        effort: "10 min",
        summary: "C1, C2, R0, and R3 in the Copy Review doc. Everything else you approved is done.",
        details: [
          "C1 + S5 (Off-Top stack): the CV and your off-top-python repo say Python/Flask was part of it. If true, I'll write 'with a Java and Python/Flask back end' on the site.",
          "C2 (Groomer.io lead bullet): CV says 'Designed and built the availability calculator, the scheduling logic used throughout the app'; site and LinkedIn say 'Owned core functionality…'. The CV line says what you built.",
          "R0 (rebuild the one-page resume from the CV): the new 'Software Engineer Resume (Nov 2026)' already has every approved fix. A rebuild would mainly redo the summary and add MGM's Cosmos DB and on-call bullets.",
          "R3 (dashes): the SE resume mixes 'Aug 2022 - Present' with en dashes elsewhere. Purely cosmetic.",
        ],
        recommend: "C1: yes if accurate. C2: use the CV line. R0: not now; the updated resume is good enough to send. R3: yes, en dashes.",
        links: [{ label: "Copy Review doc", href: "https://claude.ai/artifact/BZXU16MWzG9mzmr9kkDtm5" }],
      },
      {
        id: "linkedin",
        title: "LinkedIn updates (paste-ready)",
        kind: "do",
        area: "Accounts",
        effort: "10 min",
        summary: "Cheaper for you to paste than for me to click through. Every line below is approved copy.",
        details: [
          "Website Manager, EstateDiamondJewelry.com: replace the bullets with: Built a diamond price calculator in JavaScript, backed by Google Cloud pipelines. / Maintain the WordPress site, extending it with plugins and custom code integrations. / Write and publish research-based articles and buying guides (diamond cuts, grading, and pricing), plus gift-guide content for the business and a partner site. / Work independently and remotely, coordinating content and site changes directly with the owner.",
          "Groomer.io: change the 'one of two engineers' line to: One of two engineers on the team: developed the iOS app in Objective-C (MVVM) and the backend in Laravel and MySQL. Change the 180+ line to: Shipped 180+ features and fixes in an Agile team.",
          "Photo Fun Moments: add at the top: Kept a fun, welcoming atmosphere at parties and events, engaging guests and hosts and keeping people coming back to the booth all night. / Troubleshot cameras, printers, laptops, and booth software on site, keeping the booth running through live events.",
          "Education (CSUN): change 'Dean's list' to 'Dean's List every semester'. Activities: GE Honors; A in every computer science course; Layer8 Cyber Security Club, Rock Climbing Club, and intramural sports.",
          "About: change 'closed more than 180 features and fixes' to 'shipped 180+ features and fixes'; add Oxford commas where lists end in 'and'; end with: Portfolio: auhbon.com",
          "Contact info: Website → https://auhbon.com (type: Portfolio).",
          "Featured: Add → Link → https://auhbon.com, then drag it to the front.",
          "Projects: add BeeSafe (CSUN Cloud Jam 2020 grand prize; Flutter, Google Cloud Vision, Firebase, Flask), Power Panic (Hack the Midlands 2020 game jam; JavaScript, Phaser), and auhbon.com (Next.js, TypeScript, Tailwind CSS, Vercel; built with Claude Code to WCAG 2.2 AA). Link each to its page on auhbon.com or its demo.",
          "Open to Work: on, 'Recruiters only', with your job titles and Los Angeles / hybrid, on-site, or remote.",
        ],
      },
      {
        id: "docs",
        title: "Check the new resume and CV files",
        kind: "review",
        area: "Copy",
        effort: "10 min",
        summary: "New copies sit next to the originals in your Drive folder; nothing was overwritten.",
        details: [
          "Auhbon Amiri – Software Engineer Resume (Nov 2026): R1, R2, R4, R5, R7, R8 applied; still one page.",
          "Auhbon Amiri – Tutoring Resume (Nov 2026): T1, T2, T3 applied; still one page. I trimmed 'Programming & Computer Science' from coursework and shortened 'Grand Prize Winner' to 'Winner' to keep it on one page.",
          "Auhbon Amiri – CV (Nov 2026, rev 2) and CV, private master (rev 2): C3, C11, C16, S12, and Oxford commas.",
          "Auhbon Amiri – About Me (Nov 2026, rev 2): C3 and Oxford commas.",
          "The site's CV and About me PDFs (and their Claude Docs employer copies) are updated and live.",
          "Not touched: the Cover Letter Bank (no approved edits). The tutoring resume's header still links your old 'portfolio content' doc: swap it for auhbon.com?",
        ],
      },
      {
        id: "builder-calls",
        title: "Small calls the builders left for you",
        kind: "decide",
        area: "Site",
        effort: "10 min",
        summary: "None block anything; defaults are already in place.",
        details: [
          "/dev/secrets now shows every 'how it's found' note openly (used to be behind 'Show how'). Keep or hide?",
          "Should /dev/draft open in Fun mode by default?",
          "Should the phone gamepad (for the Konami code) show in Boring mode? (Currently no.)",
          "Pho unlocks at 9 secrets, just past the 'all themes by ~8' rule. Move it to 8?",
          "Glimmers from the clay pots: spendable on something later, or just a counter?",
          "Your mini game secrets note was cut off after 'another should be for an impressive score ()'. I made the third one a quirky skill secret per game (e.g. Pacifist in Asteroids). OK?",
          "Board games (still draft): now has dice physics and a game switcher (Push your luck, Pig, Free roll). Promote, or another pass?",
          "Known issue for MP6 (not yet fixed): the effects test suite logged one React hydration warning (#418) after the final merge. Pages work, but it should be tracked down before shipping.",
        ],
      },
      {
        id: "slideshows",
        title: "BeeSafe and Off-Top slideshows (clarified)",
        kind: "decide",
        area: "Site",
        effort: "2 min",
        summary: "You have presentation decks for both projects. Want them linked (or embedded) on their project cards?",
        recommend: "Link them as 'Slides' next to Demo and Source code; skip embedding.",
      },
    ],
  },
  {
    id: "soon",
    title: "Soon: the next few days",
    intro: "Worth doing this week, outside the site.",
    items: [
      {
        id: "referrals",
        title: "Apply to the referral links from your cousin",
        kind: "do",
        area: "Career",
        effort: "1 hr+",
        summary: "The site is presentable in Boring mode; it's good enough to point people to now.",
        details: [
          "Pick the two best-fitting links and send just those first. Done beats perfect.",
          "Use 'Software Engineer Resume (Nov 2026)'.",
        ],
      },
      {
        id: "weekly-rhythm",
        title: "Try a weekly round-robin",
        kind: "decide",
        area: "Workflow",
        effort: "10 min",
        summary: "Job applications first each day, then site or project work. See my MP5 reply for a sample week.",
      },
      {
        id: "workflow",
        title: "Confirm the MP workflow",
        kind: "decide",
        area: "Workflow",
        effort: "2 min",
        summary: "MP changes go to the preview, you approve, then the PR is merged. This page replaces Hands-on tasks.",
        recommend: "Adopt it; it's already set up.",
      },
    ],
  },
  {
    id: "later",
    title: "Ongoing: chip away over many MPs",
    intro: "Long-term goals; progress is tracked on /dev/goals.",
    items: [
      {
        id: "goals",
        title: "Grow the fun features",
        kind: "do",
        area: "Site",
        effort: "1 hr+",
        summary: "Goals: 100 secrets, 40 effect options, 12 themes, 8 mini games, 6 Wild & Wondrous modes, and 12 toys.",
        details: [
          "Secret ideas to approve or reject are on /dev/secrets, including several near-gimmes.",
          "Your #11 effects list: send new ideas any time; they'll be batched into future MPs.",
        ],
        links: [{ label: "Goals", href: p("/dev/goals") }],
      },
      {
        id: "i-love",
        title: "The 'I love' list",
        kind: "decide",
        area: "Site",
        effort: "10 min",
        summary: "You said it feels out of place and you'd circle back. It stays in draft until then.",
      },
      {
        id: "job-hunter",
        title: "ChatGPT job-hunter project",
        kind: "do",
        area: "Career",
        effort: "1 hr+",
        summary: "Set up after the referral applications are out, not before.",
      },
    ],
  },
];
