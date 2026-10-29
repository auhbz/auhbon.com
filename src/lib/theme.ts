export type Theme = "light" | "dark" | "system";

export const THEME_EVENT = "portfolio:theme";
const KEY = "theme";

/**
 * Runs before hydration (see layout.tsx) so a saved theme applies on the very
 * first paint, with no light-to-dark flash. Kept tiny and dependency-free.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function getTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Storage can be blocked (private mode, strict settings): fall back to the OS setting.
  }
  return "system";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Not persisted, but still applied for this visit.
  }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}
