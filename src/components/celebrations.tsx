"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/events";
import { burst, sound, toast } from "@/lib/fx";
import { dueMilestones, getFun, markCelebrated, scaledMilestones } from "@/lib/fun";

export const CELEBRATE_EVENT = "portfolio:celebrate";

/** Throw the party for a secrets milestone (see MILESTONES), by its 100-scale `at`. */
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

const ANIMALS = ["🐘", "🦒", "🐒", "🦓", "🐧", "🐢", "🦆", "🐇", "🦜", "🐊", "🦔", "🐓", "🦙", "🐿️", "🦘", "🐖"];

type Party = "parade" | "cannons" | "fireworks" | "disco";
/** Which parties each milestone throws. The last one is the grand finale: everything. */
const PARTIES: Record<number, Party[]> = {
  5: ["parade"],
  10: ["cannons"],
  15: ["fireworks"],
  25: ["disco"],
  40: ["parade", "cannons"],
  65: ["fireworks", "disco"],
  97: ["cannons", "fireworks"],
  100: ["parade", "cannons", "fireworks", "disco"],
};

type Parade = { id: number; animals: { emoji: string; delay: number; duration: number; size: number; hop: number }[] };

/**
 * Milestone celebrations: quick, harmless parties rather than unlocked features,
 * so nothing important is ever gated behind finding secrets. Each one is
 * decorative (hidden from screen readers) and announced with a toast; under
 * reduced motion only the toast and a sound play.
 */
export function Celebrations() {
  const [parade, setParade] = useState<Parade | null>(null);

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
    const cannons = () => {
      for (let i = 0; i < 4; i++) {
        later(i * 350, () => {
          burst("confetti", 0, window.innerHeight);
          burst("confetti", window.innerWidth, window.innerHeight);
        });
      }
    };
    const fireworks = () => {
      for (let i = 0; i < 9; i++) {
        later(i * 420, () => {
          const x = window.innerWidth * (0.15 + Math.random() * 0.7);
          const y = window.innerHeight * (0.12 + Math.random() * 0.35);
          burst(i % 2 ? "sparks" : "confetti", x, y);
        });
      }
    };
    const disco = () => {
      document.documentElement.dataset.disco = "true";
      later(8000, () => delete document.documentElement.dataset.disco);
    };
    const run: Record<Party, () => void> = { parade: startParade, cannons, fireworks, disco };

    const onCelebrate = (e: Event) => {
      const at = (e as CustomEvent<number>).detail;
      // Keyed by the 100-scale value; the toast shows today's scaled count.
      const m = scaledMilestones().find((x) => x.at === at);
      if (!m) return;
      toast(`Milestone: ${m.count} secrets! ${m.name} ${m.icon}`);
      sound("secret");
      if (prefersReducedMotion()) return;
      for (const p of PARTIES[at] ?? ["parade"]) run[p]();
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      timers.forEach((t) => window.clearTimeout(t));
      delete document.documentElement.dataset.disco;
    };
  }, []);

  if (!parade) return null;
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
