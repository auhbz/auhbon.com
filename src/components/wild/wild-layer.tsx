"use client";

import { useFunMode, useUnlocked } from "@/lib/unlocks";
import { useWild } from "@/lib/wild/store";
import { MonkeyMode } from "@/components/wild/monkey-mode";
import { GravityMode } from "@/components/wild/gravity-mode";
import { Announcements } from "@/components/wild/announcements";
import { Portals } from "@/components/wild/portals";
import { ToyBox } from "@/components/toys/toy-box";
import "./wild.css";

/**
 * The WILD workstream's live features, mounted once in the layout: the Wild &
 * Wondrous modes, the toy box and its toys, the portal device, and the
 * one-time unlock announcements. Each checks Fun mode and its own unlock.
 */
export function WildLayer() {
  const fun = useFunMode() === "fun";
  const wild = useWild();
  const monkeys = useUnlocked("wild:monkeys");
  const gravity = useUnlocked("wild:gravity");
  const on = fun && wild.on;
  return (
    <>
      {on && wild.mode === "monkeys" && monkeys ? <MonkeyMode /> : null}
      {on && wild.mode === "gravity" && gravity ? <GravityMode /> : null}
      <ToyBox />
      <Portals />
      <Announcements />
    </>
  );
}
