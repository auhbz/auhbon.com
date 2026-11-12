import Link from "next/link";
import { profile } from "@/content/profile";
import { PaletteButton } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { BellsPanel } from "@/components/bells-panel";
import { FunToggle } from "@/components/fun-toggle";

const nav = [
  { href: "/#work", label: "Work" },
  { href: "/#github", label: "GitHub" },
  { href: "/#experience", label: "Experience" },
  { href: "/#contact", label: "Contact" },
];

/**
 * Four links fit on a phone, so there's no hamburger menu: nothing hidden,
 * nothing to open, and navigation works without JavaScript.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      {/* Phones: one row (domain + icon buttons, which never wrap), then the section links with
          the Boring / Fun toggle at their end. Three columns, so neither row sets the other's widths. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-5 py-2 sm:px-8 max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto_auto] max-sm:gap-x-2 max-sm:gap-y-0 max-sm:px-4 max-sm:pt-1 max-sm:pb-0">
        <Link href="/" className="mr-auto font-display text-lg font-semibold tracking-tight max-sm:col-start-1 max-sm:row-start-1 max-sm:max-w-full max-sm:truncate">
          {profile.domain}
        </Link>
        <nav aria-label="Sections" className="order-last w-full min-w-0 sm:order-none sm:w-auto max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-2">
          <ul className="-mx-2 flex flex-wrap text-[0.95rem] max-sm:-mx-[5px] max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[scrollbar-width:none]">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded px-2 text-muted hover:text-ink max-sm:px-[5px] max-sm:whitespace-nowrap"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 max-sm:col-span-2 max-sm:col-start-2 max-sm:row-start-1 max-sm:flex-nowrap max-sm:justify-end max-sm:gap-0.5" data-header-actions>
          <PaletteButton />
          <ThemeToggle />
          <BellsPanel />
        </div>
        <div className="sm:-ml-4 max-sm:col-start-3 max-sm:row-start-2 max-sm:self-center" data-mode-toggle-slot>
          <FunToggle />
        </div>
      </div>
    </header>
  );
}
