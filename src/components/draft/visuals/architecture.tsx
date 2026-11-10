/**
 * How auhbon.com fits together, as a box-and-arrow diagram. Hand-laid (it's
 * architecture, not data); keep it in step with the code map in the README.
 */
type Box = { id: string; x: number; y: number; w: number; lines: string[]; kind?: "ext" | "data" | "store" | "draft" };
const H_LINE = 16;
const boxH = (b: Box) => 14 + b.lines.length * H_LINE;

const BOXES: Box[] = [
  { id: "browser", x: 20, y: 16, w: 180, lines: ["Visitor's browser"], kind: "ext" },
  { id: "vercel", x: 260, y: 16, w: 220, lines: ["Vercel", "CDN + serverless functions"], kind: "ext" },
  { id: "github", x: 560, y: 16, w: 240, lines: ["GitHub: auhbz/auhbon.com", "push to main → redeploy"], kind: "ext" },

  { id: "router", x: 20, y: 110, w: 780, lines: ["Next.js App Router (static, Cache Components)"] },
  { id: "home", x: 20, y: 160, w: 140, lines: ["/ home page", "app/page.tsx"] },
  { id: "dev", x: 176, y: 160, w: 150, lines: ["/dev notes", "roadmap, secrets…"] },
  { id: "draft", x: 342, y: 160, w: 150, lines: ["/dev/draft", "home + extras"], kind: "draft" },
  { id: "api", x: 508, y: 160, w: 130, lines: ["/api/scores", "leaderboards"] },
  { id: "meta", x: 654, y: 160, w: 146, lines: ["OG image, sitemap,", "robots"] },

  { id: "server", x: 20, y: 252, w: 300, lines: ["Server components", "sections, GitHubRepos (hourly cache)"] },
  { id: "client", x: 340, y: 252, w: 460, lines: ["Client components: header, Bells & whistles panel,", "command palette, hero name, farm story, goblin, games"] },

  { id: "profile", x: 20, y: 344, w: 140, lines: ["content/profile.ts"], kind: "data" },
  { id: "ghapi", x: 176, y: 344, w: 144, lines: ["GitHub API", "(QA: fixture :8787)"], kind: "ext" },
  { id: "fun", x: 340, y: 344, w: 220, lines: ["fun store (lib/fun.ts)", "→ <html data-*> → CSS looks"], kind: "store" },
  { id: "dstore", x: 580, y: 344, w: 220, lines: ["draft store (lib/draft)", "separate secrets"], kind: "draft" },

  { id: "engine", x: 340, y: 436, w: 150, lines: ["FX canvas", "fx/engine.ts"] },
  { id: "sound", x: 500, y: 436, w: 130, lines: ["Sound", "Web Audio"] },
  { id: "games", x: 640, y: 436, w: 160, lines: ["Game layer", "lib/games.ts"] },
  { id: "changelog", x: 20, y: 436, w: 300, lines: ["CHANGELOG.md → lib/changelog.ts", "→ /dev/versions, /dev/visuals"], kind: "data" },
];

const EDGES: [string, string][] = [
  ["browser", "vercel"],
  ["github", "vercel"],
  ["vercel", "router"],
  ["home", "server"],
  ["home", "client"],
  ["draft", "client"],
  ["server", "profile"],
  ["server", "ghapi"],
  ["client", "fun"],
  ["client", "dstore"],
  ["fun", "engine"],
  ["fun", "sound"],
  ["fun", "games"],
  ["dev", "changelog"],
];

const byId = Object.fromEntries(BOXES.map((b) => [b.id, b]));

function edgePath(a: Box, b: Box) {
  const ax = a.x + a.w / 2;
  const bx = b.x + b.w / 2;
  if (a.y === b.y) {
    // side by side
    const [l, r] = a.x < b.x ? [a, b] : [b, a];
    const y = a.y + boxH(a) / 2;
    return `M${l.x + l.w} ${y}H${r.x}`;
  }
  const [top, bottom] = a.y < b.y ? [a, b] : [b, a];
  const tx = top === a ? ax : bx;
  const bxx = bottom === a ? ax : bx;
  const y1 = top.y + boxH(top);
  const y2 = bottom.y;
  const x = Math.max(bottom.x + 12, Math.min(bottom.x + bottom.w - 12, tx));
  const sx = Math.max(top.x + 12, Math.min(top.x + top.w - 12, bxx));
  return `M${sx} ${y1}C${sx} ${(y1 + y2) / 2} ${x} ${(y1 + y2) / 2} ${x} ${y2}`;
}

export function Architecture() {
  return (
    <div className="viz-scroll" tabIndex={0} role="region" aria-label="Site architecture diagram (scrolls sideways on small screens)">
      <svg viewBox="0 0 820 490" width="820" height="490" role="img" aria-labelledby="arch-title arch-desc" className="viz block max-w-none">
        <title id="arch-title">Site architecture</title>
        <desc id="arch-desc">
          The browser loads the site from Vercel, which redeploys on every push to main on GitHub. Next.js App Router serves the home page, the /dev notes, the
          /dev/draft playground, a scores API and metadata. Server components read content/profile.ts and the GitHub API. Client components read the fun store,
          which drives the effects canvas, sound and games through data attributes on the html element. The draft playground has its own store. The changelog
          feeds /dev/versions and /dev/visuals.
        </desc>
        <defs>
          <marker id="arch-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L8 4L0 8z" className="viz-arrowhead" />
          </marker>
        </defs>
        {EDGES.map(([a, b]) => (
          <path key={`${a}-${b}`} d={edgePath(byId[a], byId[b])} className="viz-edge" markerEnd="url(#arch-arrow)" />
        ))}
        {BOXES.map((b) => (
          <g key={b.id} transform={`translate(${b.x} ${b.y})`} className={`viz-node is-${b.kind ?? "app"}`}>
            <rect width={b.w} height={boxH(b)} rx="6" />
            {b.lines.map((line, i) => (
              <text key={line} x="10" y={20 + i * H_LINE} className={i ? "viz-node-sub" : "viz-node-label"}>
                {line}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
