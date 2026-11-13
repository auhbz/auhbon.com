"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_DRAFT, getDraft, subscribeDraft } from "@/lib/draft/store";
import { DEFAULT_FUN, getFun, lookActive, subscribeFun } from "@/lib/fun";
import { BoardGames } from "@/components/draft/dice";

/** Everything interactive that only exists on /dev/draft, switched by the draft store. */
export function LiveBoardGames() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  return lookActive(fun) === "boardgames" ? <BoardGames draft={false} /> : null;
}

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
