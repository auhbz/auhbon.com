"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MonkeyEngine, type MonkeySecret, type MonkeyStatus } from "@/lib/wild/monkeys";
import { acquireGhostLayer } from "@/lib/wild/loot";
import { prefersReducedMotion } from "@/lib/events";
import { sound, toast } from "@/lib/fx";
import { reveal } from "@/components/easter-eggs";
import { shakePage } from "@/components/wild/shake";

const noSubscribe = () => () => {};
const HITS = 4;

const MESSAGES: Record<MonkeySecret, string> = {
  "monkey-bonk": "Ten bonks. The monkeys respect you now.",
  "monkey-troop": "A full barrel of monkeys.",
  "monkey-gorilla": "The gorilla is out!",
  "monkey-frenzy": "Strike! Banana frenzy!",
};

type Case = "gorilla" | "ball";

/**
 * Monkey Mode: the monkey canvas plus a small dock at the bottom left with the
 * banana crate and two emergency cases (a gorilla and a bowling ball).
 * Everything in the dock is a real button, so it all works from the keyboard
 * (Enter on the crate tosses a banana, Enter on the ball rolls it at the crate,
 * "Bonk a monkey" bonks the nearest thief, Esc calms the gorilla).
 */
export function MonkeyMode() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<MonkeyEngine | null>(null);
  const crate = useRef<HTMLButtonElement>(null);
  const ball = useRef<HTMLButtonElement>(null);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);
  const [status, setStatus] = useState<MonkeyStatus>({ monkeys: 0, stolen: 0, bonks: 0, gorilla: false, frenzy: false, ball: false, tipped: false });
  const [hits, setHits] = useState<Record<Case, number>>({ gorilla: 0, ball: 0 });

  useEffect(() => {
    if (!canvas.current) return;
    const release = acquireGhostLayer();
    const fx = new MonkeyEngine(canvas.current, {
      reduced: prefersReducedMotion(),
      onSecret: (id) => reveal(id, MESSAGES[id]),
      onStatus: setStatus,
      onShake: shakePage,
      onSound: sound,
    });
    fx.setCrate(crate.current);
    engine.current = fx;
    (window as unknown as { __wildMonkeys?: MonkeyEngine }).__wildMonkeys = fx;
    return () => {
      fx.destroy();
      release();
      engine.current = null;
      delete (window as unknown as { __wildMonkeys?: MonkeyEngine }).__wildMonkeys;
    };
  }, []);

  useEffect(() => engine.current?.setReduced(reduced), [reduced]);
  useEffect(() => engine.current?.setBallEl(status.ball ? ball.current : null), [status.ball]);

  // Esc calms the gorilla down.
  useEffect(() => {
    if (!status.gorilla) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") engine.current?.calmGorilla();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status.gorilla]);

  const middle = (el: Element | null) => {
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight - 40 };
  };

  const hitCase = (which: Case, el: HTMLElement) => {
    const n = hits[which];
    if (n >= HITS) {
      // An empty case: restock it, once whatever came out of it is done.
      if (which === "gorilla" && status.gorilla) return toast("The gorilla is still out there. Press Esc to calm him down.");
      if (which === "ball") engine.current?.removeBall();
      setHits((h) => ({ ...h, [which]: 0 }));
      toast(which === "gorilla" ? "A fresh gorilla, behind fresh glass." : "The bowling ball goes back behind glass.");
      return;
    }
    const next = n + 1;
    setHits((h) => ({ ...h, [which]: next }));
    sound(next === HITS ? "secret" : "hit");
    if (next < HITS) return;
    const { x, y } = middle(el);
    if (which === "gorilla") engine.current?.releaseGorilla(x, y);
    else {
      engine.current?.spawnBall(x, y);
      toast("A bowling ball! Drag it and throw it at the banana crate.");
    }
  };

  return (
    <>
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[56] h-full w-full" />
      <div role="group" aria-label="Monkey Mode controls" data-wild-ui data-monkey-dock className="wild-dock fixed bottom-3 left-3 z-[57] flex items-end gap-2">
        <button
          ref={crate}
          type="button"
          data-monkey-crate
          data-tipped={status.tipped || undefined}
          aria-label="Banana crate: drag a banana out and throw it, or press to toss one"
          title="Drag a banana out and throw it"
          onPointerDown={(e) => {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            engine.current?.startDrag(e.pointerId, e.clientX, e.clientY);
          }}
          onClick={(e) => {
            if (e.detail !== 0) return; // pointers throw on release (see the engine)
            const { x, y } = middle(e.currentTarget);
            engine.current?.toss(x, y - 20);
          }}
          className="wild-crate relative grid size-12 sm:size-14 touch-none place-items-center rounded-md"
        >
          <CrateArt tipped={status.tipped} />
        </button>
        <GlassCase which="gorilla" hits={hits.gorilla} onHit={hitCase} />
        <GlassCase which="ball" hits={hits.ball} onHit={hitCase} />
        {status.gorilla ? (
          <button
            type="button"
            onClick={() => engine.current?.calmGorilla()}
            className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink shadow hover:border-ink/40"
          >
            Calm the gorilla
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!engine.current?.bonkOne()) toast("No monkeys to bonk right now.");
            }}
            className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink shadow hover:border-ink/40"
          >
            Bonk a monkey
          </button>
        )}
        <p className="sr-only" data-monkey-status>
          {status.monkeys} {status.monkeys === 1 ? "monkey" : "monkeys"} loose, {status.stolen} carrying something. {status.bonks} bonked.
        </p>
      </div>
      {status.ball ? (
        <button
          ref={ball}
          type="button"
          data-wild-ui
          data-bowling-ball
          aria-label="Bowling ball: drag it and throw it at the banana crate, or press to roll it"
          title="Drag and throw me at the crate"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            engine.current?.grabBall(e.pointerId, e.clientX, e.clientY);
          }}
          onPointerMove={(e) => engine.current?.dragBall(e.pointerId, e.clientX, e.clientY)}
          onPointerUp={(e) => engine.current?.releaseBall(e.pointerId)}
          onPointerCancel={(e) => engine.current?.releaseBall(e.pointerId)}
          onClick={(e) => {
            if (e.detail === 0) engine.current?.bowl();
          }}
          className="wild-ball fixed top-0 left-0 z-[57] size-11 touch-none rounded-full"
        >
          <BallArt />
        </button>
      ) : null}
    </>
  );
}

function GlassCase({ which, hits, onHit }: { which: Case; hits: number; onHit: (which: Case, el: HTMLElement) => void }) {
  const empty = hits >= HITS;
  const what = which === "gorilla" ? "a gorilla" : "a bowling ball";
  const label = empty
    ? `Empty emergency case (${which === "gorilla" ? "gorilla" : "bowling ball"}). Press to restock it`
    : `Break in case of emergency: ${what}. ${HITS - hits} ${HITS - hits === 1 ? "hit" : "hits"} to break the glass`;
  return (
    <button
      type="button"
      data-glass={which}
      data-cracks={hits}
      aria-label={label}
      title={empty ? "Restock" : "Break in case of emergency"}
      onClick={(e) => onHit(which, e.currentTarget)}
      className="wild-glass relative size-12 rounded-md sm:size-14"
    >
      <svg viewBox="0 0 56 56" aria-hidden="true" className="size-full">
        <rect x="1" y="1" width="54" height="54" rx="6" fill="#b3202a" />
        <rect x="6" y="6" width="44" height="36" rx="2" fill="#20313a" />
        {!empty ? (
          which === "gorilla" ? (
            <text x="28" y="28" textAnchor="middle" dominantBaseline="middle" fontSize="22">
              🦍
            </text>
          ) : (
            <g transform="translate(28 24)">
              <circle r="11" fill="#2b2f6b" />
              <ellipse cx="-4" cy="-6" rx="4" ry="2" fill="#fff" opacity=".4" transform="rotate(-30 -4 -6)" />
              <circle cx="-3" cy="-4" r="1.6" fill="#0d0f26" />
              <circle cx="2" cy="-5" r="1.6" fill="#0d0f26" />
              <circle cx="0" cy="0" r="1.9" fill="#0d0f26" />
            </g>
          )
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

/** A heavy, glossy bowling ball with three finger holes. */
function BallArt() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" className="size-full">
      <defs>
        <radialGradient id="wild-ball-body" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6c74e0" />
          <stop offset=".45" stopColor="#30348a" />
          <stop offset="1" stopColor="#14163f" />
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="21" fill="url(#wild-ball-body)" stroke="#0b0c24" strokeWidth="1" />
      <path d="M8 26c4 6 14 10 24 4" stroke="#8d95ff" strokeOpacity=".35" strokeWidth="2" fill="none" />
      <circle cx="17" cy="15" r="3" fill="#0b0c24" />
      <circle cx="25" cy="13" r="3" fill="#0b0c24" />
      <circle cx="22" cy="22" r="3.6" fill="#0b0c24" />
      <ellipse cx="14" cy="10" rx="5" ry="2.6" fill="#fff" opacity=".35" transform="rotate(-30 14 10)" />
    </svg>
  );
}

function CrateArt({ tipped }: { tipped: boolean }) {
  return (
    <svg viewBox="0 0 56 56" aria-hidden="true" className={`size-full ${tipped ? "wild-crate-tipped" : ""}`}>
      <rect x="4" y="18" width="48" height="34" rx="3" fill="#9a6232" stroke="#5b3517" strokeWidth="2" />
      <path d="M4 29h48M4 41h48" stroke="#5b3517" strokeWidth="2" />
      <path d="M8 22l40 26M48 22L8 48" stroke="#7b4a22" strokeWidth="2" opacity=".6" />
      {tipped ? null : (
        <text x="28" y="16" textAnchor="middle" fontSize="16">
          🍌🍌
        </text>
      )}
    </svg>
  );
}
