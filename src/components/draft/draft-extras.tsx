"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_DRAFT, getDraft, subscribeDraft } from "@/lib/draft/store";
import { DEFAULT_FUN, getFun, lookActive, subscribeFun } from "@/lib/fun";
import { Slot } from "@/components/draft/slot";
import { Chaos } from "@/components/draft/chaos";
import { Dice } from "@/components/draft/dice";
import { PhoBowl } from "@/components/draft/pho-bowl";
import { Climber, FlabbyPerch } from "@/components/draft/pico-extras";
import { Portals } from "@/components/draft/portals";

const HERO = 'section[aria-labelledby="hero-name"]';

/** Everything interactive that only exists on /dev/draft, switched by the draft and live stores. */
export function DraftExtras() {
  const draft = useSyncExternalStore(subscribeDraft, getDraft, () => DEFAULT_DRAFT);
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const pico = lookActive(fun) === "pico8" && !draft.look;
  return (
    <>
      {draft.chaos ? <Chaos /> : null}
      {draft.look === "pho" ? (
        <Slot id="pho-bowl" target={HERO}>
          <PhoBowl />
        </Slot>
      ) : null}
      {draft.look === "boardgames" ? (
        <Slot id="dice" target={HERO}>
          <Dice />
        </Slot>
      ) : null}
      {pico ? <Climber /> : null}
      {pico ? <FlabbyPerch /> : null}
      <Portals />
    </>
  );
}
