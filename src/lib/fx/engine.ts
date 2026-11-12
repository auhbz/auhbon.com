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
  /** Bells & whistles is on (any effect or look). Gates touch gestures like the hero swipe. */
  on: boolean;
  /** Phones: "Motion controls" is on, so tilt steers bubbles and aims the slingshot. */
  motion: boolean;
};

type Particle = {
  kind: "sparkle" | "flame" | "confetti" | "glyph" | "spark" | "droplet" | "wisp" | "ripple" | "crumb" | "smoke" | "nitro" | "ecto";
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
  /** Nature's rare golden leaf: catch it (click or tap) for a secret. */
  golden?: boolean;
};

/** Secrets the engine can find. */
export type EngineSecret = "bat" | "cookie" | "leaf" | "skeleton" | "donuts" | "overload" | "scorched" | "shakeoff" | "sweep";
/** Dispatch this (optionally with {x, y}) to drop a golden leaf right away; the QA suite uses it. */
export const GOLDEN_LEAF_EVENT = "portfolio:golden-leaf";

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
type Goblin = {
  el: HTMLElement;
  rock: HTMLElement;
  phase: "fetch" | "carry" | "home";
  x: number;
  y: number;
  rx: number;
  ry: number;
  dir: number;
  t: number;
  age: number;
  /** Set when the visitor clicks the landed rock: it rolls toward the goblin. */
  rolling?: boolean;
  /** Set when the visitor clicks the goblin: he hurries. */
  boost?: number;
};
type Drag = {
  el: HTMLElement;
  originX: number;
  originY: number;
  x: number;
  y: number;
  id: number;
  /** Where the finger went down; while it stays put (and motion controls are on), tilt aims. */
  startX: number;
  startY: number;
  tilt: boolean;
};
/** A finger that went down with a cursor trail on; held still long enough, it becomes a "hold still". */
type Press = { x: number; y: number; timer: number };
/** A touch in progress, watched for a fast horizontal swipe across the hero name. */
type Swipe = { x0: number; y0: number; t0: number; x: number; y: number; flung: boolean };
/** kx/ky: a push (the pointer's breeze, or flying out of a split) that eases off. giant: splits when popped. */
type Bubble = { x: number; y: number; r: number; maxR: number; vy: number; phase: number; kx: number; ky: number; giant?: boolean };
/** kx/ky: a push (from a click) that eases out; squash: a jelly wobble that settles. */
type Ghost = { x: number; y: number; alpha: number; lastMove: number; dir: number; t: number; kx: number; ky: number; squash: number };
/**
 * The Car trail: a little top-down car that chases the pointer with momentum.
 * heading/steer are radians, roll is a smoothed lean, nitro is ms of boost left.
 */
type Car = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  steer: number;
  roll: number;
  nitro: number;
  alpha: number;
  parked: number;
  /** 0..1: how far into a donut it has wound (blends the chase into the orbit). */
  donut: number;
  /** Which way round it orbits: 1 or -1 (it keeps the way it was already turning). */
  spin: number;
  /** How long it has been doing full donuts. */
  donutMs: number;
  /** The rear wheels' last spots (viewport), to lay skid marks between frames. */
  rear: [number, number, number, number] | null;
};
/** A stretch of skid mark, in page coordinates so it stays on the "road" as you scroll. */
type Skid = { x1: number; y1: number; x2: number; y2: number; life: number };

const FLY_MS = 1500;
const RETURN_MS = 650;
const MAX_PARTICLES = 600;
/** The Car trail's car is drawn at 30x15 and scaled up by this. */
const CAR_SCALE = 1.2;
/** How long a finger must stay put to count as holding still. */
const HOLD_MS = 500;
/** A finger can wobble this much (px) and still be holding still. */
const HOLD_SLOP = 10;
/** Long-pressing these keeps its usual meaning (links, buttons, the rock...). */
const HOLD_SKIP =
  "a, button, input, textarea, select, label, summary, [contenteditable], [role='button'], [role='switch'], [role='radio'], [data-rock], [data-goblin], [data-farm-dot], [data-egg], dialog, [popover]";

export class FxEngine {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private frame = 0;
  private last = 0;
  private settings: EngineSettings = { trail: null, dots: null, buttons: null, look: "classic", reduced: false, on: false, motion: false };

  private particles: Particle[] = [];
  private scorches: Scorch[] = [];
  private knocked: Knocked[] = [];
  private rocks: Rock[] = [];
  private bubbles: Bubble[] = [];
  private drag: Drag | null = null;
  private ghost: Ghost | null = null;
  private car: Car | null = null;
  private skids: Skid[] = [];
  private goblins: Goblin[] = [];
  private lastDrip = 0;
  private prev = { x: 0, y: 0 };
  /** touch: lit by a finger, so it stays lit until that finger lifts (a long-press's pointerout doesn't count). */
  private electric: { el: HTMLElement; until: number; touch?: boolean } | null = null;
  private lastHoldSpark = 0;
  /** The canvas's CSS box (cached; see resize). */
  private box = { w: 0, h: 0, left: 0, top: 0 };
  private pointer: { x: number; y: number; type: string } | null = null;
  private lastTrail = 0;
  private lastScorch = 0;
  /** When the pointer last moved, and how long it has been still (for still states). */
  private lastMoveAt = 0;
  private stillMs = 0;
  private possessed = false;
  private press: Press | null = null;
  /** A finger is holding still (long-press): the trail's still state shows at the finger. */
  private holding = false;
  private swipe: Swipe | null = null;
  /** Latest device orientation and the "level" it's measured from (Motion controls). */
  private tiltRaw: { beta: number; gamma: number } | null = null;
  private tiltBase: { beta: number; gamma: number } | null = null;
  private nextBubble = new WeakMap<Element, number>();
  private nextAmbient = 0;
  /** When the next golden leaf falls (Nature theme; 0 = not scheduled yet). */
  private nextGolden = 0;
  private boltSeed = 0;
  private lastBolt = 0;
  private dark = false;
  private ink = "#13232c";
  private cleanup: (() => void)[] = [];
  /** Secrets this engine has already reported (so each fires once per visit at most). */
  private found = new Set<EngineSecret>();
  /** Hamster wheels: while the pointer is on one (or just clicked it), cursor effects stand back. */
  private overHamster = false;
  private hamsterUntil = 0;
  /** Cursed: after being shaken off, the ghost stays away until this time. */
  private ghostAwayUntil = 0;
  /** Electric buttons: recent presses (an overload secret). */
  private zaps: number[] = [];
  /** Fire trail: which section headings it has scorched. */
  private scorchedHeads = new Set<Element>();
  /** Cursed trail: recent sideways reversals of the pointer (shaking the ghost off). */
  private shake = { dir: 0, from: 0, flips: [] as number[] };
  /** Bubbles: the "keep the screen clear" watch. */
  private bubbleWatch = { since: 0, spawned: 0, popped: 0, emptySince: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private sound: (e: SoundEvent) => void,
    /** Called when something in the engine unlocks a secret. */
    private secret: (id: EngineSecret) => void = () => {},
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    this.listen();
    // Development only: let QA scripts see where the bubbles are.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __fxBubbles?: () => [number, number][] }).__fxBubbles = () => this.bubbles.map((b) => [b.x, b.y]);
  }

  configure(next: EngineSettings) {
    const prev = this.settings;
    this.settings = next;
    if (prev.buttons === "mercury" && next.buttons !== "mercury") this.clearMercury();
    if (next.trail !== "cursed") this.ghost = null;
    if (next.trail !== "car") {
      this.car = null;
      this.skids = [];
    }
    if (next.trail !== "cursed") this.setPossessed(false);
    if (next.dots !== "bubbles" || next.reduced) {
      this.bubbles = [];
      this.bubbleWatch = { since: 0, spawned: 0, popped: 0, emptySince: 0 };
    }
    if (next.dots !== "slingshot") this.goblins = [];
    if (!next.trail) this.endPress();
    if (next.motion && !prev.motion) {
      this.tiltRaw = this.tiltBase = null;
      window.addEventListener("deviceorientation", this.onOrient);
    } else if (!next.motion && prev.motion) {
      window.removeEventListener("deviceorientation", this.onOrient);
      this.tiltRaw = this.tiltBase = null;
    }
    if (next.buttons !== "cookie") for (const pill of document.querySelectorAll<HTMLElement>(".pill[data-bites]")) delete pill.dataset.bites;
    // Leaves and bats belong to their look; clear them when the look changes.
    if (prev.look !== next.look) {
      this.particles = this.particles.filter((p) => !p.ambient);
      this.nextGolden = 0;
    }
    this.readColors();
    this.ensure();
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.cleanup.forEach((f) => f());
    window.removeEventListener("deviceorientation", this.onOrient);
    this.endPress();
    this.clearMercury();
    this.setPossessed(false);
    for (const k of this.knocked) if (k.hit.letter) k.hit.letter.style.transform = "";
  }

  // ---------------------------------------------------------------- public FX

  burst(kind: "confetti" | "diamonds" | "sparks" | "droplets" | "crumbs", x: number, y: number) {
    if (kind === "crumbs") {
      for (let i = 0; i < 16; i++) {
        this.add({ kind: "crumb", x, y, vx: (Math.random() - 0.5) * 4, vy: -1.5 - Math.random() * 2.5, life: 1, decay: 0.014 + Math.random() * 0.01, size: 3 + Math.random() * 4, hue: 26 + Math.random() * 12, gravity: 0.25, spin: (Math.random() - 0.5) * 0.4, angle: Math.random() * 6 });
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

  /**
   * Flings the hero letters along a line (a fast swipe across the name), using the
   * same physics as a slingshot hit. Velocities are in px per frame. Returns how many flew.
   */
  fling(x0: number, y0: number, x1: number, y1: number, vx: number, vy: number) {
    if (!this.settings.on || this.settings.reduced) return 0;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8));
    let n = 0;
    for (let i = 0; i <= steps; i++) {
      const hit = wordAt(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
      if (!hit?.letter || this.knocked.some((k) => k.hit.key === hit.key)) continue;
      this.knock(hit, vx, vy);
      n++;
    }
    if (n) this.ensure();
    return n;
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

  /**
   * The canvas's real CSS size, measured from the canvas itself. window.innerWidth
   * includes the scrollbar while the fixed canvas doesn't (that squeezed drawings
   * left), and on phones the fixed canvas grows taller than the root's
   * clientHeight once the browser's toolbar slides away. A bitmap sized from
   * clientHeight was then stretched to fit, so effects (Electric under a finger,
   * most of all) landed further and further below where they belonged.
   */
  private get W() {
    return this.box.w || document.documentElement.clientWidth;
  }
  private get H() {
    return this.box.h || document.documentElement.clientHeight;
  }

  private resize = () => {
    const r = this.canvas.getBoundingClientRect();
    this.box = { w: r.width, h: r.height, left: r.left, top: r.top };
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    // Everything is drawn in client (viewport) coordinates; shift by the canvas's
    // own offset in case the browser places the fixed layer off the origin.
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, -this.box.left * this.dpr, -this.box.top * this.dpr);
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
    // The scrollbar can appear or vanish without a window resize (e.g. a game locks scrolling).
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.canvas);
    this.cleanup.push(() => ro.disconnect());
    on("pointermove", (e) => this.onMove(e.clientX, e.clientY, e.pointerType), { passive: true });
    // Touch: pointer events stop once the page starts scrolling, but touchmove keeps
    // reporting, so trails and mercury follow a finger through a scroll too.
    on("touchmove", (e) => {
      const t = e.touches[0];
      if (!t) return;
      this.onMove(t.clientX, t.clientY, "touch");
      this.swipeMove(t.clientX, t.clientY);
    }, { passive: true });
    on("touchend", (e) => {
      if (!e.touches.length) this.onLeave("touch");
    }, { passive: true });
    on("touchcancel", () => this.onLeave("touch"), { passive: true });
    // A fast horizontal swipe across the hero name flings its letters. Passive, so
    // vertical scrolling is never held up.
    on("touchstart", (e) => {
      const t = e.touches[0];
      this.swipe = e.touches.length === 1 && t ? { x0: t.clientX, y0: t.clientY, t0: performance.now(), x: t.clientX, y: t.clientY, flung: false } : null;
    }, { passive: true });
    // Long-press: no text selection or callout menu while a finger is holding still.
    const holdGuard = (e: Event) => {
      if (this.press) e.preventDefault();
    };
    on("contextmenu", holdGuard);
    document.addEventListener("selectstart", holdGuard);
    this.cleanup.push(() => document.removeEventListener("selectstart", holdGuard));
    on("pointerover", (e) => {
      this.overHamster = !!(e.target as Element | null)?.closest?.("[data-hamster]");
    }, { passive: true });
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
      // Focus lights it for keyboard users only; a tap also focuses, and that used to leave
      // a button crackling forever after the finger lifted.
      if (e.type === "focusin" && !pill?.matches(":focus-visible")) return;
      if (pill) {
        this.electric = { el: pill, until: Infinity };
        this.ensure();
      }
    };
    const out = (e: Event) => {
      // A finger's long-press fires pointerout/pointercancel while it's still down: keep the button lit.
      if (this.electric?.touch && (e as PointerEvent).pointerType === "touch") return;
      const pill = (e.target as Element)?.closest?.(".pill");
      const to = (e as MouseEvent | FocusEvent).relatedTarget as Element | null;
      if (pill && this.electric?.el === pill && !pill.contains(to)) this.electric = null;
    };
    for (const [t, f] of [["pointerover", over], ["focusin", over], ["pointerout", out], ["focusout", out]] as const) {
      document.addEventListener(t, f);
      this.cleanup.push(() => document.removeEventListener(t, f));
    }
    const golden = (e: Event) => {
      const d = (e as CustomEvent<{ x?: number; y?: number } | null>).detail;
      this.spawnGolden(d?.x, d?.y);
    };
    window.addEventListener(GOLDEN_LEAF_EVENT, golden);
    this.cleanup.push(() => window.removeEventListener(GOLDEN_LEAF_EVENT, golden));
    const theme = new MutationObserver(() => requestAnimationFrame(() => this.readColors()));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-look"] });
    this.cleanup.push(() => theme.disconnect());
  }

  /** True while someone is clicking a hamster wheel: trails and click effects hold off so the wheel's show is visible. */
  private quiet(now = performance.now()) {
    return this.overHamster || now < this.hamsterUntil;
  }

  /** Pointer movement, for the effects that care how it moves (not just where it is). */
  private watchMove(x: number, y: number, now: number) {
    const dx = x - this.prev.x;
    const dy = y - this.prev.y;
    // Bubbles: the pointer's movement makes a breeze that pushes nearby bubbles along
    // and a little aside, so a quick swipe scatters them and a slow hand can still pop them.
    if (this.settings.dots === "bubbles" && this.bubbles.length && !this.settings.reduced) {
      const speed = Math.min(40, Math.hypot(dx, dy));
      for (const b of this.bubbles) {
        const ox = b.x - x;
        const oy = b.y - y;
        const d = Math.hypot(ox, oy) || 1;
        if (d > 130) continue;
        const fall = (1 - d / 130) ** 2 / (b.giant ? 3 : 1);
        b.kx = Math.max(-7, Math.min(7, b.kx + dx * 0.05 * fall + (ox / d) * speed * 0.025 * fall));
        b.ky = Math.max(-7, Math.min(7, b.ky + dy * 0.05 * fall + (oy / d) * speed * 0.025 * fall));
      }
    }
    // Cursed: shake the pointer hard from side to side and the ghost loses its grip.
    if (this.settings.trail === "cursed" && this.ghost && Math.abs(dx) > 0.5) {
      const sh = this.shake;
      const dir = Math.sign(dx);
      // A reversal counts when the stretch before it was a real swing, not a jitter.
      if (dir !== sh.dir) {
        if (Math.abs(this.prev.x - sh.from) > 28) sh.flips.push(now);
        sh.dir = dir;
        sh.from = this.prev.x;
      }
      sh.flips = sh.flips.filter((t) => now - t < 1600);
      if (sh.flips.length >= 8) {
        sh.flips = [];
        this.shakeOff(now);
      }
    }
  }

  /** The ghost, shaken off: it tumbles away in a puff and stays gone for a few seconds. */
  private shakeOff(now: number) {
    const g = this.ghost;
    if (!g) return;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.add({ kind: "wisp", x: g.x, y: g.y, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, life: 1, decay: 0.02, size: 12 + Math.random() * 10, hue: 0, gravity: -0.01, spin: 0, angle: 0 });
    }
    this.ghost = null;
    this.ghostAwayUntil = now + 4000;
    this.setPossessed(false);
    this.sound("pop");
    if (!this.found.has("shakeoff")) {
      this.found.add("shakeoff");
      this.secret("shakeoff");
    }
  }

  /** Electric: press buttons fast enough and the whole lot shorts out. */
  private zap(now: number) {
    this.zaps = [...this.zaps.filter((t) => now - t < 3000), now];
    if (this.zaps.length < 10) return;
    this.zaps = [];
    let n = 0;
    for (const pill of document.querySelectorAll<HTMLElement>(".pill")) {
      const r = pill.getBoundingClientRect();
      if (r.bottom < 0 || r.top > this.H || n >= 8) continue;
      n++;
      this.burst("sparks", r.left + r.width / 2, r.top + r.height / 2);
    }
    const root = document.documentElement;
    root.dataset.overload = "true";
    window.setTimeout(() => delete root.dataset.overload, 1300);
    this.sound("hit");
    if (!this.found.has("overload")) {
      this.found.add("overload");
      this.secret("overload");
    }
  }

  /** Fire: note any section heading the flames pass over; all of them is a secret. */
  private scorchHeading(x: number, y: number) {
    const h = document.elementFromPoint(x, y)?.closest("main h2");
    if (!h || this.scorchedHeads.has(h)) return;
    this.scorchedHeads.add(h);
    const all = document.querySelectorAll("main h2").length;
    if (all >= 3 && this.scorchedHeads.size >= all && !this.found.has("scorched")) {
      this.found.add("scorched");
      this.secret("scorched");
    }
  }

  private onMove(x: number, y: number, type: string) {
    // A finger that's holding still may wobble a little; only a real move ends the hold.
    if (type === "touch" && this.press) {
      if (Math.hypot(x - this.press.x, y - this.press.y) < HOLD_SLOP) return;
      this.endPress();
    }
    this.prev = this.pointer ? { x: this.pointer.x, y: this.pointer.y } : { x, y };
    this.pointer = { x, y, type };
    this.lastMoveAt = performance.now();
    this.stillMs = 0;
    this.setPossessed(false);
    const d = this.drag;
    // With motion controls, a finger resting on the rock lets tilt do the aiming;
    // once it really drags, the finger takes over again.
    if (d && !(d.tilt && Math.hypot(x - d.startX, y - d.startY) < 12)) {
      d.tilt = false;
      d.x = x;
      d.y = y;
    }
    const now = performance.now();
    const t = this.settings.trail;
    this.watchMove(x, y, now);
    if (t && now - this.lastTrail > 16 && !this.quiet(now)) {
      this.lastTrail = now;
      if (t === "sparkle") this.spawnSparkle(x, y, now);
      else if (t === "fire") this.spawnFire(x, y, now);
      else if (t === "cursed") this.moveGhost(x, y, now);
      else if (t === "flow") this.spawnStream(x, y);
      else if (t === "car") this.car ??= this.newCar(x, y);
    }
    if (this.settings.buttons === "mercury") this.mercury(x, y);
    this.ensure();
  }

  private onLeave(type: string) {
    if (type === "touch") {
      this.endPress();
      this.swipe = null;
    }
    if (this.pointer?.type === type) this.pointer = null;
    this.setPossessed(false);
    // A finger lifted off an Electric button: it crackles a moment longer, then rests.
    if (type === "touch" && this.electric?.touch) this.electric = { ...this.electric, until: performance.now() + 500, touch: false };
    if (type === "touch" && this.settings.buttons === "mercury") this.clearMercury();
  }

  private onDown(e: PointerEvent) {
    const target = e.target as Element;
    this.pointer = { x: e.clientX, y: e.clientY, type: e.pointerType };

    // Slingshot: click the landed rock to roll it to the goblin, or the goblin to hurry him.
    if (this.goblinClick(e.clientX, e.clientY)) {
      e.preventDefault();
      return;
    }

    // Slingshot: grab a rock.
    const rock = target.closest<HTMLElement>("[data-rock]");
    if (rock && this.settings.dots === "slingshot" && rock.dataset.state !== "out") {
      e.preventDefault();
      rock.setPointerCapture?.(e.pointerId);
      const r = rock.getBoundingClientRect();
      const tilt = this.settings.motion && e.pointerType === "touch";
      // Tilt aims relative to how the phone is held right now.
      if (tilt) this.tiltBase = this.tiltRaw ? { ...this.tiltRaw } : null;
      this.drag = { el: rock, originX: r.left + r.width / 2, originY: r.top + r.height / 2, x: e.clientX, y: e.clientY, id: e.pointerId, startX: e.clientX, startY: e.clientY, tilt };
      rock.dataset.state = "out";
      document.documentElement.dataset.slinging = "true";
      this.ensure();
      return;
    }

    // Nature: catch the golden leaf.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const leaf = this.particles[i];
      if (!leaf.golden || Math.hypot(leaf.x - e.clientX, leaf.y - e.clientY) > leaf.size * 0.9) continue;
      this.particles.splice(i, 1);
      this.sparkleBurst(leaf.x, leaf.y);
      this.secret("leaf");
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

    // Clicking a hamster wheel: no trail reactions (sparkles, rings, nitro…) on top of it.
    if (target.closest("[data-hamster]")) {
      this.hamsterUntil = performance.now() + 900;
      return;
    }

    // Electric buttons throw sparks when pressed; on touch they also light up briefly.
    const pill = target.closest<HTMLElement>(".pill");
    if (pill && this.settings.buttons === "electric") {
      this.burst("sparks", e.clientX, e.clientY);
      this.zap(performance.now());
      if (e.pointerType !== "mouse") {
        this.electric = { el: pill, until: Infinity, touch: true };
        this.lastHoldSpark = performance.now();
      }
    }
    // Cookie buttons: each press takes a bite. The fourth finishes it: a shower of
    // crumbs (and a secret), then a fresh cookie.
    if (pill && this.settings.buttons === "cookie") {
      const bites = Number(pill.dataset.bites ?? 0);
      // Capped, so rapid taps on a phone don't pile up particles.
      if (this.particles.filter((p) => p.kind === "crumb").length < 48) this.burst("crumbs", e.clientX, e.clientY);
      if (bites < 3) pill.dataset.bites = String(bites + 1);
      else if (bites === 3) {
        pill.dataset.bites = "4";
        const r = pill.getBoundingClientRect();
        for (let i = 0; i < 3; i++) this.burst("crumbs", r.left + (r.width * (i + 0.5)) / 3, r.top + r.height / 2);
        this.secret("cookie");
        window.setTimeout(() => {
          if (pill.dataset.bites === "4") pill.dataset.bites = "0";
        }, 600);
      }
    }
    // Every trail reacts to a click or tap, anywhere on the page.
    const trail = this.settings.trail;
    if (trail === "flow") this.splash(e.clientX, e.clientY);
    else if (trail === "sparkle") this.sparkleBurst(e.clientX, e.clientY);
    else if (trail === "fire") this.fireBurst(e.clientX, e.clientY);
    else if (trail === "cursed") this.boo(e.clientX, e.clientY);
    else if (trail === "car") this.nitro(e.clientX, e.clientY);

    // A finger on plain page content (not a link or control) might be about to hold still.
    if (trail && e.pointerType === "touch" && !target.closest(HOLD_SKIP)) this.startPress(e.clientX, e.clientY);
  }

  // ---------------------------------------------------------------- touch gestures

  private startPress(x: number, y: number) {
    this.endPress();
    this.press = { x, y, timer: window.setTimeout(() => this.beginHold(), HOLD_MS) };
    // Long-press now means "hold still", so no text selection or callout while it's down.
    document.documentElement.dataset.fxPress = "true";
  }

  private beginHold() {
    const p = this.press;
    if (!p || !this.settings.trail) return;
    const now = performance.now();
    this.holding = true;
    this.pointer = { x: p.x, y: p.y, type: "touch" };
    this.lastMoveAt = now - 600; // the still state starts right away
    this.stillMs = 0;
    getSelection()?.removeAllRanges();
    if (this.settings.trail === "cursed") {
      this.ghost ??= { x: p.x - 34, y: p.y + 26, alpha: 0, lastMove: now, dir: 1, t: 0, kx: 0, ky: 0, squash: 0 };
      this.ghost.lastMove = now - 1400; // it comes for the finger straight away
    }
    this.ensure();
  }

  private endPress() {
    if (this.press) window.clearTimeout(this.press.timer);
    this.press = null;
    if (this.holding) {
      this.holding = false;
      this.stillMs = 0;
      this.setPossessed(false);
    }
    delete document.documentElement.dataset.fxPress;
  }

  private swipeMove(x: number, y: number) {
    const s = this.swipe;
    if (!s || this.drag || !this.settings.on) return;
    const dx = x - s.x0;
    const dy = y - s.y0;
    const ms = Math.max(1, performance.now() - s.t0);
    // Only a mostly horizontal, fast swipe counts (vertical drags are scrolling).
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) / ms > 0.45) {
      const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
      // The first time it qualifies, cover the whole path so far.
      this.fling(s.flung ? s.x : s.x0, s.flung ? s.y : s.y0, x, y, clamp((dx / ms) * 16.67, 22), clamp((dy / ms) * 16.67, 8));
      s.flung = true;
    }
    s.x = x;
    s.y = y;
  }

  private onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    this.tiltRaw = { beta: e.beta, gamma: e.gamma };
    this.tiltBase ??= { ...this.tiltRaw };
    if (this.drag?.tilt || this.bubbles.length) this.ensure();
  };

  /**
   * Tilt as a screen-space "downhill" vector, about -1..1 per axis (1 is roughly
   * 30 degrees from where the phone was held when tilt started counting).
   */
  private tiltVec(): [number, number] | null {
    const r = this.tiltRaw;
    const b = this.tiltBase;
    if (!this.settings.motion || !r || !b) return null;
    const rad = Math.PI / 180;
    const gx = Math.sin((r.gamma - b.gamma) * rad) / 0.5;
    const gy = Math.sin((r.beta - b.beta) * rad) / 0.5;
    const a = (screen.orientation?.angle ?? 0) * rad;
    const c = (v: number) => Math.max(-1.5, Math.min(1.5, v));
    return [c(gx * Math.cos(a) + gy * Math.sin(a)), c(-gx * Math.sin(a) + gy * Math.cos(a))];
  }

  private onUp(e: PointerEvent) {
    if (e.pointerType === "touch") this.endPress();
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
      this.scorchHeading(x, y);
    }
  }

  private moveGhost(x: number, y: number, now: number) {
    if (now < this.ghostAwayUntil) return;
    this.ghost ??= { x, y: y + 40, alpha: 0, lastMove: now, dir: 1, t: 0, kx: 0, ky: 0, squash: 0 };
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

  /** Sparkle click: a ring of rainbow glitter pops outward. */
  private sparkleBurst(x: number, y: number) {
    const n = this.settings.reduced ? 8 : 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const speed = this.settings.reduced ? 0.6 : 2.4 + Math.random();
      this.add({ kind: "sparkle", x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, decay: 0.022, size: 11 + Math.random() * 6, hue: (i / n) * 360, glyph: "✦", gravity: 0.03, spin: 0, angle: 0 });
    }
  }

  /** Fire click: a puff of flame, and it scorches what it lands on. */
  private fireBurst(x: number, y: number) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.6;
      this.add({ kind: "flame", x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 1.2, life: 1, decay: 0.025 + Math.random() * 0.02, size: 12 + Math.random() * 12, hue: 0, gravity: -0.03, spin: 0, angle: 0 });
    }
    if (this.scorches.length > 220) this.scorches.shift();
    this.scorches.push({ x: x + scrollX, y: y + scrollY, r: 18, life: 1 });
    this.scorchHeading(x, y);
  }

  /**
   * Cursed click: a soft ring of ectoplasm ripples out and shoos the ghost back.
   * The push is a velocity that eases out over about half a second (no jump),
   * and the ghost wobbles like jelly as it settles.
   */
  private boo(x: number, y: number) {
    const now = performance.now();
    if (now < this.ghostAwayUntil) return;
    this.ghost ??= { x: x - 34, y: y + 26, alpha: 0, lastMove: now, dir: 1, t: 0, kx: 0, ky: 0, squash: 0 };
    const g = this.ghost;
    const dx = g.x - x;
    const dy = g.y - y;
    const d = Math.hypot(dx, dy) || 1;
    // Closer clicks push a little harder; the whole glide is about 55-65px.
    const push = 7.5 * (0.75 + 0.25 * Math.max(0, 1 - d / 160));
    g.kx = (dx / d) * push;
    g.ky = (dy / d) * push;
    g.squash = 1;
    g.dir = dx >= 0 ? -1 : 1; // it flinches, facing the click
    g.lastMove = now;
    // Rapid clicking keeps pushing, but doesn't stack up a glowing blob of ripples.
    if (this.particles.filter((p) => p.kind === "ecto").length >= 4) return;
    this.add({ kind: "ecto", x, y, vx: 0, vy: 0, life: 1, decay: 0.022, size: 6, hue: 0, gravity: 0, spin: 0, angle: 0 });
    this.add({ kind: "ecto", x, y, vx: 0, vy: 0, life: 1.25, decay: 0.022, size: 2, hue: 1, gravity: 0, spin: 0, angle: 0 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      this.add({ kind: "wisp", x, y, vx: Math.cos(a) * 1.1, vy: Math.sin(a) * 1.1, life: 1, decay: 0.018, size: 12 + Math.random() * 8, hue: 0, gravity: -0.008, spin: 0, angle: 0 });
    }
  }

  // ---------------------------------------------------------------- car

  private newCar(x: number, y: number): Car {
    return { x: x - 46, y: y + 10, vx: 0, vy: 0, heading: 0, steer: 0, roll: 0, nitro: 0, alpha: 0, parked: 0, donut: 0, spin: 1, donutMs: 0, rear: null };
  }

  /** Car click or tap: nitro. A burst of speed, and flame from the exhaust. */
  private nitro(x: number, y: number) {
    this.car ??= this.newCar(x, y);
    const c = this.car;
    c.nitro = 750;
    c.vx += Math.cos(c.heading) * 7;
    c.vy += Math.sin(c.heading) * 7;
    c.parked = 0;
    this.exhaust(c, 10, 2.4);
    this.ensure();
  }

  /** Flame with a blue-hot core out of the tailpipe. */
  private exhaust(c: Car, n: number, speed: number) {
    const ex = c.x - Math.cos(c.heading) * 16 * CAR_SCALE;
    const ey = c.y - Math.sin(c.heading) * 16 * CAR_SCALE;
    for (let i = 0; i < n; i++) {
      const a = c.heading + Math.PI + (Math.random() - 0.5) * 0.5;
      const v = speed * (0.6 + Math.random() * 0.8);
      const blue = i % 3 === 0;
      this.add({ kind: blue ? "nitro" : "flame", x: ex, y: ey, vx: Math.cos(a) * v + c.vx * 0.3, vy: Math.sin(a) * v + c.vy * 0.3, life: 1, decay: blue ? 0.08 : 0.06 + Math.random() * 0.03, size: blue ? 7 + Math.random() * 3 : 6 + Math.random() * 6, hue: 0, gravity: 0, spin: 0, angle: 0 });
    }
  }

  private updateCar(ctx: CanvasRenderingContext2D, now: number, dt: number, f: number) {
    if (this.settings.trail !== "car") return;
    this.updateSkids(ctx, dt);
    const c = this.car;
    if (!c) return;
    const p = this.pointer;
    const quiet = this.quiet(now);
    // The still state: a resting mouse, or a finger long-pressing (never over a hamster wheel).
    const resting = !!p && (p.type === "mouse" || this.holding) && !this.drag && !quiet;
    const boost = c.nitro > 0;
    c.nitro = Math.max(0, c.nitro - dt);
    // Donuts wind up instead of switching on: from a quarter second after the pointer stops,
    // the car already steers into an orbit, keeping its speed and the way it was turning,
    // and blends fully in over about two thirds of a second. Moving again unwinds it quickly.
    if (resting && p && now - this.lastMoveAt > 250) {
      if (c.donut === 0) {
        // Orbit the way it's already going around the pointer, so it never has to reverse.
        const cross = (c.x - p.x) * c.vy - (c.y - p.y) * c.vx;
        c.spin = Math.hypot(c.vx, c.vy) > 0.6 && cross < 0 ? -1 : 1;
      }
      c.donut = Math.min(1, c.donut + dt / 650);
    } else c.donut = Math.max(0, c.donut - dt / 220);
    const e = c.donut * c.donut * (3 - 2 * c.donut); // smoothstep
    let drift = 0;
    if (p) {
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Chase a spot just short of the pointer, so the car never sits on top of it
      // (and well clear of a hamster wheel someone is clicking).
      const max = boost ? 17 : 9.5;
      const want = Math.max(0, Math.min(max, (dist - (quiet ? 90 : 30)) * 0.13));
      const k = (boost ? 0.16 : 0.09) * f;
      let ax = ((dx / dist) * want - c.vx) * k;
      let ay = ((dy / dist) * want - c.vy) * k;
      if (e > 0) {
        // The orbit: aim for a point a little further round a 30px circle.
        const a = Math.atan2(c.y - p.y, c.x - p.x) + c.spin * 0.11 * e * f;
        const ox = (p.x + Math.cos(a) * 30 - c.x - c.vx) * Math.min(1, 0.3 * f);
        const oy = (p.y + Math.sin(a) * 30 - c.y - c.vy) * Math.min(1, 0.3 * f);
        ax += (ox - ax) * e;
        ay += (oy - ay) * e;
      }
      c.vx += ax;
      c.vy += ay;
      // Lean into the turn (sideways acceleration relative to the nose), or hard over in a donut.
      const lateral = Math.max(-1, Math.min(1, (-Math.sin(c.heading) * ax + Math.cos(c.heading) * ay) * 0.9));
      c.roll += (lateral * (1 - e) + 0.8 * c.spin * e - c.roll) * Math.min(1, 0.2 * f);
    } else {
      c.vx *= 0.9 ** f;
      c.vy *= 0.9 ** f;
      c.roll *= 0.9 ** f;
    }
    const speed = Math.hypot(c.vx, c.vy);
    if (speed > 0.5) {
      // The nose follows the direction of travel at a limited rate, so a sharp turn slides
      // before it grips. In a donut it also swings in toward the middle (and is helped
      // round, so it never lags behind the orbit).
      const diff = wrap(Math.atan2(c.vy, c.vx) + c.spin * 0.95 * e - c.heading);
      const lim = 0.16 + 0.12 * e;
      c.heading = wrap(c.heading + (Math.max(-lim, Math.min(lim, diff * (0.22 + 0.25 * e))) + c.spin * 0.08 * e) * f);
      const steer = Math.max(-0.55, Math.min(0.55, diff * 1.4)) * (1 - e) + 0.5 * c.spin * e;
      c.steer += (steer - c.steer) * Math.min(1, 0.3 * f);
      drift = e > 0.5 || (Math.abs(diff) > 0.45 && speed > 3.2) ? 1 : 0;
      if (drift && Math.random() < (0.25 + 0.1 * e) * f) this.smoke(c);
    } else c.steer *= 0.85 ** f;
    // Donuts for a good long while: a secret.
    c.donutMs = e > 0.9 ? c.donutMs + dt : 0;
    if (c.donutMs > 8000 && !this.found.has("donuts")) {
      this.found.add("donuts");
      this.secret("donuts");
    }
    c.x += c.vx * f;
    c.y += c.vy * f;
    if (boost) this.exhaust(c, 2, 2);
    // Skid marks from both rear wheels while it slides (or spins its wheels on nitro).
    const cos = Math.cos(c.heading);
    const sin = Math.sin(c.heading);
    const rx = c.x - cos * 9 * CAR_SCALE;
    const ry = c.y - sin * 9 * CAR_SCALE;
    const w = 7.6 * CAR_SCALE;
    const rear: [number, number, number, number] = [rx - sin * w, ry + cos * w, rx + sin * w, ry - cos * w];
    if (c.rear && (drift || (boost && speed > 4)) && this.skids.length < 600) {
      for (const i of [0, 2]) {
        if (Math.hypot(rear[i] - c.rear[i], rear[i + 1] - c.rear[i + 1]) > 40) continue;
        this.skids.push({ x1: c.rear[i] + scrollX, y1: c.rear[i + 1] + scrollY, x2: rear[i] + scrollX, y2: rear[i + 1] + scrollY, life: 1 });
      }
    }
    c.rear = rear;
    // Parked with nothing to chase (finger lifted, mouse left): it fades away.
    if (!p && speed < 0.2) c.parked += dt;
    else c.parked = 0;
    const gone = c.parked > 1200;
    c.alpha += ((gone ? 0 : 1) - c.alpha) * Math.min(1, (gone ? 0.06 : 0.15) * f);
    if (gone && c.alpha < 0.03) {
      this.car = null;
      return;
    }
    this.drawCar(ctx, c, now);
  }

  private smoke(c: Car) {
    const cos = Math.cos(c.heading);
    const sin = Math.sin(c.heading);
    const side = Math.random() < 0.5 ? -7 : 7;
    this.add({ kind: "smoke", x: c.x - cos * 10 - sin * side, y: c.y - sin * 10 + cos * side, vx: (Math.random() - 0.5) * 0.5, vy: -0.25 - Math.random() * 0.3, life: 1, decay: 0.025 + Math.random() * 0.015, size: 5 + Math.random() * 4, hue: 0, gravity: 0, spin: 0, angle: 0 });
  }

  private updateSkids(ctx: CanvasRenderingContext2D, dt: number) {
    if (!this.skids.length) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = this.ink;
    for (let i = this.skids.length - 1; i >= 0; i--) {
      const s = this.skids[i];
      s.life -= dt / 2600;
      if (s.life <= 0) {
        this.skids.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = 0.28 * s.life;
      ctx.beginPath();
      ctx.moveTo(s.x1 - scrollX, s.y1 - scrollY);
      ctx.lineTo(s.x2 - scrollX, s.y2 - scrollY);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** A small top-down sports car: wheels (the front ones steer), a body that leans, glass, lights. */
  private drawCar(ctx: CanvasRenderingContext2D, c: Car, now: number) {
    const lean = c.roll * 1.6;
    ctx.save();
    ctx.globalAlpha = c.alpha;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.heading);
    ctx.scale(CAR_SCALE, CAR_SCALE);
    // Shadow, thrown opposite the lean.
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    roundRect(ctx, -15, -7 - lean * 0.6 + 2.5, 31, 15, 5);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = "#16181b";
    for (const [wx, wy, front] of [[9, -7.6, 1], [9, 7.6, 1], [-9, -7.6, 0], [-9, 7.6, 0]] as const) {
      ctx.save();
      ctx.translate(wx, wy);
      if (front) ctx.rotate(c.steer);
      roundRect(ctx, -3.6, -1.9, 7.2, 3.8, 1.2);
      ctx.fill();
      ctx.restore();
    }
    // Body, shifted by the lean.
    ctx.translate(0, lean);
    const body = ctx.createLinearGradient(0, -7, 0, 7);
    body.addColorStop(0, "#f06a52");
    body.addColorStop(0.5, "#d9402f");
    body.addColorStop(1, "#a92b20");
    ctx.fillStyle = body;
    roundRect(ctx, -15, -7, 30, 14, 5.5);
    ctx.fill();
    ctx.strokeStyle = "rgba(60,10,6,0.55)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Twin racing stripes over the hood and trunk.
    ctx.fillStyle = "rgba(255,240,225,0.85)";
    ctx.fillRect(-14.5, -2.3, 29, 1.3);
    ctx.fillRect(-14.5, 1, 29, 1.3);
    // Windshield and rear window, with a glint.
    ctx.fillStyle = "#1c2833";
    ctx.beginPath();
    ctx.moveTo(6.5, -5.2);
    ctx.lineTo(3, -5.6);
    ctx.lineTo(3, 5.6);
    ctx.lineTo(6.5, 5.2);
    ctx.quadraticCurveTo(7.6, 0, 6.5, -5.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6.5, -4.8);
    ctx.lineTo(-9, -4.2);
    ctx.quadraticCurveTo(-9.8, 0, -9, 4.2);
    ctx.lineTo(-6.5, 4.8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(4.2, -4.6, 0.9, 3.4);
    // Roof, stripes carried over.
    ctx.fillStyle = "#c33627";
    roundRect(ctx, -6.5, -5.2, 9.5, 10.4, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,240,225,0.85)";
    ctx.fillRect(-6.5, -2.3, 9.5, 1.3);
    ctx.fillRect(-6.5, 1, 9.5, 1.3);
    // Headlights; the taillights flare on nitro.
    ctx.fillStyle = "#fff6c9";
    ctx.fillRect(13.2, -5.6, 1.6, 2.6);
    ctx.fillRect(13.2, 3, 1.6, 2.6);
    const glow = c.nitro > 0 ? 0.6 + 0.4 * Math.sin(now / 40) : 0;
    ctx.fillStyle = `rgb(${Math.round(190 + glow * 65)},${Math.round(30 + glow * 40)},${Math.round(30 + glow * 20)})`;
    if (glow) {
      ctx.shadowColor = "#ff4a2a";
      ctx.shadowBlur = 8;
    }
    ctx.fillRect(-15, -5.6, 1.5, 2.6);
    ctx.fillRect(-15, 3, 1.5, 2.6);
    ctx.restore();
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
        this.bubbleWatch.popped++;
        // A giant bubble splits into a little family that scatters, then floats on up.
        if (b.giant) {
          const n = 5;
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
            const r = b.r * (0.32 + Math.random() * 0.08);
            this.bubbles.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, r, maxR: r, vy: b.vy * 1.4, phase: Math.random() * 6, kx: Math.cos(a) * 3.2, ky: Math.sin(a) * 3.2 });
          }
          this.burst("droplets", b.x, b.y);
        }
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
    ctx.clearRect(0, 0, this.W, this.H);

    this.updateScorches(ctx, dt);
    this.updateKnocked(ctx, dt, f);
    this.updateBubbles(ctx, now, f);
    this.updateAmbient(now);
    this.updateParticles(ctx, f);
    this.updateRocks(ctx, dt, f);
    this.updateGoblins(ctx, dt, f);
    this.tiltAim();
    this.drawDrag(ctx);
    this.updateGhost(ctx, now, f);
    this.updateCar(ctx, now, dt, f);
    this.drawStill(ctx, now, dt);
    this.drawElectric(ctx, now);

    const busy =
      this.particles.length || this.scorches.length || this.knocked.length || this.rocks.length || this.goblins.length || this.drag || this.ghost || this.car || this.skids.length ||
      this.electric || this.holding || ((this.settings.trail || this.settings.buttons === "electric") && this.pointer?.type === "mouse") || (this.settings.dots === "bubbles" && !this.settings.reduced) || this.ambientOn();
    this.frame = busy ? requestAnimationFrame(this.tick) : 0;
    if (!busy) ctx.clearRect(0, 0, this.W, this.H);
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
        if (p.y > this.H + 40 || p.x < -80 || p.x > this.W + 80) this.particles.splice(i, 1);
      } else {
        p.life -= p.decay * f;
        if (p.life <= 0 || p.y > this.H + 60) {
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
    if (p.golden) {
      this.drawGoldenLeaf(ctx, p.size);
      ctx.restore();
      return;
    }
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
      case "smoke": {
        const r = p.size * (1.9 - p.life * 0.9);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        const c = this.dark ? "205,210,215" : "120,124,130";
        g.addColorStop(0, `rgba(${c},${0.32 * p.life})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "nitro": {
        const r = p.size * (0.5 + p.life * 0.5);
        if (this.dark) ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, `rgba(240,250,255,${0.95 * p.life})`);
        g.addColorStop(0.45, `rgba(90,170,255,${0.75 * p.life})`);
        g.addColorStop(1, "rgba(60,90,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "ecto": {
        // An eased ring: quick at first, then settling softly (hue 1 is the fainter inner echo).
        const t = Math.max(0, Math.min(1, 1 - p.life / (p.hue ? 1.25 : 1)));
        const e = 1 - (1 - t) ** 3;
        const r = p.size + e * (p.hue ? 34 : 52);
        const a = Math.max(0, Math.min(1, p.life)) * (p.hue ? 0.35 : 0.55);
        ctx.globalAlpha = 1;
        const glow = ctx.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
        glow.addColorStop(0, "rgba(190,175,255,0)");
        glow.addColorStop(1, `rgba(190,175,255,${a * 0.35})`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.dark ? `rgba(220,210,255,${a})` : `rgba(120,100,190,${a})`;
        ctx.lineWidth = 2.2 * Math.min(1, p.life) + 0.4;
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

  /** A glowing gold leaf with a stem and veins, drawn at the origin (about `size` px long). */
  private drawGoldenLeaf(ctx: CanvasRenderingContext2D, size: number) {
    const s = size / 2;
    const shimmer = 0.6 + 0.4 * Math.sin(performance.now() / 220);
    ctx.shadowColor = `rgba(255, 210, 60, ${0.6 + 0.3 * shimmer})`;
    ctx.shadowBlur = 14 + 8 * shimmer;
    const g = ctx.createLinearGradient(-s, -s * 0.5, s, s * 0.5);
    g.addColorStop(0, "#fff3b0");
    g.addColorStop(0.45, "#ffd23c");
    g.addColorStop(1, "#c98a00");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.bezierCurveTo(-s * 0.4, -s * 0.75, s * 0.5, -s * 0.6, s, 0);
    ctx.bezierCurveTo(s * 0.5, s * 0.6, -s * 0.4, s * 0.75, -s, 0);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#8a5a00";
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 1.25, s * 0.08); // stem
    ctx.lineTo(s * 0.85, 0);
    for (const t of [-0.45, 0, 0.4]) {
      ctx.moveTo(s * t, 0);
      ctx.lineTo(s * (t + 0.28), -s * 0.32);
      ctx.moveTo(s * t, 0);
      ctx.lineTo(s * (t + 0.28), s * 0.32);
    }
    ctx.stroke();
    // A glint.
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * shimmer})`;
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 0.22, s * 0.18, s * 0.07, -0.3, 0, Math.PI * 2);
    ctx.fill();
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
      if (y < -40 || y > this.H + 40) continue;
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
        if (screenY > this.H - 16 && k.vy > 0) {
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
        const floor = this.H - 9;
        if (r.y > floor) {
          r.y = floor;
          r.vy = Math.abs(r.vy) < 2.5 ? 0 : r.vy * -0.35;
          r.vx *= 0.92 ** f;
        }
        if (r.x < 9 || r.x > this.W - 9) {
          r.x = Math.min(this.W - 9, Math.max(9, r.x));
          r.vx *= -0.5;
        }
        const resting = r.y >= floor && r.vy === 0 && Math.abs(r.vx) < 0.2;
        if (resting || r.age > 6000) {
          this.rocks.splice(i, 1);
          this.fetch(goblin, r);
          continue;
        }
      } else if (r.age > 4500 || r.y > this.H + 60 || r.x < -60 || r.x > this.W + 60) {
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

  /** Handles clicks on the landed rock or the goblin. Returns true if it used the click. */
  private goblinClick(cx: number, cy: number) {
    const x = cx + scrollX;
    const y = cy + scrollY;
    for (const g of this.goblins) {
      if (Math.hypot(g.x - x, g.y - y) < 22) {
        g.boost = 2;
        this.sound("pop");
        return true;
      }
      if (g.phase === "fetch" && Math.hypot(g.rx - x, g.ry - y) < 20) {
        g.rolling = true;
        this.sound("launch");
        return true;
      }
    }
    return false;
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
      const speed = (g.phase === "carry" ? 8 : 11) * (g.boost ?? 1) * f;
      // A clicked rock rolls toward the goblin until he reaches it.
      if (g.phase === "fetch" && g.rolling) {
        const rdx = g.x - g.rx;
        const rdy = g.y - g.ry;
        const rd = Math.hypot(rdx, rdy) || 1;
        const step = Math.min(rd, 9 * f);
        g.rx += (rdx / rd) * step;
        g.ry += (rdy / rd) * step;
      }
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
      if (g.phase === "fetch") this.drawRock(ctx, g.rx - scrollX, g.ry - scrollY, g.rolling ? g.age / 60 : 0);
      if (g.boost && Math.random() < 0.6 * f) {
        // Dust kicked up while he hurries.
        this.add({ kind: "crumb", x: x - g.dir * 8, y: y + 14, vx: -g.dir * (1 + Math.random()), vy: -Math.random(), life: 0.7, decay: 0.04, size: 1.5 + Math.random() * 1.5, hue: 35, gravity: 0.05, spin: 0, angle: 0 });
      }
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

  /** Motion controls: with a finger resting on the rock, the phone's tilt pulls it back. */
  private tiltAim() {
    const d = this.drag;
    const v = d?.tilt ? this.tiltVec() : null;
    if (!d || !v) return;
    d.x = d.originX + v[0] * 150;
    d.y = d.originY + v[1] * 150;
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
    const w = this.bubbleWatch;
    if (!w.since) w.since = now;
    const sources = document.querySelectorAll<HTMLElement>("[data-bubble]");
    let allInView = sources.length > 0;
    for (const src of sources) {
      const r = src.getBoundingClientRect();
      const inView = r.bottom >= 0 && r.top <= this.H;
      if (!inView) allInView = false;
      const due = this.nextBubble.get(src) ?? 0;
      if (now < due || this.bubbles.length > 16) continue;
      this.nextBubble.set(src, now + 900 + Math.random() * 1100);
      if (!inView) continue;
      w.spawned++;
      // Now and then (never in the first few), a giant one that splits when popped.
      const giant = w.spawned > 6 && Math.random() < 1 / 14 && !this.bubbles.some((b) => b.giant);
      this.bubbles.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: 3, maxR: giant ? 34 + Math.random() * 6 : 9 + Math.random() * 13, vy: giant ? -0.4 : -(0.5 + Math.random() * 0.7), phase: Math.random() * 6, kx: 0, ky: 0, giant });
    }
    // Hovering a bubble with a mouse pops it too.
    if (this.pointer?.type === "mouse") this.popAt(this.pointer.x, this.pointer.y);
    // Keep the screen clear of bubbles for a whole second: only once they've been coming
    // for a while, you've popped a few, and the bubble makers are on screen and making them.
    const armed = now - w.since > 6000 && w.spawned >= 10 && w.popped >= 4 && allInView && document.visibilityState === "visible";
    if (armed && !this.bubbles.length) {
      w.emptySince ||= now;
      if (now - w.emptySince >= 1000 && !this.found.has("sweep")) {
        this.found.add("sweep");
        this.secret("sweep");
      }
    } else w.emptySince = 0;
    // Motion controls: bubbles drift the way the phone tilts.
    const tilt = this.tiltVec();
    ctx.save();
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.phase += 0.04 * f;
      b.y += (b.vy + b.ky) * f;
      b.x += (Math.sin(b.phase) * 0.5 + b.kx) * f;
      b.kx *= 0.95 ** f;
      b.ky *= 0.95 ** f;
      if (tilt) {
        b.x = Math.max(b.r, Math.min(this.W - b.r, b.x + tilt[0] * 1.6 * f));
        b.y += tilt[1] * 1.6 * f;
        if (b.y > this.H + 40) {
          this.bubbles.splice(i, 1);
          continue;
        }
      }
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
      if (b.giant) {
        // A giant bubble has a soap-film shimmer, so it reads as special.
        ctx.lineWidth = 2;
        ctx.strokeStyle = `hsla(${(now / 12 + b.phase * 40) % 360}, 90%, 70%, 0.55)`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.86, 0.2, 2.2);
        ctx.stroke();
      }
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
    // (A finger long-pressing on a phone counts as holding still too.)
    const possess = (this.pointer?.type === "mouse" || this.holding) && !this.drag && now - g.lastMove > 1400 && !this.quiet(now);
    // Holding still over the skeleton: the ghost possesses it instead of the cursor.
    const skeleton = possess && this.pointer ? this.skeletonAt(this.pointer.x, this.pointer.y) : null;
    const bones = skeleton?.getBoundingClientRect();
    // Otherwise it hangs back behind you, and drifts a little when you stop.
    const tx = bones ? bones.left + bones.width / 2 : possess ? target.x + 2 : target.x - 34 * g.dir + (idle ? Math.sin(g.t) * 30 : 0);
    const ty = bones ? bones.top + bones.height / 2 : possess ? target.y - 4 : target.y + 26 + (idle ? Math.cos(g.t * 0.7) * 14 : 0);
    // While a click's push glides it back, it barely follows (then picks up again smoothly).
    const pushing = Math.min(1, Math.hypot(g.kx, g.ky) / 6);
    const follow = 0.06 * (1 - 0.85 * pushing) * f;
    const nx = g.x + (tx - g.x) * follow + g.kx * f;
    if (pushing < 0.05 && Math.abs(nx - g.x) > 0.4) g.dir = nx > g.x ? 1 : -1;
    g.x = nx;
    g.y += (ty - g.y) * follow + g.ky * f;
    g.kx *= 0.87 ** f;
    g.ky *= 0.87 ** f;
    g.squash *= 0.93 ** f;
    // It dims a little when shooed, and brightens back as it recovers.
    g.alpha += ((possess ? 0.45 : idle ? 0.25 : 0.85) * (1 - 0.35 * g.squash) - g.alpha) * 0.08 * f;
    if (skeleton && Math.hypot(g.x - tx, g.y - ty) < 14) {
      // In it goes: the skeleton gets up and dances, and the ghost is spent for now.
      this.setPossessed(false);
      skeleton.dataset.state = "dance";
      window.setTimeout(() => {
        if (skeleton.dataset.state === "dance") delete skeleton.dataset.state;
      }, 4200);
      this.ghost = null;
      this.secret("skeleton");
      return;
    }
    this.setPossessed(possess && !skeleton && Math.hypot(g.x - tx, g.y - ty) < 10);
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
    if (g.squash > 0.01) {
      // Jelly wobble: squashed by the push, springing back with a soft overshoot.
      const w = g.squash * Math.cos((1 - g.squash) * 9);
      ctx.scale(1 + 0.18 * w, 1 - 0.14 * w);
    }
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
    if (this.settings.buttons !== "electric") {
      this.electric = null;
      return;
    }
    // Re-randomize the bolt shape every frame (or calmly, for reduced motion).
    if (!this.settings.reduced || now - this.lastBolt > 600) {
      this.boltSeed = Math.random() * 1e6;
      this.lastBolt = now;
    }
    let seed = this.boltSeed;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - 0.5;
    const p = this.pointer;
    const stroke = (draw: () => void) => {
      for (const [width, color, alpha] of [[3, "#43d9ff", 0.45], [1.3, "#e9fdff", 0.95]] as const) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.shadowColor = "#43d9ff";
        ctx.shadowBlur = 10;
        ctx.lineJoin = "round";
        ctx.beginPath();
        draw();
        ctx.stroke();
        ctx.restore();
      }
    };

    // Reaching out: nearby buttons throw an arc toward the cursor, longer as it gets closer.
    if (p?.type === "mouse" && !this.settings.reduced && !this.electric) {
      const REACH = 130;
      const near: { r: DOMRect; d: number; nx: number; ny: number }[] = [];
      for (const pill of document.querySelectorAll<HTMLElement>(".pill")) {
        const r = pill.getBoundingClientRect();
        if (r.bottom < 0 || r.top > this.H) continue;
        const nx = Math.max(r.left, Math.min(p.x, r.right));
        const ny = Math.max(r.top, Math.min(p.y, r.bottom));
        const d = Math.hypot(p.x - nx, p.y - ny);
        if (d > 0 && d < REACH) near.push({ r, d, nx, ny });
      }
      near.sort((a, b) => a.d - b.d);
      for (const { d, nx, ny } of near.slice(0, 3)) {
        const reach = Math.min(1, (1 - d / REACH) * 1.6); // touches the cursor inside ~50px
        const tx = nx + (p.x - nx) * reach;
        const ty = ny + (p.y - ny) * reach;
        const len = Math.hypot(tx - nx, ty - ny);
        const steps = Math.max(3, Math.round(len / 10));
        const ux = (tx - nx) / (len || 1);
        const uy = (ty - ny) / (len || 1);
        stroke(() => {
          ctx.moveTo(nx, ny);
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const wobble = i === steps ? 0 : rand() * 12 * Math.sin(Math.PI * t);
            ctx.lineTo(nx + (tx - nx) * t - uy * wobble, ny + (ty - ny) * t + ux * wobble);
          }
        });
      }
    }

    const e = this.electric;
    if (!e) return;
    if (now > e.until || !e.el.isConnected) {
      this.electric = null;
      return;
    }
    // A finger holding an Electric button: little sparks keep jumping off under it.
    if (e.touch && p && !this.settings.reduced && now - this.lastHoldSpark > 220) {
      this.lastHoldSpark = now;
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        this.add({ kind: "spark", x: p.x, y: p.y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 0.8, decay: 0.07, size: 5 + Math.random() * 4, hue: 180 + Math.random() * 30, gravity: 0.08, spin: 0, angle: 0 });
      }
    }
    const r = e.el.getBoundingClientRect();
    const radius = Math.min(parseFloat(getComputedStyle(e.el).borderTopLeftRadius) || 0, r.height / 2, r.width / 2);
    // On the button: ripples spread out along the outline from under the cursor.
    stroke(() => {
      const points = 72;
      for (let i = 0; i <= points; i++) {
        const [px, py, nx, ny] = perimeterPoint(r, radius, i / points);
        let out = 3 + rand() * 6;
        if (p && !this.settings.reduced) {
          const d = Math.hypot(px - p.x, py - p.y);
          out += 9 * Math.exp(-d / 55) * Math.sin(now / 45 - d / 9) + 4 * Math.exp(-d / 30);
        }
        const x = px + nx * out;
        const y = py + ny * out;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    });
  }


  // ---------------------------------------------------------------- still states

  /** The skeleton (lying in the Experience timeline) under a point, unless it's already up and dancing. */
  private skeletonAt(x: number, y: number) {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-skeleton]");
    return el && el.dataset.state !== "dance" ? el : null;
  }

  /** The real cursor is hidden while the ghost holds it; a wiggling fake takes its place. */
  private setPossessed(on: boolean) {
    if (on === this.possessed) return;
    this.possessed = on;
    if (on) document.documentElement.dataset.possessed = "true";
    else delete document.documentElement.dataset.possessed;
  }

  /** What each trail does when the mouse (or a long-pressed finger) holds still. */
  private drawStill(ctx: CanvasRenderingContext2D, now: number, dt: number) {
    const p = this.pointer;
    const trail = this.settings.trail;
    if (!trail || !p || (p.type !== "mouse" && !this.holding) || this.drag || now - this.lastMoveAt < 600 || this.quiet(now)) {
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

  /** Nature's rare golden leaf: bigger, gold and glowing, every 45 to 90 seconds. */
  private spawnGolden(x?: number, y?: number) {
    if (!this.ambientOn() || this.settings.look !== "nature") return;
    const fixed = x !== undefined;
    this.add({ kind: "glyph", ambient: true, golden: true, x: x ?? 40 + Math.random() * (this.W - 80), y: y ?? -30, vx: fixed ? 0 : (Math.random() - 0.5) * 0.4, vy: fixed ? 0.35 : 0.55 + Math.random() * 0.3, life: 1, decay: 0, size: 34, hue: Math.random() * 10, gravity: 0, spin: fixed ? 0 : (Math.random() - 0.5) * 0.02, angle: fixed ? 0.3 : Math.random() * 6 });
  }

  private updateAmbient(now: number) {
    if (!this.ambientOn()) return;
    if (this.settings.look === "nature") {
      if (!this.nextGolden) this.nextGolden = now + 45000 + Math.random() * 45000;
      else if (now >= this.nextGolden) {
        this.nextGolden = now + 45000 + Math.random() * 45000;
        this.spawnGolden();
      }
    }
    if (now < this.nextAmbient) return;
    const W = this.W;
    if (this.settings.look === "nature") {
      this.nextAmbient = now + 1300 + Math.random() * 1200;
      if (this.particles.filter((p) => p.ambient && !p.golden).length > 10) return;
      this.add({ kind: "glyph", ambient: true, x: Math.random() * W, y: -24, vx: (Math.random() - 0.5) * 0.6, vy: 0.5 + Math.random() * 0.6, life: 1, decay: 0, size: 16 + Math.random() * 10, hue: Math.random() * 10, glyph: ["🍃", "🌿", "🍂", "🍃"][Math.floor(Math.random() * 4)], gravity: 0, spin: (Math.random() - 0.5) * 0.03, angle: Math.random() * 6 });
    } else {
      this.nextAmbient = now + 5000 + Math.random() * 5000;
      const fromLeft = Math.random() < 0.5;
      this.add({ kind: "glyph", ambient: true, flap: true, x: fromLeft ? -30 : W + 30, y: 60 + Math.random() * this.H * 0.35, vx: (fromLeft ? 1 : -1) * (2.2 + Math.random() * 1.5), vy: (Math.random() - 0.5) * 0.4, life: 1, decay: 0, size: 22 + Math.random() * 10, hue: Math.random() * 10, glyph: "🦇", gravity: 0, spin: 0, angle: 0,
        // Some bats are curious: they come over to the cursor for a while.
        curious: Math.random() < 0.45 ? now + 9000 + Math.random() * 7000 : undefined });
    }
  }
}

/** An angle folded into -π..π. */
function wrap(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
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
