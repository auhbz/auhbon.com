"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { filterProjects, goToSection, OPEN_PALETTE_EVENT, openPalette } from "@/lib/events";
import { setTheme, type Theme } from "@/lib/theme";
import { toast } from "@/lib/fx";
import { getFun, LOOKS, setFunOn, setLook } from "@/lib/fun";
import { reveal } from "@/components/easter-eggs";
import type { Link } from "@/content/profile";

type Command = {
  id: string;
  group: string;
  label: string;
  keywords?: string;
  run: () => void | Promise<void>;
};

type Props = {
  sections: { id: string; label: string }[];
  filters: string[];
  email: string;
  links: Link[];
};

export function CommandPalette({ sections, filters, email, links }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listId = useId();
  const notify = toast;

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = sections.map((s) => ({
      id: `go-${s.id}`,
      group: "Go to",
      label: s.label,
      keywords: "section jump navigate",
      run: () => goToSection(s.id),
    }));
    for (const tech of filters) {
      list.push({
        id: `filter-${tech}`,
        group: "Projects",
        label: `Show ${tech} projects`,
        keywords: "filter stack tech",
        run: () => {
          filterProjects(tech);
          goToSection("work");
        },
      });
    }
    if (email) {
      list.push(
        {
          id: "copy-email",
          group: "Contact",
          label: "Copy email address",
          keywords: `${email} clipboard mail`,
          run: async () => {
            try {
              await navigator.clipboard.writeText(email);
              notify("Email address copied");
            } catch {
              notify(`Couldn't copy. The address is ${email}`);
            }
          },
        },
        {
          id: "send-email",
          group: "Contact",
          label: "Write an email",
          keywords: `${email} mail message`,
          run: () => {
            window.location.assign(`mailto:${email}`);
          },
        },
      );
    }
    for (const link of links) {
      list.push({
        id: `open-${link.label}`,
        group: "Contact",
        label: `Open ${link.label}`,
        keywords: "profile social",
        run: () => {
          window.location.assign(link.href);
        },
      });
    }
    for (const theme of ["light", "dark", "system"] as Theme[]) {
      list.push({
        id: `theme-${theme}`,
        group: "Theme",
        label: theme === "system" ? "Match system theme" : `Use ${theme} theme`,
        keywords: "appearance color mode",
        run: () => {
          setTheme(theme);
          notify(theme === "system" ? "Theme matches your system" : `${theme[0].toUpperCase()}${theme.slice(1)} theme on`);
        },
      });
    }
    list.push({
      id: "fun-toggle",
      group: "Bells and whistles",
      label: "Turn bells and whistles on or off",
      keywords: "fun extras effects emoji rainbow sparkle enable disable party",
      run: () => {
        const next = !getFun().on;
        setFunOn(next);
        notify(next ? "Bells and whistles on" : "Bells and whistles off");
      },
    });
    for (const look of LOOKS) {
      list.push({
        id: `look-${look.id}`,
        group: "Bells and whistles",
        label: `${look.label} look`,
        keywords: `mode style skin ${look.description}`,
        run: () => {
          setLook(look.id);
          notify(`${look.label} look on`);
        },
      });
    }
    return list;
  }, [sections, filters, email, links, notify]);

  const results = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return commands;
    if (terms[0] === "sudo") {
      return [
        {
          id: "sudo",
          group: "Hmm",
          label: "sudo make me a sandwich",
          run: () => reveal("sudo", "Okay. 🥪"),
        },
      ];
    }

    // Every term must match somewhere; whole-word hits in the label rank highest,
    // so "java" puts "Show Java projects" ahead of "Show JavaScript projects".
    const scored = commands
      .map((c) => {
        const label = c.label.toLowerCase();
        const words = label.split(/[^a-z0-9.#+]+/);
        const hay = `${c.group} ${label} ${c.keywords ?? ""}`.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (!hay.includes(t)) return null;
          score += words.includes(t) ? 3 : label.includes(t) ? 2 : 1;
        }
        return { c, score };
      })
      .filter((x): x is { c: Command; score: number } => x !== null);

    // Keep groups together (so arrow keys follow what's on screen), best group first.
    const best = new Map<string, number>();
    for (const { c, score } of scored) best.set(c.group, Math.max(best.get(c.group) ?? 0, score));
    return scored
      .sort((a, b) => best.get(b.c.group)! - best.get(a.c.group)! || a.c.group.localeCompare(b.c.group) || b.score - a.score)
      .map((x) => x.c);
  }, [commands, query]);

  const open = useCallback(() => {
    const el = dialog.current;
    if (!el || el.open) return;
    setQuery("");
    setIndex(0);
    el.showModal();
    input.current?.focus();
  }, []);

  const close = useCallback(() => dialog.current?.close(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) close();
        else open();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, open);
    };
  }, [open, close]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    close();
    // Let the dialog close (and focus restore) before scrolling or navigating.
    window.setTimeout(() => void command.run(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(results.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[index]);
    }
  };

  const activeId = results[index] ? `${listId}-${results[index].id}` : undefined;

  // Keep the highlighted option visible while arrowing through a long list.
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const groups = results.reduce<{ name: string; items: { command: Command; i: number }[] }[]>((acc, command, i) => {
    const last = acc[acc.length - 1];
    if (last?.name === command.group) last.items.push({ command, i });
    else acc.push({ name: command.group, items: [{ command, i }] });
    return acc;
  }, []);

  return (
    <>
      <dialog
        ref={dialog}
        aria-label="Quick actions"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="palette m-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 focus-within:shadow-[inset_0_-2px_0_var(--kelp)]">
          <SearchIcon />
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-label="Search actions"
            placeholder="Jump to a section, filter projects, copy my email…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKeyDown}
            className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-xs text-muted sm:inline">Esc</kbd>
        </div>

        <div id={listId} role="listbox" aria-label="Actions" className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group.name} role="group" aria-labelledby={`${listId}-g-${group.name}`}>
              <p id={`${listId}-g-${group.name}`} className="px-3 pt-3 pb-1 text-sm text-muted">
                {group.name}
              </p>
              {group.items.map(({ command, i }) => (
                <div
                  key={command.id}
                  id={`${listId}-${command.id}`}
                  role="option"
                  aria-selected={i === index}
                  onMouseMove={() => i !== index && setIndex(i)}
                  onClick={() => run(command)}
                  className="cursor-pointer rounded-lg px-3 py-2.5 aria-selected:bg-kelp aria-selected:text-kelp-ink"
                >
                  {command.label}
                </div>
              ))}
            </div>
          ))}
        </div>
        {results.length === 0 ? (
          <p className="px-5 pb-6 text-muted">No actions match &ldquo;{query}&rdquo;. Try a section name or a technology.</p>
        ) : null}
        <p className="sr-only" role="status">
          {results.length} {results.length === 1 ? "action" : "actions"} available
        </p>
      </dialog>

    </>
  );
}

/** Header button: the visible, touch-friendly way into the palette. */
const noSubscribe = () => () => {};
function shortcutHint() {
  // Only advertise the shortcut where there's a keyboard-and-mouse setup to use it.
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return "";
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";
}

export function PaletteButton() {
  const hint = useSyncExternalStore(noSubscribe, shortcutHint, () => "");

  return (
    // The accessible name comes from the visible text (WCAG 2.5.3), so voice-control
    // users can say "Click quick actions". On phones the words are visually hidden.
    <button
      type="button"
      onClick={openPalette}
      aria-keyshortcuts="Meta+K Control+K"
      className="pill inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-3 text-sm text-muted hover:border-ink/40 hover:text-ink"
    >
      <SearchIcon />
      <span className="sr-only sm:not-sr-only">Quick actions</span>
      {hint ? <kbd className="rounded border border-line px-1 font-sans text-xs">{hint}</kbd> : null}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
