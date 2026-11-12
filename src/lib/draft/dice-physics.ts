/**
 * A dice tray for the draft Board games theme: dice you can throw (drag and
 * let go, or from a button) that slide, bounce off the edges and each other,
 * tumble through faces while they move fast, and settle on a face.
 *
 * Values are decided when a die is thrown and shown once it settles, so the
 * games only ever read settled values (onSettled). With reduced motion,
 * throws settle at once.
 */

export type Mark = "reroll" | "spend" | null;

type Die = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  /** The value it will show when it settles. */
  value: number;
  /** The face shown right now (random while tumbling). */
  face: number;
  rolling: boolean;
  /** Distance travelled since the last face change (drives the tumble). */
  roll: number;
  /** 0 to 1 while fading out after being spent. */
  gone: number;
};

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

export const d6 = () => 1 + Math.floor(Math.random() * 6);

export class DiceTray {
  w = 300;
  h = 180;
  size = 38;
  dice: Die[] = [];
  marks = new Map<number, Mark>();
  /** Dragging a die and letting go throws it (a new value) when this says so; otherwise it only slides. */
  canThrow: (id: number) => boolean = () => false;
  /** Called once every rolling die has settled, with every die's value. */
  onSettled: (values: { id: number; value: number }[], thrown: number[]) => void = () => {};
  /** Called when a drag throws a die. */
  onThrow: (ids: number[]) => void = () => {};
  private thrown: number[] = [];
  private grab: { id: number; dx: number; dy: number; px: number; py: number; t: number; vx: number; vy: number } | null = null;

  constructor(public reduced = false) {}

  /** Set the game's callbacks (each game sets its own when it's shown). */
  configure(h: { canThrow?: DiceTray["canThrow"]; onSettled?: DiceTray["onSettled"]; onThrow?: DiceTray["onThrow"] }) {
    this.canThrow = h.canThrow ?? (() => false);
    this.onSettled = h.onSettled ?? (() => {});
    this.onThrow = h.onThrow ?? (() => {});
  }

  setMarks(marks: Map<number, Mark>) {
    this.marks = marks;
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.size = w < 360 ? 32 : 38;
    for (const d of this.dice) this.clamp(d);
  }

  /** Put dice on the table (showing `faces`), laid out in a row. */
  set(faces: number[]) {
    const gap = this.size * 1.5;
    const x0 = this.w / 2 - ((faces.length - 1) * gap) / 2;
    this.dice = faces.map((f, i) => ({
      id: i,
      x: x0 + i * gap,
      y: this.h / 2 + (i % 2 ? 8 : -8),
      vx: 0,
      vy: 0,
      a: ((i * 0.4) % 1) - 0.5,
      va: 0,
      value: f,
      face: f,
      rolling: false,
      roll: 0,
      gone: 0,
    }));
    this.marks.clear();
    this.thrown = [];
  }

  /** Spent dice fade out and leave. */
  remove(id: number) {
    const d = this.dice.find((x) => x.id === id);
    if (d) d.gone = 0.001;
  }

  get busy() {
    return this.dice.some((d) => d.rolling) || !!this.grab;
  }

  /** Throw these dice in from the near edge. */
  throw(ids: number[]) {
    for (const id of ids) {
      const d = this.dice.find((x) => x.id === id && !x.gone);
      if (!d) continue;
      d.value = d6();
      d.rolling = true;
      if (this.reduced) continue;
      const fromLeft = Math.random() < 0.5;
      d.x = fromLeft ? this.size : this.w - this.size;
      d.y = this.h * (0.3 + Math.random() * 0.4);
      const speed = 9 + Math.random() * 5;
      const ang = (fromLeft ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9;
      d.vx = Math.cos(ang) * speed;
      d.vy = Math.sin(ang) * speed;
      d.va = (Math.random() - 0.5) * 0.6;
    }
    this.thrown = [...new Set([...this.thrown, ...ids])];
    if (this.reduced) this.settleAll();
  }

  private settleAll() {
    for (const d of this.dice) {
      if (d.rolling) {
        d.rolling = false;
        d.face = d.value;
      }
    }
    const thrown = this.thrown;
    this.thrown = [];
    // Async, so callers can finish their own state updates first.
    queueMicrotask(() => this.onSettled(this.values(), thrown));
  }

  values() {
    return this.dice.filter((d) => !d.gone).map((d) => ({ id: d.id, value: d.face }));
  }

  private clamp(d: Die) {
    const r = this.size / 2;
    d.x = Math.max(r, Math.min(this.w - r, d.x));
    d.y = Math.max(r, Math.min(this.h - r, d.y));
  }

  /** Advance by f frames (1 = 1/60 s). */
  step(f: number) {
    const r = this.size / 2;
    let wasRolling = false;
    for (const d of this.dice) {
      if (d.gone) {
        d.gone = Math.min(1, d.gone + 0.06 * f);
        continue;
      }
      if (this.grab?.id === d.id) continue;
      if (d.rolling) wasRolling = true;
      d.x += d.vx * f;
      d.y += d.vy * f;
      d.a += d.va * f;
      // Felt: sliding friction, more for slow dice so they come to rest.
      const sp = Math.hypot(d.vx, d.vy);
      const drag = sp > 3 ? 0.975 : 0.93;
      d.vx *= drag ** f;
      d.vy *= drag ** f;
      d.va *= 0.94 ** f;
      // The tray's walls.
      if (d.x < r || d.x > this.w - r) {
        d.x = Math.max(r, Math.min(this.w - r, d.x));
        d.vx = -d.vx * 0.6;
        d.va += d.vy * 0.02;
      }
      if (d.y < r || d.y > this.h - r) {
        d.y = Math.max(r, Math.min(this.h - r, d.y));
        d.vy = -d.vy * 0.6;
        d.va -= d.vx * 0.02;
      }
      // Tumbling: a new face every die-width or so while it's moving fast.
      if (d.rolling) {
        d.roll += sp * f;
        if (d.roll > this.size * 0.8 && sp > 1.2) {
          d.roll = 0;
          let n = d6();
          if (n === d.face) n = (n % 6) + 1;
          d.face = n;
        }
      }
      if (sp < 0.12 && Math.abs(d.va) < 0.01) {
        d.vx = 0;
        d.vy = 0;
        d.va = 0;
        if (d.rolling) {
          d.rolling = false;
          d.face = d.value;
        }
      }
    }
    // Dice knock into each other (equal masses, a soft push apart).
    const live = this.dice.filter((d) => !d.gone);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const min = this.size * 1.05;
        if (dist >= min) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        const push = (min - dist) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          const k = rel * 0.85;
          a.vx -= k * nx;
          a.vy -= k * ny;
          b.vx += k * nx;
          b.vy += k * ny;
          a.va += (Math.random() - 0.5) * 0.2;
          b.va += (Math.random() - 0.5) * 0.2;
          // A knocked die that was resting gets moving, but keeps its value unless it was thrown.
        }
      }
    }
    this.dice = this.dice.filter((d) => d.gone < 1);
    if (wasRolling && !this.dice.some((d) => d.rolling) && !this.grab) this.settleAll();
  }

  // -------------------------------------------------------------- dragging
  hit(x: number, y: number) {
    const r = this.size * 0.75;
    return [...this.dice].reverse().find((d) => !d.gone && Math.hypot(d.x - x, d.y - y) < r) ?? null;
  }

  down(x: number, y: number) {
    const d = this.hit(x, y);
    if (!d || d.rolling) return false;
    this.grab = { id: d.id, dx: d.x - x, dy: d.y - y, px: x, py: y, t: performance.now(), vx: 0, vy: 0 };
    d.vx = d.vy = 0;
    return true;
  }

  move(x: number, y: number) {
    const g = this.grab;
    if (!g) return;
    const d = this.dice.find((k) => k.id === g.id);
    if (!d) return;
    const now = performance.now();
    const dt = Math.max(1, now - g.t) / 16.67;
    // Smoothed pointer velocity, in px per frame.
    g.vx = g.vx * 0.5 + ((x - g.px) / dt) * 0.5;
    g.vy = g.vy * 0.5 + ((y - g.py) / dt) * 0.5;
    g.px = x;
    g.py = y;
    g.t = now;
    d.x = x + g.dx;
    d.y = y + g.dy;
    this.clamp(d);
  }

  up() {
    const g = this.grab;
    if (!g) return;
    this.grab = null;
    const d = this.dice.find((k) => k.id === g.id);
    if (!d) return;
    const cap = 22;
    d.vx = Math.max(-cap, Math.min(cap, g.vx));
    d.vy = Math.max(-cap, Math.min(cap, g.vy));
    d.va = (Math.random() - 0.5) * 0.1 * Math.hypot(d.vx, d.vy);
    // A real throw (not a nudge) rolls the die, if the game allows it.
    if (Math.hypot(d.vx, d.vy) > 4 && this.canThrow(d.id)) {
      d.value = d6();
      d.rolling = true;
      this.thrown = [...new Set([...this.thrown, d.id])];
      this.onThrow([d.id]);
      if (this.reduced) this.settleAll();
    }
  }

  // -------------------------------------------------------------- drawing
  draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.w, this.h);
    const s = this.size;
    for (const d of this.dice) {
      const sp = Math.hypot(d.vx, d.vy);
      // While tumbling the die squashes along its direction of travel, like it's turning over.
      const squash = d.rolling && sp > 1.2 ? 0.72 + 0.28 * Math.abs(Math.cos((d.roll / (s * 0.8)) * Math.PI)) : 1;
      const mark = this.marks.get(d.id) ?? null;
      ctx.save();
      ctx.globalAlpha = d.gone ? 1 - d.gone : 1;
      ctx.translate(d.x, d.y);
      // Shadow.
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.ellipse(3, s * 0.42, s * 0.45, s * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(d.a);
      ctx.scale(squash, 1);
      ctx.beginPath();
      ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.2);
      ctx.fillStyle = mark === "spend" ? "#d9c9b0" : "#f6efe1";
      ctx.fill();
      ctx.lineWidth = mark ? 3 : 1.5;
      ctx.strokeStyle = mark === "reroll" ? "#f4c552" : mark === "spend" ? "#d24a3c" : "#1b140c";
      ctx.stroke();
      const step = s * 0.26;
      for (const [px, py] of PIPS[d.face]) {
        ctx.beginPath();
        ctx.arc(px * step, py * step, s * 0.085, 0, Math.PI * 2);
        ctx.fillStyle = d.face === 1 ? "#b3202a" : "#1b140c";
        ctx.fill();
      }
      if (mark === "spend") {
        ctx.strokeStyle = "#d24a3c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-s * 0.32, -s * 0.32);
        ctx.lineTo(s * 0.32, s * 0.32);
        ctx.moveTo(s * 0.32, -s * 0.32);
        ctx.lineTo(-s * 0.32, s * 0.32);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
