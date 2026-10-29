/**
 * The effects engine: one canvas, one animation loop, every playful effect.
 *
 * Effects are small systems that update and draw each frame. The loop only
 * runs while something is visible or alive, so an idle page costs nothing.
 * Settings come from the bells-and-whistles store via `configure()`.
 */
import { wordAt, isDarkSurface, cssVar, type WordHit } from "./text";
import type { SoundEvent } from "@/lib/sound";
import type { Look } from "@/lib/fun";

export type EngineSettings = {
  trail: string | null;
  dots: string | null;
  buttons: string | null;
  look: Look;
  reduced: boolean;
};

type Particle = {
  kind: "sparkle" | "flame" | "confetti" | "glyph" | "spark" | "droplet" | "wisp" | "ripple" | "crumb";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  hue: number;
  glyph?: string;
  gravity: number;
  spin: number;
  angle: number;
  /** Removed when off-screen instead of by life (ambient leaves). */
  ambient?: boolean;
  flap?: boolean;
  /** Curious bats drift toward the cursor until this time (ms), then fly off. */
  curious?: number;
};

type Scorch = { x: number; y: number; r: number; life: number };

type Knocked = {
  hit: WordHit;
  homeX: number; // page coords of the word's center
  homeY: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  age: number;
  returnFrom?: { dx: number; dy: number; angle: number };
};

type Rock = { el: HTMLElement; x: number; y: number; sx: number; sy: number; vx: number; vy: number; age: number; lastHit: string };
/** The goblin on the right i: runs out to a landed rock and brings it back (page coords). */
type Goblin = { el: HTMLElement; rock: HTMLElement; phase: "fetch" | "carry" | "home"; x: number; y: number; rx: number; ry: number; dir: number; t: number; age: number };
type Drag = { el: HTMLElement; originX: number; originY: number; x: number; y: number; id: number };
type Bubble = { x: number; y: number; r: number; maxR: number; vy: number; phase: number };
type Ghost = { x: number; y: number; alpha: number; lastMove: number; dir: number; t: number };

const FLY_MS = 1500;
const RETURN_MS = 650;
const MAX_PARTICLES = 600;

export class FxEngine {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private frame = 0;
  private last = 0;
  private settings: EngineSettings = { trail: null, dots: null, buttons: null, look: "classic", reduced: false };

  private particles: Particle[] = [];
  private scorches: Scorch[] = [];
  private knocked: Knocked[] = [];
  private rocks: Rock[] = [];
  private bubbles: Bubble[] = [];
  private drag: Drag | null = null;
  private ghost: Ghost | null = null;
  private goblins: Goblin[] = [];
  private lastDrip = 0;
  private prev = { x: 0, y: 0 };
  private electric: { el: HTMLElement; until: number } | null = null;
  private pointer: { x: number; y: number; type: string } | null = null;
  private lastTrail = 0;
  private lastScorch = 0;
  /** When the pointer last moved, and how long it has been still (for still states). */
  private lastMoveAt = 0;
  private stillMs = 0;
  private possessed = false;
  private nextBubble = new WeakMap<Element, number>();
  private nextAmbient = 0;
  private boltSeed = 0;
  private lastBolt = 0;
  private dark = false;
  private ink = "#13232c";
  private cleanup: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private sound: (e: SoundEvent) => void,
    /** Called when something in the engine unlocks a secret. */
    private secret: (id: "bat") => void = () => {},
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    this.listen();
  }

  configure(next: EngineSettings) {
    const prev = this.settings;
    this.settings = next;
    if (prev.buttons === "mercury" && next.buttons !== "mercury") this.clearMercury();
    if (next.trail !== "cursed") this.ghost = null;
    if (next.trail !== "cursed") this.setPossessed(false);
    if (next.dots !== "bubbles") this.bubbles = [];
    if (next.dots !== "slingshot") this.goblins = [];
    if (next.buttons !== "cookie") for (const pill of document.querySelectorAll<HTMLElement>(".pill[data-bites]")) delete pill.dataset.bites;
    // Leaves and bats belong to their look; clear them when the look changes.
    if (prev.look !== next.look) this.particles = this.particles.filter((p) => !p.ambient);
    this.readColors();
    this.ensure();
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.cleanup.forEach((f) => f());
    this.clearMercury();
    this.setPossessed(false);
    for (const k of this.knocked) if (k.hit.letter) k.hit.letter.style.transform = "";
  }

  // ---------------------------------------------------------------- public FX

  burst(kind: "confetti" | "diamonds" | "sparks" | "droplets" | "crumbs", x: number, y: number) {
    if (kind === "crumbs") {
      for (let i = 0; i < 9; i++) {
        this.add({ kind: "crumb", x, y, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2, life: 1, decay: 0.02 + Math.random() * 0.01, size: 2 + Math.random() * 3, hue: 26 + Math.random() * 12, gravity: 0.25, spin: (Math.random() - 0.5) * 0.4, angle: Math.random() * 6 });
      }
      return;
    }
    if (this.settings.reduced && kind !== "droplets") return; // toasts still announce the moment
    const count = { confetti: 140, diamonds: 28, sparks: 22, droplets: 10 }[kind];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = { confetti: 4 + Math.random() * 9, diamonds: 2 + Math.random() * 4, sparks: 3 + Math.random() * 7, droplets: 1 + Math.random() * 2.5 }[kind];
      this.add({
        kind: kind === "confetti" ? "confetti" : kind === "diamonds" ? "glyph" : kind === "sparks" ? "spark" : "droplet",
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - (kind === "confetti" ? 5 : kind === "diamonds" ? 3 : 0),
        life: 1,
        decay: kind === "sparks" ? 0.04 + Math.random() * 0.03 : kind === "droplets" ? 0.05 : 0.006 + Math.random() * 0.008,
        size: kind === "diamonds" ? 16 + Math.random() * 12 : kind === "droplets" ? 2 + Math.random() * 2 : 7 + Math.random() * 7,
        hue: kind === "sparks" ? 50 + Math.random() * 140 : Math.random() * 360,
        glyph: kind === "diamonds" ? "💎" : undefined,
        gravity: kind === "sparks" ? 0.12 : 0.18,
        spin: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI,
      });
    }
  }

  // ---------------------------------------------------------------- plumbing

  private add(p: Particle) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(p);
    this.ensure();
  }

  private ensure() {
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  private resize = () => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private readColors() {
    this.dark = isDarkSurface();
    this.ink = cssVar("--ink") || "#13232c";
  }

  private listen() {
    const on = <K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
      window.addEventListener(t, f, o);
      this.cleanup.push(() => window.removeEventListener(t, f, o));
    };

    on("resize", this.resize);
    on("pointermove", (e) => this.onMove(e.clientX, e.clientY, e.pointerType), { passive: true });
    // Touch: pointer events stop once the page starts scrolling, but touchmove keeps
    // reporting, so trails and mercury follow a finger through a scroll too.
    on("touchmove", (e) => {
      const t = e.touches[0];
      if (t) this.onMove(t.clientX, t.clientY, "touch");
    }, { passive: true });
    on("touchend", () => this.onLeave("touch"), { passive: true });
    on("pointerdown", (e) => this.onDown(e));
    on("pointerup", (e) => this.onUp(e));
    on("pointercancel", (e) => this.onUp(e));
    on("blur", () => this.onLeave("mouse"));
    // The mouse leaving the window: mouseout with no element to go to.
    on("mouseout", (e) => {
      if (!e.relatedTarget) this.onLeave("mouse");
    });

    const over = (e: Event) => {
      if (this.settings.buttons !== "electric") return;
      const pill = (e.target as Element)?.closest?.<HTMLElement>(".pill");
      if (pill) {
        this.electric = { el: pill, until: Infinity };
        this.ensure();
      }
    };
    const out = (e: Event) => {
      const pill = (e.target as Element)?.closest?.(".pill");
      const to = (e as MouseEvent | FocusEvent).relatedTarget as Element | null;
      if (pill && this.electric?.el === pill && !pill.contains(to)) this.electric = null;
    };
    for (const [t, f] of [["pointerover", over], ["focusin", over], ["pointerout", out], ["focusout", out]] as const) {
      document.addEventListener(t, f);
      this.cleanup.push(() => document.removeEventListener(t, f));
    }
    const theme = new MutationObserver(() => requestAnimationFrame(() => this.readColors()));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-look"] });
    this.cleanup.push(() => theme.disconnect());
  }

  private onMove(x: number, y: number, type: string) {
    this.prev = this.pointer ? { x: this.pointer.x, y: this.pointer.y } : { x, y };
    this.pointer = { x, y, type };
    this.lastMoveAt = performance.now();
    this.stillMs = 0;
    this.setPossessed(false);
    if (this.drag) {
      this.drag.x = x;
      this.drag.y = y;
    }
    const now = performance.now();
    const t = this.settings.trail;
    if (t && now - this.lastTrail > 16) {
      this.lastTrail = now;
      if (t === "sparkle") this.spawnSparkle(x, y, now);
      else if (t === "fire") this.spawnFire(x, y, now);
      else if (t === "cursed") this.moveGhost(x, y, now);
      else if (t === "flow") this.spawnStream(x, y);
    }
    if (this.settings.buttons === "mercury") this.mercury(x, y);
    this.ensure();
  }

  private onLeave(type: string) {
    if (this.pointer?.type === type) this.pointer = null;
    this.setPossessed(false);
    if (type === "touch" && this.settings.buttons === "mercury") this.clearMercury();
  }

  private onDown(e: PointerEvent) {
    const target = e.target as Element;
    this.pointer = { x: e.clientX, y: e.clientY, type: e.pointerType };

    // Slingshot: grab a rock.
    const rock = target.closest<HTMLElement>("[data-rock]");
    if (rock && this.settings.dots === "slingshot" && rock.dataset.state !== "out") {
      e.preventDefault();
      rock.setPointerCapture?.(e.pointerId);
      const r = rock.getBoundingClientRect();
      this.drag = { el: rock, originX: r.left + r.width / 2, originY: r.top + r.height / 2, x: e.clientX, y: e.clientY, id: e.pointerId };
      rock.dataset.state = "out";
      document.documentElement.dataset.slinging = "true";
      this.ensure();
      return;
    }

    // Curious bats scatter from a click.
    for (const bat of this.particles) {
      if (!bat.flap || !bat.ambient) continue;
      const dx = bat.x - e.clientX;
      const dy = bat.y - e.clientY;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 260) continue;
      bat.curious = undefined;
      bat.vx = (dx / d) * 6;
      bat.vy = (dy / d) * 6 - 1;
    }

    // Bubbles pop on tap/click.
    if (this.settings.dots === "bubbles") this.popAt(e.clientX, e.clientY);

    // Electric buttons throw sparks when pressed; on touch they also light up briefly.
    const pill = target.closest<HTMLElement>(".pill");
    if (pill && this.settings.buttons === "electric") {
      this.burst("sparks", e.clientX, e.clientY);
      if (e.pointerType !== "mouse") this.electric = { el: pill, until: performance.now() + 1200 };
    }
    // Cookie buttons: each press takes a bite; after three, a fresh cookie.
    if (pill && this.settings.buttons === "cookie") {
      const bites = Number(pill.dataset.bites ?? 0);
      pill.dataset.bites = String((bites + 1) % 4);
      this.burst("crumbs", e.clientX, e.clientY);
    }
    if (this.settings.trail === "flow") this.splash(e.clientX, e.clientY);
    if (this.settings.trail === "fire" && e.pointerType !== "mouse") this.spawnFire(e.clientX, e.clientY, performance.now());
  }

  private onUp(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    delete document.documentElement.dataset.slinging;
    const [px, py] = this.pull(d);
    const power = Math.hypot(px, py);
    if (power < 12) {
      d.el.dataset.state = "ready"; // a tap, not a launch
      return;
    }
    const x = d.originX + px;
    const y = d.originY + py;
    this.rocks.push({ el: d.el, x, y, sx: x, sy: y, vx: -px * 0.17, vy: -py * 0.17, age: 0, lastHit: "" });
    this.sound("launch");
    this.ensure();
  }

  private pull(d: Drag): [number, number] {
    const dx = d.x - d.originX;
    const dy = d.y - d.originY;
    const len = Math.hypot(dx, dy);
    const max = 150;
    return len > max ? [(dx / len) * max, (dy / len) * max] : [dx, dy];
  }

  // ---------------------------------------------------------------- trails

  private spawnSparkle(x: number, y: number, now: number) {
    this.add({ kind: "sparkle", x, y, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2 + 0.3, life: 1, decay: 0.025 + Math.random() * 0.02, size: 10 + Math.random() * 8, hue: (now / 8) % 360, glyph: Math.random() < 0.7 ? "✦" : "·", gravity: 0.02, spin: 0, angle: 0 });
  }

  private spawnFire(x: number, y: number, now: number) {
    for (let i = 0; i < 3; i++) {
      this.add({ kind: "flame", x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 4, vx: (Math.random() - 0.5) * 0.9, vy: -0.8 - Math.random() * 1.6, life: 1, decay: 0.03 + Math.random() * 0.025, size: 9 + Math.random() * 9, hue: 0, gravity: -0.02, spin: 0, angle: 0 });
    }
    // Scorch whatever words the flame passes over.
    if (now - this.lastScorch > 45 && wordAt(x, y)) {
      this.lastScorch = now;
      if (this.scorches.length > 220) this.scorches.shift();
      this.scorches.push({ x: x + scrollX, y: y + scrollY, r: 9 + Math.random() * 8, life: 1 });
    }
  }

  private moveGhost(x: number, y: number, now: number) {
    this.ghost ??= { x, y: y + 40, alpha: 0, lastMove: now, dir: 1, t: 0 };
    this.ghost.lastMove = now;
  }

  /** Flow: water streams off the cursor in the direction it moves. */
  private spawnStream(x: number, y: number) {
    const vx = (x - this.prev.x) * 0.25;
    const vy = (y - this.prev.y) * 0.25;
    for (let i = 0; i < 2; i++) {
      this.add({ kind: "droplet", x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4, vx: vx + (Math.random() - 0.5) * 0.8, vy: vy + (Math.random() - 0.5) * 0.8, life: 1, decay: 0.035 + Math.random() * 0.02, size: 1.5 + Math.random() * 2.2, hue: 0, gravity: 0.22, spin: 0, angle: 0 });
    }
  }

  private splash(x: number, y: number) {
    this.add({ kind: "ripple", x, y, vx: 0, vy: 0, life: 1, decay: 0.03, size: 4, hue: 0, gravity: 0, spin: 0, angle: 0 });
    if (this.settings.reduced) return;
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + Math.random() * Math.PI; // upward half
      const speed = 2 + Math.random() * 3.5;
      this.add({ kind: "droplet", x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, decay: 0.022 + Math.random() * 0.015, size: 1.8 + Math.random() * 2.4, hue: 0, gravity: 0.3, spin: 0, angle: 0 });
    }
  }

  // ---------------------------------------------------------------- buttons

  private mercury(x: number, y: number) {
    const moveOk = !this.settings.reduced;
    for (const pill of document.querySelectorAll<HTMLElement>(".pill")) {
      const r = pill.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      const m = Math.max(0, 1 - Math.hypot(dx, dy) / 160);
      pill.style.setProperty("--m", m.toFixed(3));
      pill.style.setProperty("--ma", `${(Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90}deg`);
      const pull = moveOk ? Math.min(6, m * 7) : 0;
      const len = Math.hypot(x - cx, y - cy) || 1;
      pill.style.setProperty("--mx", `${(((x - cx) / len) * pull).toFixed(2)}px`);
      pill.style.setProperty("--my", `${(((y - cy) / len) * pull).toFixed(2)}px`);
    }
  }

  private clearMercury() {
    for (const pill of document.querySelectorAll<HTMLElement>(".pill")) {
      for (const p of ["--m", "--ma", "--mx", "--my"]) pill.style.removeProperty(p);
    }
  }

  // ---------------------------------------------------------------- dots

  private popAt(x: number, y: number) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (Math.hypot(b.x - x, b.y - y) <= b.r + 6) {
        this.bubbles.splice(i, 1);
        this.burst("droplets", b.x, b.y);
        this.sound("pop");
      }
    }
  }

  private knock(hit: WordHit, vx: number, vy: number) {
    if (this.knocked.some((k) => k.hit.key === hit.key)) return;
    this.knocked.push({
      hit,
      homeX: hit.rect.left + hit.rect.width / 2 + scrollX,
      homeY: hit.rect.top + hit.rect.height / 2 + scrollY,
      dx: 0,
      dy: 0,
      vx: vx * 0.8 + (Math.random() - 0.5) * 2,
      vy: vy * 0.8 - 2,
      angle: 0,
      spin: (Math.random() - 0.5) * 0.25,
      age: 0,
    });
    this.sound("hit");
  }

  // ---------------------------------------------------------------- loop

  private tick = (now: number) => {
    const dt = Math.min(48, now - this.last);
    this.last = now;
    const f = dt / 16.67; // 1 at 60fps
    const { ctx } = this;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    this.updateScorches(ctx, dt);
    this.updateKnocked(ctx, dt, f);
    this.updateBubbles(ctx, now, f);
    this.updateAmbient(now);
    this.updateParticles(ctx, f);
    this.updateRocks(ctx, dt, f);
    this.updateGoblins(ctx, dt, f);
    this.drawDrag(ctx);
    this.updateGhost(ctx, now, f);
    this.drawStill(ctx, now, dt);
    this.drawElectric(ctx, now);

    const busy =
      this.particles.length || this.scorches.length || this.knocked.length || this.rocks.length || this.goblins.length || this.drag || this.ghost ||
      this.electric || (this.settings.trail && this.pointer?.type === "mouse") || (this.settings.dots === "bubbles" && !this.settings.reduced) || this.ambientOn();
    this.frame = busy ? requestAnimationFrame(this.tick) : 0;
    if (!busy) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };

  private updateParticles(ctx: CanvasRenderingContext2D, f: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.gravity * f;
      p.vx *= p.kind === "flame" ? 0.96 : 0.99;
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.angle += p.spin * f;
      if (p.curious) this.steerBat(p, f);
      if (p.ambient) {
        p.x += Math.sin(p.y / 40 + p.hue) * 0.6 * f;
        if (p.y > window.innerHeight + 40 || p.x < -80 || p.x > window.innerWidth + 80) this.particles.splice(i, 1);
      } else {
        p.life -= p.decay * f;
        if (p.life <= 0 || p.y > window.innerHeight + 60) {
          this.particles.splice(i, 1);
          continue;
        }
      }
      this.drawParticle(ctx, p);
    }
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 1.4);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    switch (p.kind) {
      case "flame": {
        // White-hot core cooling to orange, red, then smoke.
        const l = p.life;
        const color = l > 0.75 ? "255,240,170" : l > 0.5 ? "255,170,60" : l > 0.25 ? "245,85,30" : "90,80,80";
        if (this.dark) ctx.globalCompositeOperation = "lighter";
        const r = p.size * (0.4 + l * 0.6);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, `rgba(${color},${0.9 * l})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "spark": {
        ctx.rotate(Math.atan2(p.vy, p.vx) - p.angle);
        ctx.strokeStyle = `hsl(${p.hue} 100% 75%)`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "#8ef6ff";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.8, 0);
        ctx.lineTo(p.size * 0.8, 0);
        ctx.stroke();
        break;
      }
      case "droplet":
        ctx.fillStyle = this.dark ? "rgba(200,235,255,0.9)" : "rgba(60,120,170,0.8)";
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "wisp": {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        g.addColorStop(0, `rgba(200,185,255,${0.35 * p.life})`);
        g.addColorStop(1, "rgba(200,185,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "ripple": {
        const r = p.size + (1 - p.life) * 34;
        ctx.strokeStyle = this.dark ? `rgba(200,235,255,${0.7 * p.life})` : `rgba(60,120,170,${0.7 * p.life})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "crumb":
        ctx.fillStyle = `hsl(${p.hue} 55% ${this.dark ? 55 : 38}%)`;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
        break;
      case "confetti":
        ctx.fillStyle = `hsl(${p.hue} 95% 60%)`;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        break;
      default: {
        if (p.flap) ctx.scale(1, 0.55 + Math.abs(Math.sin(performance.now() / 70)) * 0.45);
        ctx.fillStyle = `hsl(${p.hue} 95% 60%)`;
        ctx.font = `${p.size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.glyph ?? "✦", 0, 0);
      }
    }
    ctx.restore();
  }

  private updateScorches(ctx: CanvasRenderingContext2D, dt: number) {
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const s = this.scorches[i];
      s.life -= dt / 9000;
      if (s.life <= 0) {
        this.scorches.splice(i, 1);
        continue;
      }
      const x = s.x - scrollX;
      const y = s.y - scrollY;
      if (y < -40 || y > window.innerHeight + 40) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 1.6);
      if (this.dark) {
        g.addColorStop(0, `rgba(255,130,50,${0.45 * s.life})`);
        g.addColorStop(0.45, `rgba(140,45,10,${0.4 * s.life})`);
      } else {
        g.addColorStop(0, `rgba(35,16,5,${0.6 * s.life})`);
        g.addColorStop(0.55, `rgba(70,35,10,${0.3 * s.life})`);
      }
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, s.r * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private updateKnocked(ctx: CanvasRenderingContext2D, dt: number, f: number) {
    for (let i = this.knocked.length - 1; i >= 0; i--) {
      const k = this.knocked[i];
      k.age += dt;
      if (k.age < FLY_MS) {
        k.vy += 0.4 * f;
        k.dx += k.vx * f;
        k.dy += k.vy * f;
        k.angle += k.spin * f;
        // Bounce off the bottom of the screen.
        const screenY = k.homeY - scrollY + k.dy;
        if (screenY > window.innerHeight - 16 && k.vy > 0) {
          k.vy *= -0.45;
          k.vx *= 0.7;
          k.spin *= 0.6;
        }
      } else {
        // Spring back home.
        k.returnFrom ??= { dx: k.dx, dy: k.dy, angle: k.angle };
        const t = Math.min(1, (k.age - FLY_MS) / RETURN_MS);
        const e = 1 - (1 - t) ** 3;
        k.dx = k.returnFrom.dx * (1 - e);
        k.dy = k.returnFrom.dy * (1 - e);
        k.angle = k.returnFrom.angle * (1 - e);
        if (t >= 1) {
          if (k.hit.letter) k.hit.letter.style.transform = "";
          this.knocked.splice(i, 1);
          continue;
        }
      }

      if (k.hit.letter) {
        k.hit.letter.style.transform = `translate(${k.dx}px, ${k.dy}px) rotate(${k.angle}rad)`;
        continue;
      }
      // Patch the word's real spot, then draw the word where it flew.
      const { rect, text, font, color, background } = k.hit;
      const hx = k.homeX - scrollX;
      const hy = k.homeY - scrollY;
      ctx.fillStyle = background;
      ctx.fillRect(hx - rect.width / 2 - 1, hy - rect.height / 2, rect.width + 2, rect.height);
      ctx.save();
      ctx.translate(hx + k.dx, hy + k.dy);
      ctx.rotate(k.angle);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  private updateRocks(ctx: CanvasRenderingContext2D, dt: number, f: number) {
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      r.age += dt;
      r.vy += 0.32 * f;
      r.x += r.vx * f;
      r.y += r.vy * f;
      // Ignore the first stretch so a rock doesn't hit whatever it was launched from.
      const hit = Math.hypot(r.x - r.sx, r.y - r.sy) > 44 ? wordAt(r.x, r.y) : null;
      if (hit && hit.key !== r.lastHit) {
        r.lastHit = hit.key;
        this.knock(hit, r.vx, r.vy);
        // Hits barely slow the rock, so it keeps to the path you aimed.
        r.vx *= 0.94;
        r.vy *= 0.94;
      }
      // Spooky theme: rocks can hit the bats.
      for (const bat of this.particles) {
        if (!bat.flap || !bat.ambient) continue;
        if (Math.hypot(bat.x - r.x, bat.y - r.y) < bat.size * 0.7) {
          bat.ambient = false; // now it falls, spinning, and fades
          bat.flap = false;
          bat.vx = r.vx * 0.3;
          bat.vy = -2;
          bat.gravity = 0.35;
          bat.spin = 0.25;
          bat.decay = 0.012;
          this.sound("hit");
          this.secret("bat");
        }
      }
      // With a goblin to fetch it, the rock lands on the bottom of the screen
      // (bouncing off the sides) instead of flying away.
      const goblin = this.goblinEl();
      if (goblin) {
        const floor = window.innerHeight - 9;
        if (r.y > floor) {
          r.y = floor;
          r.vy = Math.abs(r.vy) < 2.5 ? 0 : r.vy * -0.35;
          r.vx *= 0.92 ** f;
        }
        if (r.x < 9 || r.x > window.innerWidth - 9) {
          r.x = Math.min(window.innerWidth - 9, Math.max(9, r.x));
          r.vx *= -0.5;
        }
        const resting = r.y >= floor && r.vy === 0 && Math.abs(r.vx) < 0.2;
        if (resting || r.age > 6000) {
          this.rocks.splice(i, 1);
          this.fetch(goblin, r);
          continue;
        }
      } else if (r.age > 4500 || r.y > window.innerHeight + 60 || r.x < -60 || r.x > window.innerWidth + 60) {
        this.rocks.splice(i, 1);
        r.el.dataset.state = "ready"; // the rock grows back on the i
        continue;
      }
      this.drawRock(ctx, r.x, r.y, r.age / 90);
    }
  }

  private goblinEl() {
    if (this.settings.dots !== "slingshot" || this.settings.reduced) return null;
    const el = document.querySelector<HTMLElement>("[data-goblin]");
    return el && el.dataset.state === "home" && !this.goblins.length ? el : null;
  }

  private fetch(el: HTMLElement, r: Rock) {
    const home = el.getBoundingClientRect();
    el.dataset.state = "out";
    this.goblins.push({ el, rock: r.el, phase: "fetch", x: home.left + home.width / 2 + scrollX, y: home.top + home.height / 2 + scrollY, rx: r.x + scrollX, ry: r.y + scrollY, dir: 1, t: 0, age: 0 });
  }

  private updateGoblins(ctx: CanvasRenderingContext2D, dt: number, f: number) {
    for (let i = this.goblins.length - 1; i >= 0; i--) {
      const g = this.goblins[i];
      g.age += dt;
      g.t += 0.35 * f;
      const center = (el: HTMLElement) => {
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2 + scrollX, y: b.top + b.height / 2 + scrollY };
      };
      const target = g.phase === "fetch" ? { x: g.rx, y: g.ry - 10 } : center(g.phase === "carry" ? g.rock : g.el);
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const d = Math.hypot(dx, dy);
      const speed = (g.phase === "carry" ? 5 : 7) * f;
      if (Math.abs(dx) > 1) g.dir = dx > 0 ? 1 : -1;
      // Gives up and teleports if it somehow takes too long (say, the page scrolled a lot).
      if (d <= speed || g.age > 12000) {
        g.x = target.x;
        g.y = target.y;
        if (g.phase === "fetch") {
          g.phase = "carry";
          this.sound("pop");
        } else if (g.phase === "carry") {
          g.rock.dataset.state = "ready"; // the rock is back on the i
          g.phase = "home";
        } else {
          g.el.dataset.state = "home";
          this.goblins.splice(i, 1);
          continue;
        }
      } else {
        g.x += (dx / d) * speed;
        g.y += (dy / d) * speed;
      }
      const x = g.x - scrollX;
      const y = g.y - scrollY;
      if (g.phase === "fetch") this.drawRock(ctx, g.rx - scrollX, g.ry - scrollY);
      this.drawGoblin(ctx, x, y, g);
      if (g.phase === "carry") this.drawRock(ctx, x, y - 17);
    }
  }

  private drawGoblin(ctx: CanvasRenderingContext2D, x: number, y: number, g: Goblin) {
    const bob = Math.abs(Math.sin(g.t)) * -3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(g.dir, 1);
    // Legs, scurrying.
    ctx.strokeStyle = "#2f5e17";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-3, 9);
    ctx.lineTo(-3 + Math.sin(g.t) * 4, 16);
    ctx.moveTo(3, 9);
    ctx.lineTo(3 - Math.sin(g.t) * 4, 16);
    ctx.stroke();
    // Body (a little brown tunic) and head with pointy ears.
    ctx.fillStyle = "#7a4a22";
    ctx.beginPath();
    ctx.ellipse(0, 6, 5.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5fa83a";
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(-14, -9);
    ctx.lineTo(-5, -1);
    ctx.moveTo(6, -4);
    ctx.lineTo(14, -9);
    ctx.lineTo(5, -1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe14d";
    for (const ex of [-1, 4.5]) {
      ctx.beginPath();
      ctx.arc(ex, -4, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // A toothy grin.
    ctx.strokeStyle = "#1d3a0e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(2, -1, 3, 0.2, Math.PI - 0.6);
    ctx.stroke();
    ctx.restore();
  }

  private drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, angle = 0) {
    const s = 7;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const g = ctx.createRadialGradient(-s * 0.35, -s * 0.4, 1, 0, 0, s * 1.3);
    g.addColorStop(0, "#c9c4bb");
    g.addColorStop(0.6, "#8a847b");
    g.addColorStop(1, "#4d4842");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.15, s, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDrag(ctx: CanvasRenderingContext2D) {
    const d = this.drag;
    if (!d) return;
    const [px, py] = this.pull(d);
    const x = d.originX + px;
    const y = d.originY + py;
    // Fork tips either side of where the dot was, bands to the rock.
    const spread = 16;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#a0522d";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(d.originX - spread, d.originY - 4);
    ctx.lineTo(x, y);
    ctx.lineTo(d.originX + spread, d.originY - 4);
    ctx.stroke();
    ctx.fillStyle = "#6b3a1d";
    for (const sx of [-spread, spread]) {
      ctx.beginPath();
      ctx.arc(d.originX + sx, d.originY - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Aim preview: where the rock will fly.
    const vx = -px * 0.17;
    let vy = -py * 0.17;
    let ax = x;
    let ay = y;
    ctx.fillStyle = this.ink;
    for (let i = 1; i <= 14; i++) {
      for (let s = 0; s < 3; s++) {
        vy += 0.32;
        ax += vx;
        ay += vy;
      }
      ctx.globalAlpha = 0.5 * (1 - i / 15);
      ctx.beginPath();
      ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    this.drawRock(ctx, x, y);
  }

  private updateBubbles(ctx: CanvasRenderingContext2D, now: number, f: number) {
    if (this.settings.dots !== "bubbles" || this.settings.reduced) return;
    for (const src of document.querySelectorAll<HTMLElement>("[data-bubble]")) {
      const due = this.nextBubble.get(src) ?? 0;
      if (now < due || this.bubbles.length > 16) continue;
      this.nextBubble.set(src, now + 900 + Math.random() * 1100);
      const r = src.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      this.bubbles.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: 3, maxR: 9 + Math.random() * 13, vy: -(0.5 + Math.random() * 0.7), phase: Math.random() * 6 });
    }
    // Hovering a bubble with a mouse pops it too.
    if (this.pointer?.type === "mouse") this.popAt(this.pointer.x, this.pointer.y);
    ctx.save();
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.phase += 0.04 * f;
      b.y += b.vy * f;
      b.x += Math.sin(b.phase) * 0.5 * f;
      b.r += (b.maxR - b.r) * 0.03 * f;
      if (b.y < -40) {
        this.bubbles.splice(i, 1);
        continue;
      }
      const g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, "rgba(255,255,255,0.05)");
      g.addColorStop(0.8, this.dark ? "rgba(170,220,255,0.12)" : "rgba(80,140,200,0.1)");
      g.addColorStop(1, this.dark ? "rgba(200,235,255,0.35)" : "rgba(60,110,170,0.3)");
      ctx.fillStyle = g;
      ctx.strokeStyle = this.dark ? "rgba(220,240,255,0.55)" : "rgba(50,90,140,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.65, -2.4, -1.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  private updateGhost(ctx: CanvasRenderingContext2D, now: number, f: number) {
    const g = this.ghost;
    if (!g || this.settings.trail !== "cursed") return;
    g.t += 0.05 * f;
    const idle = now - g.lastMove > 2200;
    const target = this.pointer ?? { x: g.x, y: g.y };
    // Hold still with a mouse and it possesses your cursor.
    const possess = this.pointer?.type === "mouse" && !this.drag && now - g.lastMove > 1400;
    // Otherwise it hangs back behind you, and drifts a little when you stop.
    const tx = possess ? target.x + 2 : target.x - 34 * g.dir + (idle ? Math.sin(g.t) * 30 : 0);
    const ty = possess ? target.y - 4 : target.y + 26 + (idle ? Math.cos(g.t * 0.7) * 14 : 0);
    const nx = g.x + (tx - g.x) * 0.06 * f;
    if (Math.abs(nx - g.x) > 0.4) g.dir = nx > g.x ? 1 : -1;
    g.x = nx;
    g.y += (ty - g.y) * 0.06 * f;
    g.alpha += ((possess ? 0.45 : idle ? 0.25 : 0.85) - g.alpha) * 0.05 * f;
    this.setPossessed(possess && Math.hypot(g.x - tx, g.y - ty) < 10);
    if (Math.random() < 0.25 * f) {
      this.add({ kind: "wisp", x: g.x - g.dir * 6, y: g.y + 14, vx: -g.dir * 0.3, vy: 0.2, life: 1, decay: 0.02, size: 10 + Math.random() * 8, hue: 0, gravity: -0.01, spin: 0, angle: 0 });
    }
    if (!this.pointer && now - g.lastMove > 6000) {
      this.ghost = null;
      return;
    }

    ctx.save();
    ctx.globalAlpha = g.alpha;
    ctx.translate(g.x, g.y + Math.sin(g.t * 2) * 3);
    ctx.shadowColor = "rgba(170,150,255,0.8)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = this.dark ? "rgba(236,232,255,0.85)" : "rgba(120,110,160,0.55)";
    ctx.beginPath();
    ctx.arc(0, 0, 13, Math.PI, 0);
    ctx.lineTo(13, 16);
    for (let i = 0; i < 4; i++) {
      const x = 13 - (i + 1) * 6.5;
      ctx.quadraticCurveTo(x + 3.25, 16 + (i % 2 ? -5 : 5) * Math.sin(g.t * 3 + i), x, 16);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1a1024";
    for (const ex of [-4.5, 4.5]) {
      ctx.beginPath();
      ctx.ellipse(ex + g.dir * 2, -2, 2.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawElectric(ctx: CanvasRenderingContext2D, now: number) {
    const e = this.electric;
    if (!e) return;
    if (this.settings.buttons !== "electric" || now > e.until || !e.el.isConnected) {
      this.electric = null;
      return;
    }
    // Re-randomize the bolt shape every frame (or calmly, for reduced motion).
    if (!this.settings.reduced || now - this.lastBolt > 600) {
      this.boltSeed = Math.random() * 1e6;
      this.lastBolt = now;
    }
    const r = e.el.getBoundingClientRect();
    const radius = Math.min(parseFloat(getComputedStyle(e.el).borderTopLeftRadius) || 0, r.height / 2, r.width / 2);
    let seed = this.boltSeed;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - 0.5;

    for (const [width, color, alpha] of [[3, "#43d9ff", 0.45], [1.3, "#e9fdff", 0.95]] as const) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.shadowColor = "#43d9ff";
      ctx.shadowBlur = 10;
      ctx.lineJoin = "round";
      ctx.beginPath();
      const points = 64;
      for (let i = 0; i <= points; i++) {
        const [px, py, nx, ny] = perimeterPoint(r, radius, i / points);
        const jitter = 3 + rand() * 7;
        const x = px + nx * jitter;
        const y = py + ny * jitter;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- still states

  /** The real cursor is hidden while the ghost holds it; a wiggling fake takes its place. */
  private setPossessed(on: boolean) {
    if (on === this.possessed) return;
    this.possessed = on;
    if (on) document.documentElement.dataset.possessed = "true";
    else delete document.documentElement.dataset.possessed;
  }

  /** What each trail does when the mouse holds still. */
  private drawStill(ctx: CanvasRenderingContext2D, now: number, dt: number) {
    const p = this.pointer;
    const trail = this.settings.trail;
    if (!trail || !p || p.type !== "mouse" || this.drag || now - this.lastMoveAt < 600) {
      this.stillMs = 0;
      return;
    }
    this.stillMs += dt;
    const t = this.stillMs;
    if (trail === "sparkle") {
      // A rainbow ring of sparkles circles the cursor.
      const n = 12;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t / 400);
      ctx.font = `11px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + now / 900;
        const r = 22 + Math.sin(now / 260 + i) * 2;
        ctx.fillStyle = `hsl(${(i * (360 / n) + now / 12) % 360} 95% 62%)`;
        ctx.fillText(i % 2 ? "·" : "✦", p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      }
      ctx.restore();
    } else if (trail === "fire") {
      // The flame catches and grows the longer you wait.
      const grow = Math.min(1, t / 5000);
      for (let i = 0; i < 1 + Math.round(grow * 2); i++) {
        this.add({ kind: "flame", x: p.x + (Math.random() - 0.5) * (6 + grow * 10), y: p.y + 4, vx: (Math.random() - 0.5) * 0.6, vy: -(1 + grow * 1.8) - Math.random(), life: 1, decay: 0.035 + Math.random() * 0.02, size: 8 + grow * 24 + Math.random() * 6, hue: 0, gravity: -0.02, spin: 0, angle: 0 });
      }
    } else if (trail === "flow") {
      // Hold still and it drips.
      if (now - this.lastDrip > 420) {
        this.lastDrip = now;
        this.add({ kind: "droplet", x: p.x + 1, y: p.y + 6, vx: 0, vy: 0.2, life: 1, decay: 0.012, size: 2.6, hue: 0, gravity: 0.25, spin: 0, angle: 0 });
      }
    } else if (trail === "cursed" && this.possessed) {
      // The possessed cursor twitches on its own.
      const wx = Math.sin(now / 90) * 3 + Math.sin(now / 37) * 1.5;
      const wy = Math.cos(now / 110) * 2.5;
      ctx.save();
      ctx.translate(p.x + wx, p.y + wy);
      ctx.rotate(Math.sin(now / 140) * 0.18);
      ctx.shadowColor = "rgba(170,150,255,0.9)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 17);
      ctx.lineTo(4.2, 13);
      ctx.lineTo(7, 19.5);
      ctx.lineTo(9.6, 18.4);
      ctx.lineTo(6.8, 12);
      ctx.lineTo(12, 12);
      ctx.closePath();
      ctx.fillStyle = this.dark ? "#f4f1ff" : "#ffffff";
      ctx.strokeStyle = "#1a1024";
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Curious bats flutter over to hover near the cursor. */
  private steerBat(p: Particle, f: number) {
    const ptr = this.pointer;
    if (!ptr || performance.now() > (p.curious ?? 0)) {
      p.curious = undefined;
      p.vx = (p.vx >= 0 ? 1 : -1) * 3;
      p.vy = -0.6;
      return;
    }
    const dx = ptr.x - p.x;
    const dy = ptr.y - 46 - p.y; // hang just above the cursor
    const d = Math.hypot(dx, dy) || 1;
    const pull = Math.min(1, d / 120) * 0.1;
    p.vx += ((dx / d) * pull + (Math.random() - 0.5) * 0.35) * f;
    p.vy += ((dy / d) * pull + (Math.random() - 0.5) * 0.35) * f;
    const speed = Math.hypot(p.vx, p.vy);
    const max = 1.7;
    if (speed > max) {
      p.vx *= max / speed;
      p.vy *= max / speed;
    }
  }

  // ---------------------------------------------------------------- ambient looks

  private ambientOn() {
    return !this.settings.reduced && (this.settings.look === "nature" || this.settings.look === "spooky");
  }

  private updateAmbient(now: number) {
    if (!this.ambientOn() || now < this.nextAmbient) return;
    const W = window.innerWidth;
    if (this.settings.look === "nature") {
      this.nextAmbient = now + 1300 + Math.random() * 1200;
      if (this.particles.filter((p) => p.ambient).length > 10) return;
      this.add({ kind: "glyph", ambient: true, x: Math.random() * W, y: -24, vx: (Math.random() - 0.5) * 0.6, vy: 0.5 + Math.random() * 0.6, life: 1, decay: 0, size: 16 + Math.random() * 10, hue: Math.random() * 10, glyph: ["🍃", "🌿", "🍂", "🍃"][Math.floor(Math.random() * 4)], gravity: 0, spin: (Math.random() - 0.5) * 0.03, angle: Math.random() * 6 });
    } else {
      this.nextAmbient = now + 5000 + Math.random() * 5000;
      const fromLeft = Math.random() < 0.5;
      this.add({ kind: "glyph", ambient: true, flap: true, x: fromLeft ? -30 : W + 30, y: 60 + Math.random() * window.innerHeight * 0.35, vx: (fromLeft ? 1 : -1) * (2.2 + Math.random() * 1.5), vy: (Math.random() - 0.5) * 0.4, life: 1, decay: 0, size: 22 + Math.random() * 10, hue: Math.random() * 10, glyph: "🦇", gravity: 0, spin: 0, angle: 0,
        // Some bats are curious: they come over to the cursor for a while.
        curious: Math.random() < 0.45 ? now + 9000 + Math.random() * 7000 : undefined });
    }
  }
}

/** A point on a rounded rectangle's outline at t ∈ [0,1], with its outward normal. */
function perimeterPoint(r: DOMRect, radius: number, t: number): [number, number, number, number] {
  const w = r.width - 2 * radius;
  const h = r.height - 2 * radius;
  const arc = (Math.PI / 2) * radius;
  const total = 2 * w + 2 * h + 4 * arc;
  let d = t * total;
  const seg = (len: number) => {
    if (d <= len) return true;
    d -= len;
    return false;
  };
  const L = r.left + radius;
  const R = r.right - radius;
  const T = r.top + radius;
  const B = r.bottom - radius;
  const corner = (cx: number, cy: number, a0: number): [number, number, number, number] => {
    const a = a0 + (radius ? d / radius : 0);
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, Math.cos(a), Math.sin(a)];
  };
  if (seg(w)) return [L + d, r.top, 0, -1];
  if (seg(arc)) return corner(R, T, -Math.PI / 2);
  if (seg(h)) return [r.right, T + d, 1, 0];
  if (seg(arc)) return corner(R, B, 0);
  if (seg(w)) return [R - d, r.bottom, 0, 1];
  if (seg(arc)) return corner(L, B, Math.PI / 2);
  if (seg(h)) return [r.left, B - d, -1, 0];
  return corner(L, T, Math.PI);
}
