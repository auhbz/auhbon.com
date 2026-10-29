/**
 * Single source of truth for the site's content.
 * Edit this file to update the portfolio; components only render what's here.
 *
 * Anything marked TODO is a gap only Auhbon can fill — the site hides empty
 * optional fields rather than showing placeholder text.
 */

export type Link = { label: string; href: string };

export type Project = {
  name: string;
  /** One or two sentences: what it is and who it's for. */
  summary: string;
  /** What Auhbon specifically did on it. */
  role: string;
  stack: string[];
  status: "Live" | "In progress" | "In design";
  links?: Link[];
};

export type Role = {
  title: string;
  org: string;
  location?: string;
  /** ISO month strings, e.g. "2021-12". `end` omitted means "Present". */
  start: string;
  end?: string;
  /** Optional bullet points — TODO: add 2–3 concrete outcomes per role. */
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
  /**
   * Shown in the hero. Kept factual — rewrite in your own voice.
   */
  intro:
    "I build web products end to end, from TypeScript front ends to the APIs behind them. Right now that means a Next.js storefront for a hair-care brand and a market-analytics platform for Pokémon trading cards.",
  /** Optional — set to show an email link. Left empty so nothing personal is published by default. */
  email: "" as string,
  links: [
    { label: "GitHub", href: "https://github.com/auhbz" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/auhbon" },
  ] satisfies Link[],
};

export const projects: Project[] = [
  {
    name: "DomDom",
    summary:
      "Online storefront for a hair-products company, built on a Shopify integration.",
    role: "Lead front-end developer. I own the Next.js and TypeScript front end and work against a Python API built with a collaborator.",
    stack: ["Next.js", "TypeScript", "Shopify", "Python"],
    status: "In progress",
  },
  {
    name: "PokéPulse Analytics",
    summary:
      "A market-analytics platform for the Pokémon Trading Card Game: price history, a daily movers dashboard, and signals for cards that are starting to break out.",
    role: "Sole designer and developer. Wrote the system design and a five-phase build roadmap, including a Species Index that tracks combined market value across every printing of a Pokémon.",
    stack: ["FastAPI", "React", "TypeScript", "Recharts", "DuckDB", "PostgreSQL"],
    status: "In design",
  },
  {
    name: "auhbon.com",
    summary:
      "This site. A portfolio that pulls my latest GitHub work in automatically, built to WCAG 2.2 AA with a strict security-header setup.",
    role: "Designed and built it, including the CI pipeline that lints, type-checks and builds every change.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Vercel"],
    status: "Live",
    links: [{ label: "Source code", href: "https://github.com/auhbz/auhbon.com" }],
  },
];

export const experience: Role[] = [
  {
    title: "Software Engineer",
    org: "MGM Resorts International",
    start: "2021-12",
    end: "2022-06",
  },
  {
    title: "Tutor and grader: combinatorial algorithms, discrete structures, automata",
    org: "California State University, Northridge",
    start: "2019-10",
    end: "2020-05",
  },
  {
    title: "Software Engineer",
    org: "Groomer.io",
    location: "Westlake Village, California",
    start: "2018-04",
    end: "2020-03",
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
      "Dean's List every semester",
      "Layer8 Cyber Security Club",
    ],
  },
];

/** Grouped so the page reads as a skill map, not a keyword dump. */
export const skills: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "Python", "Java", "PHP", "C++", "C#", "Objective-C"] },
  { group: "Web", items: ["Next.js", "React", "Tailwind CSS", "Laravel", "FastAPI"] },
  { group: "Mobile", items: ["Flutter", "iOS (Objective-C)"] },
  { group: "Data", items: ["PostgreSQL", "DuckDB"] },
  { group: "Practice", items: ["User experience design", "Leadership"] },
];
