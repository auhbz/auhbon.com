/**
 * Gravity Mode (Wild & Wondrous): pieces of the page in view come loose, fall,
 * tumble and pile up at the bottom of the screen. Grab one and toss it. "Put
 * everything back" flies every piece home and the page is exactly as it was.
 *
 * Each piece is a light verlet box: four corner points held together by six
 * sticks, pushed out of each other corner by corner. Cheap, stable enough for a
 * few dozen pieces, and it tumbles naturally. The pieces themselves are
 * look-alike ghosts (see loot.ts); the originals stay put, invisible.
 *
 * Reduced motion: no physics. Pieces glide down to a tidy shelf along the
 * bottom (no tumbling), can be dragged, and go back with a fade.
 */
import { isHydrated } from "@/lib/hydrated";
import { center, liftElement, liftWords, placeGhost, wordsCandidate, type Loot } from "@/lib/wild/loot";

export type GravitySecret = "gravity-toss" | "gravity-name";
export type GravityStatus = { loose: number; returning: boolean };

type P = { x: number; y: number; px: number; py: number };
type Grab = { id: number; u: number; v: number; tx: number; ty: number; samples: { x: number; y: number; t: number }[] };
type Body = {
  loot: Loot;
  w: number;
  h: number;
  p: P[];
  rest: number[];
  state: "wobble" | "fall" | "home";
  t: number;
  delay: number;
  grab: Grab | null;
  thrownAt: number;
  from?: { x: number; y: number; a: number };
  slot?: { x: number; y: number };
};

const STICKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [0, 2],
  [1, 3],
];
const G = 2400;
const STEP = 1 / 120;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

export class GravityEngine {
  private bodies: Body[] = [];
  private frame = 0;
  private last = 0;
  private acc = 0;
  private clock = 0;
  private destroyed = false;
  private lastStatus = "";

  constructor(private opts: { reduced: boolean; onSecret: (id: GravitySecret) => void; onStatus: (s: GravityStatus) => void; onSound: (k: "pop" | "launch" | "hit") => void }) {
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  setReduced(r: boolean) {
    this.opts.reduced = r;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    for (const b of this.bodies) b.loot.restore();
    this.bodies = [];
  }

  /** Loosen what's on screen. Returns how many pieces came loose. */
  loosen(budget = innerWidth < 640 ? 16 : 26): number {
    const maxW = innerWidth - 24;
    const ok = (el: HTMLElement) => {
      if (!isHydrated(el) || el.closest("[data-wild-ui], [data-wild-ghosts], [data-wild-gone], [data-portal-surface], [data-draft-slot], .sr-only, [aria-hidden='true'], [popover], dialog")) return false;
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0 && r.top > 56 && r.bottom < innerHeight - 4 && r.width < maxW && r.height < 220)) return false;
      return !picked.some((t) => t.contains(el) || el.contains(t));
    };
    const picked: HTMLElement[] = [];
    const add = (els: HTMLElement[], max: number, filter: (el: HTMLElement) => boolean = () => true) => {
      for (const el of els) {
        if (picked.length >= budget || max <= 0) break;
        if (filter(el) && ok(el)) {
          picked.push(el);
          max--;
        }
      }
    };
    const q = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
    const shuffled = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const short = (el: HTMLElement) => (el.textContent ?? "").trim().length > 0 && (el.textContent ?? "").trim().length <= 60;

    add(q("#hero-name"), 1);
    add(shuffled(q("main :is(h2, h3)")), 8);
    add(shuffled(q("main :is(.pill, button, a.text-link)")), 10, short);
    add(shuffled(q("main :is(p, dt, dd, li, time)")), 8, (el) => short(el) && !el.querySelector("p, ul, ol, dl"));

    const loots: Loot[] = picked.map((el) => liftElement(el));
    // Then a few loose words out of the longer paragraphs.
    const blocks = q("main :is(p, li, dd)").filter((el) => !picked.some((t) => t.contains(el) || el.contains(t)));
    for (let i = 0; i < 8 && loots.length < budget; i++) {
      const c = wordsCandidate(blocks);
      if (!c) break;
      const l = liftWords(c.node, c.start, c.end);
      if (l) loots.push(l);
    }

    loots.forEach((loot, i) => {
      const home = center(loot.home());
      placeGhost(loot, home.x, home.y);
      loot.ghost.dataset.gravityPiece = "";
      const b: Body = { loot, w: loot.w, h: loot.h, p: [], rest: [], state: "wobble", t: 0, delay: i * 0.05 + rand(0, 0.15), grab: null, thrownAt: -1e9 };
      this.setBox(b, home.x, home.y, 0);
      loot.ghost.addEventListener("pointerdown", (e) => this.grabStart(b, e));
      this.bodies.push(b);
    });
    if (loots.length) this.opts.onSound("pop");
    this.status();
    return loots.length;
  }

  /** Every piece flies home, then the page is restored. */
  putBack() {
    for (const b of this.bodies) {
      if (b.state === "home") continue;
      const c = this.centerOf(b);
      b.from = { x: c.x, y: c.y, a: this.angleOf(b) };
      b.state = "home";
      b.t = -Math.random() * 0.25;
      b.grab = null;
    }
    this.status();
  }

  /** Keyboard-friendly fun: everything gets thrown up in the air. */
  shake() {
    for (const b of this.bodies) {
      if (b.state !== "fall" || this.opts.reduced) continue;
      const vx = rand(-500, 500);
      const vy = rand(-1500, -900);
      const spin = rand(-200, 200);
      b.p.forEach((p, i) => {
        p.px = p.x - (vx + (i < 2 ? spin : -spin)) * STEP;
        p.py = p.y - vy * STEP;
      });
    }
    this.opts.onSound("launch");
  }

  count() {
    return this.bodies.length;
  }

  snapshot() {
    return {
      bodies: this.bodies.map((b) => {
        const c = this.centerOf(b);
        return { x: Math.round(c.x), y: Math.round(c.y), a: +this.angleOf(b).toFixed(2), state: b.state, name: b.loot.isName, kind: b.loot.kind };
      }),
    };
  }

  /* ---------- internals ---------- */

  private status() {
    const s = { loose: this.bodies.length, returning: this.bodies.some((b) => b.state === "home") };
    const key = JSON.stringify(s);
    if (key !== this.lastStatus) {
      this.lastStatus = key;
      this.opts.onStatus(s);
    }
  }

  private setBox(b: Body, cx: number, cy: number, a: number) {
    const hw = b.w / 2;
    const hh = b.h / 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    b.p = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ].map(([x, y]) => {
      const px = cx + x * c - y * s;
      const py = cy + x * s + y * c;
      return { x: px, y: py, px, py };
    });
    b.rest = STICKS.map(([i, j]) => Math.hypot(b.p[i].x - b.p[j].x, b.p[i].y - b.p[j].y));
  }

  private centerOf(b: Body) {
    return { x: (b.p[0].x + b.p[1].x + b.p[2].x + b.p[3].x) / 4, y: (b.p[0].y + b.p[1].y + b.p[2].y + b.p[3].y) / 4 };
  }
  private angleOf(b: Body) {
    return Math.atan2(b.p[1].y - b.p[0].y, b.p[1].x - b.p[0].x);
  }

  private grabStart(b: Body, e: PointerEvent) {
    if (b.state === "home" || e.button > 0) return;
    e.preventDefault();
    const el = b.loot.ghost;
    el.setPointerCapture?.(e.pointerId);
    // Where on the piece it was grabbed, as (u, v) across its face.
    const c = this.centerOf(b);
    const a = this.angleOf(b);
    const dx = e.clientX - c.x;
    const dy = e.clientY - c.y;
    const lx = dx * Math.cos(-a) - dy * Math.sin(-a);
    const ly = dx * Math.sin(-a) + dy * Math.cos(-a);
    const u = Math.max(0, Math.min(1, lx / b.w + 0.5));
    const v = Math.max(0, Math.min(1, ly / b.h + 0.5));
    if (b.state === "wobble") b.state = "fall";
    b.grab = { id: e.pointerId, u, v, tx: e.clientX, ty: e.clientY, samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
    el.dataset.grabbed = "";
    const move = (ev: PointerEvent) => {
      if (!b.grab || ev.pointerId !== b.grab.id) return;
      b.grab.tx = ev.clientX;
      b.grab.ty = ev.clientY;
      b.grab.samples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
      if (b.grab.samples.length > 6) b.grab.samples.shift();
    };
    const up = (ev: PointerEvent) => {
      if (!b.grab || ev.pointerId !== b.grab.id) return;
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      delete el.dataset.grabbed;
      const s = b.grab.samples;
      const first = s[0];
      const lastS = s[s.length - 1];
      const dt = Math.max(16, performance.now() - first.t) / 1000;
      const vx = Math.max(-2600, Math.min(2600, (lastS.x - first.x) / dt));
      const vy = Math.max(-2600, Math.min(2600, (lastS.y - first.y) / dt));
      b.grab = null;
      if (this.opts.reduced) return;
      for (const p of b.p) {
        p.px = p.x - vx * STEP;
        p.py = p.y - vy * STEP;
      }
      const speed = Math.hypot(vx, vy);
      if (speed > 400) {
        b.thrownAt = this.clock;
        this.opts.onSound("launch");
        if (b.loot.isName) this.opts.onSecret("gravity-name");
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  private tick = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!document.hidden) {
      this.clock += dt;
      this.update(dt);
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    const reduced = this.opts.reduced;
    for (const b of this.bodies) {
      if (b.state === "wobble") {
        b.t += dt;
        if (b.t > b.delay + (reduced ? 0 : 0.35)) {
          b.state = "fall";
          const c = center(b.loot.home());
          this.setBox(b, c.x, c.y, 0);
          // A little nudge, so they don't all drop straight down.
          const vx = rand(-90, 90);
          const spin = reduced ? 0 : rand(-50, 50);
          b.p.forEach((p, i) => {
            p.px = p.x - (vx + (i < 2 ? spin : -spin)) * STEP;
            p.py = p.y + rand(0, 60) * STEP;
          });
        }
      } else if (b.state === "home") {
        b.t += dt;
      }
    }

    if (reduced) this.updateShelf(dt);
    else {
      this.acc = Math.min(this.acc + dt, STEP * 6);
      while (this.acc >= STEP) {
        this.step(STEP);
        this.acc -= STEP;
      }
    }

    // Draw, and finish pieces that got home.
    const done: Body[] = [];
    for (const b of this.bodies) {
      if (b.state === "wobble") {
        const c = center(b.loot.home());
        const k = Math.max(0, b.t - b.delay);
        placeGhost(b.loot, c.x, c.y, reduced ? 0 : Math.sin(k * 55) * 0.05 * Math.min(1, k * 6));
      } else if (b.state === "home") {
        const dur = reduced ? 0.25 : 0.6;
        const k = ease(Math.max(0, Math.min(1, b.t / dur)));
        const to = center(b.loot.home());
        const f = b.from!;
        const arc = reduced ? 0 : Math.sin(k * Math.PI) * 50;
        placeGhost(b.loot, f.x + (to.x - f.x) * k, f.y + (to.y - f.y) * k - arc, f.a * (1 - k));
        if (reduced) b.loot.ghost.style.opacity = String(1 - k * 0.3);
        if (b.t >= dur) done.push(b);
      } else {
        const c = this.centerOf(b);
        placeGhost(b.loot, c.x, c.y, this.angleOf(b));
      }
    }
    if (done.length) {
      for (const b of done) b.loot.restore();
      this.bodies = this.bodies.filter((b) => !done.includes(b));
      if (!this.bodies.length) this.opts.onSound("pop");
    }
    this.status();
  }

  /** Reduced motion: pieces settle on a tidy shelf along the bottom. */
  private updateShelf(dt: number) {
    let x = 12;
    let y = innerHeight - 8;
    let rowH = 0;
    for (const b of this.bodies) {
      if (b.state !== "fall") continue;
      if (!b.slot) {
        if (x + b.w > innerWidth - 12 && x > 12) {
          x = 12;
          y -= rowH + 6;
          rowH = 0;
        }
        b.slot = { x: x + b.w / 2, y: y - b.h / 2 };
      }
      x += b.w + 6;
      rowH = Math.max(rowH, b.h);
      const c = this.centerOf(b);
      const tx = b.grab ? b.grab.tx : b.slot.x;
      const ty = b.grab ? b.grab.ty : b.slot.y;
      if (b.grab) b.slot = { x: tx, y: ty };
      const k = b.grab ? 1 : Math.min(1, dt * 6);
      this.setBox(b, c.x + (tx - c.x) * k, c.y + (ty - c.y) * k, 0);
    }
  }

  private step(dt: number) {
    const W = innerWidth;
    const H = innerHeight;
    const live = this.bodies.filter((b) => b.state === "fall");
    for (const b of live) {
      for (const p of b.p) {
        const vx = (p.x - p.px) * 0.998;
        const vy = (p.y - p.py) * 0.998;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + G * dt * dt;
      }
    }
    for (let it = 0; it < 4; it++) {
      for (const b of live) {
        this.sticks(b);
        if (b.grab) this.pull(b);
      }
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) this.collide(live[i], live[j]);
      }
      for (const b of live) this.bounds(b, W, H);
    }
  }

  private sticks(b: Body) {
    STICKS.forEach(([i, j], k) => {
      const a = b.p[i];
      const c = b.p[j];
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const diff = (d - b.rest[k]) / d / 2;
      a.x += dx * diff;
      a.y += dy * diff;
      c.x -= dx * diff;
      c.y -= dy * diff;
    });
  }

  /** Move the grabbed spot (a blend of the four corners) to the pointer. */
  private pull(b: Body) {
    const g = b.grab!;
    const w = [(1 - g.u) * (1 - g.v), g.u * (1 - g.v), g.u * g.v, (1 - g.u) * g.v];
    let qx = 0;
    let qy = 0;
    w.forEach((wi, i) => {
      qx += wi * b.p[i].x;
      qy += wi * b.p[i].y;
    });
    const sum = w.reduce((s, wi) => s + wi * wi, 0);
    const dx = (g.tx - qx) * 0.5;
    const dy = (g.ty - qy) * 0.5;
    w.forEach((wi, i) => {
      b.p[i].x += (dx * wi) / sum;
      b.p[i].y += (dy * wi) / sum;
    });
  }

  private bounds(b: Body, W: number, H: number) {
    const floor = H - 2;
    for (const p of b.p) {
      if (p.y > floor) {
        p.y = floor;
        p.px = p.x - (p.x - p.px) * 0.6; // friction
      }
      if (p.y < 0) {
        p.y = 0;
        if (this.clock - b.thrownAt < 1.5) {
          b.thrownAt = -1e9;
          this.opts.onSecret("gravity-toss");
          this.opts.onSound("hit");
        }
      }
      if (p.x < 0) p.x = 0;
      if (p.x > W) p.x = W;
    }
  }

  private collide(a: Body, b: Body) {
    const box = (x: Body) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const p of x.p) {
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x);
        y1 = Math.max(y1, p.y);
      }
      return { x0, y0, x1, y1 };
    };
    const A = box(a);
    const B = box(b);
    if (A.x1 < B.x0 || B.x1 < A.x0 || A.y1 < B.y0 || B.y1 < A.y0) return;
    this.pushOut(a, b);
    this.pushOut(b, a);
  }

  /** Corners of `a` that ended up inside `b` get pushed out through b's nearest edge. */
  private pushOut(a: Body, b: Body) {
    for (const p of a.p) {
      let best = Infinity;
      let bi = -1;
      let nx = 0;
      let ny = 0;
      let inside = true;
      for (let i = 0; i < 4; i++) {
        const e0 = b.p[i];
        const e1 = b.p[(i + 1) % 4];
        const ex = e1.x - e0.x;
        const ey = e1.y - e0.y;
        const len = Math.hypot(ex, ey) || 1;
        const depth = (ex * (p.y - e0.y) - ey * (p.x - e0.x)) / len;
        if (depth <= 0) {
          inside = false;
          break;
        }
        if (depth < best) {
          best = depth;
          bi = i;
          nx = ey / len;
          ny = -ex / len;
        }
      }
      if (!inside || bi < 0) continue;
      const e0 = b.p[bi];
      const e1 = b.p[(bi + 1) % 4];
      const ex = e1.x - e0.x;
      const ey = e1.y - e0.y;
      const t = Math.max(0, Math.min(1, ((p.x - e0.x) * ex + (p.y - e0.y) * ey) / (ex * ex + ey * ey || 1)));
      const lambda = 1 / (t * t + (1 - t) * (1 - t));
      p.x += nx * best * 0.5;
      p.y += ny * best * 0.5;
      e0.x -= nx * best * (1 - t) * lambda * 0.5;
      e0.y -= ny * best * (1 - t) * lambda * 0.5;
      e1.x -= nx * best * t * lambda * 0.5;
      e1.y -= ny * best * t * lambda * 0.5;
    }
  }
}
