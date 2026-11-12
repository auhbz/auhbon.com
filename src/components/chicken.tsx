"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { reveal } from "@/components/easter-eggs";
import { toast } from "@/lib/fx";
import { activeVariant, getFun } from "@/lib/fun";
import { prefersReducedMotion } from "@/lib/events";
import { extraSound } from "@/lib/sound";
import { useExtraVisible } from "@/lib/unlocks";

const HITS = 4;
const SWARM_MS = 7000;
const soundOn = () => !!activeVariant(getFun(), "sound");

type Flyer = { id: number; from: "left" | "right"; y: number; delay: number; duration: number; size: number; arc: number };

/**
 * A chicken wanders along the top edge of the Experience section (Fun mode, once
 * unlocked). Bother it four times and its friends come to settle the score: a
 * harmless, comedic swarm that flaps across the screen for a few seconds. Esc,
 * the "Make peace" button, or waiting ends it. Under reduced motion the chicken
 * stands still and the friends simply line up along the bottom instead of flying.
 */
export function Chicken() {
  const visible = useExtraVisible("extra:chicken");
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [hit, setHit] = useState(0);
  const [swarm, setSwarm] = useState<Flyer[] | null>(null);
  const hits = useRef(0);
  const endTimer = useRef(0);

  useEffect(() => {
    if (!visible) return;
    const el = document.getElementById("experience");
    if (el) el.dataset.chickenHost = "";
    // Mount after the section exists (it's server-rendered, so it's there now).
    const t = window.setTimeout(() => setHost(el), 0);
    return () => {
      window.clearTimeout(t);
      if (el) delete el.dataset.chickenHost;
    };
  }, [visible]);

  const endSwarm = () => {
    window.clearTimeout(endTimer.current);
    setSwarm(null);
  };

  useEffect(() => {
    if (!swarm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endSwarm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swarm]);

  useEffect(() => () => window.clearTimeout(endTimer.current), []);

  const poke = () => {
    if (swarm) return;
    hits.current += 1;
    setHit((h) => h + 1);
    if (soundOn()) extraSound.cluck(hits.current >= HITS - 1);
    if (hits.current < HITS) return;
    hits.current = 0;
    const flock: Flyer[] = Array.from({ length: window.innerWidth < 640 ? 10 : 18 }, (_, i) => ({
      id: i,
      from: i % 2 ? "left" : "right",
      y: 8 + Math.random() * 78,
      delay: Math.random() * 2.6,
      duration: 2.2 + Math.random() * 1.6,
      size: 1.6 + Math.random() * 1.2,
      arc: (Math.random() - 0.5) * 24,
    }));
    setSwarm(flock);
    toast("The chickens have had enough! Press Esc or “Make peace” to call them off.");
    if (soundOn()) for (let i = 0; i < 4; i++) window.setTimeout(() => extraSound.cluck(true), 300 + i * 450);
    reveal("fowl", "Fowl play! You survived the chicken swarm. 🐔");
    window.clearTimeout(endTimer.current);
    endTimer.current = window.setTimeout(() => setSwarm(null), SWARM_MS);
  };

  if (!visible) return null;
  const reduced = prefersReducedMotion();
  return (
    <>
      {host
        ? createPortal(
            <span className="chicken-track">
              <button
                type="button"
                className="chicken"
                data-chicken
                aria-label="A chicken. Best not to bother it."
                onClick={poke}
                // Alternates, so each poke restarts the flap animation.
                data-hit={hit ? (hit % 2 ? "a" : "b") : undefined}
              >
                <span className="chicken-face" aria-hidden="true">
                  <span className="chicken-art">🐔</span>
                </span>
              </button>
            </span>,
            host,
          )
        : null}
      {swarm ? (
        <div className="chicken-swarm" data-chicken-swarm data-reduced={reduced ? "" : undefined}>
          {swarm.map((c, i) => (
            <span
              key={c.id}
              aria-hidden="true"
              className="swarm-chicken"
              data-from={c.from}
              style={
                {
                  "--y": `${c.y}vh`,
                  "--delay": `${c.delay}s`,
                  "--duration": `${c.duration}s`,
                  "--size": `${c.size}rem`,
                  "--arc": `${c.arc}vh`,
                  "--slot": i,
                } as React.CSSProperties
              }
            >
              🐔
            </span>
          ))}
          <button type="button" className="pill swarm-peace" onClick={endSwarm}>
            Make peace
          </button>
        </div>
      ) : null}
    </>
  );
}
