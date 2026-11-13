/**
 * Has React hydrated this server-rendered element yet? Changing the DOM of a
 * section before it hydrates makes React throw the page away and rebuild it,
 * so client-only extras wait for this before touching page content.
 */
export const isHydrated = (el: Element | null | undefined) => !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));

/** Calls `cb` once `selector` exists and is hydrated (or after `maxMs`, if it exists by then). Returns a cancel function. */
export function whenHydrated(selector: string, cb: (el: Element | null) => void, maxMs = 8000): () => void {
  const start = performance.now();
  let frame = 0;
  const poll = () => {
    const el = document.querySelector(selector);
    if (isHydrated(el) || performance.now() - start > maxMs) return cb(el);
    frame = requestAnimationFrame(poll);
  };
  poll();
  return () => cancelAnimationFrame(frame);
}
