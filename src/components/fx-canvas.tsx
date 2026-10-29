"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { BURST_EVENT, type Burst } from "@/lib/fx";
import { DEFAULT_FUN, getFun, isActive, subscribeFun } from "@/lib/fun";
import { prefersReducedMotion } from "@/lib/events";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 -> 0
  decay: number;
  size: number;
  hue: number;
  glyph?: string;
  gravity: number;
  spin: number;
  angle: number;
};

const MAX_PARTICLES = 400;

/**
 * One full-screen canvas for every particle effect: the sparkle trail and the
 * easter-egg bursts. It ignores the pointer, is hidden from assistive tech,
 * and only animates while particles exist.
 */
export function FxCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const sparkles = isActive(fun, "sparkles");
  const sparklesRef = useRef(sparkles);

  useEffect(() => {
    sparklesRef.current = sparkles;
  }, [sparkles]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    const particles: Particle[] = [];
    let frame = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = window.innerWidth * dpr;
      el.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const add = (p: Particle) => {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      particles.push(p);
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const tick = () => {
      ctx.clearRect(0, 0, el.width, el.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > window.innerHeight + 40) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.4);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = `hsl(${p.hue} 95% 60%)`;
        if (p.glyph) {
          ctx.font = `${p.size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.glyph, 0, 0);
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      frame = particles.length ? requestAnimationFrame(tick) : 0;
    };

    let last = 0;
    const onMove = (e: PointerEvent) => {
      if (!sparklesRef.current || e.pointerType !== "mouse") return;
      const now = performance.now();
      if (now - last < 16) return;
      last = now;
      add({
        x: e.clientX,
        y: e.clientY,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2 + 0.3,
        life: 1,
        decay: 0.025 + Math.random() * 0.02,
        size: 10 + Math.random() * 8,
        hue: (now / 8) % 360,
        glyph: Math.random() < 0.7 ? "✦" : "·",
        gravity: 0.02,
        spin: 0,
        angle: 0,
      });
    };

    const onBurst = (e: Event) => {
      if (prefersReducedMotion()) return; // the toast still announces the moment
      const { x, y, kind } = (e as CustomEvent<Burst>).detail;
      const count = kind === "diamonds" ? 28 : 140;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = kind === "diamonds" ? 2 + Math.random() * 4 : 4 + Math.random() * 9;
        add({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - (kind === "diamonds" ? 3 : 5),
          life: 1,
          decay: 0.006 + Math.random() * 0.008,
          size: kind === "diamonds" ? 16 + Math.random() * 12 : 7 + Math.random() * 7,
          hue: Math.random() * 360,
          glyph: kind === "diamonds" ? "💎" : undefined,
          gravity: 0.18,
          spin: (Math.random() - 0.5) * 0.3,
          angle: Math.random() * Math.PI,
        });
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener(BURST_EVENT, onBurst);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener(BURST_EVENT, onBurst);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[55] h-full w-full" />;
}
