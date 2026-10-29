#!/usr/bin/env node
// Verifies every text/background pair in the palette meets WCAG 2.2 AA.
// Run: npm run check:contrast

const themes = {
  light: { paper: "#f4f7f6", surface: "#ffffff", ink: "#13232c", muted: "#4b5b63", kelp: "#1d6b58", kelpInk: "#ffffff", line: "#d3dcd9" },
  dark: { paper: "#0f1c22", surface: "#142329", ink: "#e5ecea", muted: "#9fb0b5", kelp: "#6cc7ae", kelpInk: "#0f1c22", line: "#24363e" },
  // Opt-in "bells and whistles" looks are held to the same bar.
  terminal: { paper: "#0a0f0a", surface: "#0f1710", ink: "#b6f7a2", muted: "#7fbf6a", kelp: "#3dff7a", kelpInk: "#0a0f0a", line: "#1f3320" },
  pico8: { paper: "#1d2b53", surface: "#000000", ink: "#fff1e8", muted: "#c2c3c7", kelp: "#ffec27", kelpInk: "#1d2b53", line: "#5f574f" },
};

// [foreground, background, minimum ratio, what it's used for]
const pairs = [
  ["ink", "paper", 4.5, "body text"],
  ["ink", "surface", 4.5, "text on cards"],
  ["muted", "paper", 4.5, "secondary text"],
  ["muted", "surface", 4.5, "secondary text on cards"],
  ["kelp", "paper", 4.5, "links"],
  ["kelp", "surface", 4.5, "links on cards"],
  ["kelpInk", "kelp", 4.5, "button text"],
  ["kelp", "paper", 3, "focus ring (non-text, 1.4.11)"],
  ["muted", "surface", 3, "switch track, off (non-text)"],
  ["kelp", "surface", 3, "switch track, on (non-text)"],
];

const lum = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let failed = false;
for (const [name, t] of Object.entries(themes)) {
  for (const [fg, bg, min, use] of pairs) {
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failed = true;
    console.log(`${ok ? "pass" : "FAIL"}  ${name.padEnd(8)} ${fg}/${bg}`.padEnd(34) + `${r.toFixed(2)}:1 (min ${min}) ${use}`);
  }
}
process.exit(failed ? 1 : 0);
