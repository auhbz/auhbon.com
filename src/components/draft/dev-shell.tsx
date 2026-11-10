"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The /dev pages' frame: a narrow column with a "working notes" note. The
 * draft playground (/dev/draft) mirrors the full-width home page instead, so
 * it skips the frame and shows its own banner.
 */
export function DevShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/dev/draft") return <>{children}</>;
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="mb-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
        Working notes for this site. Not linked from the main pages.
      </p>
      {children}
    </div>
  );
}
