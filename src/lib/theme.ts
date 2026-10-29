export type Theme = "light" | "dark" | "system";

export const THEME_EVENT = "portfolio:theme";
const KEY = "theme";

/** The site is dark unless a visitor picks Light or "match my system". */
export const DEFAULT_THEME: Theme = "dark";

/**
 * Runs before hydration (see layout.tsx) so the theme applies on the very
 * first paint, with no flash. Kept tiny and dependency-free.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;else if(t!=="system")document.documentElement.dataset.theme="${DEFAULT_THEME}"}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME}"}`;

export function getTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // Storage can be blocked (private mode, strict settings): use the default.
  }
  return DEFAULT_THEME;
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Not persisted, but still applied for this visit.
  }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}
