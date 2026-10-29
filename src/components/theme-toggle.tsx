"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, getTheme, setTheme, THEME_EVENT, type Theme } from "@/lib/theme";
import { DEFAULT_FUN, getFun, LOOKS, subscribeFun } from "@/lib/fun";

const ORDER: Theme[] = ["dark", "light", "system"];
const LABEL: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange); // stay in sync across open tabs
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function ThemeToggle() {
  // The saved theme lives in localStorage, outside React, so read it as an external store.
  const current = useSyncExternalStore(subscribe, getTheme, () => DEFAULT_THEME);
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  // Bells-and-whistles themes (Terminal, Nature...) bring their own colors, so
  // the light/dark color mode is paused while one is on.
  const look = fun.on && fun.look !== "classic" ? LOOKS.find((l) => l.id === fun.look)?.label : undefined;
  const label = look
    ? `Color mode: set by the ${look} theme`
    : `Color mode: ${LABEL[current]}. Switch to ${LABEL[next]}`;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      disabled={Boolean(look)}
      aria-label={label}
      title={look ? `Colors come from the ${look} theme` : `Color mode: ${LABEL[current]}`}
      className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      <ThemeIcon theme={current} />
    </button>
  );
}

export function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (theme === "light")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (theme === "dark")
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
