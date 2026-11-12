/**
 * Game modes: Asteroids, Keepy Uppy and Stacker. Each is a small simulation
 * drawn on its own canvas over a blurred page, built from the page itself
 * (its headings, tags and buttons become asteroids and blocks).
 */
import { burst, foundSecret, sound } from "@/lib/fx";

export type GameMode = "asteroids" | "keepy" | "stacker";

export const GAMES: { id: GameMode; label: string; how: string; touch: string }[] = [
  { id: "asteroids", label: "Asteroids", how: "The page breaks apart. Turn with ← → (or A D), thrust with ↑ (W), fire with Space. Two hits and it's over.", touch: "Use the buttons at the bottom." },
  { id: "keepy", label: "Keepy Uppy", how: "Keep the ball in the air: click or tap it, or press Space. Things get harder at 10, 20, 30 and 40.", touch: "Tap the ball." },
  { id: "stacker", label: "Stacker", how: "Drop each block onto the stack with a click, a tap or Space. Only the overlap stays.", touch: "Tap anywhere to drop." },
];

/** `touch` marks a finger tap (touch-only extras, like tap-to-thrust, key off it). */
export type Input = { keys: Set<string>; taps: { x: number; y: number; touch?: boolean }[] };

/** Clear taps after each frame (and keys too, when a game starts). */
export function clearInput(input: Input, keys = false) {
  input.taps.splice(0);
  if (keys) input.keys.clear();
}

export interface Game {
  score: number;
  over: boolean;
  /** A short message to flash on screen (e.g. "Faster!"). */
  banner: { text: string; until: number } | null;
  update(dt: number, f: number, input: Input, now: number): void;
  draw(ctx: CanvasRenderingContext2D, now: number): void;
}

type Colors = { ink: string; accent: string; muted: string; surface: string };

/** Visible page elements, in viewport coordinates, with their text. */
function pageShapes(max: number) {
  const els = document.querySelectorAll<HTMLElement>("main h2, main h3, main .pill, main dt, main [data-letter], main p");
  const out: { x: number; y: number; w: number; h: number; text: string }[] = [];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    if (!text || r.width < 14 || r.height < 14 || r.bottom < 0 || r.top > innerHeight || r.width > 520) continue;
    out.push({ x: r.left, y: r.top, w: r.width, h: Math.min(r.height, 60), text: text.length > 22 ? `${text.slice(0, 20)}…` : text });
    if (out.length >= max) break;
  }
  return out;
}

/** Words from the page (project names, tags, skills) for labeling blocks. */
function pageWords() {
  const words = Array.from(document.querySelectorAll<HTMLElement>("main h3, main .pill, main dt"))
    .map((e) => (e.innerText || "").trim().split("\n")[0])
    .filter((t) => t && t.length <= 22);
  return words.length ? words : ["TypeScript", "Java", "Flutter", "React", "Next.js"];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
}

// ------------------------------------------------------------------ Asteroids

type Rock = { x: number; y: number; w: number; h: number; vx: number; vy: number; spin: number; angle: number; text: string };

export class Asteroids implements Game {
  score = 0;
  over = false;
  banner: Game["banner"] = null;
  private ship = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, angle: -Math.PI / 2, hits: 0, safeUntil: 0 };
  private rocks: Rock[] = [];
  private shots: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  private lastShot = 0;
  private wave = 0;
  private thrustUntil = 0;
  private tapFire = false;
  /** For the Pacifist secret: when the game began, and whether a shot has been fired. */
  private startedAt = performance.now();
  private fired = false;
  private pacifist = false;

  constructor(private colors: Colors) {
    this.nextWave(performance.now());
  }

  private nextWave(now: number) {
    // Clearing the first wave (one that actually had rocks in it) is a secret.
    if (this.wave === 1 && this.score > 0) foundSecret("cadet");
    // Clearing three waves (reaching the fourth) is a bigger one.
    if (this.wave === 3 && this.score > 0) foundSecret("deepspace");
    this.wave++;
    const speed = 0.5 + this.wave * 0.25;
    const shapes = pageShapes(14);
    for (const s of shapes) {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      // Keep the ship's start clear.
      if (Math.hypot(cx - this.ship.x, cy - this.ship.y) < 120) continue;
      const a = Math.random() * Math.PI * 2;
      this.rocks.push({ x: cx, y: cy, w: s.w, h: s.h, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, spin: (Math.random() - 0.5) * 0.01, angle: 0, text: s.text });
    }
    this.ship.safeUntil = now + 1500;
    this.banner = { text: `Wave ${this.wave}`, until: now + 1400 };
  }

  update(_dt: number, f: number, input: Input, now: number) {
    const k = input.keys;
    const s = this.ship;
    // Touch: a tap on the playfield is a short burst of thrust, and a shot.
    if (input.taps.some((t) => t.touch)) {
      this.thrustUntil = now + 260;
      this.tapFire = true;
    }
    if (k.has("left")) s.angle -= 0.075 * f;
    if (k.has("right")) s.angle += 0.075 * f;
    if (k.has("up") || now < this.thrustUntil) {
      s.vx += Math.cos(s.angle) * 0.18 * f;
      s.vy += Math.sin(s.angle) * 0.18 * f;
    }
    s.vx *= 0.992 ** f;
    s.vy *= 0.992 ** f;
    s.x = wrap(s.x + s.vx * f, innerWidth);
    s.y = wrap(s.y + s.vy * f, innerHeight);
    if ((k.has("fire") || this.tapFire) && now - this.lastShot > 220) {
      this.lastShot = now;
      this.tapFire = false;
      this.fired = true;
      this.shots.push({ x: s.x + Math.cos(s.angle) * 14, y: s.y + Math.sin(s.angle) * 14, vx: Math.cos(s.angle) * 9 + s.vx, vy: Math.sin(s.angle) * 9 + s.vy, life: 70 });
      sound("launch");
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const b = this.shots[i];
      b.x = wrap(b.x + b.vx * f, innerWidth);
      b.y = wrap(b.y + b.vy * f, innerHeight);
      b.life -= f;
      const hit = this.rocks.findIndex((r) => Math.abs(b.x - r.x) < r.w / 2 && Math.abs(b.y - r.y) < r.h / 2);
      if (hit >= 0) {
        const r = this.rocks[hit];
        this.rocks.splice(hit, 1);
        this.shots.splice(i, 1);
        burst("sparks", r.x, r.y);
        sound("hit");
        this.score += r.w > 110 ? 10 : 25;
        // Big pieces of the page split in two, text and all.
        if (r.w > 110) {
          const mid = Math.ceil(r.text.length / 2);
          for (const [dir, text] of [[-1, r.text.slice(0, mid)], [1, r.text.slice(mid)]] as const) {
            this.rocks.push({ ...r, w: r.w / 2, x: r.x + (dir * r.w) / 4, vx: r.vx + dir * 1.2, vy: r.vy + (Math.random() - 0.5) * 1.5, text: text.trim() || "·" });
          }
        }
        continue;
      }
      if (b.life <= 0) this.shots.splice(i, 1);
    }
    for (const r of this.rocks) {
      r.x = wrap(r.x + r.vx * f, innerWidth);
      r.y = wrap(r.y + r.vy * f, innerHeight);
      r.angle += r.spin * f;
      if (now > s.safeUntil && Math.abs(s.x - r.x) < r.w / 2 + 8 && Math.abs(s.y - r.y) < r.h / 2 + 8) {
        s.hits++;
        s.safeUntil = now + 1800;
        burst("sparks", s.x, s.y);
        sound("hit");
        if (s.hits >= 2) this.over = true;
        else this.banner = { text: "Hit! One more and it's over", until: now + 1600 };
      }
    }
    if (!this.rocks.length) this.nextWave(now);
    // Thirty seconds without firing a shot, and still flying.
    if (!this.pacifist && !this.fired && !this.over && now - this.startedAt > 30_000) {
      this.pacifist = true;
      foundSecret("pacifist");
    }
  }

  draw(ctx: CanvasRenderingContext2D, now: number) {
    const c = this.colors;
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const r of this.rocks) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle);
      roundRect(ctx, -r.w / 2, -r.h / 2, r.w, r.h, 8);
      ctx.fillStyle = c.surface;
      ctx.fill();
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = c.ink;
      ctx.fillText(r.text, 0, 0, r.w - 10);
      ctx.restore();
    }
    ctx.fillStyle = c.accent;
    for (const b of this.shots) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const s = this.ship;
    const blink = now < s.safeUntil && Math.floor(now / 120) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-11, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-11, 10);
      ctx.closePath();
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function wrap(v: number, max: number) {
  return v < -40 ? max + 40 : v > max + 40 ? -40 : v;
}

// ------------------------------------------------------------------ Keepy Uppy

type Ball = { x: number; y: number; vx: number; vy: number; r: number; spin: number };

export class KeepyUppy implements Game {
  score = 0;
  over = false;
  banner: Game["banner"] = null;
  private balls: Ball[] = [];
  private gravity = 0.3;
  private wind = 0;
  private level = 0;
  /** Times a ball has bounced off the top of the screen this game. */
  private ceilings = 0;

  constructor() {
    this.balls.push(this.newBall(innerWidth / 2));
    this.banner = { text: "Click the ball!", until: performance.now() + 1600 };
  }

  private newBall(x: number): Ball {
    return { x, y: innerHeight * 0.3, vx: (Math.random() - 0.5) * 2, vy: -2, r: 30, spin: 0 };
  }

  private bump(b: Ball, fromX: number) {
    b.vy = -11 - Math.random() * 2;
    b.vx += (b.x - fromX) * 0.12 + (Math.random() - 0.5) * 1.5;
    b.spin = b.vx * 0.02;
    this.score++;
    sound("pop");
    if (this.score === 15) foundSecret("warmup");
    this.escalate();
  }

  /** Every ten hits, something new makes it harder. */
  private escalate() {
    const now = performance.now();
    const level = Math.floor(this.score / 10);
    if (level <= this.level || level > 4) return;
    this.level = level;
    burst("confetti", innerWidth / 2, innerHeight / 3);
    if (level === 1) {
      this.gravity = 0.4;
      this.banner = { text: "10! Faster!", until: now + 1600 };
    } else if (level === 2) {
      this.wind = 1;
      this.banner = { text: "20! Windy!", until: now + 1600 };
    } else if (level === 3) {
      for (const b of this.balls) b.r = 21;
      this.banner = { text: "30! Tiny ball!", until: now + 1600 };
    } else {
      const b = this.newBall(innerWidth * 0.3);
      b.r = 21;
      this.balls.push(b);
      this.banner = { text: "40! Double trouble!", until: now + 1600 };
      foundSecret("double");
    }
  }

  update(_dt: number, f: number, input: Input, now: number) {
    for (const t of input.taps) {
      // Fingers are less precise than a cursor, so taps get a little extra reach.
      const reach = (b: { r: number }) => (t.touch ? Math.max(b.r * 1.5, b.r + 26) : b.r * 1.5);
      const hit = this.balls.find((b) => Math.hypot(b.x - t.x, b.y - t.y) < reach(b));
      if (hit) this.bump(hit, t.x);
    }
    // Space bumps the lowest ball that's within reach, for keyboard players.
    if (input.keys.has("fire")) {
      input.keys.delete("fire");
      const low = [...this.balls].sort((a, b) => b.y - a.y)[0];
      if (low && low.y > innerHeight * 0.45 && low.vy > 0) this.bump(low, low.x + (Math.random() - 0.5) * 20);
    }
    const gust = this.wind ? Math.sin(now / 1400) * 0.06 * this.wind : 0;
    for (const b of this.balls) {
      b.vy += this.gravity * f;
      b.vx += gust * f;
      b.x += b.vx * f;
      b.y += b.vy * f;
      if (b.x < b.r || b.x > innerWidth - b.r) {
        b.x = Math.max(b.r, Math.min(innerWidth - b.r, b.x));
        b.vx *= -0.8;
      }
      if (b.y < b.r) {
        b.y = b.r;
        b.vy = Math.abs(b.vy) * 0.5;
        if (++this.ceilings === 3) foundSecret("skyhigh");
      }
      if (b.y > innerHeight + b.r) this.over = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D, now: number) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const b of this.balls) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(now * b.spin * 0.01);
      ctx.font = `${b.r * 2}px "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif`;
      ctx.fillText("🏐", 0, 0);
      ctx.restore();
    }
  }
}

// ------------------------------------------------------------------ Stacker

type Block = { x: number; w: number; y: number; text: string; hue: number };

export class Stacker implements Game {
  score = 0;
  over = false;
  banner: Game["banner"] = null;
  private h = 38;
  private stack: Block[] = [];
  private moving: Block & { dir: number; speed: number };
  private debris: { x: number; y: number; w: number; vy: number; text: string; hue: number }[] = [];
  private words = pageWords();
  private camera = 0;
  /** Perfect drops in a row. */
  private streak = 0;

  constructor(private colors: Colors) {
    const w = Math.min(340, innerWidth * 0.7);
    this.stack.push({ x: (innerWidth - w) / 2, w, y: innerHeight - 70, text: this.word(), hue: 160 });
    this.moving = this.nextBlock();
    this.banner = { text: "Drop it on the stack", until: performance.now() + 1500 };
  }

  private word() {
    return this.words[Math.floor(Math.random() * this.words.length)];
  }

  private nextBlock() {
    const top = this.stack[this.stack.length - 1];
    // Each block slides in from alternating sides, starting close enough to land on the stack.
    const fromLeft = this.stack.length % 2 === 1;
    const x = Math.max(0, Math.min(innerWidth - top.w, fromLeft ? top.x - top.w * 0.9 : top.x + top.w * 0.9));
    return { x, w: top.w, y: top.y - this.h, text: this.word(), hue: (top.hue + 23) % 360, dir: fromLeft ? 1 : -1, speed: 3 + this.score * 0.25 };
  }

  private drop() {
    const top = this.stack[this.stack.length - 1];
    const m = this.moving;
    const left = Math.max(m.x, top.x);
    const right = Math.min(m.x + m.w, top.x + top.w);
    const overlap = right - left;
    if (overlap <= 0) {
      this.debris.push({ x: m.x, y: m.y, w: m.w, vy: 0, text: m.text, hue: m.hue });
      this.over = true;
      sound("hit");
      return;
    }
    // The overhang falls away.
    if (m.x < left) this.debris.push({ x: m.x, y: m.y, w: left - m.x, vy: 0, text: "", hue: m.hue });
    if (m.x + m.w > right) this.debris.push({ x: right, y: m.y, w: m.x + m.w - right, vy: 0, text: "", hue: m.hue });
    const perfect = Math.abs(m.x - top.x) < 3;
    this.stack.push({ x: perfect ? top.x : left, w: perfect ? top.w : overlap, y: m.y, text: m.text, hue: m.hue });
    this.score++;
    sound(perfect ? "secret" : "pop");
    this.streak = perfect ? this.streak + 1 : 0;
    if (perfect) this.banner = { text: this.streak >= 3 ? `${this.streak} perfect in a row!` : "Perfect!", until: performance.now() + 900 };
    if (this.streak === 3) foundSecret("perfect");
    if (this.score === 10) foundSecret("tower");
    if (this.score === 20) foundSecret("skyscraper");
    this.moving = this.nextBlock();
  }

  update(_dt: number, f: number, input: Input) {
    const m = this.moving;
    m.x += m.dir * m.speed * f;
    if (m.x < 0 || m.x + m.w > innerWidth) {
      m.dir *= -1;
      m.x = Math.max(0, Math.min(innerWidth - m.w, m.x));
    }
    if (input.taps.length || input.keys.has("fire")) {
      input.keys.delete("fire");
      this.drop();
    }
    // Keep the top of the stack in view.
    const target = Math.max(0, innerHeight * 0.45 - this.moving.y);
    this.camera += (target - this.camera) * 0.08 * f;
    for (const d of this.debris) {
      d.vy += 0.5 * f;
      d.y += d.vy * f;
    }
    this.debris = this.debris.filter((d) => d.y - this.camera < innerHeight + 200);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(0, this.camera);
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const block = (b: { x: number; y: number; w: number; text: string; hue: number }) => {
      roundRect(ctx, b.x, b.y, b.w, this.h - 4, 7);
      ctx.fillStyle = `hsl(${b.hue} 55% 55%)`;
      ctx.fill();
      ctx.strokeStyle = this.colors.ink;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (b.text && b.w > 30) {
        ctx.fillStyle = "#0f1c22";
        ctx.fillText(b.text, b.x + b.w / 2, b.y + (this.h - 4) / 2, b.w - 10);
      }
    };
    this.stack.forEach(block);
    if (!this.over) block(this.moving);
    this.debris.forEach(block);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ scores

export type Score = { initials: string; score: number; at: number };
const LOCAL_KEY = "bells-and-whistles-scores";

export function localScores(mode: GameMode): Score[] {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") as Record<string, Score[]>;
    return Array.isArray(all[mode]) ? all[mode] : [];
  } catch {
    return [];
  }
}

export function saveLocalScore(mode: GameMode, entry: Score) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") as Record<string, Score[]>;
    all[mode] = [...(all[mode] ?? []), entry].sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    // Scores are a nicety; ignore storage failures.
  }
}

export const bestLocal = (mode: GameMode) => localScores(mode)[0]?.score ?? 0;
