import { DevPageHeader, DevSection, StatusPill, devMetadata, formatDate, type PillTone } from "@/components/dev/ui";
import { REVIEW, REVIEW_AS_OF, REVIEW_MP, type ReviewKind } from "@/content/review";

export const metadata = devMetadata(
  "Review",
  "/dev/review",
  "Everything that needs Auhbon's eyes, a decision, or his hands before the next Major Push.",
);

const kindLabel: Record<ReviewKind, string> = { review: "Review", decide: "Decide", do: "Do" };
const kindTone: Record<ReviewKind, PillTone> = { review: "active", decide: "waiting", do: "todo" };

export default function ReviewPage() {
  const total = REVIEW.reduce((n, t) => n + t.items.length, 0);
  return (
    <>
      <DevPageHeader
        title={`Review after ${REVIEW_MP}`}
        asOf={REVIEW_AS_OF}
        intro={`Your one list before sending the next Major Push: ${total} items, newest work first. If something isn't here, it's done and needs nothing from you. Updated ${formatDate(REVIEW_AS_OF)}.`}
      />
      {REVIEW.map((tier) => (
        <DevSection key={tier.id} id={tier.id} title={tier.title} intro={tier.intro}>
          <ul className="space-y-3">
            {tier.items.map((item) => (
              <li key={item.id}>
                <details className="group rounded-lg border border-line px-4 py-3 open:pb-4">
                  <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">
                      ▸
                    </span>
                    <span className="font-semibold">{item.title}</span>
                    <StatusPill tone={kindTone[item.kind]}>{kindLabel[item.kind]}</StatusPill>
                    <span className="text-sm text-muted">
                      {item.area} · {item.effort}
                    </span>
                    <span className="basis-full pl-6 text-pretty text-muted">{item.summary}</span>
                  </summary>
                  <div className="mt-3 space-y-3 pl-6">
                    {item.details?.length ? (
                      <ul className="list-disc space-y-1.5 pl-5 text-pretty">
                        {item.details.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    ) : null}
                    {item.recommend ? (
                      <p className="text-pretty">
                        <span className="font-semibold">My recommendation: </span>
                        {item.recommend}
                      </p>
                    ) : null}
                    {item.links?.length ? (
                      <p className="flex flex-wrap gap-x-4 gap-y-1">
                        {item.links.map((l) => (
                          <a key={l.href} href={l.href} className="underline underline-offset-4">
                            {l.label}
                          </a>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </DevSection>
      ))}
    </>
  );
}
