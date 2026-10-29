/**
 * Single source of truth for the site's content.
 * Edit this file to update the portfolio; components only render what's here.
 *
 * Sources: Auhbon's current resume (Oct 2026), his "portfolio content" document,
 * and his LinkedIn profile. Optional fields left empty are hidden on the site.
 */

export type Link = { label: string; href: string };

export type Project = {
  name: string;
  /** One or two sentences: what it is and who it's for. */
  summary: string;
  /** What Auhbon specifically did on it. */
  role?: string;
  stack: string[];
  status: "Live" | "Shipped" | "In progress" | "In design";
  /** Awards, events or context worth calling out. */
  recognition?: string;
  links?: Link[];
  /** Featured projects get the full treatment; the rest go in a compact list. */
  featured: boolean;
};

export type Role = {
  title: string;
  org: string;
  location?: string;
  /** ISO month strings, e.g. "2021-12". `end` omitted means "present". */
  start: string;
  end?: string;
  highlights?: string[];
};

export type Education = {
  school: string;
  degree?: string;
  start: string;
  end: string;
  notes?: string[];
};

export const profile = {
  name: "Auhbon Amiri",
  role: "Software engineer",
  location: "Los Angeles, California",
  domain: "auhbon.com",
  siteUrl: "https://auhbon.com",
  githubUser: "auhbz",
  intro:
    "I build web products end to end: Java and Spring backends, REST APIs, cloud deployments, and TypeScript front ends. I've shipped the scheduling system at the core of a startup's app, backend services at MGM Resorts, and an award-winning Flutter app. AI is part of how I work: I use Claude Code to scaffold, refactor and test faster, and I own the design and review every line.",
  /** Shown as the primary contact link. Already public on Auhbon's resume. */
  email: "auhbon@gmail.com" as string,
  links: [
    { label: "GitHub", href: "https://github.com/auhbz" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/auhbon" },
  ] satisfies Link[],
};

export const projects: Project[] = [
  {
    name: "DomDom",
    summary: "Online storefront for a hair-products company, built on a Shopify integration.",
    role: "Contributed to the front end: I set up the Next.js and TypeScript project, broke the work into tickets, and shipped a couple of them. A collaborator owns the Python API.",
    stack: ["Next.js", "TypeScript", "Shopify", "Python"],
    status: "In progress",
    featured: true,
  },
  {
    name: "BeeSafe",
    summary: "A Flutter app built on Google Cloud Vision for the Build for COVID-19 challenge.",
    role: "Team project. I built with Flutter and learned Google Cloud Vision along the way.",
    stack: ["Flutter", "Google Cloud Vision"],
    status: "Shipped",
    recognition: "Grand prize, CSUN Cloud Jam",
    links: [
      { label: "Project overview", href: "https://buildforcovid19.io/beesafe/" },
      { label: "Demo video", href: "https://youtu.be/1iCwulnJjKo" },
    ],
    featured: true,
  },
  {
    name: "Space Panic",
    summary:
      "A frantic real-time co-op browser game about teamwork and communication, built under game-jam time pressure.",
    role: "Team project for the Hack the Midlands 2020 game jam.",
    stack: ["JavaScript", "Phaser"],
    status: "Live",
    recognition: "Hack the Midlands 2020 entry",
    links: [
      { label: "Play it", href: "https://mac15001900.github.io/powerPanic/" },
      { label: "Source code", href: "https://github.com/Mac15001900/powerPanic" },
      { label: "Demo video", href: "https://youtu.be/qkYqH_80lNI" },
    ],
    featured: true,
  },
  {
    name: "Off-Top",
    summary: "A real-time productivity mobile app that helps people stay on topic.",
    role: "CSUN senior design project. I worked mainly in Flutter; the project also used Java.",
    stack: ["Flutter", "Java"],
    status: "Shipped",
    links: [{ label: "Demo video", href: "https://www.youtube.com/watch?v=aIdvYbYuoE4" }],
    featured: true,
  },
  {
    name: "auhbon.com",
    summary:
      "This site. A portfolio that pulls my latest GitHub work in automatically, built to WCAG 2.2 AA with a strict security-header setup.",
    role: "Designed and built it with Claude Code as a pair programmer: I set the architecture, accessibility and security requirements, and verified the result with automated axe-core audits and a CI pipeline that lints, type-checks and builds every change.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Vercel"],
    status: "Live",
    links: [{ label: "Source code", href: "https://github.com/auhbz/auhbon.com" }],
    featured: true,
  },
  {
    name: "PokéPulse Analytics",
    summary:
      "Market analytics for the Pokémon Trading Card Game: price history, a daily movers dashboard, and breakout signals.",
    stack: ["FastAPI", "React", "TypeScript", "PostgreSQL"],
    status: "In design",
    featured: false,
  },
  {
    name: "Discord Motivator Bot",
    summary: "A Discord bot that watches conversation and responds with encouragement when it's needed.",
    stack: ["Python"],
    status: "Shipped",
    links: [{ label: "Source code", href: "https://github.com/auhbz/MotivatorDiscordBot" }],
    featured: false,
  },
  {
    name: "Flabby",
    summary: "A helicopter-cave game in the spirit of Flappy Bird. Code, art, animation and sound all made by me.",
    stack: ["Pico-8", "Lua"],
    status: "Live",
    links: [{ label: "Play it", href: "https://auhbz.github.io/flabbby/" }],
    featured: false,
  },
];

/** Technologies offered as one-click project filters (in this order). */
export const projectFilters = ["TypeScript", "JavaScript", "Java", "Python", "Flutter", "Next.js", "React"];

export const experience: Role[] = [
  {
    title: "Website Manager",
    org: "EstateDiamondJewelry.com",
    start: "2022-08",
    highlights: [
      "Built a diamond price calculator with JavaScript and Google Cloud pipelines",
      "Maintain the WordPress site, extending it with plugins and custom code integrations",
      "Publish in-depth, research-based articles and product guides",
      "Work remotely and independently, coordinating across the business",
    ],
  },
  {
    title: "Backend Software Engineer",
    org: "MGM Resorts International",
    start: "2021-12",
    end: "2022-06",
    highlights: [
      "Developed and maintained Java-based backend services and REST APIs",
      "Tested and validated services with JUnit and Postman",
      "Streamlined deployments using Azure Pipelines",
      "Ran performance testing with JMeter",
    ],
  },
  {
    title: "Tutor and grader: combinatorial algorithms, discrete structures, automata",
    org: "California State University, Northridge",
    start: "2019-10",
    end: "2020-05",
  },
  {
    title: "Full Stack Software Engineer",
    org: "Groomer.io",
    location: "Westlake Village, California",
    start: "2018-04",
    end: "2020-03",
    highlights: [
      "Owned core functionality, including the scheduling and availability system used throughout the app",
      "Built and maintained backend features with Laravel and SQL",
      "Built the customer-facing web app with Vue.js and Vuex",
      "Wrote unit and integration tests using a test-driven approach",
      "Shipped 180+ features and bug fixes in an Agile team",
    ],
  },
];

export const education: Education[] = [
  {
    school: "California State University, Northridge",
    degree: "B.S. Computer Science",
    start: "2018",
    end: "2020",
    notes: [
      "Magna Cum Laude, 3.91 GPA",
      "Dean's List four times",
      "Grand prize winner, CSUN Cloud Jam",
      "Layer8 Cyber Security Club",
    ],
  },
];

/** Grouped so the page reads as a skill map, not a keyword dump. */
export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["Java", "JavaScript", "TypeScript", "Python", "SQL", "PHP"] },
  { group: "Backend", items: ["Spring Boot", "REST APIs", "Laravel", "Maven"] },
  { group: "Front end and mobile", items: ["Next.js", "React", "Vue.js", "Flutter"] },
  { group: "Cloud and data", items: ["Azure", "Docker", "Linux", "PostgreSQL", "MySQL", "Google Cloud"] },
  { group: "AI-assisted development", items: ["Claude Code", "agentic coding workflows", "AI-assisted testing and refactoring"] },
  { group: "Testing and tools", items: ["JUnit", "Postman", "JMeter", "Git"] },
];
