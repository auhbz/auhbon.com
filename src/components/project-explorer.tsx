"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import type { Project } from "@/content/profile";
import { FILTER_EVENT, prefersReducedMotion } from "@/lib/events";

/** The active filter lives in the URL (?stack=Java), so filtered views can be shared. */
const PARAM = "stack";
const URL_EVENT = "portfolio:url";

function subscribe(onChange: () => void) {
  window.addEventListener(URL_EVENT, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(URL_EVENT, onChange);
    window.removeEventListener("popstate", onChange);
  };
}
const readParam = () => new URL(window.location.href).searchParams.get(PARAM);

export function ProjectExplorer({ projects, filters }: { projects: Project[]; filters: string[] }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) for (const t of p.stack) map.set(t, (map.get(t) ?? 0) + 1);
    return map;
  }, [projects]);

  const param = useSyncExternalStore(subscribe, readParam, () => null);
  const active = param && counts.has(param) ? param : null;

  // Curated chips first; a tech picked from a card that isn't curated gets appended.
  const chips = useMemo(() => {
    const list = filters.filter((f) => counts.has(f));
    if (active && !list.includes(active)) list.push(active);
    return list;
  }, [filters, counts, active]);

  const choose = useCallback(
    (tech: string | null) => {
      const next = tech && counts.has(tech) ? tech : null;
      const update = () =>
        flushSync(() => {
          const url = new URL(window.location.href);
          if (next) url.searchParams.set(PARAM, next);
          else url.searchParams.delete(PARAM);
          history.replaceState(null, "", url);
          window.dispatchEvent(new Event(URL_EVENT));
        });
      // Animate projects into their new positions where the browser supports it.
      if ("startViewTransition" in document && !prefersReducedMotion()) document.startViewTransition(update);
      else update();
    },
    [counts],
  );

  // Commands from the palette ("Show Java projects") arrive as events.
  useEffect(() => {
    const onFilter = (e: Event) => choose((e as CustomEvent<string | null>).detail);
    window.addEventListener(FILTER_EVENT, onFilter);
    return () => window.removeEventListener(FILTER_EVENT, onFilter);
  }, [choose, counts]);

  const visible = active ? projects.filter((p) => p.stack.includes(active)) : projects;
  const featured = visible.filter((p) => p.featured);
  const more = visible.filter((p) => !p.featured);
  const summary = active
    ? `Showing ${visible.length} ${visible.length === 1 ? "project" : "projects"} built with ${active}.`
    : `Showing all ${projects.length} projects.`;

  return (
    <>
      <div role="group" aria-label="Filter projects by technology" className="mb-10 flex flex-wrap gap-2">
        <FilterChip label="All" pressed={active === null} onClick={() => choose(null)} />
        {chips.map((tech) => (
          <FilterChip
            key={tech}
            label={tech}
            count={counts.get(tech)}
            pressed={active === tech}
            onClick={() => choose(active === tech ? null : tech)}
          />
        ))}
      </div>
      <p role="status" className="sr-only">
        {summary}
      </p>

      <ul className="divide-y divide-line">
        {featured.map((project) => (
          <li
            key={project.name}
            className="py-8 first:pt-0 last:pb-0"
            style={{ viewTransitionName: `project-${slug(project.name)}` }}
          >
            <article aria-labelledby={`project-${slug(project.name)}`}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h3 id={`project-${slug(project.name)}`} className="font-display text-2xl font-semibold tracking-tight">
                  {project.name}
                </h3>
                <p className="text-sm text-muted">{project.status}</p>
              </div>
              {project.recognition ? (
                <p className="mt-2 inline-block rounded-md bg-kelp px-2.5 py-0.5 text-sm font-medium text-kelp-ink">
                  {project.recognition}
                </p>
              ) : null}
              <p className="mt-3 max-w-prose">{project.summary}</p>
              {project.role ? <p className="mt-2 max-w-prose text-muted">{project.role}</p> : null}
              <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${project.name} tech stack`}>
                {project.stack.map((tech) => (
                  <li key={tech}>
                    <button
                      type="button"
                      aria-pressed={active === tech}
                      aria-label={`${tech}: show projects built with ${tech}`}
                      onClick={() => choose(active === tech ? null : tech)}
                      className="min-h-8 rounded-md bg-surface px-2.5 py-1 text-sm ring-1 ring-line hover:ring-ink/40 aria-pressed:bg-kelp aria-pressed:text-kelp-ink aria-pressed:ring-kelp"
                    >
                      {tech}
                    </button>
                  </li>
                ))}
              </ul>
              <ProjectLinks project={project} className="mt-4" />
            </article>
          </li>
        ))}
      </ul>

      {more.length ? (
        <>
          <h3 className="mt-14 font-display text-xl font-semibold tracking-tight">More projects</h3>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {more.map((project) => (
              <li
                key={project.name}
                className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6"
                style={{ viewTransitionName: `project-${slug(project.name)}` }}
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted">
                    {project.stack.join(", ")}. {project.status}
                  </p>
                </div>
                <div>
                  <p className="text-muted">{project.summary}</p>
                  <ProjectLinks project={project} className="mt-1" />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

function FilterChip({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count?: number;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="pill inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-4 text-[0.95rem] font-medium transition-colors hover:border-ink aria-pressed:border-kelp aria-pressed:bg-kelp aria-pressed:text-kelp-ink"
    >
      {label}
      {count ? (
        <span className="text-sm opacity-70">
          {count}
          <span className="sr-only">{count === 1 ? " project" : " projects"}</span>
        </span>
      ) : null}
    </button>
  );
}

function ProjectLinks({ project, className }: { project: Project; className: string }) {
  if (!project.links?.length) return null;
  return (
    <p className={`${className} flex flex-wrap gap-4`}>
      {project.links.map((link) => (
        <a key={link.href} className="text-link" href={link.href}>
          {link.label}
          <span className="sr-only"> for {project.name}</span>
        </a>
      ))}
    </p>
  );
}

function slug(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
