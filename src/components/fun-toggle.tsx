"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { DEFAULT_FUN, getFun, isFunMode, setMode, subscribeFun } from "@/lib/fun";
import { burst, sound, toast } from "@/lib/fx";
import { GoblinGuide } from "@/components/goblin";
import { HERO_WAVE_EVENT } from "@/components/easter-eggs";

const noSubscribe = () => () => {};
let arriveTimer = 0;

/**
 * Switch to Fun mode with a fanfare: confetti from the toggle, a wave from the
 * name, and the Bells & whistles button and secrets chip arriving with a bounce
 * (CSS keys off data-fun-arrive). The first time, the default effects come on too.
 */
export function enterFunMode({ quiet = false }: { quiet?: boolean } = {}) {
  if (isFunMode(getFun())) return;
  const first = !getFun().funSeen;
  setMode("fun");
  const d = document.documentElement.dataset;
  d.funArrive = "true";
  window.clearTimeout(arriveTimer);
  arriveTimer = window.setTimeout(() => delete d.funArrive, 2600);
  const r = document.querySelector("[data-fun-toggle]")?.getBoundingClientRect();
  const x = r ? r.left + r.width * 0.75 : window.innerWidth / 2;
  const y = r ? r.top + r.height / 2 : window.innerHeight / 3;
  burst("confetti", x, y);
  window.setTimeout(() => burst("sparks", x, y + 10), 180);
  window.setTimeout(() => burst("confetti"), 320);
  window.dispatchEvent(new Event(HERO_WAVE_EVENT));
  sound("secret");
  if (!quiet) toast(first ? "Fun mode! Effects are on, and secrets are hiding. Open Bells & whistles to explore." : "Fun mode is back on.");
}

/** Back to the plain portfolio. Secrets, unlocks and settings are all kept for next time. */
export function enterBoringMode() {
  if (!isFunMode(getFun())) return;
  // Close any open playground panel first (they're about to disappear).
  document.querySelectorAll<HTMLElement>(".bells-panel:popover-open").forEach((p) => p.hidePopover());
  setMode("boring");
  toast("Boring mode: just the portfolio. Your fun settings are saved.");
}

/**
 * The Boring / Fun toggle at the top of every page. Boring (the default) is a
 * clean portfolio; Fun brings out Bells & whistles, secrets and everything else.
 * Its look comes from <html data-mode>, set before the first paint, so the
 * saved choice never flashes; the radios' checked state follows once mounted.
 */
export function FunToggle() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const isFun = mounted && isFunMode(fun);
  const boringRef = useRef<HTMLButtonElement>(null);
  const funRef = useRef<HTMLButtonElement>(null);

  const choose = (mode: "boring" | "fun") => {
    if (mode === "fun") enterFunMode();
    else enterBoringMode();
  };
  // Radio-group keys: any arrow picks the other option and moves focus to it.
  const onKeyDown = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = isFun ? "boring" : "fun";
    choose(next);
    (next === "fun" ? funRef : boringRef).current?.focus();
  };

  return (
    <span className="relative inline-flex">
      <div role="radiogroup" aria-label="Site mode" data-fun-toggle className="fun-toggle" onKeyDown={onKeyDown}>
        <button
          ref={boringRef}
          type="button"
          role="radio"
          aria-checked={!isFun}
          tabIndex={isFun ? -1 : 0}
          data-mode-option="boring"
          title="The plain portfolio"
          onClick={() => choose("boring")}
        >
          Boring
        </button>
        <button
          ref={funRef}
          type="button"
          role="radio"
          aria-checked={isFun}
          tabIndex={isFun ? 0 : -1}
          data-mode-option="fun"
          title="Effects, themes, secrets and mini games"
          onClick={() => choose("fun")}
        >
          Fun
        </button>
      </div>
      <GoblinGuide />
    </span>
  );
}
