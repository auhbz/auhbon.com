"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { BURST_EVENT, SOUND_EVENT, type Burst } from "@/lib/fx";
import { activeVariant, DEFAULT_FUN, getFun, lookActive, subscribeFun } from "@/lib/fun";
import { FxEngine } from "@/lib/fx/engine";
import { play, type SoundEvent, type SoundPack } from "@/lib/sound";
import { prefersReducedMotion } from "@/lib/events";

const noSubscribe = () => () => {};

function playIfOn(event: SoundEvent) {
  const pack = activeVariant(getFun(), "sound") as SoundPack | null;
  if (pack) play(pack, event);
}

/**
 * Hosts the effects engine on one full-screen canvas. It ignores the pointer
 * and is hidden from assistive tech; everything it draws is decoration.
 */
export function FxCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<FxEngine | null>(null);
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);

  useEffect(() => {
    if (!canvas.current) return;
    const fx = new FxEngine(canvas.current, playIfOn);
    engine.current = fx;
    const onBurst = (e: Event) => {
      const { x, y, kind } = (e as CustomEvent<Burst>).detail;
      fx.burst(kind, x, y);
    };
    window.addEventListener(BURST_EVENT, onBurst);
    return () => {
      window.removeEventListener(BURST_EVENT, onBurst);
      fx.destroy();
      engine.current = null;
    };
  }, []);

  const trail = activeVariant(fun, "trail");
  const dots = activeVariant(fun, "dots");
  const buttons = activeVariant(fun, "buttons");
  const look = lookActive(fun);

  useEffect(() => {
    engine.current?.configure({ trail, dots, buttons, look, reduced });
  }, [trail, dots, buttons, look, reduced]);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[55] h-full w-full" />;
}

/**
 * Sound effects for ordinary interactions: a hover sound when the pointer
 * enters something interactive, and a press sound on click/tap.
 */
export function SoundFx() {
  useEffect(() => {
    const INTERACTIVE = "a, button, [role='option'], [data-letter], [data-rock], [data-egg]";
    let lastHover = 0;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element).closest(INTERACTIVE);
      if (!el || el.contains(e.relatedTarget as Node)) return;
      const now = performance.now();
      if (now - lastHover < 90) return;
      lastHover = now;
      playIfOn("hover");
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest("a, button, [role='option'], [data-letter]")) playIfOn("press");
    };
    const onSound = (e: Event) => playIfOn((e as CustomEvent<SoundEvent>).detail);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("click", onClick);
    window.addEventListener(SOUND_EVENT, onSound);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick);
      window.removeEventListener(SOUND_EVENT, onSound);
    };
  }, []);
  return null;
}
