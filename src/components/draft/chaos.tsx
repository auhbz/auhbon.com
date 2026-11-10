"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChaosEngine, type ChaosStatus } from "@/lib/draft/monkeys";
import { revealDraft } from "@/lib/draft/store";
import { prefersReducedMotion } from "@/lib/events";
import { sound, toast } from "@/lib/fx";

const noSubscribe = () => () => {};
const HITS = 4;

const MESSAGES = {
  "d-bonk": "Ten bonks. The monkeys respect you now.",
  "d-troop": "A full barrel of monkeys.",
  "d-gorilla": "The gorilla is out.",
  "d-frenzy": "Banana frenzy!",
} as const;

/**
 * "Unleash the monkeys" (Chaos, draft only): the monkey canvas plus a small
 * dock with the banana crate and two emergency cases. Everything in the dock
 * is a real button, so it all works from the keyboard too (Enter on the crate
 * tosses a banana, "Bonk a monkey" bonks the nearest thief).
 */
export function Chaos() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ChaosEngine | null>(null);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);
  const [status, setStatus] = useState<ChaosStatus>({ monkeys: 0, stolen: 0, bonks: 0, gorilla: false, frenzy: false, hammer: false });
  const [gorillaHits, setGorillaHits] = useState(0);
  const [hammerHits, setHammerHits] = useState(0);
  const crate = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!canvas.current) return;
    const fx = new ChaosEngine(canvas.current, {
      reduced: prefersReducedMotion(),
      onSecret: (id) => revealDraft(id, MESSAGES[id]),
      onStatus: setStatus,
    });
    engine.current = fx;
    (window as unknown as { __draftChaos?: ChaosEngine }).__draftChaos = fx;
    return () => {
      fx.destroy();
      engine.current = null;
      delete (window as unknown as { __draftChaos?: ChaosEngine }).__draftChaos;
    };
  }, []);

  useEffect(() => engine.current?.setReduced(reduced), [reduced]);

  // Esc puts the hammer down.
  useEffect(() => {
    if (!status.hammer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") engine.current?.setHammer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status.hammer]);

  const center = (el: Element | null) => {
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight - 40 };
  };

  const hitCase = (which: "gorilla" | "hammer", el: HTMLElement) => {
    const hits = which === "gorilla" ? gorillaHits : hammerHits;
    const set = which === "gorilla" ? setGorillaHits : setHammerHits;
    if (hits >= HITS) {
      // An empty case: restock it (only once its contents are done).
      if (which === "gorilla" && status.gorilla) return toast("The gorilla is still out there.");
      if (which === "hammer" && status.hammer) return toast("You're holding the hammer. Press Esc to put it down.");
      set(0);
      toast(which === "gorilla" ? "A fresh gorilla, behind fresh glass." : "A new peanut hammer, safely behind glass.");
      return;
    }
    const next = hits + 1;
    set(next);
    sound(next === HITS ? "secret" : "hit");
    if (next < HITS) return;
    const { x, y } = center(el);
    if (which === "gorilla") engine.current?.releaseGorilla(x, y);
    else {
      engine.current?.setHammer(true);
      toast("You picked up a hammer made of peanuts and bananas. Try it on the crate.");
    }
  };

  return (
    <>
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[56] h-full w-full" />
      <div role="group" aria-label="Chaos controls" data-chaos-dock className="draft-chaos-dock fixed bottom-3 left-3 z-[57] flex items-end gap-2">
        <button
          ref={crate}
          type="button"
          data-chaos-crate
          aria-label={status.hammer ? "Banana crate: hit it with the hammer" : "Banana crate: drag a banana out and throw it, or press to toss one"}
          title={status.hammer ? "Swing the hammer at the crate" : "Drag a banana out and throw it"}
          onPointerDown={(e) => {
            if (status.hammer) return;
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            engine.current?.startDrag(e.pointerId, e.clientX, e.clientY);
          }}
          onClick={(e) => {
            const { x, y } = center(e.currentTarget);
            if (status.hammer) {
              engine.current?.spill(x, y - 10);
              engine.current?.setHammer(false);
              sound("hit");
            } else if (e.detail === 0) engine.current?.toss(x, y - 20); // keyboard
          }}
          className="draft-crate relative grid size-14 touch-none place-items-center rounded-md"
        >
          <CrateArt tipped={status.frenzy} />
        </button>
        <GlassCase which="gorilla" hits={gorillaHits} onHit={hitCase} empty={gorillaHits >= HITS} />
        <GlassCase which="hammer" hits={hammerHits} onHit={hitCase} empty={hammerHits >= HITS} />
        <button
          type="button"
          onClick={() => {
            if (!engine.current?.bonkOne()) toast("No monkeys to bonk right now.");
          }}
          className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink shadow hover:border-ink/40"
        >
          Bonk a monkey
        </button>
        <p className="sr-only" data-chaos-status>
          {status.monkeys} {status.monkeys === 1 ? "monkey" : "monkeys"} loose, {status.stolen} carrying something. {status.bonks} bonked.
        </p>
      </div>
    </>
  );
}

function GlassCase({
  which,
  hits,
  empty,
  onHit,
}: {
  which: "gorilla" | "hammer";
  hits: number;
  empty: boolean;
  onHit: (which: "gorilla" | "hammer", el: HTMLElement) => void;
}) {
  const what = which === "gorilla" ? "a gorilla" : "a hammer made of peanuts and bananas";
  const label = empty
    ? `Empty emergency case (${which}). Press to restock it`
    : `Break in case of emergency: ${what}. ${HITS - hits} ${HITS - hits === 1 ? "hit" : "hits"} to break the glass`;
  return (
    <button
      type="button"
      data-glass={which}
      data-cracks={hits}
      aria-label={label}
      title={empty ? "Restock" : "Break in case of emergency"}
      onClick={(e) => onHit(which, e.currentTarget)}
      className="draft-glass relative size-14 rounded-md"
    >
      <svg viewBox="0 0 56 56" aria-hidden="true" className="size-full">
        <rect x="1" y="1" width="54" height="54" rx="6" fill="#b3202a" />
        <rect x="6" y="6" width="44" height="36" rx="2" fill="#20313a" />
        {!empty ? (
          <text x="28" y="28" textAnchor="middle" dominantBaseline="middle" fontSize="22">
            {which === "gorilla" ? "🦍" : "🔨"}
          </text>
        ) : null}
        {!empty ? <rect x="6" y="6" width="44" height="36" rx="2" fill="rgba(190,230,255,.28)" stroke="rgba(255,255,255,.7)" strokeWidth="1" /> : null}
        {!empty ? (
          <g fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round">
            {hits >= 1 ? <path d="M30 20l-6 5m6-5l7-3m-7 3l2 8" /> : null}
            {hits >= 2 ? <path d="M24 25l-9 2m9-2l-4 9m10-6l6 6m-6-6l12 1" /> : null}
            {hits >= 3 ? <path d="M15 27l-8-6m13 7l-4 13m22-6l4 7m-16-17l-3-12m10 9l9-8" /> : null}
          </g>
        ) : (
          <g fill="#cfe9f7" opacity=".8">
            <path d="M7 42l5-6 3 6zM40 42l6-5 3 5zM22 42l4-3 3 3z" />
          </g>
        )}
        <text x="28" y="50" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
          {empty ? "RESTOCK" : "BREAK GLASS"}
        </text>
      </svg>
    </button>
  );
}

function CrateArt({ tipped }: { tipped: boolean }) {
  return (
    <svg viewBox="0 0 56 56" aria-hidden="true" className={`size-full ${tipped ? "draft-crate-tipped" : ""}`}>
      <rect x="4" y="18" width="48" height="34" rx="3" fill="#9a6232" stroke="#5b3517" strokeWidth="2" />
      <path d="M4 29h48M4 41h48" stroke="#5b3517" strokeWidth="2" />
      <path d="M8 22l40 26M48 22L8 48" stroke="#7b4a22" strokeWidth="2" opacity=".6" />
      <text x="28" y="16" textAnchor="middle" fontSize="16">
        🍌🍌
      </text>
    </svg>
  );
}
