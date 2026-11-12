"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_DRAFT, getDraft, subscribeDraft } from "@/lib/draft/store";
import { Slot } from "@/components/draft/slot";
import { Chaos } from "@/components/draft/chaos";
import { BoardGames } from "@/components/draft/dice";
import { Portals } from "@/components/draft/portals";

const HERO = 'section[aria-labelledby="hero-name"]';

/** Everything interactive that only exists on /dev/draft, switched by the draft store. */
export function DraftExtras() {
  const draft = useSyncExternalStore(subscribeDraft, getDraft, () => DEFAULT_DRAFT);
  return (
    <>
      {draft.chaos ? <Chaos /> : null}
      {draft.look === "boardgames" ? (
        <Slot id="dice" target={HERO}>
          <BoardGames />
        </Slot>
      ) : null}
      <Portals />
    </>
  );
}
