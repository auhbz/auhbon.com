import { DEV_AS_OF, roughSecretIdeas } from "@/content/dev";
import { SECRET_AREA_LABELS, SECRET_CATEGORIES, SECRET_GOAL, SECRET_LIST, scaledMilestones, type SecretCategory } from "@/lib/fun";
import { DRAFT_SECRETS } from "@/lib/draft/store";
import { AreaCounts, Unlockables } from "@/components/dev/fun-dev";
import { SecretsBar } from "@/components/secrets-bar";
import Link from "next/link";
import { DevPageHeader, DevSection, ResponsiveTable, StatusPill, devMetadata } from "@/components/dev/ui";

export const metadata = devMetadata("Secrets", "/dev/secrets", "Every secret on auhbon.com, with spoilers hidden.");

type Row = (typeof SECRET_LIST)[number] & { n: number };
const secrets: Row[] = SECRET_LIST.map((s, i) => ({ ...s, n: i + 1 }));

function Title({ row }: { row: { icon?: string; title: string } }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      {row.icon ? <span aria-hidden="true">{row.icon}</span> : null}
      <span>{row.title}</span>
    </span>
  );
}

const CATEGORY_NOTES: Record<SecretCategory, string> = {
  Hidden: "Things to click or find on the page.",
  Typing: "Words, codes and keys (phones get on-screen stand-ins).",
  Combos: "Themes and effects switched on together in Bells & whistles.",
  Effects: "Playing with a particular effect or theme.",
  Farm: "Endings and tricks in the Farm i-dots story.",
  Games: "Inside the mini games.",
  Misc: "Everything else.",
};

const LEVELS = { 1: "Easy", 2: "Medium", 3: "Hard" } as const;

function Difficulty({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span aria-hidden="true" className="tracking-widest text-kelp">
        {"●".repeat(level)}
        <span className="text-muted">{"○".repeat(3 - level)}</span>
      </span>
      <span>{LEVELS[level]}</span>
    </span>
  );
}

export default function Secrets() {
  const count = SECRET_LIST.length;
  const milestones = scaledMilestones(count);
  return (
    <>
      <DevPageHeader
        title="Secrets"
        asOf={DEV_AS_OF}
        intro="Every secret hidden on the site, with its one-word hint and how it's found (spoilers!), plus what secrets unlock."
      />

      <DevSection id="progress" title="Progress">
        <p className="font-display text-xl font-semibold tracking-tight">
          {count} of {SECRET_GOAL} secrets implemented
        </p>
        <SecretsBar className="mt-3 max-w-xl" found={count} live={count} goal={SECRET_GOAL} notches={milestones.slice(0, -1).map((m) => m.count)} />
        <p className="mt-3 max-w-prose text-muted">
          Milestone celebrations are set on the 100 scale and scaled down to the {count} live secrets, so every one is reachable today (and they move
          automatically as secrets are added). See them move on <Link className="text-link" href="/dev/milestones">Milestones</Link>.
        </p>
        <ul className="mt-4 grid gap-1.5 text-[0.95rem] sm:grid-cols-2" aria-label="Milestones">
          {milestones.map((m) => (
            <li key={m.at} className="flex items-baseline gap-2">
              <span aria-hidden="true">{m.icon}</span>
              <span>
                <span className="font-medium">{m.count}</span> secrets: {m.name} <span className="text-muted">({m.at} on the 100 scale)</span>
              </span>
            </li>
          ))}
        </ul>
      </DevSection>

      <DevSection
        id="implemented"
        title="Implemented"
        intro="Grouped by kind. Difficulty is a rough estimate of how hard each one is to stumble on or work out. The hint is what a visitor sees after revealing a badge; the note is what they see once it's found."
      >
        <h3 className="font-display text-lg font-semibold tracking-tight">By area</h3>
        <p className="mt-1 mb-3 max-w-prose text-sm text-muted">Which part of the site each secret belongs to.</p>
        <AreaCounts />
        <div className="mt-10" />
        {SECRET_CATEGORIES.map((category) => {
          const rows = secrets.filter((s) => s.category === category);
          if (!rows.length) return null;
          return (
            <div key={category} className="mt-10 first:mt-0">
              <h3 id={`cat-${category.toLowerCase()}`} className="font-display text-lg font-semibold tracking-tight">
                {category} <span className="text-base font-normal text-muted">({rows.length})</span>
              </h3>
              <p className="mt-1 max-w-prose text-sm text-muted">{CATEGORY_NOTES[category]}</p>
              <div className="mt-3">
                <ResponsiveTable
                  caption={`${category} secrets`}
                  rows={rows}
                  rowKey={(r) => r.id}
                  columns={[
                    { header: "Secret", cell: (r) => <><span className="text-muted">{r.n}.</span> <Title row={r} /></>, className: "w-[24%]" },
                    { header: "Difficulty", cell: (r) => <Difficulty level={r.difficulty} />, className: "w-36" },
                    { header: "Hint", cell: (r) => <span className="font-medium">{r.hint}</span>, className: "w-28" },
                    { header: "Area", cell: (r) => SECRET_AREA_LABELS[r.area], className: "w-32" },
                    { header: "Unlocked note", cell: (r) => r.how },
                  ]}
                />
              </div>
            </div>
          );
        })}

      </DevSection>

      <DevSection
        id="draft"
        title="Draft secrets"
        intro="Only on /dev/draft, in their own store: they never count toward the live total, milestones, or unlocks."
      >
        <ResponsiveTable
          caption="Draft secrets"
          rows={[...DRAFT_SECRETS]}
          rowKey={(r) => r.id}
          columns={[
            { header: "Secret", cell: (r) => <Title row={r} />, className: "w-[30%]" },
            { header: "Feature", cell: (r) => r.feature, className: "w-32" },
            { header: "How it's found", cell: (r) => r.how },
          ]}
        />
      </DevSection>

      <DevSection id="unlockables" title="Unlockables" intro="Every fun feature that can be unlocked, by kind.">
        <Unlockables />
      </DevSection>

      <DevSection id="ideas" title="Rough ideas" intro="Not built yet. Any of these might change or never ship.">
        <ResponsiveTable
          caption="Rough secret ideas"
          rows={roughSecretIdeas}
          rowKey={(r) => r.title}
          columns={[
            { header: "Secret", cell: (r) => <Title row={r} />, className: "w-[38%]" },
            { header: "Status", cell: () => <StatusPill tone="idea">Rough idea</StatusPill>, className: "w-40" },
            { header: "How it would be found", cell: (r) => r.how },
          ]}
        />
      </DevSection>
    </>
  );
}
