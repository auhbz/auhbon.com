/**
 * The Review page (/dev/review): the one list to work through before sending
 * the next Major Push. Everything that needs Auhbon's eyes, a decision, or his
 * hands lives here, sorted by when it matters. Rewritten at the end of each MP.
 */

export const REVIEW_MP = "MP6";
export const REVIEW_AS_OF = "2026-11-13";
export const PREVIEW_URL = "https://preview.auhbon.com";

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
    title: "Now: MP6 release and preview",
    intro: "Quick or important. Work top to bottom; tick things off in your MP6 notes as you go.",
    items: [
      {
        id: "mp6-release",
        title: "MP6 selective release",
        kind: "review",
        area: "Site",
        effort: "10 min",
        summary: "Try the small fixes and see where each feature is available.",
        details: [
          "Board games is available in the main Theme picker. Try Push your luck, Pig, and Free roll.",
          "Pho has five lime wedges, 17 jalapeños, seven bean sprouts, and seven basil. Auhbon’s Way uses three limes, all the jalapeños and basil, and no sprouts.",
          "The typing prompt points toward word secrets, the Pico-8 climber moves a little faster, and portal panels use their colored outlines without adding words.",
          "Toy box, Gravity, Car, and their dependent secrets are held for preview. Monkey Mode keeps its approved behavior.",
        ],
        links: [{ label: "Public, Preview, and Draft inventory", href: p("/dev/environments") }],
      },
      {
        id: "mp6-preview",
        title: "Preview fixes and new secrets",
        kind: "review",
        area: "Site",
        effort: "10 min",
        summary: "Try the features held for preview, plus the new secrets and dev controls.",
        details: [
          "Gravity: Drop more several times, including with a long paragraph in view. Try Put everything back and switching to Boring while pieces are still down.",
          "Car: reverse direction quickly, then hold the pointer still. Check continuous movement and gentler turns.",
          "Toy box: the next locked toy has a readable silhouette and unlock hint. Later toys are blurred. The toys themselves are still awaiting review.",
          "Visit a dev page in Fun mode and try the all-toppings Pho recipe. In /dev/secrets, check that spoiler notes start closed and Reveal all works.",
          "Nature: cut grass at the bottom of the page. Its glimmers go into the same balance as pot glimmers. Spending is future work.",
        ],
        links: [{ label: "Preview", href: PREVIEW_URL }, { label: "Secrets", href: p("/dev/secrets") }],
      },
      {
        id: "mp6-draft",
        title: "Draft experiments to review",
        kind: "review",
        area: "Site",
        effort: "30 min",
        summary: "Review Knucklebones, the Monkey Mode frenzy, and celebration options.",
        details: [
          "Board games: finish Pig and Push your luck, confirm Free roll gives no draft secrets, and play Knucklebones against the lamb. Try finishing and winning.",
          "Monkey Mode: try the bowling ball and gorilla. Look for extra bananas and monkeys, fights, the pile-on, and the eruption. The public version keeps the MP5 behavior.",
          "Replay Disco floor, Confetti storm, and Dancing suns at the bottom of Draft. Pick what to keep and in what order. Try the doubled finale as well.",
          "The rejected I love list is gone from the preview Draft. Visuals is listed under Dev, where it already ships.",
        ],
        links: [{ label: "Preview Draft", href: p("/dev/draft") }, { label: "Environment inventory", href: p("/dev/environments") }],
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
          "The site’s CV and About me PDFs are already live. The Oxford-comma pass is in a separate Cover Letter Bank copy.",
          "The tutoring resume still needs your decision on the portfolio link.",
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
