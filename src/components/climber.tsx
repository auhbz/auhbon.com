"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { DEFAULT_FUN, getFun, lookActive, subscribeFun } from "@/lib/fun";
import { useExtraVisible } from "@/lib/unlocks";
import { drawSprite, FLABBY, PICO_PALETTE, type Sprite } from "@/lib/flabby";
import { prefersReducedMotion } from "@/lib/events";
import { foundSecret } from "@/lib/fx";

/** CSS pixels per sprite pixel: an 8×8 sprite is 24 px, about PICO-8 size on a laptop. */
const S = 3;
/** Simulation steps per second (like the cart). */
const STEP_MS = 1000 / 30;
/** What he can climb: text, headings, cards, images, and open panels. */
const SELECTOR = "main h1, main h2, main h3, main p, main li, main img, main .pill, [popover]:popover-open, dialog[open]";

type Block = { l: number; t: number; r: number; b: number; fixed: boolean };
type State = "walk" | "climb" | "air" | "dazed";
type Side = "left" | "right";

const noSubscribe = () => () => {};

/**
 * The Pico-8 theme's climber: Flabby (from Auhbon's PICO-8 cart) wanders the
 * bottom of the screen, and when he meets something on the page (text, cards,
 * an open panel) he grabs its side and climbs, walks along its top, and jumps
 * across gaps. Scroll him into the top or bottom of the screen mid-climb and
 * he falls, dazed, with stars round his head.
 *
 * Cheap by design: one small canvas at 1/3 resolution, a 30 fps simulation,
 * and page measurements batched (all rect reads together, nothing written to
 * the DOM) a few times a second and right after scrolling settles.
 */
export function Climber() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const visible = useExtraVisible("extra:climber");
  if (!visible || lookActive(fun) !== "pico8") return null;
  return <ClimberCanvas />;
}

function ClimberCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext("2d")!;
    let W = 0;
    let H = 0;
    const size = () => {
      W = Math.ceil(innerWidth / S);
      H = Math.floor(innerHeight / S);
      el.width = W;
      el.height = H;
      el.style.width = `${W * S}px`;
      el.style.height = `${H * S}px`;
    };
    size();

    // Calm version: he just sits in the corner.
    if (reduced) {
      drawSprite(ctx, FLABBY.fall, 4, H - 8);
      const onResize = () => {
        size();
        drawSprite(ctx, FLABBY.fall, 4, H - 8);
      };
      addEventListener("resize", onResize);
      return () => removeEventListener("resize", onResize);
    }

    // ---------------------------------------------------------------- the page
    let blocks: Block[] = [];
    const measure = () => {
      // Reads only (no writes in between), so this is one layout at most.
      const raw: Block[] = [];
      for (const n of document.querySelectorAll<HTMLElement>(SELECTOR)) {
        const r = n.getBoundingClientRect();
        if (r.width < 12 || r.height < 8 || r.bottom < -innerHeight || r.top > innerHeight * 2) continue;
        if (n.closest(".sr-only")) continue;
        raw.push({ l: r.left / S, t: r.top / S, r: r.right / S, b: r.bottom / S, fixed: n.matches("[popover], dialog") });
      }
      blocks = merge(raw).filter((k) => k.r - k.l >= 8 && k.b - k.t >= 4 && k.t < H && k.b > 0);
      reattach();
    };

    // ---------------------------------------------------------------- him
    const c = {
      x: 6,
      y: 0,
      vx: 0,
      vy: 0,
      dir: 1,
      vdir: -1,
      state: "walk" as State,
      on: null as Block | null,
      side: "left" as Side,
      t: 0,
      dazedFor: 0,
      dazedFall: false,
    };
    c.y = H - 8;
    const floorY = () => H - 8;

    /** After a re-measure, find the block he's holding on to again (or let go). */
    const reattach = () => {
      if (!c.on) return;
      if (c.state === "walk" || c.state === "dazed") {
        const k = blocks.find((b) => Math.abs(b.t - (c.y + 8)) < 2.5 && c.x + 4 >= b.l - 1 && c.x + 4 <= b.r + 1);
        if (k) {
          c.on = k;
          c.y = k.t - 8;
        } else fall(false);
      } else if (c.state === "climb") {
        const k = blocks.find((b) => Math.abs((c.side === "left" ? b.l - 8 : b.r) - c.x) < 2.5 && c.y + 4 >= b.t - 2 && c.y + 4 <= b.b + 2);
        if (k) {
          c.on = k;
          c.x = c.side === "left" ? k.l - 8 : k.r;
        } else fall(false);
      }
    };

    const fall = (dazed: boolean) => {
      c.state = "air";
      c.on = null;
      c.vx = 0;
      c.vy = 0;
      c.dazedFall = dazed;
    };
    const land = (on: Block | null) => {
      c.on = on;
      c.y = (on ? on.t : H) - 8;
      c.vy = 0;
      c.vx = 0;
      if (c.dazedFall) {
        c.state = "dazed";
        c.dazedFor = 75;
        c.dazedFall = false;
      } else c.state = "walk";
    };
    const grab = (k: Block, side: Side, vdir: number) => {
      c.state = "climb";
      c.on = k;
      c.side = side;
      c.vdir = vdir;
      c.x = side === "left" ? k.l - 8 : k.r;
      c.vx = 0;
      c.vy = 0;
    };
    const hits = (x: number, y: number, k: Block) => x < k.r && x + 8 > k.l && y < k.b && y + 8 > k.t;

    const step = () => {
      c.t++;
      if (c.state === "dazed") {
        if (--c.dazedFor <= 0) c.state = "walk";
        return;
      }
      if (c.state === "walk") {
        const v = 0.7;
        const nx = c.x + c.dir * v;
        // A wall ahead: step up a tiny ledge, or grab it and climb.
        const wall = blocks.find((k) => k !== c.on && hits(nx, c.y, k));
        if (wall) {
          if (c.y + 8 - wall.t <= 3) {
            c.on = wall;
            c.y = wall.t - 8;
            c.x = nx;
          } else if (c.y <= 2) c.dir = -c.dir;
          else grab(wall, c.dir > 0 ? "left" : "right", -1);
          return;
        }
        c.x = nx;
        // Screen edges: turn around.
        if (c.x <= 0 || c.x >= W - 8) {
          c.x = Math.max(0, Math.min(W - 8, c.x));
          c.dir = -c.dir;
        }
        const on = c.on;
        if (on) {
          c.y = on.t - 8;
          // The end of a ledge: jump across to something nearby, or climb down the side.
          const edge = c.dir > 0 ? on.r : on.l;
          if ((c.dir > 0 && c.x + 4 > edge) || (c.dir < 0 && c.x + 4 < edge)) {
            const feet = c.y + 8;
            const target = blocks.find(
              (k) => k !== on && k.t > feet - 18 && k.t < feet + 40 && (c.dir > 0 ? k.l > edge && k.l < edge + 30 : k.r < edge && k.r > edge - 30),
            );
            if (target && Math.random() < 0.75) {
              c.state = "air";
              c.on = null;
              const up = Math.max(0, feet - target.t);
              c.vy = -1.6 - up * 0.08;
              c.vx = c.dir * Math.min(1.6, 0.6 + Math.abs((c.dir > 0 ? target.l : target.r) - edge) * 0.04);
            } else if (on.b + 2 >= H || Math.random() < 0.5) {
              grab(on, c.dir > 0 ? "right" : "left", 1);
            } else {
              c.state = "air";
              c.on = null;
              c.vy = -1.2;
              c.vx = c.dir * 0.8;
            }
          }
        } else c.y = floorY();
        // Now and then he changes his mind.
        if (Math.random() < 0.003) c.dir = -c.dir;
        return;
      }
      if (c.state === "climb") {
        const k = c.on!;
        c.y += c.vdir * 0.5;
        // Something above him (or the top of the screen): head back down.
        if (c.vdir < 0 && (c.y <= 2 || blocks.some((o) => o !== k && hits(c.x, c.y, o)))) c.vdir = 1;
        if (c.vdir < 0 && c.y + 8 <= k.t + 0.5) {
          // Over the top, onto the ledge.
          c.state = "walk";
          c.y = k.t - 8;
          c.x = c.side === "left" ? k.l : k.r - 8;
          c.dir = c.side === "left" ? 1 : -1;
          return;
        }
        if (c.vdir > 0) {
          if (c.y + 8 >= H) {
            land(null);
            c.dir = c.side === "left" ? -1 : 1;
            return;
          }
          const below = blocks.find((o) => o !== k && hits(c.x, c.y + 1, o));
          if (below) {
            land(below);
            c.dir = c.side === "left" ? -1 : 1;
            return;
          }
          if (c.y >= k.b - 2) fall(false);
        }
        // Wall jump: a facing side close behind him.
        if (c.t % 15 === 0 && Math.random() < 0.15) {
          const back = c.side === "left" ? -1 : 1;
          const other = blocks.find((o) => {
            if (o === k || o.b < c.y + 2 || o.t > c.y + 6) return false;
            const gap = back < 0 ? c.x - o.r : o.l - (c.x + 8);
            return gap > 4 && gap < 26;
          });
          if (other) {
            c.state = "air";
            c.on = null;
            c.vx = back * 1.4;
            c.vy = -1.8;
          }
        }
        return;
      }
      // In the air.
      const prevFeet = c.y + 8;
      c.vy = Math.min(3, c.vy + 0.15);
      c.x += c.vx;
      c.y += c.vy;
      if (c.x <= 0 || c.x >= W - 8) {
        c.x = Math.max(0, Math.min(W - 8, c.x));
        c.vx = -c.vx * 0.5;
      }
      const feet = c.y + 8;
      if (c.vy > 0) {
        const top = blocks.find((k) => prevFeet <= k.t + 0.5 && feet >= k.t && c.x + 6 > k.l && c.x + 2 < k.r);
        if (top) return land(top);
        if (feet >= H) return land(null);
      }
      const side = blocks.find((k) => hits(c.x, c.y, k));
      if (side) {
        const fromLeft = c.x + 4 < (side.l + side.r) / 2;
        if (c.dazedFall || c.y + 8 < side.t + 2) {
          // Bounce off rather than grab.
          c.x = fromLeft ? side.l - 8 : side.r;
          c.vx = 0;
        } else grab(side, fromLeft ? "left" : "right", c.vy < 0 ? -1 : 1);
      }
    };

    // ---------------------------------------------------------------- drawing
    const blit = (sprite: Sprite, x: number, y: number, rot: number, flip: boolean) => {
      ctx.save();
      ctx.translate(Math.round(x) + 4, Math.round(y) + 4);
      ctx.rotate((rot * Math.PI) / 2);
      drawSprite(ctx, sprite, -4, -4, flip);
      ctx.restore();
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const walkFrame = Math.floor(c.t / 6) % 2 ? FLABBY.jump : FLABBY.fall;
      if (c.state === "walk") blit(walkFrame, c.x, c.y - (Math.floor(c.t / 6) % 2), 0, c.dir < 0);
      else if (c.state === "climb") {
        // Feet to the wall, like walking up it.
        const frame = Math.floor(c.t / 8) % 2 ? FLABBY.jump : FLABBY.fall;
        blit(frame, c.x, c.y, c.side === "left" ? -1 : 1, c.vdir > 0);
      } else if (c.state === "air") blit(c.dazedFall ? FLABBY.fall : FLABBY.jump, c.x, c.y, c.dazedFall ? Math.floor(c.t / 4) % 4 : 0, c.vx < 0);
      else {
        blit(FLABBY.fall, c.x + (Math.floor(c.t / 10) % 2 ? 0.5 : -0.5), c.y, 0, false);
        // Stars circling his head.
        for (let i = 0; i < 3; i++) {
          const a = c.t * 0.18 + (i * Math.PI * 2) / 3;
          const sx = Math.round(c.x + 4 + Math.cos(a) * 5);
          const sy = Math.round(c.y - 2 + Math.sin(a) * 1.6);
          ctx.fillStyle = PICO_PALETTE[i === 1 ? 7 : 10];
          ctx.fillRect(sx, sy - 1, 1, 3);
          ctx.fillRect(sx - 1, sy, 3, 1);
        }
      }
    };

    // ---------------------------------------------------------------- loop
    let lastScroll = scrollY;
    let measureAt = 0;
    let nextPeriodic = 0;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    measure();
    const tick = (now: number) => {
      // Scrolling moves everything that isn't fixed, and him with it if he's holding on.
      const dy = (lastScroll - scrollY) / S;
      lastScroll = scrollY;
      if (dy) {
        for (const k of blocks) {
          if (k.fixed) continue;
          k.t += dy;
          k.b += dy;
        }
        if (c.on && !c.on.fixed && (c.state === "climb" || c.state === "walk" || c.state === "dazed")) {
          c.y += dy;
          if (c.y < 0 || c.y + 8 > H) {
            // Bonk: into the top or bottom of the screen.
            c.y = Math.max(0, Math.min(H - 8, c.y));
            fall(true);
            if (c.y >= H - 8) land(null);
            foundSecret("dazed");
          }
        }
        measureAt = now + 160;
      }
      if ((measureAt && now >= measureAt) || now >= nextPeriodic) {
        measureAt = 0;
        nextPeriodic = now + 900;
        measure();
      }
      acc += Math.min(100, now - last);
      last = now;
      while (acc > STEP_MS) {
        step();
        acc -= STEP_MS;
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      size();
      measure();
      if (!c.on && c.state !== "air") c.y = floorY();
      c.x = Math.min(c.x, W - 8);
    };
    // Panels opening and closing change what there is to climb.
    const onToggle = () => {
      measureAt = performance.now() + 50;
    };
    addEventListener("resize", onResize);
    document.addEventListener("toggle", onToggle, true);
    // For the QA suite.
    (window as unknown as { __climber?: unknown }).__climber = {
      snapshot: () => ({
        state: c.state,
        x: c.x * S,
        y: c.y * S,
        on: c.on ? { ...c.on } : null,
        dazed: c.state === "dazed" || c.dazedFall,
        blocks: blocks.length,
      }),
    };
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      document.removeEventListener("toggle", onToggle, true);
      delete (window as unknown as { __climber?: unknown }).__climber;
    };
  }, [reduced]);

  return <canvas ref={ref} aria-hidden="true" data-climber className="pico-climber pointer-events-none fixed top-0 left-0 z-[54]" />;
}

/**
 * Merge rects that touch or nearly touch (closer than he is tall) into
 * blocks, so stacked lines of text become one wall and there's always room
 * to stand on top of a block without covering the text above it.
 */
function merge(rects: Block[]): Block[] {
  const out = rects.map((r) => ({ ...r }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length && !changed; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        if (a.fixed !== b.fixed) continue;
        const xOverlap = a.l < b.r && b.l < a.r;
        const yOverlap = a.t < b.b && b.t < a.b;
        const yGap = Math.max(a.t, b.t) - Math.min(a.b, b.b);
        const xGap = Math.max(a.l, b.l) - Math.min(a.r, b.r);
        if ((xOverlap && yGap < 9) || (yOverlap && xGap < 4)) {
          out[i] = { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b), fixed: a.fixed };
          out.splice(j, 1);
          changed = true;
          break;
        }
      }
    }
  }
  return out;
}
