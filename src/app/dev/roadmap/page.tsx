import Link from "next/link";
import { DEV_AS_OF, mobileIdeas, roadmap, type RoadmapItem, type RoadmapStatus } from "@/content/dev";
import { versions, versionAnchor } from "@/lib/changelog";
import { DevPageHeader, DevSection, ResponsiveTable, StatusPill, devMetadata, type PillTone } from "@/components/dev/ui";

export const metadata = devMetadata("Roadmap", "/dev/roadmap", "Working roadmap for auhbon.com.");

const tone: Record<RoadmapStatus, PillTone> = {
  Shipped: "done",
  "Waiting on Auhbon": "waiting",
  WIP: "active",
  Planned: "todo",
  Skipped: "skipped",
};

const released = new Set(versions.map((v) => v.version));

function Item({ row }: { row: RoadmapItem }) {
  if (row.version && released.has(row.version)) {
    return (
      <Link href={`/dev/versions#${versionAnchor(row.version)}`} className="text-link">
        {row.item}
      </Link>
    );
  }
  return <>{row.item}</>;
}

export default function Roadmap() {
  const counts = (Object.keys(tone) as RoadmapStatus[])
    .map((s) => ({ status: s, n: roadmap.filter((r) => r.status === s).length }))
    .filter((c) => c.n > 0);
  return (
    <>
      <DevPageHeader
        title="Roadmap"
        asOf={DEV_AS_OF}
        intro={counts.map((c) => `${c.status}: ${c.n}`).join(" · ")}
      />
      <DevSection id="items" title="Items">
        <ResponsiveTable
          caption="Roadmap items"
          rows={roadmap}
          rowKey={(r) => r.item}
          columns={[
            { header: "Item", cell: (r) => <Item row={r} />, className: "w-[34%]" },
            { header: "Status", cell: (r) => <StatusPill tone={tone[r.status]}>{r.status}</StatusPill>, className: "w-44" },
            { header: "Notes", cell: (r) => (r.notes ? <span className="text-pretty">{r.notes}</span> : null) },
          ]}
        />
      </DevSection>
      <DevSection id="mobile" title="Mobile ideas" intro="Being built on the 1.18.0 preview branch.">
        <ul className="max-w-prose list-disc space-y-1.5 pl-5">
          {mobileIdeas.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      </DevSection>
    </>
  );
}
