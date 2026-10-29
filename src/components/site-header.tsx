import Link from "next/link";
import { profile } from "@/content/profile";
import { PaletteButton } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { BellsPanel } from "@/components/bells-panel";

const nav = [
  { href: "#work", label: "Work" },
  { href: "#github", label: "GitHub" },
  { href: "#experience", label: "Experience" },
  { href: "#contact", label: "Contact" },
];

/**
 * Four links fit on a phone, so there's no hamburger menu: nothing hidden,
 * nothing to open, and navigation works without JavaScript.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-5 py-2 sm:px-8">
        <Link href="/" className="mr-auto font-display text-lg font-semibold tracking-tight">
          {profile.domain}
        </Link>
        <nav aria-label="Sections" className="order-last w-full sm:order-none sm:w-auto">
          <ul className="-mx-2 flex flex-wrap text-[0.95rem]">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded px-2 text-muted hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <PaletteButton />
          <ThemeToggle />
          <BellsPanel />
        </div>
      </div>
    </header>
  );
}
