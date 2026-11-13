/**
 * Monkey Mode (Wild & Wondrous).
 *
 * Its own canvas and loop, separate from the main effects engine, so the two
 * never fight over frames. Monkeys multiply, swing on vines that hang from the
 * top of the screen, and steal pieces of the page: whole buttons and tags, or
 * a few words out of a heading or paragraph. The gap stays where the piece
 * came from, and the piece looks exactly the same while it's carried around
 * (see loot.ts). Bonking a monkey sends its loot flying home.
 *
 * The gorilla (behind emergency glass) rampages: chest beats that shake the
 * page, ground pounds that fling monkeys, and the troop goes bananas. A
 * bowling ball (also behind glass) knocks the banana crate over.
 *
 * Everything is capped and bounded, and there's a calm version for reduced
 * motion: fewer, slower monkeys, still vines, no shaking and no frenzy.
 */
import { center, placeGhost, liftElement, liftWords, wholeCandidates, wordsCandidate, type Loot } from "@/lib/wild/loot";

export type MonkeySecret = "monkey-bonk" | "monkey-troop" | "monkey-gorilla" | "monkey-frenzy";
export type MonkeyStatus = { monkeys: number; stolen: number; bonks: number; gorilla: boolean; frenzy: boolean; ball: boolean; tipped: boolean };

type Target = { rect(): DOMRect | null; take(): Loot | null };
type State = "wander" | "grab" | "banana" | "vine" | "swing" | "fly" | "dizzy" | "leave";
type Monkey = {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  state: State;
  loot: Loot | null;
  target: Target | null;
  vine: Vine | null;
  t: number;
  face: 1 | -1;
  hop: number;
  /** Base speed (px/s): every monkey is different… */
  speed: number;
  /** …and changes pace now and then. */
  pace: number;
  paceT: number;
  size: number;
  swingFor: number;
};
type Vine = { x: number; len: number; phase: number; rider: Monkey | null; theta: number; omega: number; cool: number };
type Banana = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; rest: boolean };
type Homing = { loot: Loot; x: number; y: number; t: number };
type Text = { x: number; y: number; text: string; t: number; size: number };
type Ring = { x: number; y: number; t: number; big: boolean };
type Gorilla = { x: number; y: number; vx: number; vy: number; tx: number; phase: "jump" | "beat" | "rampage" | "leap" | "leave"; t: number; age: number; beats: number };
type Ball = { x: number; y: number; vx: number; vy: number; rot: number; held: number | null; samples: { x: number; y: number; t: number }[] };

const MONKEY = "🐒";
const BANANA = "🍌";
const GORILLA = "🦍";
const MAX_MONKEYS = 12;
const MAX_BANANAS = 40;
const BALL_R = 22;
const SHOUTS = ["OOK!", "EEK!", "OOK OOK!", "AAAH!", "WHEE!", "EEEE!"];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (k: number) => 1 - (1 - k) ** 3;

export class MonkeyEngine {
  private ctx: CanvasRenderingContext2D;
  private monkeys: Monkey[] = [];
  private vines: Vine[] = [];
  private bananas: Banana[] = [];
  private homing: Homing[] = [];
  private texts: Text[] = [];
  private rings: Ring[] = [];
  private gorilla: Gorilla | null = null;
  private ball: Ball | null = null;
  private ballEl: HTMLElement | null = null;
  private crateEl: HTMLElement | null = null;
  private frame = 0;
  private last = 0;
  private clock = 0;
  private spawnTimer = 0;
  private pile: Monkey[] = [];
  private nextId = 1;
  private bonks = 0;
  private frenzyUntil = 0;
  private tippedUntil = 0;
  private lastStatus = "";
  private w = 0;
  private h = 0;
  private dpr = 1;
  private pointer = { x: -100, y: -100 };
  private drag: { id: number; samples: { x: number; y: number; t: number }[] } | null = null;
  private destroyed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: {
      reduced: boolean;
      draft?: boolean;
      onSecret: (id: MonkeySecret) => void;
      onStatus: (s: MonkeyStatus) => void;
      onShake: (strength: 1 | 2 | 3) => void;
      onSound: (kind: "pop" | "hit" | "launch" | "secret") => void;
    },
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    window.addEventListener("pointerdown", this.onDown, { capture: true });
    for (let i = 0; i < (opts.reduced ? 1 : 2); i++) this.spawn();
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  get cap() {
    return this.opts.reduced ? 3 : this.opts.draft ? 18 : MAX_MONKEYS;
  }
  get reduced() {
    return this.opts.reduced;
  }
  setReduced(reduced: boolean) {
    this.opts.reduced = reduced;
  }
  setCrate(el: HTMLElement | null) {
    this.crateEl = el;
  }
  setBallEl(el: HTMLElement | null) {
    this.ballEl = el;
    this.placeBall();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    window.removeEventListener("pointerdown", this.onDown, { capture: true });
    for (const m of this.monkeys) m.loot?.restore();
    for (const h of this.homing) h.loot.restore();
    this.monkeys = [];
    this.homing = [];
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  /* ---------- public actions (the dock, keyboard and tests) ---------- */

  spawn() {
    if (this.monkeys.length >= this.cap) return;
    const left = Math.random() < 0.5;
    const r = this.opts.reduced;
    const m: Monkey = {
      id: this.nextId++,
      x: left ? -30 : this.w + 30,
      y: this.h * rand(0.3, 0.9),
      tx: this.w / 2,
      ty: this.h / 2,
      vx: 0,
      vy: 0,
      state: "wander",
      loot: null,
      target: null,
      vine: null,
      t: 0,
      face: left ? 1 : -1,
      hop: Math.random() * 6,
      // Sprinters, strollers and everything between.
      speed: r ? rand(26, 40) : Math.random() < 0.25 ? rand(190, 260) : rand(45, 150),
      pace: 1,
      paceT: rand(1, 4),
      size: r ? 30 : rand(26, 38),
      swingFor: 0,
    };
    this.pickWander(m);
    this.monkeys.push(m);
    if (this.monkeys.length >= MAX_MONKEYS) this.opts.onSecret("monkey-troop");
    this.status();
  }

  /** A monkey to bonk without a pointer (keyboard): the nearest thief, or anyone. */
  bonkOne() {
    const ok = (x: Monkey) => x.state !== "dizzy" && x.state !== "leave";
    const m = this.monkeys.find((x) => x.loot && ok(x)) ?? this.monkeys.find(ok);
    if (m) this.bonk(m);
    return !!m;
  }

  /** Toss one banana from a point (keyboard, or a tap on the crate). */
  toss(x: number, y: number) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const v = rand(500, 800);
    this.addBanana(x, y, Math.cos(a) * v, Math.sin(a) * v);
  }

  startDrag(pointerId: number, x: number, y: number) {
    this.drag = { id: pointerId, samples: [{ x, y, t: performance.now() }] };
    this.pointer = { x, y };
  }

  /** The gorilla bursts out of his case at (x, y). */
  releaseGorilla(x: number, y: number) {
    const tx = this.w * rand(0.35, 0.65);
    const g: Gorilla = { x, y, vx: (tx - x) / 0.9, vy: -950, tx, phase: "jump", t: 0, age: 0, beats: 0 };
    if (this.opts.reduced) Object.assign(g, { x: -60, y: this.floor() - 10, phase: "rampage", tx });
    this.gorilla = g;
    this.pile = [];
    if (this.opts.draft && !this.opts.reduced) for (let i = 0; i < 6; i++) this.spawn();
    this.opts.onSecret("monkey-gorilla");
    this.status();
  }

  /** Send the gorilla home early (the "Calm the gorilla" button, or Esc). */
  calmGorilla() {
    const g = this.gorilla;
    if (!g || g.phase === "leave") return;
    if (g.phase === "jump" || g.phase === "leap") {
      g.y = this.floor() - 10;
      g.vy = 0;
    }
    g.phase = "leave";
    g.tx = g.x < this.w / 2 ? -90 : this.w + 90;
    this.say(g.x, g.y - 70, "…fine.", 18);
  }

  /** The bowling ball pops out of its case and lands on the floor. */
  spawnBall(x: number, y: number) {
    this.ball = { x, y: y - 10, vx: rand(80, 200), vy: -500, rot: 0, held: null, samples: [] };
    this.placeBall();
    this.status();
  }
  removeBall() {
    this.ball = null;
    this.status();
  }
  grabBall(pointerId: number, x: number, y: number) {
    const b = this.ball;
    if (!b) return;
    b.held = pointerId;
    b.samples = [{ x, y, t: performance.now() }];
    b.vx = b.vy = 0;
  }
  dragBall(pointerId: number, x: number, y: number) {
    const b = this.ball;
    if (!b || b.held !== pointerId) return;
    b.x = Math.max(BALL_R, Math.min(this.w - BALL_R, x));
    b.y = Math.max(BALL_R, Math.min(this.floor() - BALL_R, y));
    b.samples.push({ x, y, t: performance.now() });
    if (b.samples.length > 6) b.samples.shift();
    this.placeBall();
  }
  releaseBall(pointerId: number) {
    const b = this.ball;
    if (!b || b.held !== pointerId) return;
    b.held = null;
    const first = b.samples[0];
    const last = b.samples[b.samples.length - 1];
    const dt = Math.max(16, last.t - first.t) / 1000;
    b.vx = Math.max(-1800, Math.min(1800, (last.x - first.x) / dt));
    b.vy = Math.max(-1800, Math.min(1800, (last.y - first.y) / dt));
    if (Math.hypot(b.vx, b.vy) > 300) this.opts.onSound("launch");
  }
  /** Keyboard: roll the ball straight at the crate. */
  bowl() {
    const b = this.ball;
    if (!b) return;
    const c = this.crateEl ? center(this.crateEl.getBoundingClientRect()) : { x: 30, y: this.h };
    b.held = null;
    b.y = this.floor() - BALL_R;
    b.vx = Math.sign(c.x - b.x || -1) * 1100;
    b.vy = -60;
    this.opts.onSound("launch");
  }

  /** For tests and the status line. */
  snapshot() {
    return {
      monkeys: this.monkeys.map((m) => ({ id: m.id, x: m.x, y: m.y, state: m.state, carrying: !!m.loot, speed: Math.round(m.speed) })),
      bananas: this.bananas.length,
      vines: this.vines.length,
      swinging: this.vines.filter((v) => v.rider).length,
      gorilla: this.gorilla?.phase ?? null,
      ball: this.ball ? { x: this.ball.x, y: this.ball.y } : null,
      bonks: this.bonks,
      frenzy: this.clock < this.frenzyUntil,
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
    this.makeVines();
  };

  /** Vines hang from just under the (sticky) header, so they never cover the navigation. */
  private top = 0;

  private makeVines() {
    this.top = Math.max(0, document.querySelector("header")?.getBoundingClientRect().bottom ?? 0);
    const n = Math.max(3, Math.min(6, Math.floor(this.w / 230)));
    const old = this.vines;
    for (const v of old) if (v.rider) this.letGo(v.rider);
    this.vines = Array.from({ length: n }, (_, i) => ({
      x: (this.w * (i + 0.5)) / n + rand(-25, 25),
      len: this.h * rand(0.16, 0.34),
      phase: Math.random() * 6,
      rider: null,
      theta: 0,
      omega: 0,
      cool: 0,
    }));
  }

  private floor() {
    return this.h - 16;
  }
  private frenzy() {
    return this.clock < this.frenzyUntil;
  }
  /** Monkeys go bananas while the gorilla is out (or the crate just spilled). */
  private wild() {
    return !this.opts.reduced && ((!!this.gorilla && this.gorilla.phase !== "leave") || this.frenzy());
  }

  private status() {
    const s: MonkeyStatus = {
      monkeys: this.monkeys.length,
      stolen: this.monkeys.filter((m) => m.loot).length,
      bonks: this.bonks,
      gorilla: !!this.gorilla,
      frenzy: this.frenzy(),
      ball: !!this.ball,
      tipped: this.clock < this.tippedUntil,
    };
    const key = JSON.stringify(s);
    if (key === this.lastStatus) return;
    this.lastStatus = key;
    this.opts.onStatus(s);
  }

  private say(x: number, y: number, text: string, size = 18) {
    const half = (text.length * size) / 3;
    this.texts.push({ x: Math.max(half, Math.min(this.w - half, x)), y: Math.max(size, y), text, t: 0, size });
    if (this.texts.length > 24) this.texts.shift();
  }

  private addBanana(x: number, y: number, vx: number, vy: number) {
    this.bananas.push({ x, y, vx, vy, rot: 0, vr: (Math.random() - 0.5) * 14, rest: false });
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
    if (Math.hypot(e.clientX - first.x, e.clientY - first.y) < 12) {
      this.toss(e.clientX, e.clientY - 10);
      return;
    }
    const dt = Math.max(16, performance.now() - first.t) / 1000;
    const vx = Math.max(-1600, Math.min(1600, (lastS.x - first.x) / dt));
    const vy = Math.max(-1600, Math.min(1600, (lastS.y - first.y) / dt));
    this.addBanana(e.clientX, e.clientY, vx, vy);
  };

  /** Capture phase: a press on a monkey bonks it and doesn't reach the page underneath. */
  private onDown = (e: PointerEvent) => {
    const m = this.hit(e.clientX, e.clientY);
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
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

  private dropLoot(m: Monkey) {
    if (!m.loot) return;
    this.homing.push({ loot: m.loot, x: m.x, y: m.y - 30, t: 0 });
    m.loot = null;
  }

  private letGo(m: Monkey) {
    if (m.vine && m.vine.rider === m) {
      m.vine.rider = null;
      m.vine.cool = 0.8;
    }
    m.vine = null;
  }

  private bonk(m: Monkey, fling = false) {
    this.dropLoot(m);
    this.letGo(m);
    m.target = null;
    m.t = 0;
    this.bonks++;
    this.say(m.x, m.y - 34, "BONK!", 20);
    this.opts.onSound("hit");
    if (fling && !this.opts.reduced) {
      m.state = "fly";
      m.vx = rand(-500, 500);
      m.vy = rand(-900, -600);
    } else m.state = "dizzy";
    if (this.bonks === 10) this.opts.onSecret("monkey-bonk");
    this.status();
  }

  private pickWander(m: Monkey) {
    m.tx = rand(40, this.w - 40);
    m.ty = this.h * rand(0.15, 0.9);
  }

  /** Something on screen to steal: a few words, or a whole button or tag. */
  private findTarget(): Target | null {
    if (Math.random() < 0.35) {
      const els = wholeCandidates(260).filter((el) => !this.monkeys.some((m) => m.target && (m.target as { el?: HTMLElement }).el === el));
      if (els.length) {
        const el = els[Math.floor(Math.random() * els.length)];
        return Object.assign(
          {
            rect: () => (el.isConnected && !el.dataset.wildGone ? el.getBoundingClientRect() : null),
            take: () => (el.isConnected && !el.dataset.wildGone ? liftElement(el) : null),
          },
          { el },
        );
      }
    }
    const c = wordsCandidate();
    if (!c) return null;
    const { node, start, end } = c;
    const text = (node.nodeValue ?? "").slice(start, end);
    const valid = () => node.isConnected && (node.nodeValue ?? "").slice(start, end) === text;
    return {
      rect: () => {
        if (!valid()) return null;
        const r = document.createRange();
        r.setStart(node, start);
        r.setEnd(node, end);
        return r.getBoundingClientRect();
      },
      take: () => (valid() ? liftWords(node, start, end) : null),
    };
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

  private tip(v: Vine) {
    return { x: v.x + Math.sin(v.theta) * v.len, y: this.top + Math.cos(v.theta) * v.len };
  }

  private tick = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!document.hidden) {
      this.clock += dt * 1000;
      this.update(dt);
      this.draw();
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    const wild = this.wild();
    const reduced = this.opts.reduced;

    // Monkeys multiply: slowly, or fast while things are wild.
    this.spawnTimer += dt;
    const every = reduced ? 15 : this.gorilla ? 0.8 : this.frenzy() ? 2 : 7;
    if (this.spawnTimer > every) {
      this.spawnTimer = 0;
      this.spawn();
    }

    this.updateBananas(dt);
    this.updateVines(dt);
    if (this.gorilla) this.updateGorilla(this.gorilla, dt);
    this.updateBall(dt);
    for (const m of this.monkeys) this.updateMonkey(m, dt, wild);

    // Monkeys that ran off screen are gone (new ones keep coming).
    this.monkeys = this.monkeys.filter((m) => !(m.state === "leave" && (m.x < -40 || m.x > this.w + 40)));

    // Stolen things fly home.
    for (const h of this.homing) h.t += dt;
    for (const h of this.homing.filter((x) => x.t >= 0.45)) h.loot.restore();
    this.homing = this.homing.filter((x) => x.t < 0.45);
    for (const h of this.homing) {
      const home = center(h.loot.home());
      const k = ease(Math.min(1, h.t / 0.45));
      placeGhost(h.loot, h.x + (home.x - h.x) * k, h.y + (home.y - h.y) * k - Math.sin(k * Math.PI) * 60, 0, 1);
    }

    for (const t of this.texts) {
      t.t += dt;
      t.y -= dt * 30;
    }
    this.texts = this.texts.filter((t) => t.t < 1.1);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < 0.7);
    this.status();
  }

  private updateBananas(dt: number) {
    const floor = this.floor();
    for (const b of this.bananas) {
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
  }

  private updateVines(dt: number) {
    const G = 1500;
    for (const v of this.vines) {
      v.cool = Math.max(0, v.cool - dt);
      if (!v.rider) {
        // Idle vines sway a little (and settle after a swing).
        const rest = this.opts.reduced ? 0 : Math.sin(this.clock / 900 + v.phase) * 0.05;
        v.omega += (-(G / v.len) * Math.sin(v.theta - rest) - v.omega * 2.5) * dt;
        v.theta += v.omega * dt;
        continue;
      }
      // A rider pumps the swing higher, up to a limit.
      const pump = Math.abs(v.theta) < 0.3 ? Math.sign(v.omega || 1) * (this.wild() ? 4 : 2.4) : 0;
      v.omega += (-(G / v.len) * Math.sin(v.theta) + pump) * dt;
      v.theta += v.omega * dt;
      const max = 1.25;
      if (Math.abs(v.theta) > max) {
        v.theta = Math.sign(v.theta) * max;
        v.omega *= -0.2;
      }
    }
  }

  private updateMonkey(m: Monkey, dt: number, wild: boolean) {
    m.t += dt;
    m.hop += dt * (wild ? 22 : 12);
    m.paceT -= dt;
    if (m.paceT <= 0) {
      m.pace = this.opts.reduced ? 1 : Math.random() < 0.2 ? rand(1.6, 2.2) : rand(0.5, 1.2);
      m.paceT = rand(1.5, 4);
    }
    const speed = m.speed * m.pace * (wild ? this.opts.draft ? 3 : 2.4 : 1) * (m.state === "leave" ? 2 : 1);
    const g = this.gorilla;
    const pileIndex = this.pile.indexOf(m);
    if (g && pileIndex >= 0) {
      m.x = g.x + Math.cos(pileIndex * 2.4) * (12 + pileIndex * 3);
      m.y = g.y - 22 + Math.sin(pileIndex * 2.4) * 27;
      return;
    }

    if (m.state === "dizzy") {
      if (m.t > 1.3) {
        m.state = "leave";
        m.tx = m.x < this.w / 2 ? -60 : this.w + 60;
        m.ty = m.y;
      }
      return;
    }

    if (m.state === "swing") {
      const v = m.vine!;
      const tip = this.tip(v);
      m.x = tip.x;
      m.y = tip.y + 14;
      m.face = v.omega > 0 ? 1 : -1;
      // Let go at speed, near the bottom of the arc.
      if (m.t > m.swingFor && Math.abs(v.theta) < 0.45 && Math.abs(v.omega) > 1.2) {
        m.vx = v.len * Math.cos(v.theta) * v.omega;
        m.vy = -v.len * Math.sin(v.theta) * v.omega - 320;
        this.letGo(m);
        m.state = "fly";
        m.t = 0;
        if (Math.random() < 0.4) this.say(m.x, m.y - 30, "WHEE!", 15);
      }
      return;
    }

    if (m.state === "fly") {
      m.vy += 1500 * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.x < 16 || m.x > this.w - 16) {
        m.vx *= -0.6;
        m.x = Math.max(16, Math.min(this.w - 16, m.x));
      }
      if (m.y < 16) {
        m.y = 16;
        m.vy = Math.abs(m.vy) * 0.3;
      }
      if (Math.abs(m.vx) > 4) m.face = m.vx > 0 ? 1 : -1;
      // Vine to vine: catch another one on the way past.
      for (const v of this.vines) {
        if (v.rider || v.cool > 0 || this.opts.reduced) continue;
        const tip = this.tip(v);
        if (Math.hypot(tip.x - m.x, tip.y + 14 - m.y) < 30) {
          this.grabVine(m, v);
          return;
        }
      }
      if ((m.t > 0.9 && m.vy > 0) || m.y > this.floor() - 4) {
        m.y = Math.min(m.y, this.floor() - 4);
        m.state = "wander";
        m.t = 0;
        this.pickWander(m);
      }
      return;
    }

    // Bananas beat everything except running from the gorilla.
    const scared = g && g.phase !== "leave" && Math.hypot(g.x - m.x, g.y - m.y) < 170;
    if (m.state !== "leave" && m.state !== "vine" && this.bananas.length && !scared) {
      const b = this.nearestBanana(m)!;
      m.target = null;
      m.state = "banana";
      m.tx = b.x;
      m.ty = b.y;
      if (Math.hypot(b.x - m.x, b.y - m.y) < 18) {
        this.bananas.splice(this.bananas.indexOf(b), 1);
        if (Math.random() < 0.35) this.say(m.x, m.y - 30, "nom", 14);
        m.state = "wander";
        this.pickWander(m);
        if (this.opts.draft && wild) {
          const rival = this.monkeys.find((other) => other !== m && other.state === "banana" && Math.hypot(other.x - m.x, other.y - m.y) < 42);
          if (rival) {
            rival.state = "dizzy";
            rival.t = 0;
            this.addBanana(m.x, m.y, rand(-160, 160), -300);
            this.say(m.x, m.y - 28, "BONK!");
          }
        }
      }
    } else if (m.state === "banana") {
      m.state = "wander";
      this.pickWander(m);
    }

    if (scared && m.state !== "leave") {
      // Scatter!
      m.target = null;
      m.state = "wander";
      m.tx = Math.max(30, Math.min(this.w - 30, m.x + Math.sign(m.x - g.x || 1) * 220));
      m.ty = Math.max(40, m.y - rand(40, 160));
    }

    if (m.state === "wander") {
      if (wild && Math.random() < dt * 0.8) this.say(m.x, m.y - 34, SHOUTS[Math.floor(Math.random() * SHOUTS.length)], 14);
      const steal = (wild ? 1.1 : 0.35) * dt;
      const swing = (wild ? 0.7 : 0.3) * dt;
      if (!m.loot && m.t > 1.5 && Math.random() < steal) {
        const t = this.findTarget();
        if (t) {
          m.state = "grab";
          m.target = t;
        }
      } else if (!this.opts.reduced && m.t > 1 && Math.random() < swing) {
        const free = this.vines.filter((v) => !v.rider && v.cool <= 0 && !this.monkeys.some((o) => o.vine === v));
        if (free.length) {
          const v = free.sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x))[0];
          m.state = "vine";
          m.vine = v;
        }
      }
    }

    if (m.state === "vine") {
      const v = m.vine;
      if (!v || v.rider) {
        m.vine = null;
        m.state = "wander";
      } else {
        const tip = this.tip(v);
        m.tx = tip.x;
        m.ty = tip.y + 14;
        if (Math.hypot(m.tx - m.x, m.ty - m.y) < 16) this.grabVine(m, v);
      }
    }

    if (m.state === "grab" && m.target) {
      const r = m.target.rect();
      if (!r || r.bottom < 0 || r.top > this.h) {
        m.target = null;
        m.state = "wander";
      } else {
        m.tx = r.left + r.width / 2;
        m.ty = r.top + r.height / 2 + 14;
        if (Math.hypot(m.tx - m.x, m.ty - m.y) < 16) {
          m.loot = m.target.take();
          m.target = null;
          m.state = "wander";
          m.t = 0;
          if (m.loot) {
            this.say(m.x, m.y - 40, Math.random() < 0.5 ? "mine!" : "ooh!", 15);
            // Run off with it.
            m.tx = Math.random() < 0.5 ? 40 : this.w - 40;
            m.ty = this.h * rand(0.2, 0.8);
          }
        }
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

  private grabVine(m: Monkey, v: Vine) {
    v.rider = m;
    m.vine = v;
    m.state = "swing";
    m.t = 0;
    m.swingFor = rand(1.2, 3.2);
    v.omega += (m.face || 1) * 1.6;
  }

  /* ---------- the gorilla ---------- */

  private shockwave(x: number, y: number, big: boolean) {
    this.rings.push({ x, y, t: 0, big });
    if (this.opts.reduced) return;
    this.opts.onShake(big ? 3 : 1);
    if (!big) return;
    // Ground pound: nearby monkeys go flying (and drop what they carry), bananas jump.
    for (const m of this.monkeys) {
      if (m.state === "leave" || Math.hypot(m.x - x, m.y - y) > 280) continue;
      this.dropLoot(m);
      this.letGo(m);
      m.target = null;
      m.state = "fly";
      m.t = 0;
      m.vx = Math.sign(m.x - x || 1) * rand(300, 700);
      m.vy = rand(-1100, -700);
    }
    for (const b of this.bananas) {
      if (Math.abs(b.x - x) > 320) continue;
      b.rest = false;
      b.vy = rand(-700, -400);
      b.vx += rand(-200, 200);
    }
  }

  private updateGorilla(g: Gorilla, dt: number) {
    g.t += dt;
    g.age += dt;
    const floor = this.floor() - 10;
    const reduced = this.opts.reduced;
    if (this.opts.draft && !reduced && g.phase !== "leave" && g.age > 5) {
      const next = Math.min(9, Math.floor((g.age - 5) * 2));
      if (this.pile.length < next) {
        const m = this.monkeys.find((monkey) => monkey.state !== "leave" && !this.pile.includes(monkey));
        if (m) {
          this.dropLoot(m);
          this.letGo(m);
          this.pile.push(m);
        }
      }
      if (g.age > 10.5) {
        for (const m of this.pile) {
          m.state = "fly";
          m.t = 0;
          m.vx = rand(-650, 650);
          m.vy = rand(-1000, -550);
        }
        this.pile = [];
        this.shockwave(g.x, g.y, true);
        this.calmGorilla();
      } else if (this.pile.length >= 8) {
        return;
      }
    }
    const air = (onLand: () => void) => {
      g.vy += 2200 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.x = Math.max(30, Math.min(this.w - 30, g.x));
      if (g.y >= floor && g.vy > 0) {
        g.y = floor;
        g.vy = 0;
        onLand();
      }
    };
    if (g.phase !== "leave" && g.age > (reduced ? 8 : 14)) {
      g.phase = "leave";
      g.tx = g.x < this.w / 2 ? -90 : this.w + 90;
      g.y = floor;
    }
    if (g.phase === "jump") {
      air(() => {
        this.shockwave(g.x, floor, true);
        this.say(g.x, g.y - 90, "BOOM", 30);
        g.phase = "beat";
        g.t = 0;
      });
    } else if (g.phase === "beat") {
      // Chest beats: THUMP THUMP THUMP, and the page shakes along.
      const beat = Math.floor(g.t * 4);
      if (beat !== g.beats && !reduced) {
        g.beats = beat;
        this.say(g.x + rand(-40, 40), g.y - 80, "THUMP", 18);
        this.shockwave(g.x, g.y - 30, false);
        this.opts.onSound("hit");
      }
      if (g.t > (reduced ? 1 : 1.6)) {
        g.phase = "rampage";
        g.t = 0;
        g.tx = rand(40, this.w - 40);
        this.say(g.x, g.y - 90, "RAAAH!", 26);
      }
    } else if (g.phase === "rampage") {
      const sp = reduced ? 70 : 400;
      const dx = g.tx - g.x;
      g.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
      g.y = floor - (reduced ? 0 : Math.abs(Math.sin(g.t * 11)) * 18);
      if (Math.abs(dx) < 10) {
        const roll = Math.random();
        if (!reduced && roll < 0.45) {
          // A huge leap, then a ground pound.
          g.phase = "leap";
          g.vy = rand(-1300, -1000);
          g.vx = rand(-1, 1) * 500;
          g.t = 0;
        } else if (!reduced && roll < 0.7) {
          g.phase = "beat";
          g.t = 0;
          g.beats = -1;
        } else g.tx = rand(40, this.w - 40);
      }
    } else if (g.phase === "leap") {
      air(() => {
        this.shockwave(g.x, floor, true);
        this.say(g.x, g.y - 90, Math.random() < 0.5 ? "SMASH!" : "BOOM", 28);
        this.opts.onSound("hit");
        g.phase = "rampage";
        g.t = 0;
        g.tx = rand(40, this.w - 40);
      });
    } else {
      g.y = Math.min(floor, g.y + 600 * dt);
      const dx = g.tx - g.x;
      g.x += Math.sign(dx) * (reduced ? 120 : 380) * dt;
      if (Math.abs(dx) < 12 || g.x < -80 || g.x > this.w + 80) {
        this.gorilla = null;
        this.status();
      }
    }
  }

  /* ---------- the bowling ball and the crate ---------- */

  private placeBall() {
    const b = this.ball;
    if (!b || !this.ballEl) return;
    this.ballEl.style.transform = `translate(${b.x - BALL_R}px, ${b.y - BALL_R}px) rotate(${b.rot}rad)`;
  }

  private updateBall(dt: number) {
    const b = this.ball;
    if (!b) return;
    if (b.held === null) {
      const floor = this.floor() - BALL_R + 6;
      b.vy += 2200 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < BALL_R || b.x > this.w - BALL_R) {
        b.vx *= -0.5;
        b.x = Math.max(BALL_R, Math.min(this.w - BALL_R, b.x));
      }
      if (b.y < BALL_R) {
        b.y = BALL_R;
        b.vy = Math.abs(b.vy) * 0.4;
      }
      if (b.y >= floor) {
        b.y = floor;
        b.vy = Math.abs(b.vy) > 140 ? -b.vy * 0.35 : 0;
        b.vx *= Math.exp(-0.7 * dt);
        if (Math.abs(b.vx) < 6) b.vx = 0;
      }
      b.rot += (b.vx / BALL_R) * dt;
      this.ballHits(b);
    }
    this.placeBall();
  }

  private ballHits(b: Ball) {
    const speed = Math.hypot(b.vx, b.vy);
    // Monkeys in the way get bowled over.
    if (speed > 220) {
      for (const m of this.monkeys) {
        if (m.state === "leave" || m.state === "dizzy" || m.state === "fly") continue;
        if (Math.hypot(m.x - b.x, m.y - 8 - b.y) < BALL_R + 16) this.bonk(m, true);
      }
    }
    const crate = this.crateEl?.getBoundingClientRect();
    if (!crate) return;
    const cx = Math.max(crate.left, Math.min(b.x, crate.right));
    const cy = Math.max(crate.top, Math.min(b.y, crate.bottom));
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d = Math.hypot(dx, dy);
    if (d >= BALL_R) return;
    // Push the ball back out of the crate.
    const nx = d ? dx / d : Math.sign(b.x - (crate.left + crate.width / 2)) || 1;
    const ny = d ? dy / d : 0;
    b.x += nx * (BALL_R - d);
    b.y += ny * (BALL_R - d);
    if (this.clock >= this.tippedUntil && speed > 90) {
      const c = center(crate);
      this.spill(c.x, c.y - 10);
      b.vx = -b.vx * 0.3 + nx * 120;
      b.vy = -200;
    } else {
      b.vx = nx ? Math.abs(b.vx) * 0.4 * Math.sign(nx) : b.vx;
    }
  }

  /** The crate tips over: bananas everywhere, and the troop goes bananas. */
  private spill(x: number, y: number) {
    const reduced = this.opts.reduced;
    const n = reduced ? 8 : this.opts.draft ? 40 : 26;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.3) * 2.2;
      const v = rand(300, 1000);
      this.addBanana(x, y, Math.cos(a) * v, Math.sin(a) * v);
    }
    const dur = reduced ? 5000 : 10000;
    this.frenzyUntil = this.clock + dur;
    this.tippedUntil = this.clock + dur;
    this.say(x + 40, y - 50, "STRIKE!", 30);
    this.opts.onSound("hit");
    if (!reduced) this.opts.onShake(2);
    for (let i = 0; i < (this.opts.draft && !reduced ? 9 : 4); i++) this.spawn();
    this.opts.onSecret("monkey-frenzy");
    this.status();
  }

  /* ---------- drawing ---------- */

  private draw() {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.textAlign = "center";
    c.textBaseline = "middle";

    this.drawVines(c);

    for (const r of this.rings) {
      const k = r.t / 0.7;
      c.strokeStyle = `rgba(255, 214, 120, ${0.6 * (1 - k)})`;
      c.lineWidth = r.big ? 5 : 3;
      c.beginPath();
      c.ellipse(r.x, r.y, (r.big ? 320 : 90) * k + 10, (r.big ? 60 : 50) * k + 4, 0, 0, Math.PI * 2);
      c.stroke();
    }

    c.font = "24px serif";
    for (const b of this.bananas) {
      c.save();
      c.translate(b.x, b.y);
      c.rotate(b.rot);
      c.fillText(BANANA, 0, 0);
      c.restore();
    }

    const wild = this.wild();
    for (const m of this.monkeys) {
      const air = m.state === "swing" || m.state === "fly";
      const bob = m.state === "dizzy" || air ? 0 : Math.abs(Math.sin(m.hop)) * (this.opts.reduced ? 1 : 5);
      if (m.loot) placeGhost(m.loot, m.x, m.y - m.size * 0.55 - m.loot.h / 2 - bob, Math.sin(m.hop / 2) * 0.06, 1);
      c.save();
      c.translate(m.x, m.y - bob);
      if (m.state === "dizzy") c.rotate(Math.sin(m.t * 20) * 0.3);
      else if (m.state === "fly") c.rotate(m.t * 8 * m.face);
      else if (m.state === "swing" && m.vine) c.rotate(-m.vine.theta);
      c.scale(-m.face, 1);
      c.font = `${m.size}px serif`;
      c.fillText(MONKEY, 0, 0);
      c.restore();
      if (m.state === "dizzy") {
        c.font = "12px serif";
        for (let i = 0; i < 3; i++) {
          const a = m.t * 6 + (i * Math.PI * 2) / 3;
          c.fillText("⭐", m.x + Math.cos(a) * 16, m.y - 22 + Math.sin(a) * 5);
        }
      } else if (wild && !air) {
        c.font = "bold 14px sans-serif";
        c.fillStyle = "#ffd23f";
        c.fillText("!!", m.x + 14, m.y - 24);
      }
    }

    const g = this.gorilla;
    if (g && this.pile.length < 8) {
      c.save();
      c.translate(g.x, g.y);
      const beat = g.phase === "beat" && !this.opts.reduced ? 1 + Math.abs(Math.sin(g.t * 12)) * 0.14 : 1;
      const lean = g.phase === "leap" ? Math.max(-0.4, Math.min(0.4, g.vy / 3000)) : 0;
      c.rotate(lean);
      c.scale((g.tx > g.x ? -1 : 1) * beat, beat);
      c.font = "72px serif";
      c.fillText(GORILLA, 0, -24);
      c.restore();
    }

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

  private drawVines(c: CanvasRenderingContext2D) {
    c.lineCap = "round";
    for (const v of this.vines) {
      const tip = this.tip(v);
      // A gentle curve from the anchor to the tip: it sags opposite the swing.
      const mx = (v.x + tip.x) / 2 - Math.sin(v.theta) * v.len * 0.12;
      const my = (this.top + tip.y) / 2;
      c.strokeStyle = "#3f7d2c";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(v.x, this.top - 2);
      c.quadraticCurveTo(mx, my, tip.x, tip.y);
      c.stroke();
      c.strokeStyle = "#5fa83f";
      c.lineWidth = 1.5;
      c.stroke();
      // Leaves along the vine.
      c.fillStyle = "#4f9a35";
      for (let i = 1; i < 6; i++) {
        const k = i / 6;
        const x = (1 - k) * (1 - k) * v.x + 2 * (1 - k) * k * mx + k * k * tip.x;
        const y = (1 - k) * (1 - k) * this.top + 2 * (1 - k) * k * my + k * k * tip.y;
        const side = i % 2 ? 1 : -1;
        c.save();
        c.translate(x, y);
        c.rotate(side * 0.9 + v.theta);
        c.beginPath();
        c.ellipse(side * 6, 0, 7, 3.2, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
  }
}
