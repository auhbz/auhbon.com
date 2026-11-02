import { DEV_AS_OF, roughSecretIdeas } from "@/content/dev";
import { MILESTONES, SECRET_GOAL, SECRET_LIST } from "@/lib/fun";
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

      <DevSection id="implemented" title="Implemented">
        <ResponsiveTable
          caption="Implemented secrets"
          rows={secrets}
          rowKey={(r) => r.id}
          columns={[
            { header: "Secret", cell: (r) => <><span className="text-muted">{r.n}.</span> <Title row={r} /></>, className: "w-[38%]" },
            { header: "Status", cell: () => <StatusPill tone="done">Implemented</StatusPill>, className: "w-40" },
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
