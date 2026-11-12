"use client";

import { AskMe } from "@/components/ask-me";
import { Chicken } from "@/components/chicken";
import { ClayPots } from "@/components/clay-pots";
import { FunSecrets } from "@/components/fun-secrets";
import { Leaflings } from "@/components/leaflings";

/**
 * Fun-mode extras from the EFFECTS workstream (MP5): passive secrets (clicks,
 * shuffles, coming back, early mornings, dozing off), the "Quick question"
 * bubble, and small hidden things (a chicken, clay pots and leaflings). Each
 * one checks Fun mode and its own unlock, so nothing shows on the clean site.
 */
export function FunExtras() {
  return (
    <>
      <FunSecrets />
      <AskMe />
      <Chicken />
      <ClayPots />
      <Leaflings />
    </>
  );
}
