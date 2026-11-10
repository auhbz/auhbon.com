import type { Metadata } from "next";
import { DevShell } from "@/components/draft/dev-shell";

/**
 * Working notes reachable only by URL: never linked from the main site, left
 * out of the sitemap, disallowed in robots.txt, and marked noindex here (each
 * page repeats it) and with an X-Robots-Tag header in next.config.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function DevLayout({ children }: LayoutProps<"/dev">) {
  // DevShell draws the usual narrow frame; /dev/draft opts out to mirror the full home page.
  return <DevShell>{children}</DevShell>;
}
