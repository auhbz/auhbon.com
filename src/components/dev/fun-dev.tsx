"use client";

/**
 * /dev views of the unlocks contract and goals. Client components because
 * src/lib/unlocks.ts carries React hooks (server components can't import it).
 */
import Link from "next/link";
import { liveSecretCount, SECRET_LIST } from "@/lib/fun";
import { liveThreshold, UNLOCK_KINDS, UNLOCKS, type UnlockDef, type UnlockKind } from "@/lib/unlocks";
import { goals, secretsByArea } from "@/content/goals";
import { ResponsiveTable } from "@/components/dev/ui";

export const KIND_NOTES: Record<UnlockKind, string> = {
  effect: "Styles for the i-dots, buttons, cursor trail, and sounds. Two of each are open from the start; the rest arrive about two per secret.",
  theme: "Whole-site looks. Classic is always open; the others follow quickly.",
  game: "Full-screen games built from the page itself. They open one at a time, early on.",
  wild: "Big, chaotic takeovers, each one a “<Name> Mode” (Monkey Mode and friends). Later unlocks.",
  toy: "Things to pick up and play with on the page, from the toy box.",
  extra: "Visual and interactive elements, like the portal gun, the skeleton, and the climber.",
};

/** "3 secrets", "0 (from the start)", or the specific secret. */
function needs(def: UnlockDef) {
  if (def.secret) {
    const s = SECRET_LIST.find((x) => x.id === def.secret);
    const by = `the “${s?.title ?? def.secret}” secret`;
    return def.at > 0 ? `${by}, or ${liveThreshold(def)} secrets` : by;
  }
  return def.at === 0 ? "From the start" : `${liveThreshold(def)} ${liveThreshold(def) === 1 ? "secret" : "secrets"}`;
}

function range(defs: UnlockDef[], f: (d: UnlockDef) => number) {
  const v = defs.filter((d) => !d.secret || d.at > 0).map(f);
  if (!v.length) return "by specific secrets";
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  return lo === hi ? `${hi}` : `${lo} to ${hi}`;
}

/** Every UNLOCKS entry, grouped by kind, with its full-scale and today's threshold. */
export function Unlockables() {
  const n = liveSecretCount();
  return (
    <>
      <p className="max-w-prose text-muted">
        Thresholds are written on the 100-secret scale and scaled to today&apos;s {n} live secrets (see{" "}
        <Link className="text-link" href="/dev/milestones">
          Milestones
        </Link>
        ). Cheats can unlock any of these without secrets.
      </p>
      {UNLOCK_KINDS.map((kind) => {
        const defs = UNLOCKS.filter((u) => u.kind === kind.id);
        return (
          <div key={kind.id} className="mt-10">
            <h3 className="font-display text-lg font-semibold tracking-tight">
              {kind.label} <span className="text-base font-normal text-muted">({defs.length})</span>
            </h3>
            <p className="mt-1 max-w-prose text-sm text-muted">
              {KIND_NOTES[kind.id]}{" "}
              {defs.length ? (
                <>
                  Secrets needed today: <span className="font-medium text-ink">{range(defs, (d) => liveThreshold(d))}</span> ({range(defs, (d) => d.at)} on the
                  100 scale).
                </>
              ) : (
                "None yet."
              )}
            </p>
            {defs.length ? (
              <div className="mt-3">
                <ResponsiveTable
                  caption={`${kind.label} unlocks`}
                  rows={defs}
                  rowKey={(r) => r.id}
                  columns={[
                    { header: "Feature", cell: (r) => r.label, className: "w-[34%]" },
                    { header: "Id", cell: (r) => <code className="text-sm">{r.id}</code> },
                    { header: "100 scale", cell: (r) => (r.secret && r.at === 0 ? "n/a" : r.at), className: "w-24 tabular-nums" },
                    { header: "Today", cell: (r) => needs(r), className: "w-44" },
                  ]}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/** Long-term goals, with progress bars. */
export function GoalsTracker() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2" aria-label="Goals">
      {goals().map((g) => {
        const pct = Math.min(100, (g.current / g.goal) * 100);
        return (
          <li key={g.id} className="rounded-lg border border-line bg-surface p-4">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-display text-lg font-semibold tracking-tight">{g.label}</span>
              <span className="tabular-nums">
                <span className="font-semibold">{g.current}</span> <span className="text-muted">of {g.goal}</span>
              </span>
            </p>
            <div
              role="progressbar"
              aria-label={`${g.label}: ${g.current} of ${g.goal}`}
              aria-valuemin={0}
              aria-valuemax={g.goal}
              aria-valuenow={g.current}
              className="mt-2 h-2.5 rounded-full border border-muted"
            >
              <div className="h-full rounded-full bg-kelp" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">
              {Math.round(pct)}% there. {g.note}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Live secrets per area of the site. */
export function AreaCounts() {
  const rows = secretsByArea();
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="max-w-xl space-y-2" aria-label="Secrets by area">
      {rows.map((r) => (
        <li key={r.area} className="grid grid-cols-[9.5rem_1fr_2rem] items-center gap-3 text-[0.95rem]">
          <span>{r.label}</span>
          <span aria-hidden="true" className="h-2 rounded-full bg-paper">
            <span className="block h-full rounded-full bg-kelp" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}
