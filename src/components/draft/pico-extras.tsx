"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { CLIMBER, drawSprite, FLABBY, FlabbyGame } from "@/lib/draft/flabby";
import { revealDraft } from "@/lib/draft/store";
import { prefersReducedMotion } from "@/lib/events";
import { sound } from "@/lib/fx";
import { ExternalLink } from "@/components/external-link";

const noSubscribe = () => () => {};
const SCALE = 3;

/**
 * Pico-8 theme extras on /dev/draft: an original little climber who runs along
 * the bottom of the screen and scales its edges (decoration only), and Flabby,
 * who sits at the bottom of the page and opens his minigame.
 */
export function Climber() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);

  useEffect(() => {
    const el = canvas.current;
    if (!el || reduced) return;
    const ctx = el.getContext("2d")!;
    let w = 0;
    let h = 0;
    const size = () => {
      w = Math.floor(innerWidth / SCALE);
      h = Math.floor(innerHeight / SCALE);
      el.width = w;
      el.height = h;
    };
    size();
    addEventListener("resize", size);
    const c = { x: 10, y: h - 8, vx: 0.9, vy: 0, mode: "run" as "run" | "climb" | "jump", top: 0, t: 0 };
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const step = () => {
      c.t++;
      const floor = h - 8;
      if (c.mode === "run") {
        c.x += c.vx;
        c.y = floor;
        if (c.t % 90 === 0 && Math.random() < 0.5) {
          c.mode = "jump";
          c.vy = -2.4;
        }
        if (c.x <= 0 || c.x >= w - 8) {
          c.x = Math.max(0, Math.min(w - 8, c.x));
          c.mode = "climb";
          c.top = floor - 20 - Math.random() * (h * 0.5);
        }
      } else if (c.mode === "climb") {
        c.y -= 0.6;
        if (c.y <= c.top) {
          c.mode = "jump";
          c.vx = c.x <= 0 ? 0.9 : -0.9;
          c.vy = -1.6;
        }
      } else {
        c.x += c.vx;
        c.vy += 0.12;
        c.y += c.vy;
        if (c.y >= floor) {
          c.y = floor;
          c.mode = "run";
        }
        c.x = Math.max(0, Math.min(w - 8, c.x));
      }
    };
    const tick = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc > 33) {
        step();
        acc -= 33;
      }
      ctx.clearRect(0, 0, w, h);
      const sprite = c.mode === "climb" ? CLIMBER.climb : Math.floor(c.t / 6) % 2 ? CLIMBER.run1 : CLIMBER.run2;
      drawSprite(ctx, sprite, Math.round(c.x), Math.round(c.y), c.mode === "climb" ? c.x > w / 2 : c.vx < 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", size);
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvas} aria-hidden="true" data-climber className="draft-climber pointer-events-none fixed inset-0 z-[54] h-full w-full" />;
}

/** A static 8×8 sprite on a tiny canvas, scaled up with crisp pixels. */
function SpriteSvg({ sprite, className }: { sprite: string[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 8, 8);
    drawSprite(ctx, sprite, 0, 0);
  }, [sprite]);
  return <canvas ref={ref} width={8} height={8} aria-hidden="true" className={`[image-rendering:pixelated] ${className ?? ""}`} />;
}

export function FlabbyPerch() {
  const [frame, setFrame] = useState<"fall" | "jump">("fall");
  const [open, setOpen] = useState(false);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);
  const opener = useRef<HTMLButtonElement>(null);

  // Idle: an occasional little hop.
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setFrame("jump");
      window.setTimeout(() => setFrame("fall"), 260);
    }, 2400);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="draft-flabby mx-auto flex max-w-5xl items-end gap-4 px-5 pb-10 sm:px-8">
      <button
        ref={opener}
        type="button"
        data-flabby
        onClick={() => setOpen(true)}
        aria-label="Play Flabby's game"
        className="draft-flabby-button rounded-md p-1 hover:bg-surface"
      >
        <SpriteSvg sprite={FLABBY[frame]} className={`size-16 ${frame === "jump" ? "-translate-y-2" : ""}`} />
      </button>
      <p className="pb-2 text-sm text-muted">
        Flabby, from{" "}
        <ExternalLink className="text-link" href="https://github.com/auhbz/flabbby">
          my PICO-8 game
        </ExternalLink>
        . Click him to play.
      </p>
      {open ? <FlabbyGameDialog onClose={() => setOpen(false)} opener={opener} /> : null}
    </div>
  );
}

function FlabbyGameDialog({ onClose, opener }: { onClose: () => void; opener: RefObject<HTMLButtonElement | null> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState(() => new FlabbyGame(prefersReducedMotion()));
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [phase, setPhase] = useState<"ready" | "play" | "dead">("ready");
  const titleId = useId();
  const deadAt = useRef(0);

  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    const back = opener.current;
    return () => back?.focus();
  }, [opener]);

  // The loop: 30 fps, like the cart.
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(4, 0, 0, 4, 0, 0);
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    const tick = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      if (!paused) {
        while (acc > 33.3) {
          game.step();
          frames++;
          acc -= 33.3;
        }
      } else acc = 0;
      game.draw(ctx);
      if (frames % 6 === 0) {
        setScore(game.score);
        setPhase(game.state);
        if (game.state === "dead" && !deadAt.current) {
          deadAt.current = now;
          setOver(true);
          sound("hit");
          if (game.score >= 10) revealDraft("d-flap", `Score ${game.score}. Flabby's proud of you.`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game, paused]);

  const flap = () => {
    if (paused) return;
    if (game.state === "dead") {
      if (performance.now() - deadAt.current < 500) return;
      deadAt.current = 0;
      setOver(false);
      setGame(new FlabbyGame(prefersReducedMotion()));
      setPhase("ready");
      return;
    }
    game.flap();
    setPhase(game.state);
    sound("pop");
  };

  const close = () => {
    // Leaving mid-flight: Flabby's game has a word for that.
    if (game.state === "play") revealDraft("d-coward", "Coward!");
    dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      data-flabby-game={over ? "over" : phase}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        // Space on a focused button presses that button instead.
        if (e.key === " " && e.target instanceof HTMLButtonElement) return;
        if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
          e.preventDefault();
          flap();
        } else if (e.key === "p" || e.key === "P") setPaused((p) => !p);
      }}
      className="draft-flabby-dialog m-auto w-[min(30rem,calc(100vw-2rem))] rounded-none border-4 border-[#5f574f] bg-black p-4 text-[#fff1e8] backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="font-mono text-lg font-bold">
          flabbby
        </h2>
        <p className="font-mono text-sm" aria-live="polite">
          score {score}
          {over ? " · game over" : paused ? " · paused" : ""}
        </p>
      </div>
      <canvas
        ref={canvas}
        width={512}
        height={512}
        role="img"
        aria-label="Flabby's game. Flap to fly between the pipes."
        onPointerDown={(e) => {
          e.preventDefault();
          flap();
        }}
        className="mt-3 aspect-square w-full touch-none [image-rendering:pixelated]"
      />
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono">
        <button type="button" onClick={flap} className="min-h-11 border-2 border-[#ffec27] bg-[#ffec27] font-bold text-[#1d2b53]" autoFocus>
          {over ? "Retry" : "Flap"}
        </button>
        <button type="button" aria-pressed={paused} onClick={() => setPaused((p) => !p)} className="min-h-11 border-2 border-[#c2c3c7]">
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={close} className="min-h-11 border-2 border-[#c2c3c7]">
          Exit
        </button>
      </div>
      <p className="mt-2 font-mono text-xs text-[#c2c3c7]">Space, ↑ or tap to flap · P to pause · Esc to exit</p>
    </dialog>
  );
}
