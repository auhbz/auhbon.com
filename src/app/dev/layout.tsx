import type { Metadata } from "next";

/**
 * Working notes reachable only by URL: never linked from the main site, left
 * out of the sitemap, disallowed in robots.txt, and marked noindex here (each
 * page repeats it) and with an X-Robots-Tag header in next.config.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function DevLayout({ children }: LayoutProps<"/dev">) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="mb-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
        Working notes for this site. Not linked from the main pages.
      </p>
      {children}
    </div>
  );
}
