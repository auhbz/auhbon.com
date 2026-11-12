/**
 * "Loot": a piece of the page lifted off it for a while (a monkey carries it,
 * or gravity drops it). The real thing stays exactly where it was, only
 * invisible, so the gap stays put and the layout never shifts; a look-alike
 * "ghost" (a styled clone) is what moves around. Restoring removes the ghost
 * and makes the original visible again.
 *
 * Words can be lifted out of a paragraph too: the text node is split around
 * them and joined back up on restore. React keeps a reference to the original
 * text node, which is the one we keep (and put back to its full text), so the
 * component tree never notices.
 */
import { isHydrated } from "@/lib/hydrated";

export type Loot = {
  kind: "element" | "words";
  /** The moving look-alike (fixed layer, positioned by its owner). */
  ghost: HTMLElement;
  w: number;
  h: number;
  /** Is this my name (the hero heading)? */
  isName: boolean;
  /** Where it belongs, in viewport coordinates, right now. */
  home(): DOMRect;
  restore(): void;
};

const GONE = "wildGone";
const SKIP = "#hero-name, [data-wild-ui], [data-wild-ghosts], [data-portal-surface], [data-draft-slot], [data-hamster], [aria-hidden='true'], .sr-only, [data-wild-gone], [data-wild-vanish], dialog, [popover], header, nav";
const WORDY = "main :is(h1, h2, h3, p, li, dt, dd, time)";
const WHOLE = "main :is(.pill, button, a.text-link, h2, h3)";

let layer: HTMLElement | null = null;
let users = 0;

/** The shared fixed layer the ghosts live in (above the page, below docks and the panel). */
export function ghostLayer(): HTMLElement {
  if (!layer || !layer.isConnected) {
    layer = document.createElement("div");
    layer.dataset.wildGhosts = "";
    layer.setAttribute("aria-hidden", "true");
    layer.className = "wild-ghosts";
    document.body.append(layer);
  }
  return layer;
}
export function acquireGhostLayer() {
  users++;
  ghostLayer();
  return () => {
    users = Math.max(0, users - 1);
    if (!users && layer) {
      layer.remove();
      layer = null;
    }
  };
}

/** Place a ghost: centered on (x, y), rotated, scaled. */
export function placeGhost(l: Loot, x: number, y: number, rot = 0, scale = 1) {
  l.ghost.style.transform = `translate(${x - l.w / 2}px, ${y - l.h / 2}px) rotate(${rot}rad) scale(${scale})`;
}

const NOT_COPIED = /^(position|inset|top|left|right|bottom|margin|transform|translate|rotate|scale|visibility|opacity|transition|animation|will-change|z-index|float|cursor|pointer-events|view-transition|anchor|offset|content-visibility|contain)/;

function copyStyles(from: Element, to: HTMLElement) {
  const cs = getComputedStyle(from);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    if (NOT_COPIED.test(prop) || prop.startsWith("--")) continue;
    to.style.setProperty(prop, cs.getPropertyValue(prop));
  }
}

function wrap(inner: HTMLElement, w: number, h: number) {
  const g = document.createElement("div");
  g.className = "wild-ghost";
  g.style.width = `${w}px`;
  g.style.height = `${h}px`;
  inner.setAttribute("inert", "");
  g.append(inner);
  ghostLayer().append(g);
  return g;
}

/** Lift a whole element (a button, a tag, a heading). */
export function liftElement(el: HTMLElement): Loot {
  const r = el.getBoundingClientRect();
  const clone = el.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  copyStyles(el, clone);
  Object.assign(clone.style, { width: `${r.width}px`, height: `${r.height}px`, boxSizing: "border-box", margin: "0", display: getComputedStyle(el).display === "inline" ? "inline-block" : clone.style.display });
  const ghost = wrap(clone, r.width, r.height);
  el.dataset[GONE] = "";
  return {
    kind: "element",
    ghost,
    w: r.width,
    h: r.height,
    isName: el.id === "hero-name",
    home: () => el.getBoundingClientRect(),
    restore: () => {
      delete el.dataset[GONE];
      ghost.remove();
    },
  };
}

/** Lift characters [start, end) out of a text node, leaving a same-size gap. */
export function liftWords(node: Text, start: number, end: number): Loot | null {
  const parent = node.parentElement;
  if (!parent) return null;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const rects = range.getClientRects();
  if (rects.length !== 1) return null; // wraps across lines
  const r = rects[0];
  const full = node.nodeValue ?? "";
  const before = full.slice(0, start);
  const word = full.slice(start, end);
  const span = document.createElement("span");
  span.dataset[GONE] = "";
  span.textContent = word;
  const rest = document.createTextNode(full.slice(end));
  node.nodeValue = before;
  node.after(span, rest);

  const inner = document.createElement("span");
  inner.textContent = word;
  const cs = getComputedStyle(parent);
  for (const p of ["font-family", "font-size", "font-weight", "font-style", "font-variation-settings", "letter-spacing", "line-height", "color", "text-transform", "font-feature-settings"]) {
    inner.style.setProperty(p, cs.getPropertyValue(p));
  }
  Object.assign(inner.style, { display: "block", whiteSpace: "pre", lineHeight: `${r.height}px` });
  const ghost = wrap(inner, r.width + 1, r.height);
  return {
    kind: "words",
    ghost,
    w: r.width + 1,
    h: r.height,
    isName: false,
    home: () => (span.isConnected ? span.getBoundingClientRect() : r),
    restore: () => {
      ghost.remove();
      if (node.isConnected && node.nodeValue === before) node.nodeValue = full;
      span.remove();
      rest.remove();
    },
  };
}

function inView(r: DOMRect, top = 64) {
  return r.width > 0 && r.height > 0 && r.bottom > top && r.top < innerHeight - 8 && r.left > -4 && r.right < innerWidth + 4;
}
const usable = (el: Element) => !el.closest(SKIP) && isHydrated(el);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Whole elements in view that can be lifted. */
export function wholeCandidates(maxW = innerWidth * 0.9): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(WHOLE)].filter((el) => {
    if (!usable(el)) return false;
    const r = el.getBoundingClientRect();
    const text = (el.textContent ?? "").trim();
    return inView(r) && r.width < maxW && r.height < 90 && text.length > 0 && text.length < 40;
  });
}

/** A run of 1–3 words from a text block in view. */
export function wordsCandidate(blocks = [...document.querySelectorAll<HTMLElement>(WORDY)]): { node: Text; start: number; end: number } | null {
  const inViewBlocks = blocks.filter((b) => usable(b) && inView(b.getBoundingClientRect()));
  for (let tries = 0; tries < 6 && inViewBlocks.length; tries++) {
    const block = pick(inViewBlocks);
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && usable(n.parentElement) && /[A-Za-z]{2}/.test(n.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
    if (!nodes.length) continue;
    const node = pick(nodes);
    const words = [...(node.nodeValue ?? "").matchAll(/[^\s]+/g)].filter((m) => /[A-Za-z]/.test(m[0]));
    if (!words.length) continue;
    const i = Math.floor(Math.random() * words.length);
    const n = Math.min(words.length - i, Math.random() < 0.55 ? 1 : Math.random() < 0.7 ? 2 : 3);
    const first = words[i];
    const last = words[i + n - 1];
    const start = first.index!;
    const end = last.index! + last[0].length;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const rects = range.getClientRects();
    if (rects.length === 1 && inView(rects[0])) return { node, start, end };
  }
  return null;
}

/** Where something is, centered, in viewport coordinates. */
export const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
