import { Suspense } from "react";
import { education, experience, profile, projectFilters, projects, skills, type Role } from "@/content/profile";
import { GitHubRepos, GitHubReposSkeleton } from "@/components/github-repos";
import { HeroName } from "@/components/hero-name";
import { ProjectExplorer } from "@/components/project-explorer";
import { ExternalLink } from "@/components/external-link";

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function formatMonth(iso: string) {
  return monthFormat.format(new Date(`${iso}-01T00:00:00Z`));
}

function Dates({ role }: { role: Role }) {
  return (
    <>
      <time dateTime={role.start}>{formatMonth(role.start)}</time>
      {" to "}
      {role.end ? <time dateTime={role.end}>{formatMonth(role.end)}</time> : "present"}
    </>
  );
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="border-t border-line">
      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[13rem_1fr] lg:gap-12">
        <div>
          {/* tabIndex lets "jump to section" move focus here for keyboard and screen-reader users. */}
          <h2
            id={headingId}
            tabIndex={-1}
            className="font-display text-2xl font-semibold tracking-tight focus:outline-none lg:sticky lg:top-24"
          >
            {title}
          </h2>
        </div>
        <div className="min-w-0">
          {intro ? <p className="mb-8 max-w-prose text-muted">{intro}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.role,
  url: profile.siteUrl,
  address: { "@type": "PostalAddress", addressLocality: "Los Angeles", addressRegion: "CA", addressCountry: "US" },
  alumniOf: education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.school })),
  sameAs: profile.links.map((l) => l.href),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, developer-authored data; `<` is escaped so content can never close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c") }}
      />
      {/* Hero: the one bold typographic moment on the page. */}
      <section aria-labelledby="hero-name" className="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
        <HeroName id="hero-name" name={profile.name} />
        <div className="hero-rest mt-8 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-[38rem]">
            <p className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              {profile.role} in {profile.location}
            </p>
            <p className="mt-4 text-pretty text-muted">{profile.intro}</p>
          </div>
          <ul className="flex flex-wrap gap-3" aria-label="Profiles">
            {profile.email ? (
              <li>
                <ExternalLink
                  href={`mailto:${profile.email}`}
                  className="pill pill-filled inline-flex min-h-11 items-center rounded-full bg-kelp px-5 font-medium text-kelp-ink hover:opacity-90"
                >
                  Email me
                </ExternalLink>
              </li>
            ) : null}
            {profile.links.map((link) => (
              <li key={link.href}>
                <ExternalLink
                  href={link.href}
                  className="pill inline-flex min-h-11 items-center rounded-full border border-ink/25 px-5 font-medium hover:border-ink"
                >
                  {link.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section id="work" title="Selected work">
        <ProjectExplorer projects={projects} filters={projectFilters} />
      </Section>

      <Section
        id="github"
        title="On GitHub"
        intro="My most recently updated public repositories, pulled from GitHub and refreshed every hour."
      >
        <Suspense fallback={<GitHubReposSkeleton />}>
          <GitHubRepos />
        </Suspense>
      </Section>

      <Section id="experience" title="Experience">
        <ol className="relative border-l border-line">
          {experience.map((role) => (
            <li key={`${role.org}-${role.start}`} className="relative pb-10 pl-6 last:pb-0">
              {/* Decorative dot. Easter egg: it's clickable, for anyone with a keen eye. */}
              <span
                aria-hidden="true"
                data-egg="dot"
                data-current={!role.end}
                className="absolute top-2 -left-[5px] size-2.5 cursor-pointer rounded-full bg-kelp transition-transform before:absolute before:-inset-2 before:content-[''] hover:scale-150"
              />
              <h3 className="font-display text-lg font-semibold tracking-tight">{role.title}</h3>
              <p>{role.org}</p>
              <p className="text-sm text-muted">
                <Dates role={role} />
                {role.location ? `, ${role.location}` : null}
              </p>
              {role.highlights?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-muted">
                  {role.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>

      <Section id="education" title="Education">
        {education.map((e) => (
          <div key={e.school}>
            <h3 className="font-display text-lg font-semibold tracking-tight">{e.school}</h3>
            {e.degree ? <p>{e.degree}</p> : null}
            <p className="text-sm text-muted">
              <time dateTime={e.start}>{e.start}</time> to <time dateTime={e.end}>{e.end}</time>
            </p>
            {e.notes?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-muted">
                {e.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </Section>

      <Section id="skills" title="Skills">
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {skills.map((s) => (
            <div key={s.group}>
              <dt className="font-medium">{s.group}</dt>
              <dd className="mt-1 text-muted">{s.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="contact" title="Contact">
        <p className="max-w-prose font-display text-2xl leading-snug font-medium tracking-tight sm:text-3xl">
          I&apos;m looking for my next software engineering role in Los Angeles, hybrid or on-site.
        </p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2" aria-label="Ways to reach me">
          {profile.email ? (
            <li>
              <ExternalLink className="text-link" href={`mailto:${profile.email}`}>
                {profile.email}
              </ExternalLink>
            </li>
          ) : null}
          {profile.links.map((link) => (
            <li key={link.href}>
              <ExternalLink className="text-link" href={link.href}>
                {link.label}
              </ExternalLink>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

