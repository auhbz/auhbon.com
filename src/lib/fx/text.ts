/**
 * Finds the word under a viewport point without touching the DOM.
 *
 * Effects that "hit" text (slingshot rocks, fire scorch marks) never wrap or
 * move real page text, which React owns. Instead they read the word's box and
 * styles here and paint over it on the effects canvas.
 */

export type WordHit = {
  key: string;
  text: string;
  rect: DOMRect;
  font: string;
  color: string;
  background: string;
  /** Set when the hit is one of the hero letters, which can be moved directly. */
  letter?: HTMLElement;
};

type CaretDoc = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

const IGNORE = "header, dialog, [popover], [data-fx-ignore], .sr-only, script, style";

export function wordAt(x: number, y: number): WordHit | null {
  // Hero letters are already individual elements.
  const el = document.elementFromPoint(x, y);
  const letter = el?.closest<HTMLElement>("[data-letter]");
  if (letter) {
    const rect = letter.getBoundingClientRect();
    const index = letter.style.getPropertyValue("--i");
    return { key: `letter-${index}`, text: letter.textContent ?? "", rect, font: "", color: "", background: "", letter };
  }
  if (!el || el.closest(IGNORE)) return null;

  const doc = document as CaretDoc;
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) ({ offsetNode: node, offset } = p);
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) {
      node = r.startContainer;
      offset = r.startOffset;
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const parent = node.parentElement;
  if (!parent || parent.closest(IGNORE)) return null;

  const text = node.textContent ?? "";
  let start = Math.min(offset, text.length);
  let end = start;
  while (start > 0 && /\S/.test(text[start - 1])) start--;
  while (end < text.length && /\S/.test(text[end])) end++;
  if (end <= start) return null;

  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  // A word can wrap across lines; use the box that actually contains the point.
  const rect = [...range.getClientRects()].find((r) => x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1);
  if (!rect || rect.width < 2) return null;

  const cs = getComputedStyle(parent);
  return {
    key: `${Math.round(rect.left + scrollX)}:${Math.round(rect.top + scrollY)}:${text.slice(start, end)}`,
    text: text.slice(start, end),
    rect,
    font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    color: cs.color,
    background: backgroundOf(parent),
  };
}

/** The first non-transparent background behind an element. */
export function backgroundOf(el: Element | null): string {
  for (let n = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
  }
  return getComputedStyle(document.body).backgroundColor;
}

/** True when the page's base color is dark (picks additive vs. darkening effects). */
export function isDarkSurface() {
  const m = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g);
  if (!m) return false;
  const [r, g, b] = m.map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
}

export function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
