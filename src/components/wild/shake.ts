import { prefersReducedMotion } from "@/lib/events";

let timer = 0;

/** A short, small shake of the page (never with reduced motion). See wild.css. */
export function shakePage(strength: 1 | 2 | 3 = 1) {
  if (prefersReducedMotion()) return;
  const d = document.documentElement.dataset;
  delete d.wildShake;
  void document.documentElement.offsetWidth; // restart the animation
  d.wildShake = String(strength);
  window.clearTimeout(timer);
  timer = window.setTimeout(() => delete d.wildShake, 450);
}
