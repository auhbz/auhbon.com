"use client";

import { useEffect, useRef } from "react";
import { activeVariant, getFun } from "@/lib/fun";
import { fireworkSound } from "@/lib/sound";

/**
 * A fireworks show for a secrets milestone: rockets climb on glowing trails
 * (whistling, if sound effects are on), then burst into different shells:
 * peonies, rings, gold willows that droop, crossettes that split again, and
 * glitter that crackles. It ends with a finale. Drawn on its own canvas, which
 * lets clicks through and is hidden from assistive tech. Under reduced motion,
 * a few soft starbursts simply glow and fade in place.
 */

type Shell = "peony" | "ring" | "willow" | "crossette" | "crackle" | "palm";
type Rocket = { x: number; y: number; vx: number; vy: number; apex: number; hue: number; shell: Shell; trail: [number, number][] };
type Star = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  hue: number;
  /** Lightness: gold and white stars are paler. */
  light: number;
  size: number;
  drag: number;
  gravity: number;
  trail: [number, number][];
  trailLen: number;
  /** Splits into a little burst of its own (crossette) when it reaches this life. */
  splitAt?: number;
  /** Twinkles (glitter). */
  twinkle?: boolean;
};
type Flash = { x: number; y: number; r: number; life: number; hue: number };

const SHELLS: Shell[] = ["peony", "ring", "willow", "crossette", "crackle", "palm"];
const MAX_STARS = 1400;

export function Fireworks({ duration = 9500, onDone }: { duration?: number; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const soundOn = () => !!activeVariant(getFun(), "sound");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dark = document.documentElement.dataset.theme !== "light";
    const start = performance.now();
    const timers: number[] = [];
    let frame = 0;

    // ------------------------------------------------------- reduced motion: still starbursts
    if (reduced) {
      const bursts = [0.25, 0.5, 0.75].map((fx, i) => ({ x: fx, y: 0.25 + (i % 2) * 0.1, at: i * 900, hue: [45, 330, 190][i] }));
      const still = (now: number) => {
        const t = now - start;
        ctx.clearRect(0, 0, W, H);
        for (const b of bursts) {
          const local = (t - b.at) / 2400;
          if (local < 0 || local > 1) continue;
          ctx.globalAlpha = Math.sin(local * Math.PI) * 0.9;
          const x = b.x * W;
          const y = b.y * H;
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            ctx.strokeStyle = `hsl(${b.hue} 90% ${dark ? 65 : 45}%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
            ctx.lineTo(x + Math.cos(a) * 60, y + Math.sin(a) * 60);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        if (t < 3600) frame = requestAnimationFrame(still);
        else done.current();
      };
      frame = requestAnimationFrame(still);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
      };
    }

    // ------------------------------------------------------- the show
    const rockets: Rocket[] = [];
    const stars: Star[] = [];
    const flashes: Flash[] = [];

    const launch = (shell: Shell = SHELLS[Math.floor(Math.random() * SHELLS.length)], xFrac = 0.12 + Math.random() * 0.76) => {
      const x = W * xFrac;
      const apex = H * (0.12 + Math.random() * 0.26);
      // Enough upward speed to reach the apex against gravity (v² = 2gh).
      const vy = -Math.sqrt(2 * 0.12 * (H - apex)) * (1 + Math.random() * 0.04);
      rockets.push({ x, y: H + 6, vx: (W / 2 - x) * 0.0012 + (Math.random() - 0.5) * 0.6, vy, apex, hue: Math.random() * 360, shell, trail: [] });
      if (soundOn()) fireworkSound.whistle(Math.min(1.6, Math.abs(vy) / 11));
    };

    const star = (p: Partial<Star> & Pick<Star, "x" | "y" | "vx" | "vy" | "hue">) => {
      if (stars.length >= MAX_STARS) stars.shift();
      stars.push({ life: 1, decay: 0.012, light: 62, size: 2, drag: 0.975, gravity: 0.05, trail: [], trailLen: 5, ...p });
    };

    const explode = (r: Rocket) => {
      const { x, y, hue, shell } = r;
      flashes.push({ x, y, r: shell === "willow" ? 70 : 55, life: 1, hue });
      const n = shell === "ring" ? 56 : shell === "palm" ? 10 : shell === "crossette" ? 16 : shell === "willow" ? 90 : 120;
      const power = shell === "willow" ? 5 : shell === "palm" ? 6 : 6.6;
      const tilt = Math.random() * Math.PI;
      for (let i = 0; i < n; i++) {
        let vx: number;
        let vy: number;
        if (shell === "ring") {
          // A flat ring seen at an angle: an ellipse.
          const a = (i / n) * Math.PI * 2;
          const ex = Math.cos(a) * power;
          const ey = Math.sin(a) * power * 0.45;
          vx = ex * Math.cos(tilt) - ey * Math.sin(tilt);
          vy = ex * Math.sin(tilt) + ey * Math.cos(tilt);
        } else {
          // A sphere, projected: random directions, speeds weighted toward the shell's edge.
          const a = Math.random() * Math.PI * 2;
          const s = power * (shell === "palm" ? 0.9 + Math.random() * 0.2 : Math.cbrt(0.35 + Math.random() * 0.65));
          vx = Math.cos(a) * s;
          vy = Math.sin(a) * s;
        }
        const gold = shell === "willow" || shell === "palm";
        star({
          x,
          y,
          vx,
          vy,
          hue: gold ? 40 + Math.random() * 8 : shell === "crackle" ? 50 : hue + (Math.random() - 0.5) * 30,
          light: gold ? 60 : shell === "crackle" ? 88 : 62,
          size: shell === "palm" ? 3.6 : shell === "willow" ? 2 : 2.6,
          decay: shell === "willow" ? 0.0065 : shell === "palm" ? 0.009 : shell === "crackle" ? 0.016 : 0.0125 + Math.random() * 0.004,
          drag: shell === "willow" ? 0.965 : 0.975,
          gravity: shell === "willow" ? 0.035 : 0.05,
          trailLen: shell === "willow" ? 16 : shell === "palm" ? 12 : 6,
          splitAt: shell === "crossette" ? 0.62 + Math.random() * 0.06 : undefined,
          twinkle: shell === "crackle",
        });
      }
      if (soundOn()) {
        fireworkSound.boom(shell === "willow" || shell === "palm" ? 1.2 : 0.9);
        if (shell === "crackle" || shell === "crossette") window.setTimeout(() => fireworkSound.crackle(shell === "crackle" ? 18 : 8), 350);
      }
    };

    // The program: a steady opening, then a finale of several at once.
    const plan: [number, Shell | undefined, number | undefined][] = [
      [0, "peony", 0.3],
      [650, "willow", 0.68],
      [1350, "ring", 0.45],
      [2000, "crossette", 0.22],
      [2550, "crackle", 0.78],
      [3200, "palm", 0.55],
      [3800, undefined, undefined],
      [4300, "peony", 0.15],
      [4500, "peony", 0.85],
      [5200, "willow", 0.4],
      [5600, "crossette", 0.62],
    ];
    for (const [at, shell, x] of plan) timers.push(window.setTimeout(() => launch(shell, x), at));
    for (let i = 0; i < 7; i++) timers.push(window.setTimeout(() => launch(i === 6 ? "willow" : undefined, 0.1 + (i / 6) * 0.8), 6400 + i * 140));
    timers.push(window.setTimeout(() => launch("crackle", 0.5), 7400));

    let last = start;
    const tick = (now: number) => {
      const f = Math.min(3, (now - last) / 16.67);
      last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      ctx.lineCap = "round";

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += 0.12 * f;
        r.x += r.vx * f;
        r.y += r.vy * f;
        r.trail.push([r.x, r.y]);
        if (r.trail.length > 14) r.trail.shift();
        // Sparks shed from the rising rocket.
        if (Math.random() < 0.6 * f) star({ x: r.x, y: r.y + 4, vx: (Math.random() - 0.5) * 0.8, vy: Math.random() * 0.6, hue: 35, light: 70, size: 1.2, decay: 0.05, trailLen: 2 });
        for (let k = 1; k < r.trail.length; k++) {
          ctx.strokeStyle = `hsla(40 100% ${dark ? 80 : 50}% / ${k / r.trail.length})`;
          ctx.lineWidth = 2.2 * (k / r.trail.length);
          ctx.beginPath();
          ctx.moveTo(...r.trail[k - 1]);
          ctx.lineTo(...r.trail[k]);
          ctx.stroke();
        }
        if (r.vy >= -0.6 || r.y <= r.apex) {
          rockets.splice(i, 1);
          explode(r);
        }
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const fl = flashes[i];
        fl.life -= 0.08 * f;
        if (fl.life <= 0) {
          flashes.splice(i, 1);
          continue;
        }
        const g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.r);
        g.addColorStop(0, `hsla(${fl.hue} 100% 90% / ${0.55 * fl.life})`);
        g.addColorStop(1, `hsla(${fl.hue} 100% 60% / 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.vx *= s.drag ** f;
        s.vy = s.vy * s.drag ** f + s.gravity * f;
        s.x += s.vx * f;
        s.y += s.vy * f;
        s.life -= s.decay * f;
        s.trail.push([s.x, s.y]);
        if (s.trail.length > s.trailLen) s.trail.shift();
        if (s.splitAt && s.life < s.splitAt) {
          // Crossette: each star breaks into four.
          s.splitAt = undefined;
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + Math.random();
            star({ x: s.x, y: s.y, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, hue: s.hue, light: 72, size: 1.6, decay: 0.02 });
          }
          if (Math.random() < 0.3) flashes.push({ x: s.x, y: s.y, r: 12, life: 0.6, hue: s.hue });
          stars.splice(i, 1);
          continue;
        }
        if (s.life <= 0) {
          // Glitter ends in a tiny white pop.
          if (s.twinkle && Math.random() < 0.5) flashes.push({ x: s.x, y: s.y, r: 7, life: 0.7, hue: 50 });
          stars.splice(i, 1);
          continue;
        }
        const flicker = s.twinkle ? (Math.random() < 0.5 ? 0.25 : 1) : 1;
        const alpha = Math.min(1, s.life * 1.6) * flicker;
        const light = dark ? s.light : s.light - 18;
        for (let k = 1; k < s.trail.length; k++) {
          ctx.strokeStyle = `hsla(${s.hue} 100% ${light}% / ${alpha * (k / s.trail.length) * 0.8})`;
          ctx.lineWidth = s.size * (k / s.trail.length);
          ctx.beginPath();
          ctx.moveTo(...s.trail[k - 1]);
          ctx.lineTo(...s.trail[k]);
          ctx.stroke();
        }
        ctx.fillStyle = `hsla(${s.hue} 100% ${Math.min(95, light + 15)}% / ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      if (now - start < duration || rockets.length || stars.length) frame = requestAnimationFrame(tick);
      else done.current();
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("resize", resize);
    };
  }, [duration]);

  return <canvas ref={ref} aria-hidden="true" data-fireworks className="pointer-events-none fixed inset-0 z-[56] h-full w-full" />;
}
