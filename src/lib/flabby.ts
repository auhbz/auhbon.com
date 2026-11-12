/**
 * Flabby, from Auhbon's own PICO-8 game (github.com/auhbz/flabbby). The
 * sprites below are copied pixel for pixel from the cart's sprite sheet
 * (__gfx__): one hex digit per pixel in the PICO-8 16-color palette, "." for
 * transparent. Sprite numbers are the cart's: 16 falling, 17 flapping, 34 to 43
 * the death animation, 48 to 53 the word his game shows when you lose.
 *
 * The mini game is a Flappy-style remix (pipes instead of the original cave),
 * keeping the cart's touches: gravity 0.2 per frame at 30 fps, the rainbow
 * trail on flaps, the screen shake, and the game-over lines. It speeds up as
 * you score, and from 20 points on the pipes drift slowly up and down.
 *
 * The same sprites are the Pico-8 theme's climber (src/components/climber.tsx)
 * and the little icon beside Flabby's source code link.
 */
import type { Game, Input } from "@/lib/games";
import { foundSecret } from "@/lib/fx";

export const PICO_PALETTE = [
  "#000000",
  "#1d2b53",
  "#7e2553",
  "#008751",
  "#ab5236",
  "#5f574f",
  "#c2c3c7",
  "#fff1e8",
  "#ff004d",
  "#ffa300",
  "#ffec27",
  "#00e436",
  "#29adff",
  "#83769c",
  "#ff77a8",
  "#ffccaa",
];

export type Sprite = string[];

export const FLABBY = {
  fall: ["........", ".777777.", "77777777", ".999b99.", ".995999.", ".959797.", ".599999.", "........"],
  jump: [".77777..", ".77777..", "7777777.", ".99999..", "599797..", ".59999..", ".95999..", ".99b99.."],
  death: [
    [".88..88.", "89999998", "89799798", ".9c99c9.", ".9c99c9.", "89c99c98", "89999998", ".88..88."],
    [".88..88.", "88899888", "88799788", ".9c99c9.", ".9c99c9.", "88c99c88", "88899888", ".88..88."],
    [".8....8.", ".889988.", ".879978.", ".9c99c9.", ".8c99c9.", "88c89c88", ".888988.", "........"],
    ["........", "...888..", ".87997..", ".8c99c8.", ".8c99c8.", "..c89c8.", "..888...", "........"],
    ["........", "........", "..7887..", ".8c88c..", ".8899c8.", "..c888..", "...88...", "........"],
    ["........", "........", "...887..", "..8888..", "..8988..", "..c888..", "........", "........"],
    ["........", "........", "...8....", "...888..", "...888..", ".....8..", "........", "........"],
    ["........", "........", "........", "...88...", "...88...", "........", "........", "........"],
    ["........", "........", "........", "........", "...8....", "........", "........", "........"],
    ["........", "7.....7.", ".7...7..", "........", "...8....", "........", ".7...7..", "7.....7."],
  ],
  coward: [
    ["77777777", "74444447", "74777777", "747.....", "747.....", "74777777", "74444447", "77777777"],
    ["77777777", "74444447", "74777747", "74744747", "74744747", "74777747", "74444447", "77777777"],
    ["777..777", "747..747", "74777747", "74744747", "74444447", "74477447", "74777747", "777..777"],
    ["..7777..", ".774477.", "77477477", "747..747", "74777747", "74444447", "74777747", "777..777"],
    ["777777..", "744447..", "74..47..", "744447..", "744777..", "7474477.", "7477447.", "7777777."],
    ["77777...", "7444477.", "7477747.", "747.7747", "747.7747", "7477747.", "7444477.", "77777..."],
  ],
} satisfies Record<string, Sprite | Sprite[]>;

/** Draws an 8×8 sprite at (x, y) in pixel units; `swap` remaps one palette index (like PICO-8's pal()). */
export function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, flip = false, swap?: [number, number]) {
  for (let j = 0; j < 8; j++) {
    const row = sprite[j];
    for (let i = 0; i < 8; i++) {
      const ch = row[i];
      if (ch === ".") continue;
      let c = parseInt(ch, 16);
      if (swap && c === swap[0]) c = swap[1];
      ctx.fillStyle = PICO_PALETTE[c];
      ctx.fillRect(x + (flip ? 7 - i : i), y + j, 1, 1);
    }
  }
}

type Pipe = { x: number; base: number; gap: number; amp: number; phase: number; passed: boolean };

/** Speed (px per frame) for a score: 1 at the start, up to 1.9 by 25 points. */
export const flabbySpeed = (score: number) => 1 + Math.min(score, 25) * 0.036;
/** Gap height for a score: 40 at the start, 36 from 20 points. */
export const flabbyGap = (score: number) => 40 - Math.min(4, Math.floor(score / 5));
/** How far new pipes drift (0 below 20 points, growing slowly to 10). */
export const flabbyDrift = (score: number) => (score < 20 ? 0 : Math.min(10, 3 + (score - 20) * 0.5));
/** Most a gap can move from the last one: less as it speeds up, so every gap stays reachable. */
export const flabbyStep = (score: number) => 36 - Math.min(score, 25) * 0.32;

/** One run of the mini game on a 128×128 screen. step() runs at 30 fps, like the cart. */
export class FlabbyGame {
  state: "ready" | "play" | "dead" = "ready";
  score = 0;
  /** Frames since death (the death animation plays before the game-over card). */
  deadFor = 0;
  private y = 60;
  private dy = 0;
  private pipes: Pipe[] = [];
  private frame = 0;
  private deathFrame = 0;
  private shake = 0;
  private trail: { x: number; y: number; r: number; c: number }[] = [];
  private bob = 0;

  constructor(private reduced = false) {}

  flap() {
    if (this.state === "dead") return;
    if (this.state === "ready") {
      this.state = "play";
      this.pipes = [this.newPipe(140, 44)];
    }
    this.dy = -2.6;
    for (let i = 0; i < 4; i++)
      this.trail.push({ x: 12 + Math.random() * 12, y: this.y + 6 + Math.random() * 8, r: 1 + Math.random() * 3, c: 1 + Math.floor(Math.random() * 15) });
  }

  private newPipe(x: number, near?: number): Pipe {
    const gap = flabbyGap(this.score);
    const amp = this.reduced ? Math.min(6, flabbyDrift(this.score)) : flabbyDrift(this.score);
    const lo = 14 + amp;
    const hi = 128 - 14 - gap - amp;
    // Fair: each gap is within reach of the last one, even at full speed with drift.
    const prev = near ?? this.pipes[this.pipes.length - 1]?.base ?? 44;
    const base = Math.round(Math.max(lo, Math.min(hi, prev + (Math.random() * 2 - 1) * flabbyStep(this.score))));
    return { x, base, gap, amp, phase: Math.random() * Math.PI * 2, passed: false };
  }

  /** Top of a pipe's gap right now (drifting pipes move slowly, about one cycle every 5 s). */
  private top(p: Pipe) {
    return p.base + (p.amp ? Math.sin(p.phase + this.frame * 0.042) * p.amp : 0);
  }

  step() {
    this.frame++;
    this.bob += 0.15;
    this.trail = this.trail.map((t) => ({ ...t, x: t.x - 1.5, r: t.r * 0.9 })).filter((t) => t.r > 0.4);
    if (this.state === "ready") return;
    if (this.state === "dead") {
      this.deadFor++;
      if (this.frame % 3 === 0 && this.deathFrame < FLABBY.death.length - 1) this.deathFrame++;
      this.shake *= 0.8;
      return;
    }
    this.dy = Math.min(4, this.dy + 0.2);
    this.y += this.dy;
    const speed = flabbySpeed(this.score);
    for (const p of this.pipes) p.x -= speed;
    const lastPipe = this.pipes[this.pipes.length - 1];
    if (lastPipe.x < 128 - 52) this.pipes.push(this.newPipe(lastPipe.x + 56));
    this.pipes = this.pipes.filter((p) => p.x > -16);
    for (const p of this.pipes) {
      if (!p.passed && p.x + 12 < 24) {
        p.passed = true;
        this.score++;
      }
      const top = this.top(p);
      const overlapX = 24 + 7 > p.x && 24 < p.x + 12;
      const overlapY = this.y < top || this.y + 7 > top + p.gap;
      if (overlapX && overlapY) this.die();
    }
    if (this.y > 120 || this.y < -8) this.die();
  }

  private die() {
    if (this.state === "dead") return;
    this.state = "dead";
    this.deathFrame = 0;
    this.deadFor = 0;
    this.shake = this.reduced ? 0 : 6;
  }

  draw(ctx: CanvasRenderingContext2D, paused = false) {
    ctx.save();
    if (this.shake > 0.3) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.fillStyle = PICO_PALETTE[1];
    ctx.fillRect(-8, -8, 144, 144);
    for (const p of this.pipes) {
      const top = this.top(p);
      ctx.fillStyle = PICO_PALETTE[12];
      ctx.fillRect(p.x, -8, 12, top + 8);
      ctx.fillStyle = PICO_PALETTE[2];
      ctx.fillRect(p.x, top + p.gap, 12, 140);
      ctx.fillStyle = PICO_PALETTE[p.amp ? 10 : 7];
      ctx.fillRect(p.x - 1, top - 3, 14, 3);
      ctx.fillRect(p.x - 1, top + p.gap, 14, 3);
    }
    if (this.state === "play" && this.dy < 0) {
      for (const t of this.trail) {
        ctx.fillStyle = PICO_PALETTE[t.c];
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const y = this.state === "ready" ? 60 + Math.sin(this.bob) * 3 : this.y;
    if (this.state === "dead") drawSprite(ctx, FLABBY.death[this.deathFrame], 24, y);
    else drawSprite(ctx, this.dy < 0 ? FLABBY.jump : FLABBY.fall, 24, y);

    ctx.fillStyle = PICO_PALETTE[7];
    ctx.font = "6px ui-monospace, Menlo, Consolas, monospace";
    ctx.textBaseline = "top";
    if (this.state === "ready") {
      ctx.textAlign = "center";
      ctx.fillText("tap, click, or space to flap", 64, 90);
    } else if (this.state === "play") {
      ctx.textAlign = "left";
      ctx.fillText("score:", 2, 2);
      ctx.fillStyle = PICO_PALETTE[this.score > 0 ? 3 : 8];
      ctx.fillText(String(this.score), 26, 2);
      if (paused) {
        ctx.fillStyle = PICO_PALETTE[7];
        ctx.textAlign = "center";
        ctx.fillText("paused · p to resume", 64, 60);
      }
    } else {
      ctx.textAlign = "center";
      ctx.fillText("oopsi poopsi!", 64, 40);
      ctx.fillText(`your amazing score: ${this.score}`, 64, 52);
      let x = 32;
      const col = 8 + (Math.floor(this.frame / 18) % 7);
      for (const letter of FLABBY.coward) {
        drawSprite(ctx, letter, x, 75 + Math.sin(this.frame / 6 + x) * (this.reduced ? 0 : 1), false, [4, col]);
        x += 10;
      }
    }
    ctx.restore();
  }
}

/**
 * Flabby as a mini game in the game layer (its HUD, Esc, and leaderboards):
 * the 128×128 cart screen, drawn crisp in the middle of the page.
 */
export class FlabbyRun implements Game {
  score = 0;
  over = false;
  paused = false;
  banner: Game["banner"] = null;
  private sim: FlabbyGame;
  private screen: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private acc = 0;
  private upHeld = false;
  private found = new Set<string>();

  constructor(reduced = false) {
    this.sim = new FlabbyGame(reduced);
    this.screen = document.createElement("canvas");
    this.screen.width = 512;
    this.screen.height = 512;
    this.sctx = this.screen.getContext("2d")!;
    this.sctx.setTransform(4, 0, 0, 4, 0, 0);
    this.banner = { text: "Tap, click, Space or ↑ to flap", until: performance.now() + 1800 };
  }

  /** Where the cart screen sits on the page. */
  rect() {
    const size = Math.max(160, Math.min(innerWidth - 24, innerHeight - 150, 640));
    return { x: (innerWidth - size) / 2, y: Math.max(64, (innerHeight - size) / 2 + 16), size };
  }

  /** P, or the Pause button. */
  togglePause() {
    if (this.sim.state !== "play") return;
    this.paused = !this.paused;
  }

  /** Leaving mid-flight: Flabby's game has a word for that. */
  onExit() {
    if (this.sim.state === "play") foundSecret("coward");
  }

  update(dt: number, _f: number, input: Input, now: number) {
    if (input.keys.has("pause")) {
      input.keys.delete("pause");
      this.togglePause();
    }
    const up = input.keys.has("up");
    const press = input.taps.length > 0 || input.keys.has("fire") || (up && !this.upHeld);
    this.upHeld = up;
    input.keys.delete("fire");
    if (this.paused) {
      if (input.taps.length) this.paused = false;
      return;
    }
    if (press && this.sim.state !== "dead") this.sim.flap();
    this.acc += dt;
    while (this.acc > 33.3) {
      const before = this.sim.score;
      this.sim.step();
      this.acc -= 33.3;
      if (this.sim.score !== before) this.scored(now);
    }
    this.score = this.sim.score;
    // Let the death animation and the cart's game-over lines play, then the card.
    if (this.sim.state === "dead" && this.sim.deadFor > 40) this.over = true;
  }

  private scored(now: number) {
    const s = this.sim.score;
    if (s === 10) this.banner = { text: "10! Faster!", until: now + 1500 };
    if (s === 20) this.banner = { text: "20! The pipes are moving!", until: now + 1800 };
    for (const [at, id] of [
      [10, "flap10"],
      [25, "flap25"],
    ] as const) {
      if (s >= at && !this.found.has(id)) {
        this.found.add(id);
        foundSecret(id);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.sim.draw(this.sctx, this.paused);
    const { x, y, size } = this.rect();
    ctx.save();
    ctx.fillStyle = PICO_PALETTE[5];
    ctx.fillRect(x - 6, y - 6, size + 12, size + 12);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.screen, x, y, size, size);
    ctx.restore();
  }
}
