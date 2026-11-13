"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_DRAFT, getDraft, subscribeDraft } from "@/lib/draft/store";
import { BoardGames } from "@/components/draft/dice";

/** Everything interactive that only exists on /dev/draft, switched by the draft store. */
export function DraftExtras() {
  const draft = useSyncExternalStore(subscribeDraft, getDraft, () => DEFAULT_DRAFT);
  return (
    <>
      {draft.look === "boardgames" ? (
        <div data-draft-slot="dice">
          <BoardGames />
        </div>
      ) : null}
    </>
  );
}
