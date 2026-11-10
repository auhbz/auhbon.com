"use client";

import { useEffect, useRef, useState } from "react";
import { burst, sound } from "@/lib/fx";
import { prefersReducedMotion } from "@/lib/events";

/**
 * Stage gates: to go from stage n to n + 1 you need at least `cps` clicks per
 * second (over the last second) AND at least `clicks` clicks since stage n began,
 * so nobody skips the build-up. 0 running, 1 shaking, 2 sparks, 3 fire, 4 broken.
 */
export const HAMSTER_GATES = [
  { cps: 3, clicks: 3 },
  { cps: 5, clicks: 8 },
  { cps: 7, clicks: 15 },
  { cps: 9, clicks: 20 },
] as const;
const BROKEN = HAMSTER_GATES.length;
/** No clicks for this long and the wheel starts calming down, a stage at a time. */
const COOL_AFTER = 1200;
const COOL_STEP = 900;
/** How long the broken wheel is gone before it rolls back. */
const AWAY_MS = 3600;

/**
 * One i-dot as a hamster in a wheel (decorative; the name is read from the
 * heading's plain text). Clicking or tapping makes it run faster; keep it up
 * and the wheel shakes, throws sparks, catches fire and finally breaks off and
 * rolls away. Original art, drawn as SVG; the wheel turns from a small rAF loop.
 */
export function HamsterDot({ index }: { index: number }) {
  const [stage, setStage] = useState(0);
  const [back, setBack] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const wheel = useRef<SVGGElement>(null);
  const legs = useRef<SVGGElement>(null);
  const live = useRef({ clicks: [] as number[], since: 0, stage: 0, last: 0, lastDrop: 0, speed: 0.6, angle: 0, timer: 0 });

  const go = (s: number) => {
    live.current.stage = s;
    live.current.since = 0;
    setStage(s);
  };

  useEffect(() => {
    const l = live.current;
    let frame = 0;
    let prev = performance.now();
    const reduced = prefersReducedMotion();
    const loop = (now: number) => {
      const dt = Math.min(64, now - prev) / 1000;
      prev = now;
      l.clicks = l.clicks.filter((t) => now - t < 1000);
      const cps = l.clicks.length;
      // Calm down when the clicking stops (a broken wheel waits for its own timer).
      if (l.stage > 0 && l.stage < BROKEN && now - l.last > COOL_AFTER && now - l.lastDrop > COOL_STEP) {
        l.lastDrop = now;
        l.stage -= 1;
        l.since = 0;
        setStage(l.stage);
      }
      const target = l.stage === BROKEN ? 0 : 0.6 + cps * 0.5 + l.stage * 0.5;
      l.speed += (target - l.speed) * Math.min(1, dt * 4);
      if (!reduced) {
        l.angle = (l.angle + l.speed * 360 * dt) % 360;
        wheel.current?.setAttribute("transform", `rotate(${l.angle.toFixed(1)})`);
        // Little legs, scurrying in step with the wheel.
        const ph = (l.angle / 360) * Math.PI * 2 * 3.4;
        const kids = legs.current?.children;
        if (kids && l.stage !== BROKEN) for (let i = 0; i < kids.length; i++) kids[i].setAttribute("transform", `translate(${(Math.sin(ph + i * Math.PI) * 1.6).toFixed(2)} 0)`);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(l.timer);
    };
  }, []);

  const click = (e: React.PointerEvent) => {
    const l = live.current;
    if (l.stage === BROKEN) return;
    const now = performance.now();
    l.last = now;
    l.clicks = [...l.clicks.filter((t) => now - t < 1000), now];
    l.since++;
    const gate = HAMSTER_GATES[l.stage];
    if (l.clicks.length < gate.cps || l.since < gate.clicks) return;
    const next = l.stage + 1;
    go(next);
    if (next === 2) sound("pop");
    else if (next === 3) sound("launch");
    else if (next === BROKEN) {
      sound("hit");
      const r = e.currentTarget.getBoundingClientRect();
      burst("sparks", r.left + r.width / 2, r.top + r.height / 2);
      window.clearTimeout(l.timer);
      l.timer = window.setTimeout(() => {
        l.clicks = [];
        setBack(true);
        go(0);
      }, AWAY_MS);
    }
  };

  return (
    <span
      ref={root}
      data-hamster={index}
      data-stage={stage}
      className={`hero-dot hero-hamster${back ? " is-back" : ""}`}
      style={{ "--dir": index % 2 ? -1 : 1 } as React.CSSProperties}
      onPointerDown={click}
      onAnimationEnd={(e) => {
        if (e.animationName === "hw-return") setBack(false);
      }}
    >
      <svg viewBox="-20 -20 40 40" className="hw-art" aria-hidden="true">
        {/* The post: the i's own stem holds the axle. */}
        <path d="M0 0 L0 21" className="hw-post" />
        <g className="hw-roll">
          <g ref={wheel}>
            <circle r="17" className="hw-rim" />
            <circle r="14" className="hw-rim hw-rim-in" />
            {Array.from({ length: 18 }, (_, i) => {
              const a = (i / 18) * Math.PI * 2;
              return <path key={i} d={`M${(Math.cos(a) * 14).toFixed(2)} ${(Math.sin(a) * 14).toFixed(2)} L${(Math.cos(a) * 17).toFixed(2)} ${(Math.sin(a) * 17).toFixed(2)}`} className="hw-rung" />;
            })}
            {[0, 1, 2, 3].map((i) => (
              <path key={i} d={`M0 0 L${(Math.cos((i * Math.PI) / 2) * 14).toFixed(2)} ${(Math.sin((i * Math.PI) / 2) * 14).toFixed(2)}`} className="hw-spoke" />
            ))}
          </g>
          <circle r="2.2" className="hw-hub" />
          {/* Stage 2: sparks fly off the rim where the wheel grinds. */}
          <g className="hw-sparks">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path key={i} d="M0 0 L-4 -1.6" style={{ "--i": i } as React.CSSProperties} />
            ))}
          </g>
          {/* Stage 3: it catches fire. */}
          <g className="hw-fire">
            <path d="M-7 -14 C-9 -19 -6 -21 -6 -25 C-3 -22 -2 -19 -3 -15 Z" />
            <path d="M-2 -16 C-4 -22 0 -25 0 -30 C4 -25 5 -21 2 -16 Z" />
            <path d="M4 -14 C3 -19 6 -20 7 -24 C9 -20 10 -17 7 -13 Z" />
            <path d="M-1 -16 C-2 -20 0 -22 0 -25 C2 -22 3 -19 1 -16 Z" className="hw-fire-core" />
          </g>
        </g>
        {/* The hamster stays at the bottom of the wheel, running in place. */}
        <g className="hw-hamster">
          <g ref={legs} className="hw-legs">
            <ellipse cx="-3.5" cy="12.6" rx="1.6" ry="1" />
            <ellipse cx="3" cy="12.6" rx="1.6" ry="1" />
          </g>
          <path d="M-8.4 8.4 Q-10.6 7.4 -10.2 9.6" className="hw-tail" />
          <ellipse cx="-0.5" cy="8.5" rx="8" ry="4.9" className="hw-fur" />
          <ellipse cx="0.5" cy="10.4" rx="5" ry="2.6" className="hw-belly" />
          <circle cx="5.6" cy="6.2" r="4.1" className="hw-fur" />
          <circle cx="3.6" cy="2.6" r="1.6" className="hw-ear" />
          <ellipse cx="7.7" cy="7.6" rx="1.5" ry="1.2" className="hw-cheek" />
          <circle cx="6.6" cy="5.4" r="0.85" className="hw-eye" />
          <circle cx="9.5" cy="6.4" r="0.7" className="hw-nose" />
          {/* Stage 4: dazed, little stars going round. */}
          <g className="hw-daze">
            {[0, 1, 2].map((i) => (
              <path key={i} d="M0 -1.4 L0.4 -0.4 L1.4 0 L0.4 0.4 L0 1.4 L-0.4 0.4 L-1.4 0 L-0.4 -0.4 Z" style={{ "--i": i } as React.CSSProperties} />
            ))}
          </g>
        </g>
      </svg>
    </span>
  );
}
