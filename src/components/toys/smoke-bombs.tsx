"use client";

import { useEffect, useRef } from "react";
import { ToyToolbar, toolButton } from "@/components/toys/toolbar";
import { reveal } from "@/components/easter-eggs";
import { prefersReducedMotion } from "@/lib/events";
import { sound } from "@/lib/fx";

/**
 * Smoke bombs: with one in hand, tap anywhere to throw it. It arcs out of the
 * toy box, lands, and POOF: a cloud billows and drifts away within about two
 * seconds. Whatever it lands on does a ninja vanish and pops back a moment
 * later. Smoke never hides anything for more than a couple of seconds.
 */

type Bomb = { x0: number; y0: number; x1: number; y1: number; t: number };
type Puff = { x: number; y: number; vx: number; vy: number; r: number; grow: number; t: number; life: number; shade: number };

const VANISHABLE = "main :is(h1, h2, h3, p, li, dt, dd, .pill, a, button, time)";
const MAX_PUFFS = 200;

export function SmokeBombs() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ throwAt: (x: number, y: number) => void } | null>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const reduced = prefersReducedMotion();
    let dpr = 1;
    let bombs: Bomb[] = [];
    let puffs: Puff[] = [];
    let frame = 0;
    let last = performance.now();
    const timers: number[] = [];
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
    };

    const vanish = (x: number, y: number) => {
      const target = document
        .elementsFromPoint(x, y)
        .find((el) => !el.closest("[data-wild-ui], [data-wild-ghosts]") && el.matches(VANISHABLE)) as HTMLElement | undefined;
      if (!target) return;
      const el = (target.closest("#hero-name") as HTMLElement | null) ?? target;
      timers.push(
        window.setTimeout(() => (el.dataset.wildVanish = ""), reduced ? 150 : 280),
        window.setTimeout(() => {
          delete el.dataset.wildVanish;
          el.dataset.wildReappear = "";
          timers.push(window.setTimeout(() => delete el.dataset.wildReappear, 450));
          sound("pop");
        }, 1500),
      );
      if (el.id === "hero-name") timers.push(window.setTimeout(() => reveal("toy-smoke", "Now you see me… now you don't. Ninja vanish!"), 1600));
    };

    const poof = (x: number, y: number) => {
      sound("hit");
      const n = reduced ? 14 : 40;
      for (let i = 0; i < n && puffs.length < MAX_PUFFS; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = reduced ? 10 : 40 + Math.random() * 160;
        puffs.push({
          x: x + Math.cos(a) * 8,
          y: y + Math.sin(a) * 8,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - (reduced ? 0 : 30),
          r: 14 + Math.random() * 18,
          grow: reduced ? 20 : 50 + Math.random() * 60,
          t: 0,
          life: (reduced ? 1.1 : 1.6) + Math.random() * 0.6,
          shade: 170 + Math.floor(Math.random() * 70),
        });
      }
      vanish(x, y);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const b of bombs) {
        b.t += dt / 0.45;
        const k = Math.min(1, b.t);
        const x = b.x0 + (b.x1 - b.x0) * k;
        const y = b.y0 + (b.y1 - b.y0) * k - Math.sin(k * Math.PI) * 120;
        ctx.fillStyle = "#23272e";
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffb02e";
        ctx.beginPath();
        ctx.arc(x + 7, y - 8, 2.5 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
        if (k >= 1) poof(b.x1, b.y1);
      }
      bombs = bombs.filter((b) => b.t < 1);
      for (const p of puffs) {
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - 2.5 * dt;
        p.vy = p.vy * (1 - 2.5 * dt) - 12 * dt;
        p.r += p.grow * dt;
        const k = p.t / p.life;
        // Thick quickly, then thinning out.
        const alpha = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.75;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(${p.shade},${p.shade},${p.shade + 8},${alpha})`);
        g.addColorStop(1, `rgba(${p.shade},${p.shade},${p.shade + 8},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      puffs = puffs.filter((p) => p.t < p.life);
      frame = requestAnimationFrame(tick);
    };

    api.current = {
      throwAt: (x, y) => {
        if (bombs.length >= 4) return;
        const b = document.querySelector("[data-toy-box]")?.getBoundingClientRect();
        bombs.push({ x0: b ? b.left + b.width / 2 : innerWidth - 40, y0: b ? b.top : innerHeight - 40, x1: x, y1: y, t: 0 });
        sound("launch");
      },
    };
    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      timers.forEach((t) => window.clearTimeout(t));
      document.querySelectorAll<HTMLElement>("[data-wild-vanish], [data-wild-reappear]").forEach((el) => {
        delete el.dataset.wildVanish;
        delete el.dataset.wildReappear;
      });
    };
  }, []);

  return (
    <>
      {/* While a smoke bomb is in hand, a tap anywhere throws it (instead of clicking the page). */}
      <div
        aria-hidden="true"
        data-wild-ui
        data-smoke-catcher
        onPointerDown={(e) => {
          if (e.button > 0) return;
          e.preventDefault();
          api.current?.throwAt(e.clientX, e.clientY);
        }}
        className="smoke-catcher fixed inset-0 z-[56]"
      />
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[57] h-full w-full" />
      <ToyToolbar label="Smoke bombs">
        <span className="px-1 text-muted max-sm:hidden">Tap anywhere to throw</span>
        <button type="button" onClick={() => api.current?.throwAt(innerWidth / 2, innerHeight / 2)} className={toolButton}>
          Throw one
        </button>
      </ToyToolbar>
    </>
  );
}
