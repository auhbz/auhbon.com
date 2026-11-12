"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_DRAFT, getDraft, subscribeDraft } from "@/lib/draft/store";
import { Slot } from "@/components/draft/slot";
import { BoardGames } from "@/components/draft/dice";

const HERO = 'section[aria-labelledby="hero-name"]';

/** Everything interactive that only exists on /dev/draft, switched by the draft store. */
export function DraftExtras() {
  const draft = useSyncExternalStore(subscribeDraft, getDraft, () => DEFAULT_DRAFT);
  return (
    <>
      {draft.look === "boardgames" ? (
        <Slot id="dice" target={HERO}>
          <BoardGames />
        </Slot>
      ) : null}
    </>
  );
}
