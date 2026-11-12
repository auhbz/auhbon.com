import Link from "next/link";
import { DevPageHeader, devMetadata } from "@/components/dev/ui";

export const metadata = devMetadata("Dev notes", "/dev", "Working notes for auhbon.com.");

const pages = [
  { href: "/dev/roadmap", title: "Roadmap", description: "What's shipped, in progress, waiting, planned or skipped, plus the mobile ideas." },
  { href: "/dev/secrets", title: "Secrets", description: "Every secret with its hint and how it’s found, by area, the draft secrets, everything secrets unlock, and rough ideas for more." },
  { href: "/dev/milestones", title: "Milestones", description: "A slider that shows where every milestone and unlock lands for any number of secrets." },
  { href: "/dev/goals", title: "Goals", description: "Long-term goals (100 secrets, 40 effect options, and more) with live progress." },
  { href: "/dev/hands-on-tasks", title: "Hands-on tasks", description: "Things only Auhbon can decide or do, open ones first." },
  { href: "/dev/versions", title: "Versions", description: "Every version's notes and its GitHub branch, from the changelog." },
  { href: "/dev/draft", title: "Draft playground", description: "The live home page plus ideas being tested before they go live. See what's different on /dev/draft/diff." },
  { href: "/dev/visuals", title: "Visuals", description: "The farm story as a tree, the site's architecture, release sizes and the effects catalog." },
] as const;

export default function DevIndex() {
  return (
    <>
      <DevPageHeader title="Dev notes" back={false} intro="Where the site stands, round by round." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {pages.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className="block h-full rounded-lg border border-line bg-surface p-5 transition-colors hover:border-kelp"
            >
              <span className="font-display text-xl font-semibold tracking-tight text-kelp underline decoration-1 underline-offset-[0.2em]">
                {page.title}
              </span>
              <span className="mt-1 block text-muted">{page.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
