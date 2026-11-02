/**
 * Fails if the source uses emoji newer than Emoji 11 (2018). Older systems
 * (Windows 10 especially) don't have glyphs for them and show an empty box.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Code points added in Emoji 12.0 and later (2019+), plus the gender-neutral
// person ZWJ sequences (U+1F9D1 + ZWJ ..., Emoji 12.1).
const NEW = [
  [0x1fa70, 0x1faff], [0x1f90c, 0x1f90f], [0x1f93f, 0x1f93f], [0x1f971, 0x1f972], [0x1f977, 0x1f978],
  [0x1f97b, 0x1f97b], [0x1f9a3, 0x1f9a4], [0x1f9a5, 0x1f9aa], [0x1f9ab, 0x1f9ad], [0x1f9ba, 0x1f9bf],
  [0x1f9c3, 0x1f9cb], [0x1f9cc, 0x1f9cf], [0x1f6d5, 0x1f6d7], [0x1f6fa, 0x1f6fc], [0x1f7e0, 0x1f7f0],
  [0x1f6dc, 0x1f6df], [0x1f979, 0x1f979], [0x1f9de, 0x1f9ff],
];
const isNew = (cp) => NEW.some(([a, b]) => cp >= a && cp <= b);

const files = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css|mdx?)$/.test(f)) files.push(p);
  }
};
walk("src");

let bad = 0;
for (const f of files) {
  const text = readFileSync(f, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      if (isNew(cp) || (cp === 0x1f9d1 && line.includes("\u{1F9D1}‍"))) {
        console.log(`${f}:${i + 1}  ${ch} (U+${cp.toString(16).toUpperCase()}) is newer than Emoji 11`);
        bad++;
      }
    }
  });
}
if (bad) process.exit(1);
console.log(`emoji-check: ${files.length} files OK`);
