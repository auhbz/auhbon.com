/**
 * Chaos: "Unleash the monkeys" (draft only).
 *
 * Its own canvas and loop, separate from the main effects engine, so the two
 * never fight over frames or pointer events. Monkeys multiply over time and
 * "steal" page elements: the real element stays put (it only fades and gets a
 * dashed outline) while the monkey carries a canvas copy of it. Bonking a
 * monkey sends the copy flying home and restores the element.
 *
 * Everything is capped (monkeys, bananas) and there's a calm version for
 * reduced motion: fewer, slower monkeys and no screen-filling frenzy.
 */

export type ChaosSecret = "d-bonk" | "d-troop" | "d-gorilla" | "d-frenzy";
export type ChaosStatus = { monkeys: number; stolen: number; bonks: number; gorilla: boolean; frenzy: boolean; hammer: boolean };

type Item = { el: HTMLElement; text: string; w: number; h: number; bg: string; fg: string };
type Monkey = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  state: "wander" | "grab" | "banana" | "chase" | "dizzy" | "leave";
  item: Item | null;
  target: HTMLElement | null;
  t: number;
  face: 1 | -1;
  hop: number;
  speed: number;
};
type Banana = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; rest: boolean; age: number };
type Homing = { item: Item; x: number; y: number; t: number };
type Text = { x: number; y: number; text: string; t: number; size: number };
type Gorilla = { x: number; y: number; vx: number; vy: number; tx: number; phase: "jump" | "beat" | "rampage" | "leave"; t: number };

const MONKEY = "🐒";
const BANANA = "🍌";
const GORILLA = "🦍";
const PEANUT = "🥜";
const MAX_MONKEYS = 12;
const MAX_BANANAS = 40;
const GRABBABLE = "[data-draft-root] :is(.pill, h2, h3)";

export class ChaosEngine {
  private ctx: CanvasRenderingContext2D;
  private monkeys: Monkey[] = [];
  private bananas: Banana[] = [];
  private homing: Homing[] = [];
  private texts: Text[] = [];
  private gorilla: Gorilla | null = null;
  private frame = 0;
  private last = 0;
  private spawnTimer = 0;
  private nextId = 1;
  private bonks = 0;
  private frenzyUntil = 0;
  private wasFrenzy = false;
  private now = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private pointer = { x: -100, y: -100 };
  private hammer = false;
  private swing = 0;
  private drag: { id: number; samples: { x: number; y: number; t: number }[] } | null = null;
  private destroyed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: { reduced: boolean; onSecret: (id: ChaosSecret) => void; onStatus: (s: ChaosStatus) => void },
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    window.addEventListener("pointerdown", this.onDown, { capture: true });
    const start = this.opts.reduced ? 1 : 2;
    for (let i = 0; i < start; i++) this.spawn();
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  get cap() {
    return this.opts.reduced ? 3 : MAX_MONKEYS;
  }

  setReduced(reduced: boolean) {
    this.opts.reduced = reduced;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    window.removeEventListener("pointerdown", this.onDown, { capture: true });
    for (const m of this.monkeys) if (m.item) restore(m.item);
    for (const h of this.homing) restore(h.item);
    this.monkeys = [];
    delete document.documentElement.dataset.draftHammer;
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  /* ---------- public actions (from the dock and tests) ---------- */

  spawn() {
    if (this.monkeys.length >= this.cap) return;
    const left = Math.random() < 0.5;
    const m: Monkey = {
      id: this.nextId++,
      x: left ? -30 : this.w + 30,
      y: this.h * (0.3 + Math.random() * 0.6),
      tx: this.w / 2,
      ty: this.h / 2,
      state: "wander",
      item: null,
      target: null,
      t: 0,
      face: left ? 1 : -1,
      hop: Math.random() * 6,
      speed: (this.opts.reduced ? 28 : 70 + Math.random() * 50),
    };
    this.pickWander(m);
    this.monkeys.push(m);
    if (this.monkeys.length >= MAX_MONKEYS) this.opts.onSecret("d-troop");
    this.status();
  }

  /** A monkey to bonk without a pointer (keyboard): the nearest thief, or anyone. */
  bonkOne() {
    const m = this.monkeys.find((x) => x.item && x.state !== "dizzy" && x.state !== "leave") ?? this.monkeys.find((x) => x.state !== "dizzy" && x.state !== "leave");
    if (m) this.bonk(m);
    return !!m;
  }

  /** Toss one banana from a point (keyboard or tap on the crate). */
  toss(x: number, y: number) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const v = 500 + Math.random() * 300;
    this.addBanana(x, y, Math.cos(a) * v, Math.sin(a) * v);
  }

  startDrag(pointerId: number, x: number, y: number) {
    this.drag = { id: pointerId, samples: [{ x, y, t: performance.now() }] };
    this.pointer = { x, y };
  }

  setHammer(on: boolean) {
    this.hammer = on;
    if (on) document.documentElement.dataset.draftHammer = "on";
    else delete document.documentElement.dataset.draftHammer;
    this.status();
  }

  /** The peanut hammer hits the crate: it tips over, bananas everywhere, frenzy. */
  spill(x: number, y: number) {
    this.swing = this.now;
    const n = this.opts.reduced ? 8 : 26;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.3) * 2.2;
      const v = 300 + Math.random() * 700;
      this.addBanana(x, y, Math.cos(a) * v, Math.sin(a) * v);
    }
    this.frenzyUntil = this.now + (this.opts.reduced ? 5000 : 10000);
    this.say(x, y - 40, "CRASH!", 28);
    for (let i = 0; i < 4; i++) this.spawn();
    this.opts.onSecret("d-frenzy");
    this.status();
  }

  /** The gorilla bursts out of his case at (x, y). */
  releaseGorilla(x: number, y: number) {
    const tx = this.w * (0.35 + Math.random() * 0.3);
    this.gorilla = { x, y, vx: (tx - x) / 0.9, vy: -900, tx, phase: this.opts.reduced ? "beat" : "jump", t: 0 };
    if (this.opts.reduced) {
      this.gorilla.x = tx;
      this.gorilla.y = this.floor() - 10;
    }
    this.opts.onSecret("d-gorilla");
    this.status();
  }

  /** For tests and the status line. */
  snapshot() {
    return {
      monkeys: this.monkeys.map((m) => ({ id: m.id, x: m.x, y: m.y, state: m.state, carrying: !!m.item })),
      bananas: this.bananas.length,
      gorilla: this.gorilla?.phase ?? null,
      bonks: this.bonks,
    };
  }

  /* ---------- internals ---------- */

  private resize = () => {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private floor() {
    return this.h - 16;
  }

  private status() {
    this.opts.onStatus({
      monkeys: this.monkeys.length,
      stolen: this.monkeys.filter((m) => m.item).length,
      bonks: this.bonks,
      gorilla: !!this.gorilla,
      frenzy: this.now < this.frenzyUntil,
      hammer: this.hammer,
    });
  }

  private say(x: number, y: number, text: string, size = 18) {
    const half = (text.length * size) / 3;
    this.texts.push({ x: Math.max(half, Math.min(this.w - half, x)), y: Math.max(size, y), text, t: 0, size });
    if (this.texts.length > 20) this.texts.shift();
  }

  private addBanana(x: number, y: number, vx: number, vy: number) {
    this.bananas.push({ x, y, vx, vy, rot: 0, vr: (Math.random() - 0.5) * 14, rest: false, age: 0 });
    if (this.bananas.length > MAX_BANANAS) this.bananas.shift();
  }

  private onMove = (e: PointerEvent) => {
    this.pointer = { x: e.clientX, y: e.clientY };
    if (this.drag && e.pointerId === this.drag.id) {
      this.drag.samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (this.drag.samples.length > 6) this.drag.samples.shift();
    }
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    const first = d.samples[0];
    const lastS = d.samples[d.samples.length - 1];
    const dist = Math.hypot(e.clientX - first.x, e.clientY - first.y);
    if (dist < 12) {
      this.toss(e.clientX, e.clientY - 10);
      return;
    }
    const dt = Math.max(16, performance.now() - first.t) / 1000;
    const vx = Math.max(-1600, Math.min(1600, (lastS.x - first.x) / dt));
    const vy = Math.max(-1600, Math.min(1600, (lastS.y - first.y) / dt));
    this.addBanana(e.clientX, e.clientY, vx, vy);
  };

  /** Capture-phase: a press on a monkey bonks it and doesn't reach the page underneath. */
  private onDown = (e: PointerEvent) => {
    const m = this.hit(e.clientX, e.clientY);
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
    // Swallow the click that follows this press.
    const swallow = (c: MouseEvent) => {
      c.preventDefault();
      c.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 400);
    this.bonk(m);
  };

  private hit(x: number, y: number) {
    let best: Monkey | null = null;
    let bestD = 30;
    for (const m of this.monkeys) {
      if (m.state === "leave") continue;
      const d = Math.hypot(m.x - x, m.y - 6 - y);
      if (d < bestD) {
        best = m;
        bestD = d;
      }
    }
    return best;
  }

  private bonk(m: Monkey) {
    if (m.item) {
      this.homing.push({ item: m.item, x: m.x, y: m.y - 30, t: 0 });
      m.item = null;
    }
    m.target = null;
    m.state = "dizzy";
    m.t = 0;
    this.bonks++;
    this.say(m.x, m.y - 34, "BONK!", 20);
    if (this.bonks === 10) this.opts.onSecret("d-bonk");
    this.status();
  }

  private pickWander(m: Monkey) {
    m.tx = 40 + Math.random() * (this.w - 80);
    m.ty = this.h * 0.15 + Math.random() * this.h * 0.75;
  }

  private findTarget(): HTMLElement | null {
    const taken = new Set(this.monkeys.map((m) => m.target).filter(Boolean));
    const els = [...document.querySelectorAll<HTMLElement>(GRABBABLE)].filter((el) => {
      if (el.dataset.draftStolen || taken.has(el)) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.bottom > 60 && r.top < this.h - 20 && r.width < this.w * 0.9;
    });
    return els.length ? els[Math.floor(Math.random() * els.length)] : null;
  }

  private nearestBanana(m: Monkey) {
    let best: Banana | null = null;
    let bestD = Infinity;
    for (const b of this.bananas) {
      const d = Math.hypot(b.x - m.x, b.y - m.y);
      if (d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  private tick = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.now = now;
    if (!document.hidden) {
      this.update(dt);
      this.draw();
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    const frenzy = this.now < this.frenzyUntil;
    // Monkeys multiply, slowly.
    this.spawnTimer += dt;
    const every = this.opts.reduced ? 15 : frenzy ? 2 : 7;
    if (this.spawnTimer > every) {
      this.spawnTimer = 0;
      this.spawn();
    }

    // Bananas: thrown, they fly, bounce and settle on the bottom of the screen.
    const floor = this.floor();
    for (const b of this.bananas) {
      b.age += dt;
      if (b.rest) continue;
      b.vy += 1400 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      if (b.x < 12 || b.x > this.w - 12) {
        b.vx *= -0.6;
        b.x = Math.max(12, Math.min(this.w - 12, b.x));
      }
      if (b.y > floor) {
        b.y = floor;
        b.vy *= -0.3;
        b.vx *= 0.7;
        b.vr *= 0.5;
        if (Math.abs(b.vy) < 60) {
          b.vy = 0;
          b.rest = true;
        }
      }
    }

    const g = this.gorilla;
    if (g) this.updateGorilla(g, dt);

    for (const m of this.monkeys) {
      m.t += dt;
      m.hop += dt * (frenzy ? 22 : 12);
      const speed = m.speed * (frenzy ? 2.2 : 1) * (m.state === "leave" ? 2 : 1);

      if (m.state === "dizzy") {
        if (m.t > 1.3) {
          m.state = "leave";
          m.tx = m.x < this.w / 2 ? -60 : this.w + 60;
          m.ty = m.y;
        }
        continue;
      }
      // Bananas beat everything except running from the gorilla's rampage.
      if (m.state !== "leave" && this.bananas.length && !(g && g.phase === "rampage")) {
        const b = this.nearestBanana(m)!;
        if (m.state === "grab" && m.target) m.target = null;
        m.state = "banana";
        m.tx = b.x;
        m.ty = b.y;
        if (Math.hypot(b.x - m.x, b.y - m.y) < 18) {
          this.bananas.splice(this.bananas.indexOf(b), 1);
          if (Math.random() < 0.35) this.say(m.x, m.y - 30, "nom", 14);
          m.state = "wander";
          this.pickWander(m);
        }
      } else if (m.state === "banana") {
        m.state = "wander";
        this.pickWander(m);
      }

      if (g && g.phase === "rampage" && m.state !== "leave") {
        m.state = "chase";
        m.tx = g.x;
        m.ty = g.y;
        if (Math.hypot(g.x - m.x, g.y - m.y) < 40 && Math.random() < dt * 3) {
          this.say((g.x + m.x) / 2, (g.y + m.y) / 2 - 20, "💥", 30);
          // The gorilla wins every scuffle: the monkey drops its loot and staggers off.
          if (m.item) {
            this.homing.push({ item: m.item, x: m.x, y: m.y - 30, t: 0 });
            m.item = null;
          }
          m.x += (m.x < g.x ? -1 : 1) * 70;
          m.state = "dizzy";
          m.t = 0;
        }
      } else if (m.state === "chase") {
        m.state = "wander";
        this.pickWander(m);
      }

      if (m.state === "wander") {
        if (!m.item && m.t > 2 && Math.random() < dt * 0.35) {
          const el = this.findTarget();
          if (el) {
            m.state = "grab";
            m.target = el;
          }
        }
      }
      if (m.state === "grab" && m.target) {
        const r = m.target.getBoundingClientRect();
        m.tx = r.left + r.width / 2;
        m.ty = r.top + r.height / 2 + 14;
        if (r.bottom < 0 || r.top > this.h) {
          m.target = null;
          m.state = "wander";
        } else if (Math.hypot(m.tx - m.x, m.ty - m.y) < 16) {
          m.item = snapshotItem(m.target);
          m.target.dataset.draftStolen = "true";
          m.target = null;
          m.state = "wander";
          m.t = 0;
          this.say(m.x, m.y - 40, "mine!", 15);
          // Run off with it.
          m.tx = Math.random() < 0.5 ? 40 : this.w - 40;
          m.ty = this.h * (0.2 + Math.random() * 0.6);
          this.status();
        }
      }

      const dx = m.tx - m.x;
      const dy = m.ty - m.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        const step = Math.min(d, speed * dt);
        m.x += (dx / d) * step;
        m.y += (dy / d) * step;
        if (Math.abs(dx) > 4) m.face = dx > 0 ? 1 : -1;
      } else if (m.state === "wander") {
        this.pickWander(m);
      }
    }
    // Monkeys that ran off screen are gone (new ones keep coming).
    const before = this.monkeys.length;
    this.monkeys = this.monkeys.filter((m) => !(m.state === "leave" && (m.x < -40 || m.x > this.w + 40)));
    if (this.monkeys.length !== before) this.status();

    // Stolen things fly home.
    for (const h of this.homing) h.t += dt;
    for (const h of this.homing.filter((x) => x.t >= 0.45)) restore(h.item);
    this.homing = this.homing.filter((x) => x.t < 0.45);

    for (const t of this.texts) {
      t.t += dt;
      t.y -= dt * 30;
    }
    this.texts = this.texts.filter((t) => t.t < 1.1);
    if (frenzy !== this.wasFrenzy) {
      this.wasFrenzy = frenzy;
      this.status();
    }
  }

  private updateGorilla(g: Gorilla, dt: number) {
    g.t += dt;
    const floor = this.floor() - 10;
    if (g.phase === "jump") {
      g.vy += 2000 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.y >= floor && g.vy > 0) {
        g.y = floor;
        g.phase = "beat";
        g.t = 0;
      }
    } else if (g.phase === "beat") {
      if (Math.floor(g.t * 4) !== Math.floor((g.t - dt) * 4)) this.say(g.x + (Math.random() - 0.5) * 50, g.y - 60, "THUMP", 16);
      if (g.t > 2) {
        g.phase = "rampage";
        g.t = 0;
        g.tx = Math.random() * this.w;
      }
    } else if (g.phase === "rampage") {
      const sp = this.opts.reduced ? 60 : 260;
      const dx = g.tx - g.x;
      if (Math.abs(dx) < 10) g.tx = 40 + Math.random() * (this.w - 80);
      g.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
      g.y = floor - Math.abs(Math.sin(g.t * 9)) * (this.opts.reduced ? 0 : 24);
      if (g.t > 14) {
        g.phase = "leave";
        g.tx = g.x < this.w / 2 ? -80 : this.w + 80;
      }
    } else {
      const dx = g.tx - g.x;
      g.x += Math.sign(dx) * 320 * dt;
      if (Math.abs(dx) < 10) {
        this.gorilla = null;
        this.status();
      }
    }
  }

  private draw() {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.textAlign = "center";
    c.textBaseline = "middle";

    for (const b of this.bananas) {
      c.save();
      c.translate(b.x, b.y);
      c.rotate(b.rot);
      c.font = "24px serif";
      c.fillText(BANANA, 0, 0);
      c.restore();
    }

    for (const h of this.homing) {
      const r = h.item.el.getBoundingClientRect();
      const k = easeOut(Math.min(1, h.t / 0.45));
      const x = h.x + (r.left + r.width / 2 - h.x) * k;
      const y = h.y + (r.top + r.height / 2 - h.y) * k - Math.sin(k * Math.PI) * 60;
      drawItem(c, h.item, x, y, 1);
    }

    const frenzy = this.now < this.frenzyUntil;
    for (const m of this.monkeys) {
      const bob = m.state === "dizzy" ? 0 : Math.abs(Math.sin(m.hop)) * (this.opts.reduced ? 1 : 5);
      if (m.item) drawItem(c, m.item, m.x, m.y - 34 - bob, 0.8);
      c.save();
      c.translate(m.x, m.y - bob);
      if (m.state === "dizzy") c.rotate(Math.sin(m.t * 20) * 0.3);
      c.scale(-m.face, 1);
      c.font = "32px serif";
      c.fillText(MONKEY, 0, 0);
      c.restore();
      if (m.state === "dizzy") {
        c.font = "12px serif";
        for (let i = 0; i < 3; i++) {
          const a = m.t * 6 + (i * Math.PI * 2) / 3;
          c.fillText("⭐", m.x + Math.cos(a) * 16, m.y - 22 + Math.sin(a) * 5);
        }
      } else if (frenzy) {
        c.font = "bold 14px sans-serif";
        c.fillStyle = "#ffd23f";
        c.fillText("!!", m.x + 14, m.y - 24);
      }
    }

    const g = this.gorilla;
    if (g) {
      c.save();
      c.translate(g.x, g.y);
      const beat = g.phase === "beat" && !this.opts.reduced ? 1 + Math.abs(Math.sin(g.t * 12)) * 0.12 : 1;
      c.scale((g.tx > g.x ? -1 : 1) * beat, beat);
      c.font = "64px serif";
      c.fillText(GORILLA, 0, -20);
      c.restore();
    }

    if (this.hammer) this.drawHammer(c);

    for (const t of this.texts) {
      c.globalAlpha = Math.max(0, 1 - t.t / 1.1);
      c.font = `800 ${t.size}px system-ui, sans-serif`;
      c.lineWidth = 4;
      c.strokeStyle = "rgba(0,0,0,.65)";
      c.strokeText(t.text, t.x, t.y);
      c.fillStyle = "#fff6d5";
      c.fillText(t.text, t.x, t.y);
      c.globalAlpha = 1;
    }

    if (this.drag) {
      c.font = "28px serif";
      c.fillText(BANANA, this.pointer.x, this.pointer.y);
    }
  }

  /** A hammer whose handle is a banana and whose head is a cluster of peanuts. */
  private drawHammer(c: CanvasRenderingContext2D) {
    const since = (this.now - this.swing) / 1000;
    const swing = since < 0.35 ? Math.sin((since / 0.35) * Math.PI) * 1.1 : 0;
    c.save();
    c.translate(this.pointer.x + 18, this.pointer.y + 18);
    c.rotate(-0.6 + swing);
    c.font = "30px serif";
    c.save();
    c.rotate(Math.PI / 2.3);
    c.fillText(BANANA, 0, 6);
    c.restore();
    c.font = "18px serif";
    c.fillText(PEANUT, -12, -22);
    c.fillText(PEANUT, 0, -26);
    c.fillText(PEANUT, 12, -22);
    c.restore();
  }
}

function easeOut(k: number) {
  return 1 - (1 - k) ** 3;
}

function snapshotItem(el: HTMLElement): Item {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
  const bg = cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? cs.backgroundColor : getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#fff";
  return { el, text: text.length > 22 ? `${text.slice(0, 21)}…` : text, w: Math.min(220, r.width), h: Math.min(44, r.height), bg, fg: cs.color };
}

function restore(item: Item) {
  delete item.el.dataset.draftStolen;
}

function drawItem(c: CanvasRenderingContext2D, item: Item, x: number, y: number, scale: number) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.font = "600 14px system-ui, sans-serif";
  const w = Math.max(40, Math.min(200, c.measureText(item.text).width + 22));
  const h = 28;
  c.fillStyle = item.bg;
  c.strokeStyle = item.fg;
  c.lineWidth = 1.5;
  c.beginPath();
  c.roundRect(-w / 2, -h / 2, w, h, 14);
  c.fill();
  c.stroke();
  c.fillStyle = item.fg;
  c.fillText(item.text, 0, 1);
  c.restore();
}
