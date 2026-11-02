import { DEV_AS_OF, handsOnTasks, type HandsOnTask, type TaskStatus, type TaskType } from "@/content/dev";
import { DevPageHeader, DevSection, ResponsiveTable, StatusPill, devMetadata, type Column, type PillTone } from "@/components/dev/ui";

export const metadata = devMetadata("Hands-on tasks", "/dev/hands-on-tasks", "Things only Auhbon can decide or do for auhbon.com.");

const typeLabel: Record<TaskType, string> = { decide: "For Auhbon to decide", do: "For Auhbon to do" };
const tone: Record<TaskStatus, PillTone> = { "To do": "todo", WIP: "active", Done: "done" };
// WIP first among open items, then To do; Done last. Ties keep the data file's order.
const rank: Record<TaskStatus, number> = { WIP: 0, "To do": 1, Done: 2 };

const columns: Column<HandsOnTask>[] = [
  { header: "Task", cell: (t) => t.task, className: "w-[34%]" },
  { header: "Type", cell: (t) => typeLabel[t.type], className: "w-48" },
  { header: "Status", cell: (t) => <StatusPill tone={tone[t.status]}>{t.status}</StatusPill>, className: "w-28" },
  { header: "Details", cell: (t) => t.details ?? null },
];

export default function HandsOnTasks() {
  const sorted = handsOnTasks.map((t, i) => ({ t, i })).sort((a, b) => rank[a.t.status] - rank[b.t.status] || a.i - b.i).map((x) => x.t);
  const open = sorted.filter((t) => t.status !== "Done");
  const done = sorted.filter((t) => t.status === "Done");
  return (
    <>
      <DevPageHeader
        title="Hands-on tasks"
        asOf={DEV_AS_OF}
        intro={`Things only Auhbon can decide or do. ${open.length} open, ${done.length} done.`}
      />
      <DevSection id="open" title="Open">
        {open.length ? (
          <ResponsiveTable caption="Open tasks" rows={open} rowKey={(t) => t.task} columns={columns} />
        ) : (
          <p className="text-muted">Nothing open right now.</p>
        )}
      </DevSection>
      <DevSection id="done" title="Done">
        <ResponsiveTable caption="Done tasks" rows={done} rowKey={(t) => t.task} columns={columns} />
      </DevSection>
    </>
  );
}
