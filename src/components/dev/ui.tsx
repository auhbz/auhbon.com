import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/** Shared metadata for every /dev page: kept out of search engines. */
export function devMetadata(title: string, path: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}

export function DevPageHeader({ title, intro, asOf, back = true }: { title: string; intro?: ReactNode; asOf?: string; back?: boolean }) {
  return (
    <header className="mb-10">
      {back ? (
        <p className="mb-4">
          <Link href="/dev" className="text-link inline-flex min-h-11 items-center">
            <span aria-hidden="true">←&nbsp;</span>Dev notes
          </Link>
        </p>
      ) : null}
      <h1 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">{title}</h1>
      {intro ? <p className="mt-4 max-w-prose text-pretty text-muted">{intro}</p> : null}
      {asOf ? (
        <p className="mt-2 text-sm text-muted">
          As of <time dateTime={asOf}>{formatDate(asOf)}</time>
        </p>
      ) : null}
    </header>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`));

export function DevSection({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-14 border-t border-line pt-10 first:mt-0 first:border-t-0 first:pt-0">
      <h2 id={`${id}-heading`} className="font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {intro ? <p className="mt-2 max-w-prose text-pretty text-muted">{intro}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/* ---------- Status pills ---------- */

export type PillTone = "done" | "waiting" | "active" | "todo" | "skipped" | "idea";

/**
 * A status pill. The words carry the meaning; the fill, border style and
 * small shape only reinforce it, so nothing depends on color alone.
 */
export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const styles: Record<PillTone, string> = {
    done: "bg-kelp text-kelp-ink border-kelp",
    waiting: "border-ink text-ink font-semibold",
    active: "border-kelp text-kelp",
    todo: "border-muted text-muted",
    skipped: "border-line text-muted",
    idea: "border-dashed border-muted text-muted",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm leading-snug font-medium ${styles[tone]}`}>
      <PillIcon tone={tone} />
      <span>{children}</span>
    </span>
  );
}

function PillIcon({ tone }: { tone: PillTone }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 16 16",
    className: "size-3.5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (tone) {
    case "done":
      return (
        <svg {...common}>
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      );
    case "waiting":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4.5V8l2.5 1.5" />
        </svg>
      );
    case "active":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "todo":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
        </svg>
      );
    case "skipped":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M4 12L12 4" />
        </svg>
      );
    case "idea":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" strokeDasharray="2.5 2.5" />
        </svg>
      );
  }
}

/* ---------- Responsive table ---------- */

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  /** Extra classes for this column's cells on wide screens (e.g. a width). */
  className?: string;
};

/**
 * A real <table> from the sm breakpoint up. On phones the same rows render as
 * a list of cards, the first column as the card's title and the others as
 * labeled pairs, so nothing needs a sideways scroll. Only one version is ever
 * displayed (the other is display:none, which also hides it from assistive tech).
 */
export function ResponsiveTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
}) {
  const [first, ...rest] = columns;
  return (
    <>
      <table className="hidden w-full border-collapse text-left text-[0.95rem] sm:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header} scope="col" className={`border-b border-line py-2 pr-4 text-sm font-semibold text-muted last:pr-0 ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)}>
              {columns.map((col, c) =>
                c === 0 ? (
                  <th key={col.header} scope="row" className={`border-b border-line py-3 pr-4 align-top font-medium ${col.className ?? ""}`}>
                    {col.cell(row)}
                  </th>
                ) : (
                  <td key={col.header} className={`border-b border-line py-3 pr-4 align-top last:pr-0 ${col.className ?? ""}`}>
                    {col.cell(row)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <ul aria-label={caption} className="divide-y divide-line border-y border-line sm:hidden">
        {rows.map((row, i) => (
          <li key={rowKey(row, i)} className="py-4">
            <p className="font-medium">{first.cell(row)}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.95rem]">
              {rest.map((col) => {
                const value = col.cell(row);
                // Skip empty pairs (e.g. a row with no notes) rather than show a bare label.
                if (value == null || value === "") return null;
                return (
                  <div key={col.header} className="contents">
                    <dt className="pt-0.5 text-sm text-muted">{col.header}</dt>
                    <dd className="min-w-0">{value}</dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
