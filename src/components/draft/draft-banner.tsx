import Link from "next/link";

/** The slim strip at the top of /dev/draft. */
export function DraftBanner() {
  return (
    <div className="draft-banner border-b border-line bg-surface">
      <p className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 text-sm sm:px-8">
        <span className="inline-flex items-center gap-2 font-medium">
          <span aria-hidden="true" className="draft-tag">
            draft
          </span>
          Draft playground: ideas being tested before they go live
        </span>
        <span className="flex gap-4">
          <Link href="/" className="text-link inline-flex min-h-11 items-center">
            Live site
          </Link>
          <Link href="/dev/draft/diff" className="text-link inline-flex min-h-11 items-center">
            What&apos;s different
          </Link>
        </span>
      </p>
    </div>
  );
}
