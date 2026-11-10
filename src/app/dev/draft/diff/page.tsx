import Link from "next/link";
import { DRAFT_AS_OF, DRAFT_FEATURES, type DraftStatus } from "@/content/draft";
import { DevPageHeader, DevSection, ResponsiveTable, StatusPill, devMetadata, type PillTone } from "@/components/dev/ui";
import { DRAFT_SECRETS } from "@/lib/draft/store";

export const metadata = devMetadata("Draft vs live", "/dev/draft/diff", "Every difference between the draft playground and the live site.");

const TONE: Record<DraftStatus, PillTone> = { idea: "idea", testing: "active", ready: "done" };
const LABEL: Record<DraftStatus, string> = { idea: "Idea", testing: "Testing", ready: "Ready to ship" };

export default function DraftDiff() {
  const counts = (["ready", "testing", "idea"] as const).map((s) => ({ s, n: DRAFT_FEATURES.filter((f) => f.status === s).length }));
  return (
    <>
      <DevPageHeader
        title="Draft vs live"
        asOf={DRAFT_AS_OF}
        intro={
          <>
            Everything on <Link className="text-link" href="/dev/draft">the draft playground</Link> that isn&apos;t on{" "}
            <Link className="text-link" href="/">the live site</Link>. Everything else on the draft page is the live home page itself.
          </>
        }
      />
      <DevSection id="checklist" title="Checklist">
        <p className="mb-4 text-muted">
          {counts.map((c, i) => (
            <span key={c.s}>
              {i ? " · " : ""}
              {c.n} {LABEL[c.s].toLowerCase()}
            </span>
          ))}
        </p>
        <ResponsiveTable
          caption="Draft features"
          rows={DRAFT_FEATURES}
          rowKey={(r) => r.id}
          columns={[
            { header: "Feature", cell: (r) => r.feature, className: "w-[28%]" },
            { header: "Where", cell: (r) => r.where, className: "w-[26%]" },
            { header: "Status", cell: (r) => <StatusPill tone={TONE[r.status]}>{LABEL[r.status]}</StatusPill>, className: "w-40" },
            { header: "Notes", cell: (r) => r.notes ?? "" },
          ]}
        />
      </DevSection>
      <DevSection id="draft-secrets" title="Draft secrets" intro="Tracked on their own: they never count toward the live total, its milestones or the game-mode unlock.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {DRAFT_SECRETS.map((s) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <span aria-hidden="true">{s.icon}</span>
              <span>
                <span className="font-medium">{s.title}</span> <span className="text-muted">({s.feature})</span>
              </span>
            </li>
          ))}
        </ul>
      </DevSection>
    </>
  );
}
