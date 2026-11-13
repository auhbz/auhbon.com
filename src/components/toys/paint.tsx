"use client";

import { useEffect, useRef, useState } from "react";
import { ToyToolbar, toolButton } from "@/components/toys/toolbar";
import { reveal } from "@/components/easter-eggs";
import { prefersReducedMotion } from "@/lib/events";
import { sound } from "@/lib/fx";

/**
 * The paint brush: paint all over the site. Strokes are kept in page
 * coordinates (so paint scrolls with the page) and drawn into one fixed,
 * screen-sized canvas. The canvas only catches the pointer while the brush is
 * in hand; otherwise clicks go straight through to the page.
 * "Wash it off" sweeps a wave of soapy water down the screen.
 */

type Stroke = { color: string; size: number; pts: number[] };

const COLORS = [
  { id: "#e2453c", label: "Red" },
  { id: "#f28c28", label: "Orange" },
  { id: "#f2c230", label: "Yellow" },
  { id: "#3fae5a", label: "Green" },
  { id: "#2f8bd8", label: "Blue" },
  { id: "#8a55d6", label: "Purple" },
];
const SIZES = [
  { id: 6, label: "Thin" },
  { id: 14, label: "Medium" },
  { id: 30, label: "Thick" },
];
const MAX_POINTS = 40000;
const GX = 16;
const GY = 8;

// Paint lasts for the visit, even while the brush is back in the box.
let strokes: Stroke[] = [];
let covered = new Set<number>();

function heroRect() {
  const el = document.querySelector<HTMLElement>('section[aria-labelledby="hero-name"]');
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } : null;
}

export function PaintLayer({ held }: { held: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0].id);
  const [size, setSize] = useState(14);
  const [washing, setWashing] = useState(false);
  const state = useRef({ color, size, wash: 0, frame: 0, drawing: null as Stroke | null, pid: -1 });
  const api = useRef<{ mark: () => void; segment: (s: Stroke, from: number) => void } | null>(null);
  useEffect(() => {
    state.current.color = color;
    state.current.size = size;
  }, [color, size]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    let dirty = true;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
      dirty = true;
    };
    const stroke = (s: Stroke, from = 0) => {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.size;
      if (s.pts.length === 2) {
        ctx.beginPath();
        ctx.arc(s.pts[0] - scrollX, s.pts[1] - scrollY, s.size / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      const start = Math.max(0, from - 2);
      ctx.moveTo(s.pts[start] - scrollX, s.pts[start + 1] - scrollY);
      for (let i = start + 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i] - scrollX, s.pts[i + 1] - scrollY);
      ctx.stroke();
    };
    const redraw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1;
      for (const s of strokes) stroke(s);
      ctx.globalAlpha = 1;
    };
    const tick = (now: number) => {
      const st = state.current;
      if (st.wash) {
        const k = Math.min(1, (now - st.wash) / 1200);
        redraw();
        const y = k * (innerHeight + 160) - 80;
        ctx.clearRect(0, 0, innerWidth, Math.max(0, y));
        // The wave: a soapy band with bubbles riding on it.
        const g = ctx.createLinearGradient(0, y - 70, 0, y + 24);
        g.addColorStop(0, "rgba(140, 210, 255, 0)");
        g.addColorStop(0.7, "rgba(120, 195, 250, .55)");
        g.addColorStop(1, "rgba(235, 248, 255, .9)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, y - 70);
        for (let x = 0; x <= innerWidth + 20; x += 20) ctx.lineTo(x, y + Math.sin(x / 40 + now / 120) * 8);
        ctx.lineTo(innerWidth, y - 70);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.8)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 24; i++) {
          const bx = ((i * 97 + now / 6) % (innerWidth + 40)) - 20;
          const by = y - 10 - ((i * 37) % 50);
          ctx.beginPath();
          ctx.arc(bx, by, 3 + (i % 4) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (k >= 1) {
          st.wash = 0;
          strokes = [];
          covered = new Set();
          setWashing(false);
          dirty = true;
        }
      } else if (dirty) {
        redraw();
        dirty = false;
      }
      st.frame = requestAnimationFrame(tick);
    };
    const onScroll = () => (dirty = true);
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    state.current.frame = requestAnimationFrame(tick);
    api.current = {
      mark: () => (dirty = true),
      segment: (s, from) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 1;
        stroke(s, from);
        ctx.globalAlpha = 1;
      },
    };
    const st = state.current;
    return () => {
      cancelAnimationFrame(st.frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const cover = (x: number, y: number, r: number) => {
    const h = heroRect();
    if (!h || covered.size >= GX * GY) return;
    const cw = h.w / GX;
    const ch = h.h / GY;
    for (let gx = 0; gx < GX; gx++) {
      for (let gy = 0; gy < GY; gy++) {
        const cx = h.x + (gx + 0.5) * cw;
        const cy = h.y + (gy + 0.5) * ch;
        if (Math.abs(cx - x) < r + cw / 2 && Math.abs(cy - y) < r + ch / 2) covered.add(gy * GX + gx);
      }
    }
    if (covered.size >= GX * GY * 0.7) {
      covered = new Set(Array.from({ length: GX * GY }, (_, i) => i));
      reveal("toy-paint", "Happy little accidents. A masterpiece!");
    }
  };

  const add = (s: Stroke, x: number, y: number) => {
    const from = s.pts.length;
    s.pts.push(x + scrollX, y + scrollY);
    // Keep memory bounded: the oldest paint fades out of history first.
    let total = strokes.reduce((n, t) => n + t.pts.length, 0);
    while (total > MAX_POINTS && strokes.length > 1) {
      total -= strokes.shift()!.pts.length;
      api.current?.mark();
    }
    api.current?.segment(s, from);
    cover(x + scrollX, y + scrollY, s.size / 2 + 6);
  };

  const wash = () => {
    if (!strokes.length) return;
    sound("launch");
    if (prefersReducedMotion()) {
      strokes = [];
      covered = new Set();
      api.current?.mark();
      return;
    }
    setWashing(true);
    state.current.wash = performance.now();
  };

  return (
    <>
      <canvas
        ref={canvas}
        aria-hidden="true"
        data-paint-canvas
        data-held={held || undefined}
        className={`paint-canvas fixed inset-0 z-[53] h-full w-full ${held ? "touch-none" : "pointer-events-none"}`}
        onPointerDown={(e) => {
          if (!held || e.button > 0) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          const s: Stroke = { color: state.current.color, size: state.current.size, pts: [] };
          strokes.push(s);
          state.current.drawing = s;
          state.current.pid = e.pointerId;
          add(s, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          const s = state.current.drawing;
          if (!s || e.pointerId !== state.current.pid) return;
          add(s, e.clientX, e.clientY);
        }}
        onPointerUp={() => (state.current.drawing = null)}
        onPointerCancel={() => (state.current.drawing = null)}
      />
      {held ? (
        <ToyToolbar label="Paint brush">
          <div role="radiogroup" aria-label="Paint color" className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                aria-label={c.label}
                title={c.label}
                onClick={() => setColor(c.id)}
                className="paint-swatch size-8 rounded-full border-2 border-surface aria-checked:outline-2 aria-checked:outline-offset-1 aria-checked:outline-ink"
                style={{ background: c.id }}
              />
            ))}
          </div>
          <div role="radiogroup" aria-label="Brush size" className="flex gap-1">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={size === s.id}
                aria-label={`${s.label} brush`}
                title={s.label}
                onClick={() => setSize(s.id)}
                className="grid size-10 place-items-center rounded-full border border-line aria-checked:border-kelp aria-checked:bg-kelp"
              >
                <span aria-hidden="true" className="rounded-full bg-ink in-aria-checked:bg-kelp-ink" style={{ width: Math.max(4, s.id / 1.6), height: Math.max(4, s.id / 1.6) }} />
              </button>
            ))}
          </div>
          <button type="button" onClick={wash} disabled={washing} className={toolButton}>
            Wash it off
          </button>
        </ToyToolbar>
      ) : null}
    </>
  );
}
