import { CATEGORIES, LOOKS, SECRET_LIST } from "@/lib/fun";
import { DRAFT_LOOKS, DRAFT_SECRETS } from "@/lib/draft/store";

/**
 * Everything Bells & whistles can do, generated from fun.ts (live) and the
 * draft store: each category's options, the themes, and how many secrets
 * there are. Draft-only entries are marked.
 */
export function EffectsCatalog() {
  const rows = [
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, options: c.options.map((o) => ({ label: o.label, description: o.description, draft: false })) })),
    {
      id: "chaos",
      label: "Chaos",
      options: [{ label: "Unleash the monkeys", description: "Monkeys, bananas, a gorilla and a peanut hammer", draft: true }],
    },
    {
      id: "themes",
      label: "Themes",
      options: [
        ...LOOKS.map((l) => ({ label: l.label, description: l.description, draft: false })),
        ...DRAFT_LOOKS.map((l) => ({ label: l.label, description: l.description, draft: true })),
      ],
    },
  ];
  return (
    <>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-start">
            <p className="font-medium">
              {r.label} <span className="text-sm text-muted">({r.options.length})</span>
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label={`${r.label} options`}>
              {r.options.map((o) => (
                <li
                  key={o.label}
                  title={o.description}
                  className={`rounded-md border px-2 py-1.5 text-sm ${o.draft ? "border-dashed border-muted" : "border-line bg-surface"}`}
                >
                  {o.label}
                  {o.draft ? <span className="draft-tag ml-1.5">draft</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        Secrets: {SECRET_LIST.length} live, plus {DRAFT_SECRETS.length} draft-only (kept apart, never counted toward the live total).
      </p>
    </>
  );
}
