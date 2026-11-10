/**
 * Flabby, from Auhbon's own PICO-8 game (github.com/auhbz/flabbby). The
 * sprites below are copied pixel for pixel from the cart's sprite sheet
 * (__gfx__): one hex digit per pixel in the PICO-8 16-color palette, "." for
 * transparent. Sprite numbers are the cart's: 16 falling, 17 flapping, 34 to 43
 * the death animation, 48 to 53 the word his game shows when you lose.
 *
 * The minigame is a Flappy-style remix (pipes instead of the original cave),
 * keeping the cart's touches: gravity 0.2 per frame at 30 fps, the rainbow
 * trail on flaps, the screen shake, and the game-over lines.
 */

export const PICO_PALETTE = [
  "#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8",
  "#ff004d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa",
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

/** An original little climber for the Pico-8 theme (not from any game): teal beanie, green jacket, brown pack. */
export const CLIMBER: Record<"run1" | "run2" | "climb", Sprite> = {
  run1: ["..cccc..", ".cccccc.", "..ffff..", "..f0f0..", "..ffff4.", ".333344.", "..3333..", "..d..d.."],
  run2: ["..cccc..", ".cccccc.", "..ffff..", "..f0f0..", "..ffff4.", ".333344.", "..3333..", ".d....d."],
  climb: ["f.cccc.f", "fcccccc3", "3.ffff.3", ".3f0f03.", "..ffff4.", "..333344", "..3333..", "..d..d.."],
};

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

type Pipe = { x: number; gap: number; passed: boolean };

/** One run of the minigame on a 128×128 screen. step() runs at 30 fps, like the cart. */
export class FlabbyGame {
  state: "ready" | "play" | "dead" = "ready";
  score = 0;
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
      this.pipes = [{ x: 140, gap: 56, passed: false }];
    }
    this.dy = -2.6;
    for (let i = 0; i < 4; i++) this.trail.push({ x: 12 + Math.random() * 12, y: this.y + 6 + Math.random() * 8, r: 1 + Math.random() * 3, c: 1 + Math.floor(Math.random() * 15) });
  }

  step() {
    this.frame++;
    this.bob += 0.15;
    this.trail = this.trail.map((t) => ({ ...t, x: t.x - 1.5, r: t.r * 0.9 })).filter((t) => t.r > 0.4);
    if (this.state === "ready") return;
    if (this.state === "dead") {
      if (this.frame % 3 === 0 && this.deathFrame < FLABBY.death.length - 1) this.deathFrame++;
      this.shake *= 0.8;
      return;
    }
    this.dy = Math.min(4, this.dy + 0.2);
    this.y += this.dy;
    for (const p of this.pipes) p.x -= 1;
    const lastPipe = this.pipes[this.pipes.length - 1];
    if (lastPipe.x < 128 - 52) this.pipes.push({ x: 132, gap: 22 + Math.floor(Math.random() * 64), passed: false });
    this.pipes = this.pipes.filter((p) => p.x > -16);
    for (const p of this.pipes) {
      if (!p.passed && p.x + 12 < 24) {
        p.passed = true;
        this.score++;
      }
      const overlapX = 24 + 7 > p.x && 24 < p.x + 12;
      const overlapY = this.y < p.gap || this.y + 7 > p.gap + 40;
      if (overlapX && overlapY) this.die();
    }
    if (this.y > 120 || this.y < -8) this.die();
  }

  private die() {
    this.state = "dead";
    this.deathFrame = 0;
    this.shake = this.reduced ? 0 : 6;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.shake > 0.3) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.fillStyle = PICO_PALETTE[1];
    ctx.fillRect(-8, -8, 144, 144);
    for (const p of this.pipes) {
      ctx.fillStyle = PICO_PALETTE[12];
      ctx.fillRect(p.x, 0, 12, p.gap);
      ctx.fillStyle = PICO_PALETTE[2];
      ctx.fillRect(p.x, p.gap + 40, 12, 128);
      ctx.fillStyle = PICO_PALETTE[7];
      ctx.fillRect(p.x - 1, p.gap - 3, 14, 3);
      ctx.fillRect(p.x - 1, p.gap + 40, 14, 3);
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
      ctx.fillText("tap, click or space to flap", 64, 90);
    } else if (this.state === "play") {
      ctx.textAlign = "left";
      ctx.fillText("score:", 2, 2);
      ctx.fillStyle = PICO_PALETTE[this.score > 0 ? 3 : 8];
      ctx.fillText(String(this.score), 26, 2);
    } else {
      ctx.textAlign = "center";
      ctx.fillText("oopsi poopsi!", 64, 40);
      ctx.fillText(`your amazing score: ${this.score}`, 64, 52);
      ctx.fillText("press flap to retry!", 64, 62);
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
