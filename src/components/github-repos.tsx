import { getRecentRepos } from "@/lib/github";
import { profile } from "@/content/profile";
import { ExternalLink } from "@/components/external-link";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export async function GitHubRepos() {
  const repos = await getRecentRepos(profile.githubUser);
  const profileUrl = `https://github.com/${profile.githubUser}`;

  if (!repos || repos.length === 0) {
    return (
      <p className="text-muted">
        GitHub didn&apos;t respond just now.{" "}
        <ExternalLink className="text-link" href={profileUrl}>
          See my repositories on GitHub
        </ExternalLink>
        .
      </p>
    );
  }

  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
      {repos.map((repo) => (
        <li key={repo.name} className="flex flex-col gap-2 bg-surface p-5 sm:last:odd:col-span-2">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            <ExternalLink className="text-link" href={repo.url}>
              {repo.name}
              <span className="sr-only"> on GitHub</span>
            </ExternalLink>
          </h3>
          {repo.description ? (
            <p className="text-[0.975rem] text-muted">{repo.description}</p>
          ) : null}
          <dl className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-2 text-sm text-muted">
            {repo.language ? (
              <div className="flex gap-1.5">
                <dt className="sr-only">Language</dt>
                <dd>{repo.language}</dd>
              </div>
            ) : null}
            <div className="flex gap-1.5">
              <dt>Updated</dt>
              <dd>
                <time dateTime={repo.pushedAt}>{dateFormat.format(new Date(repo.pushedAt))}</time>
              </dd>
            </div>
            {repo.stars > 0 ? (
              <div className="flex gap-1.5">
                <dt>Stars</dt>
                <dd>{repo.stars}</dd>
              </div>
            ) : null}
          </dl>
        </li>
      ))}
    </ul>
  );
}

export function GitHubReposSkeleton() {
  return (
    <div role="status" className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
      <span className="sr-only">Loading recent repositories</span>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} aria-hidden="true" className="h-32 bg-surface" />
      ))}
    </div>
  );
}
