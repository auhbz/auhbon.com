"use client";

import { useCallback, useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/events";
import { burst, sound, toast } from "@/lib/fx";
import { dueMilestones, getFun, markCelebrated, MILESTONES } from "@/lib/fun";
import { Fireworks } from "@/components/fireworks";

export const CELEBRATE_EVENT = "portfolio:celebrate";

/** Throw the party for a secrets milestone (see MILESTONES). */
export function celebrate(at: number) {
  window.dispatchEvent(new CustomEvent<number>(CELEBRATE_EVENT, { detail: at }));
}

/**
 * Celebrate any milestones just reached. Several at once (the 137 unlock, or a
 * save from before the milestones changed) are all marked as celebrated, but
 * only the biggest party plays, so they never pile up.
 */
export function celebrateDue(delayMs = 1200) {
  const due = dueMilestones(getFun());
  if (!due.length) return;
  for (const m of due) markCelebrated(m.at);
  const top = due[due.length - 1].at;
  window.setTimeout(() => celebrate(top), delayMs);
}

/**
 * Whole-animal emoji only (every one here is drawn with a full body on the major
 * platforms). Head-only faces such as the giraffe, zebra, horse, cow, pig, monkey,
 * tiger, dog, cat, mouse, hamster, rabbit, fox, bear, panda, koala, lion and frog
 * faces are left out, so nothing marches past as just a head.
 */
export const PARADE_ANIMALS = ["🐘", "🐒", "🐧", "🐢", "🦆", "🐇", "🦜", "🐊", "🦔", "🐓", "🦙", "🐿️", "🦘", "🐖", "🐎", "🐄", "🐅", "🐕", "🐈", "🐫", "🦏", "🦛", "🐐", "🐑", "🦌", "🦚", "🦃", "🦡", "🦍", "🐆", "🐃", "🐂", "🐏"];
const ANIMALS = PARADE_ANIMALS;

type Party = "parade" | "fireworks" | "lanterns" | "disco";
/** Which parties each milestone throws. The last one is the grand finale: everything. */
const PARTIES: Record<number, Party[]> = {
  5: ["parade"],
  10: ["fireworks"],
  15: ["lanterns"],
  25: ["disco"],
  40: ["parade", "lanterns"],
  65: ["fireworks", "disco"],
  97: ["lanterns", "fireworks"],
  100: ["parade", "lanterns", "fireworks", "disco"],
};

type Lanterns = { id: number; lanterns: { x: number; delay: number; duration: number; size: number; sway: number; hue: number }[] };

type Parade = { id: number; animals: { emoji: string; delay: number; duration: number; size: number; hop: number }[] };

/**
 * Milestone celebrations: quick, harmless parties rather than unlocked features,
 * so nothing important is ever gated behind finding secrets. Each one is
 * decorative (hidden from screen readers) and announced with a toast; under
 * reduced motion only the toast and a sound play.
 */
export function Celebrations() {
  const [parade, setParade] = useState<Parade | null>(null);
  const [show, setShow] = useState(0);
  const [lanterns, setLanterns] = useState<Lanterns | null>(null);
  const endShow = useCallback(() => setShow(0), []);

  useEffect(() => {
    const timers: number[] = [];
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));

    const startParade = () => {
      const id = Date.now();
      const animals = Array.from({ length: 14 }, (_, i) => ({
        emoji: ANIMALS[(i * 5 + Math.floor(Math.random() * 3)) % ANIMALS.length],
        delay: i * 0.45 + Math.random() * 0.3,
        duration: 6 + Math.random() * 3,
        size: 1.8 + Math.random() * 1.2,
        hop: 0.28 + Math.random() * 0.2,
      }));
      setParade({ id, animals });
      later(14000, () => setParade((p) => (p?.id === id ? null : p)));
    };
    // Rockets, bursts and a finale, on their own canvas (see fireworks.tsx).
    const fireworks = () => setShow(Date.now());
    // Paper lanterns drift up from the bottom of the screen, glowing and swaying.
    const startLanterns = () => {
      const id = Date.now();
      const count = window.innerWidth < 640 ? 9 : 16;
      const list = Array.from({ length: count }, (_, i) => ({
        x: ((i + 0.5) / count) * 100 + (Math.random() - 0.5) * (60 / count),
        delay: Math.random() * 3.5,
        duration: 9 + Math.random() * 4,
        size: 1.6 + Math.random() * 1.3,
        sway: 0.6 + Math.random() * 0.8,
        hue: 18 + Math.random() * 26,
      }));
      setLanterns({ id, lanterns: list });
      later(17500, () => setLanterns((l) => (l?.id === id ? null : l)));
      // A gentle shower of embers as the first ones lift off.
      later(400, () => burst("sparks", window.innerWidth / 2, window.innerHeight - 30));
    };
    const disco = () => {
      document.documentElement.dataset.disco = "true";
      later(8000, () => delete document.documentElement.dataset.disco);
    };
    const run: Record<Party, () => void> = { parade: startParade, fireworks, lanterns: startLanterns, disco };

    const onCelebrate = (e: Event) => {
      const at = (e as CustomEvent<number>).detail;
      const m = MILESTONES.find((x) => x.at === at);
      if (!m) return;
      toast(`Milestone: ${at} secrets! ${m.name} ${m.icon}`);
      sound("secret");
      // Reduced motion: the toast and sound, plus the fireworks' calm version (still starbursts).
      if (prefersReducedMotion()) {
        if (PARTIES[at]?.includes("fireworks")) fireworks();
        return;
      }
      for (const p of PARTIES[at] ?? ["parade"]) run[p]();
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      timers.forEach((t) => window.clearTimeout(t));
      delete document.documentElement.dataset.disco;
    };
  }, []);

  return (
    <>
      {show ? <Fireworks key={show} onDone={endShow} /> : null}
      {lanterns ? (
        <div aria-hidden="true" data-lanterns className="lanterns" key={lanterns.id}>
          {lanterns.lanterns.map((l, i) => (
            <span
              key={i}
              className="lantern"
              style={
                {
                  "--x": `${l.x}%`,
                  "--delay": `${l.delay}s`,
                  "--duration": `${l.duration}s`,
                  "--size": `${l.size}rem`,
                  "--sway": `${l.sway}`,
                  "--hue": l.hue,
                } as React.CSSProperties
              }
            >
              <span className="lantern-body" />
            </span>
          ))}
        </div>
      ) : null}
      {parade ? <ParadeStrip parade={parade} /> : null}
    </>
  );
}

function ParadeStrip({ parade }: { parade: Parade }) {
  return (
    // The strip lets clicks through to the page; only the animals catch them (tap one and it jumps).
    <div aria-hidden="true" data-parade className="parade" key={parade.id}>
      {parade.animals.map((a, i) => (
        <span
          key={i}
          className="parade-animal"
          style={
            {
              "--delay": `${a.delay}s`,
              "--duration": `${a.duration}s`,
              "--size": `${a.size}rem`,
              "--hop": `${a.hop}s`,
            } as React.CSSProperties
          }
        >
          {/* Emoji animals face left; flip them so they walk the way they're going. */}
          <span className="parade-hop">
            <span
              className="parade-trick"
              data-parade-animal
              onPointerDown={(e) => {
                const el = e.currentTarget;
                if (el.dataset.trick) return;
                el.dataset.trick = "true";
                sound("pop");
              }}
              onAnimationEnd={(e) => {
                if (e.animationName === "parade-trick") delete e.currentTarget.dataset.trick;
              }}
            >
              {a.emoji}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
