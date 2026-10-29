import { profile } from "@/content/profile";
import { ExternalLink } from "@/components/external-link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-4 px-5 py-8 text-sm text-muted sm:px-8">
        <p>{profile.name}, {profile.location}</p>
        <p>
          Built with Next.js.{" "}
          <ExternalLink className="text-link" href={`https://github.com/${profile.githubUser}/${profile.domain}`}>
            View the source
          </ExternalLink>
        </p>
      </div>
    </footer>
  );
}
