import { versions, versionAnchor } from "@/lib/changelog";
import { ExternalLink } from "@/components/external-link";
import { Markdown } from "@/components/dev/markdown";
import { DevPageHeader, devMetadata } from "@/components/dev/ui";

export const metadata = devMetadata("Versions", "/dev/versions", "Every version of auhbon.com and what changed.");

export default function Versions() {
  return (
    <>
      <DevPageHeader
        title="Versions"
        intro={`Every version of the site, newest first, read from CHANGELOG.md when the site is built. Each one is saved as a release/<version> branch on GitHub. ${versions.length} versions so far.`}
      />

      <nav aria-labelledby="versions-toc" className="mb-12">
        <h2 id="versions-toc" className="font-display text-xl font-semibold tracking-tight">
          Jump to a version
        </h2>
        <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
          {versions.map((v) => (
            <li key={v.version}>
              <a href={`#${versionAnchor(v.version)}`} className="text-link inline-flex min-h-11 items-center sm:min-h-9">
                {v.version}
                {v.label ? `: ${v.label}` : ""}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ol className="space-y-0">
        {versions.map((v) => (
          <li key={v.version}>
            <article aria-labelledby={`${versionAnchor(v.version)}-heading`} id={versionAnchor(v.version)} className="border-t border-line py-10">
              <h2 id={`${versionAnchor(v.version)}-heading`} className="font-display text-2xl font-semibold tracking-tight text-balance">
                <span className="text-muted">{v.version}</span>
                {v.label ? <>: {v.label}</> : null}
              </h2>
              <p className="mt-2 text-sm">
                <ExternalLink href={v.branchUrl} className="text-link inline-flex min-h-11 items-center sm:min-h-6">
                  release/{v.version} on GitHub
                </ExternalLink>
              </p>
              <div className="mt-4">
                {v.notes ? <Markdown source={v.notes} /> : <p className="text-muted">No notes in the changelog.</p>}
              </div>
            </article>
          </li>
        ))}
      </ol>
    </>
  );
}
