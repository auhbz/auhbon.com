"use client";

import { STORY, type Stage } from "@/components/farm-story";

/**
 * The farm story (src/components/farm-story.tsx) drawn as a branching tree,
 * generated from STORY itself, so editing the story updates the picture.
 * A client component only because STORY lives in a client module; it renders
 * to static markup all the same.
 */
type N = { id: Stage; depth: number; y: number; children: { label: string; node: N }[] };

const COL = 188;
const ROW = 46;
const BOX_W = 118;
/** Endings get a wider box: secret endings show their full name. */
const LEAF_W = 180;

/** Choice labels wrap onto two short lines so they fit between the columns. */
function wrap(label: string, max = 13) {
  if (label.length <= max) return [label];
  const words = label.split(" ");
  let first = "";
  while (words.length && (first + " " + words[0]).trim().length <= max) first = `${first} ${words.shift()}`.trim();
  return [first || words.shift()!, words.join(" ")].filter(Boolean);
}
const BOX_H = 34;
const PAD = 8;

function build(): { root: N; leaves: number; depth: number } {
  let leaf = 0;
  let maxDepth = 0;
  const walk = (id: Stage, depth: number): N => {
    maxDepth = Math.max(maxDepth, depth);
    const n = STORY[id] as { choices?: { label: string; to: string }[] };
    const children = (n.choices ?? []).map((c) => ({ label: c.label, node: walk(c.to as Stage, depth + 1) }));
    const y = children.length ? children.reduce((a, c) => a + c.node.y, 0) / children.length : leaf++ * ROW;
    return { id, depth, y, children };
  };
  const root = walk("start", 0);
  return { root, leaves: leaf, depth: maxDepth };
}

const words = (id: string) => id.replace(/([A-Z])/g, " $1").toLowerCase();

function endingOf(id: Stage) {
  const e = (STORY[id] as { ending?: "common" | { name: string } }).ending;
  return e === undefined ? null : e === "common" ? "common" : e.name;
}

export function StoryTree() {
  const { root, leaves, depth } = build();
  const width = depth * COL + LEAF_W + PAD * 2;
  const height = leaves * ROW + PAD * 2;
  const nodes: N[] = [];
  const collect = (n: N) => {
    nodes.push(n);
    n.children.forEach((c) => collect(c.node));
  };
  collect(root);
  const x = (n: N) => PAD + n.depth * COL;
  const cy = (n: N) => PAD + n.y + BOX_H / 2;
  const secrets = nodes.filter((n) => {
    const e = endingOf(n.id);
    return e && e !== "common";
  }).length;
  const common = nodes.filter((n) => endingOf(n.id) === "common").length;

  return (
    <>
      <div className="viz-scroll" tabIndex={0} role="region" aria-label="Farm story tree (scrolls sideways on small screens)">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-labelledby="story-tree-title story-tree-desc" className="viz block max-w-none">
          <title id="story-tree-title">The farm story as a tree</title>
          <desc id="story-tree-desc">
            {`Starts from one situation, branches by two choices per round over four rounds, and ends in ${secrets + common} endings: ${secrets} secret endings and ${common} common ones. The same tree is listed as text below.`}
          </desc>
          {nodes.flatMap((n) =>
            n.children.map((c) => {
              const x1 = x(n) + BOX_W;
              const y1 = cy(n);
              const x2 = x(c.node);
              const y2 = cy(c.node);
              const mx = (x1 + x2) / 2;
              return (
                <g key={`${n.id}-${c.node.id}`}>
                  <path d={`M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} className="viz-edge" />
                  {/* The label sits on the edge's midpoint, above it for the upper branch and below for the lower one. */}
                  <text x={mx} y={(y1 + y2) / 2 + (y2 < y1 ? -18 : 14)} textAnchor="middle" className="viz-edge-label">
                    {wrap(c.label).map((line, i) => (
                      <tspan key={line} x={mx} dy={i ? 12 : 0}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }),
          )}
          {nodes.map((n) => {
            const e = endingOf(n.id);
            const kind = e === null ? "situation" : e === "common" ? "common" : "secret";
            const dots = (STORY[n.id] as { dots: [string, string] }).dots.join("");
            return (
              <g key={n.id} transform={`translate(${x(n)} ${PAD + n.y})`} className={`viz-node is-${kind}`}>
                <rect width={kind === "situation" ? BOX_W : LEAF_W} height={BOX_H} rx={kind === "secret" ? 17 : 6} />
                <text x="10" y={BOX_H / 2 + 1} dominantBaseline="middle">
                  <tspan>{dots}</tspan>
                  <tspan dx="6" className="viz-node-label">
                    {kind === "secret" ? `★ ${e}` : words(n.id)}
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted" aria-label="Legend">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="viz-key is-situation" /> Situation (two choices)
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="viz-key is-common" /> Common ending ({common})
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="viz-key is-secret" /> ★ Secret ending ({secrets})
        </li>
      </ul>
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-kelp underline underline-offset-4">The tree as text</summary>
        <TextTree n={root} />
      </details>
    </>
  );
}

function TextTree({ n, via }: { n: N; via?: string }) {
  const e = endingOf(n.id);
  const text = (STORY[n.id] as { text: string }).text;
  return (
    <ul className="ml-4 list-disc text-sm">
      <li>
        {via ? <span className="font-medium">{via}: </span> : null}
        {text}
        {e ? <span className="text-muted">{e === "common" ? " (common ending)" : ` (secret ending: ${e})`}</span> : null}
        {n.children.map((c) => (
          <TextTree key={c.node.id} n={c.node} via={c.label} />
        ))}
      </li>
    </ul>
  );
}
