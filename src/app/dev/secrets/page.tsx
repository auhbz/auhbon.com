import { DEV_AS_OF, roughSecretIdeas } from "@/content/dev";
import { MILESTONES, SECRET_CATEGORIES, SECRET_GOAL, SECRET_LIST, type SecretCategory } from "@/lib/fun";
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
  Games: "Inside the game modes (these don't count toward unlocking them).",
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

const summaryClass =
  "inline-flex min-h-11 cursor-pointer items-center text-kelp underline decoration-1 underline-offset-[0.2em] hover:decoration-2";

export default function Secrets() {
  const count = SECRET_LIST.length;
  const pct = Math.min(100, (count / SECRET_GOAL) * 100);
  const next = MILESTONES.find((m) => m.at > count);
  return (
    <>
      <DevPageHeader
        title="Secrets"
        asOf={DEV_AS_OF}
        intro="Every secret hidden on the site. How each one is found is a spoiler, so it stays hidden until you open it."
      />

      <DevSection id="progress" title="Progress">
        <p className="font-display text-xl font-semibold tracking-tight">
          {count} of {SECRET_GOAL} secrets implemented
        </p>
        <div aria-hidden="true" className="relative mt-3 h-2.5 max-w-xl rounded-full border border-muted">
          <div className="h-full rounded-full bg-kelp" style={{ width: `${pct}%` }} />
          {MILESTONES.filter((m) => m.at < SECRET_GOAL).map((m) => (
            <span key={m.at} className="absolute -top-1 -bottom-1 w-0.5 bg-ink" style={{ left: `${(m.at / SECRET_GOAL) * 100}%` }} />
          ))}
        </div>
        <p className="mt-3 text-muted">
          {next ? `Next milestone at ${next.at}: ${next.name}.` : "Every milestone reached."}
        </p>
        <ul className="mt-4 grid gap-1.5 text-[0.95rem] sm:grid-cols-2" aria-label="Milestones">
          {MILESTONES.map((m) => (
            <li key={m.at} className="flex items-baseline gap-2">
              <span aria-hidden="true">{m.icon}</span>
              <span>
                <span className="font-medium">{m.at}</span>: {m.name}{" "}
                <span className="text-muted">({count >= m.at ? "reached" : `${m.at - count} to go`})</span>
              </span>
            </li>
          ))}
        </ul>
      </DevSection>

      <DevSection
        id="implemented"
        title="Implemented"
        intro="Grouped by kind. Difficulty is a rough estimate of how hard each one is to stumble on or work out."
      >
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
                    { header: "Secret", cell: (r) => <><span className="text-muted">{r.n}.</span> <Title row={r} /></>, className: "w-[38%]" },
                    { header: "Difficulty", cell: (r) => <Difficulty level={r.difficulty} />, className: "w-40" },
                    {
                      header: "How it's found",
                      cell: (r) => (
                        <details className="group">
                          <summary className={summaryClass}>
                            <span className="group-open:hidden">Show how</span>
                            <span className="hidden group-open:inline">Hide how</span>
                            <span className="sr-only"> to find {r.title}</span>
                          </summary>
                          <p className="pb-1">{r.how}</p>
                        </details>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          );
        })}

        <details className="group mt-6 rounded-lg border border-line bg-surface px-4">
          <summary className={`${summaryClass} font-medium`}>
            <span className="group-open:hidden">Show all answers</span>
            <span className="hidden group-open:inline">Hide all answers</span>
          </summary>
          <ol className="list-decimal space-y-1.5 pb-4 pl-6">
            {secrets.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.title}</span>: {s.how}
              </li>
            ))}
          </ol>
        </details>
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
