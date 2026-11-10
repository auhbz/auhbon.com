import "server-only";
import { versions } from "@/lib/changelog";

/**
 * How much each release changed: the number of bullet points in each
 * version's notes in CHANGELOG.md, oldest at the top. One series, so one color.
 */
export function Releases() {
  const rows = [...versions].reverse().map((v) => ({
    version: v.version,
    label: v.label,
    n: v.notes.split("\n").filter((l) => /^\s*-\s/.test(l)).length,
  }));
  const max = Math.max(1, ...rows.map((r) => r.n));
  const BAR = 22;
  const GAP = 6;
  const LEFT = 250;
  const W = 760;
  const height = rows.length * (BAR + GAP) + 26;
  const scale = (n: number) => ((W - LEFT - 40) * n) / max;
  const ticks = [0, Math.round(max / 2), max];

  return (
    <>
      <div className="viz-scroll" tabIndex={0} role="region" aria-label="Release sizes chart (scrolls sideways on small screens)">
        <svg viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-labelledby="rel-title" className="viz block max-w-none">
          <title id="rel-title">{`Bullet points in each release's notes, from 1.0.0 to ${rows[rows.length - 1]?.version}. The same numbers are in the table below.`}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={LEFT + scale(t)} x2={LEFT + scale(t)} y1="0" y2={height - 20} className="viz-grid" />
              <text x={LEFT + scale(t)} y={height - 6} textAnchor="middle" className="viz-node-sub">
                {t}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const y = i * (BAR + GAP);
            return (
              <g key={r.version} className="viz-bar-row">
                <title>{`${r.version} ${r.label}: ${r.n} ${r.n === 1 ? "change" : "changes"}`}</title>
                <text x={LEFT - 10} y={y + BAR / 2 + 1} textAnchor="end" dominantBaseline="middle" className="viz-node-label">
                  <tspan className="viz-mono">{r.version}</tspan> {r.label.length > 24 ? `${r.label.slice(0, 23)}…` : r.label}
                </text>
                <rect x={LEFT} y={y + 2} width={Math.max(2, scale(r.n))} height={BAR - 4} rx="4" className="viz-bar" />
                <text x={LEFT + scale(r.n) + 6} y={y + BAR / 2 + 1} dominantBaseline="middle" className="viz-node-sub">
                  {r.n}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-kelp underline underline-offset-4">The numbers as a table</summary>
        <table className="mt-2 text-sm">
          <caption className="sr-only">Bullet points per release</caption>
          <thead>
            <tr>
              <th scope="col" className="pr-4 text-left">Version</th>
              <th scope="col" className="pr-4 text-left">Label</th>
              <th scope="col" className="text-right">Bullets</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.version}>
                <th scope="row" className="pr-4 text-left font-normal">{r.version}</th>
                <td className="pr-4">{r.label}</td>
                <td className="text-right tabular-nums">{r.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
