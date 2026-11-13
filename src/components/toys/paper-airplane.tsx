"use client";

import { useEffect, useRef, useState } from "react";
import { ToyToolbar, toolButton } from "@/components/toys/toolbar";
import { reveal } from "@/components/easter-eggs";
import { holdToy } from "@/lib/toys";
import { prefersReducedMotion } from "@/lib/events";
import { sound, toast } from "@/lib/fx";

/**
 * The paper airplane: it folds itself when you take it out; drag and let go to
 * throw it. A tiny glider model does the rest: lift grows with speed, so a hard
 * throw loops, a weak one stalls and dips, and in between it glides down and
 * lands. It bumps headings it flies through. Land it in the toy box for a
 * secret.
 *
 * Reduced motion: gentle throws only, no loops.
 */

type Plane = { x: number; y: number; vx: number; vy: number; dir: 1 | -1; mode: "rest" | "held" | "fly" | "slide"; turn: number; angle: number };

const G = 600;
const LIFT = G / 280 ** 2; // level flight at 280 px/s
const DRAG = 0.0009;
const W = 52;
const H = 30;

export function PaperAirplane() {
  const el = useRef<HTMLButtonElement>(null);
  const [folding, setFolding] = useState(true);
  const [flying, setFlying] = useState(false);
  const plane = useRef<Plane | null>(null);
  const samples = useRef<{ x: number; y: number; t: number }[]>([]);
  const api = useRef<{ throwAt: (vx: number, vy: number) => void; reset: () => void } | null>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const start = (): Plane => ({ x: innerWidth - 110, y: innerHeight - 150, vx: 0, vy: 0, dir: -1, mode: "rest", turn: 0, angle: 0 });
    plane.current = start();
    let frame = 0;
    let last = performance.now();
    let headings: { el: HTMLElement; r: DOMRect }[] = [];
    let inside = new Set<HTMLElement>();
    let scan = 0;
    const box = () => document.querySelector("[data-toy-box]")?.getBoundingClientRect();

    const place = () => {
      const p = plane.current!;
      // Nose along the flight path; belly down for the way it was thrown (loops turn it over).
      const still = p.mode === "rest" || p.mode === "held" || (!p.vx && !p.vy);
      const a = still ? (p.dir > 0 ? 0 : Math.PI) : Math.atan2(p.vy, p.vx);
      el.current?.style.setProperty("transform", `translate(${p.x - W / 2}px, ${p.y - H / 2}px) rotate(${a}rad) scaleY(${p.dir})`);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const p = plane.current!;
      if (p.mode === "fly" || p.mode === "slide") {
        const floor = innerHeight - 14;
        if (p.mode === "fly") {
          const s = Math.hypot(p.vx, p.vy) || 1;
          // Lift is perpendicular to the flight path, toward the plane's top side.
          const lift = Math.min(reduced ? 900 : 6500, LIFT * s * s);
          const nx = (p.dir * p.vy) / s;
          const ny = (-p.dir * p.vx) / s;
          p.vx += (nx * lift - DRAG * s * p.vx) * dt;
          p.vy += (ny * lift - DRAG * s * p.vy + G) * dt;
          const before = Math.atan2(p.vy, p.vx);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          let d = Math.atan2(p.vy, p.vx) - before;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          p.turn += d;
          if (Math.abs(p.turn) >= Math.PI * 2) {
            p.turn = 0;
            toast("Loop the loop!");
            sound("pop");
          }
          // Walls and ceiling.
          if (p.x < 20 || p.x > innerWidth - 20) {
            p.x = Math.max(20, Math.min(innerWidth - 20, p.x));
            p.vx = -p.vx * 0.5;
            p.dir = p.dir === 1 ? -1 : 1;
            sound("hit");
          }
          if (p.y < 12) {
            p.y = 12;
            p.vy = Math.abs(p.vy) * 0.5;
          }
          // Headings it flies through get a bump.
          if (now - scan > 300) {
            scan = now;
            headings = [...document.querySelectorAll<HTMLElement>("main :is(h2, h3)")]
              .map((h) => ({ el: h, r: h.getBoundingClientRect() }))
              .filter(({ r }) => r.bottom > 0 && r.top < innerHeight);
          }
          const now_in = new Set<HTMLElement>();
          for (const h of headings) {
            const r = h.el.getBoundingClientRect();
            if (p.x > r.left && p.x < r.left + Math.min(r.width, 600) && p.y > r.top && p.y < r.bottom) {
              now_in.add(h.el);
              if (!inside.has(h.el)) {
                h.el.dataset.wildBump = "";
                window.setTimeout(() => delete h.el.dataset.wildBump, 520);
                p.vy = -Math.abs(p.vy) * 0.6 - 60;
                sound("pop");
              }
            }
          }
          inside = now_in;
          // Into the toy box: home again.
          const b = box();
          if (b && p.x > b.left - 8 && p.x < b.right + 8 && p.y > b.top - 8 && p.y < b.bottom + 8) {
            reveal("toy-plane", "Return to sender: a perfect landing in the toy box.");
            holdToy(null);
            return;
          }
          if (p.y >= floor) {
            p.y = floor;
            if (p.vy > 260) {
              p.vy = -p.vy * 0.3;
              p.vx *= 0.6;
            } else {
              p.vy = 0;
              p.mode = "slide";
            }
          }
        } else {
          const f = 700 * dt;
          p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
          p.x = Math.max(20, Math.min(innerWidth - 20, p.x + p.vx * dt));
          p.y = floor;
          if (!p.vx) {
            p.mode = "rest";
            setFlying(false);
          }
        }
      }
      place();
      frame = requestAnimationFrame(tick);
    };

    api.current = {
      throwAt: (vx, vy) => {
        const p = plane.current!;
        const max = reduced ? 380 : 1600;
        const s = Math.hypot(vx, vy);
        const k = s > max ? max / s : 1;
        p.vx = vx * k;
        p.vy = vy * k;
        if (Math.abs(p.vx) > 10) p.dir = p.vx > 0 ? 1 : -1;
        p.mode = "fly";
        p.turn = 0;
        inside = new Set();
        setFlying(true);
        sound("launch");
      },
      reset: () => {
        plane.current = start();
        setFlying(false);
      },
    };
    place();
    frame = requestAnimationFrame(tick);
    const t = window.setTimeout(() => setFolding(false), reduced ? 0 : 750);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <>
      <button
        ref={el}
        type="button"
        data-wild-ui
        data-paper-plane={flying ? "flying" : "ready"}
        aria-label="Paper airplane: drag and let go to throw it, or press to throw it"
        title="Drag and let go to throw"
        onPointerDown={(e) => {
          if (folding) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const p = plane.current!;
          p.mode = "held";
          samples.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
        }}
        onPointerMove={(e) => {
          const p = plane.current!;
          if (p.mode !== "held") return;
          p.x = e.clientX;
          p.y = e.clientY;
          samples.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
          if (samples.current.length > 6) samples.current.shift();
        }}
        onPointerUp={() => {
          const p = plane.current!;
          if (p.mode !== "held") return;
          const s = samples.current;
          const dt = Math.max(16, s[s.length - 1].t - s[0].t) / 1000;
          const vx = (s[s.length - 1].x - s[0].x) / dt;
          const vy = (s[s.length - 1].y - s[0].y) / dt;
          if (Math.hypot(vx, vy) < 60) {
            // A tap, not a throw: a gentle launch toward the middle of the screen.
            api.current?.throwAt(p.x > innerWidth / 2 ? -420 : 420, -120);
          } else api.current?.throwAt(vx, vy);
        }}
        onClick={(e) => {
          if (e.detail === 0) {
            const p = plane.current!;
            api.current?.throwAt(p.x > innerWidth / 2 ? -520 : 520, -160);
          }
        }}
        className="paper-plane fixed top-0 left-0 z-[57] touch-none"
        style={{ width: W, height: H }}
      >
        <svg viewBox="0 0 52 30" aria-hidden="true" className={`size-full ${folding ? "paper-plane-folding" : ""}`}>
          <path d="M2 15 50 4 34 27 26 19z" fill="#f7f9fa" stroke="#5f6e78" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M26 19 50 4 20 17z" fill="#d6dde2" stroke="#5f6e78" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="m26 19-3 8 6-5" fill="#b8c2c9" stroke="#5f6e78" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </button>
      <ToyToolbar label="Paper airplane">
        <button
          type="button"
          onClick={() => {
            const p = plane.current;
            if (p) api.current?.throwAt(p.x > innerWidth / 2 ? -700 : 700, -260);
          }}
          className={toolButton}
        >
          Throw it
        </button>
        <button
          type="button"
          onClick={() => {
            api.current?.reset();
            setFolding(true);
            window.setTimeout(() => setFolding(false), prefersReducedMotion() ? 0 : 750);
            sound("pop");
          }}
          className={toolButton}
        >
          Fold a new one
        </button>
      </ToyToolbar>
    </>
  );
}
