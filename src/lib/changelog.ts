import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every version in CHANGELOG.md, for /dev/versions. The file is read once at
 * module scope: it's the same for every request, so (per the Cache Components
 * guide) it's resolved during prerendering and baked into the static page.
 */

export type Version = {
  version: string;
  label: string;
  /** The version's raw markdown notes (between its "## x.y.z: Label" heading and the next one). */
  notes: string;
  branchUrl: string;
};

const REPO = "https://github.com/auhbz/auhbon.com";
const SEMVER = /^\d+\.\d+\.\d+$/;

export const versionAnchor = (version: string) => `v${version.replaceAll(".", "-")}`;

function compareDesc(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
  return 0;
}

export function parseChangelog(source: string): Version[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const labels = new Map<string, string>();
  const notes = new Map<string, { label: string; lines: string[] }>();

  // The "| Version | Label | Checkpoint |" table.
  for (const line of lines) {
    const cells = line.match(/^\|(.*)\|\s*$/)?.[1].split("|").map((c) => c.trim());
    if (cells && cells.length >= 2 && SEMVER.test(cells[0])) labels.set(cells[0], cells[1]);
  }

  // The "## x.y.z: Label" sections.
  let current: { label: string; lines: string[] } | null = null;
  for (const line of lines) {
    const heading = line.match(/^## (\d+\.\d+\.\d+):\s*(.+?)\s*$/);
    if (heading) {
      current = { label: heading[2], lines: [] };
      notes.set(heading[1], current);
    } else if (/^## /.test(line)) {
      current = null;
    } else if (current) {
      current.lines.push(line);
    }
  }

  const all = new Set([...labels.keys(), ...notes.keys()]);
  return [...all].sort(compareDesc).map((version) => ({
    version,
    label: labels.get(version) ?? notes.get(version)?.label ?? "",
    notes: (notes.get(version)?.lines.join("\n") ?? "").replace(/(\n\s*(---)?\s*)+$/, "").trim(),
    branchUrl: `${REPO}/tree/release/${version}`,
  }));
}

export const versions: Version[] = parseChangelog(readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8"));
