/** Tiny typed event bus so the command palette can drive other components. */
export const OPEN_PALETTE_EVENT = "portfolio:open-palette";
export const FILTER_EVENT = "portfolio:filter";

export function openPalette() {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

export function filterProjects(tech: string | null) {
  window.dispatchEvent(new CustomEvent<string | null>(FILTER_EVENT, { detail: tech }));
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scroll to a section and move keyboard/screen-reader focus to its heading. */
export function goToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  const heading = document.getElementById(`${id}-heading`);
  heading?.focus({ preventScroll: true });
  history.replaceState(null, "", `#${id}`);
}
