"use client";

import type { ReactNode } from "react";
import { holdToy } from "@/lib/toys";
import { sound } from "@/lib/fx";

/** The little bar of controls for the toy in hand, just above the box. */
export function ToyToolbar({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={`${label} controls`}
      data-wild-ui
      data-toy-toolbar
      className="fixed right-3 bottom-[4.25rem] z-[58] flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-1.5 rounded-xl border border-line bg-surface p-1.5 text-sm text-ink shadow-lg"
    >
      {children}
      <button
        type="button"
        onClick={() => {
          holdToy(null);
          sound("pop");
        }}
        className="min-h-10 rounded-full border border-line px-3 font-medium hover:border-ink/40"
      >
        Put back
      </button>
    </div>
  );
}

export const toolButton = "min-h-10 rounded-full border border-line px-3 hover:border-ink/40 aria-pressed:border-kelp aria-pressed:bg-kelp aria-pressed:text-kelp-ink";
