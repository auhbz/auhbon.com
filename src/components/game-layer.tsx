"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getFun, isFunMode, subscribeFun } from "@/lib/fun";
import { isUnlocked } from "@/lib/unlocks";
import { Asteroids, bestLocal, clearInput, GAMES, KeepyUppy, localScores, saveLocalScore, Stacker, type Game, type GameMode, type Input, type Score } from "@/lib/games";
import { cssVar } from "@/lib/fx/text";
import { FlabbyRun } from "@/lib/flabby";
import { prefersReducedMotion } from "@/lib/events";

export const GAME_EVENT = "portfolio:game";

/** Start a mini game (from the Bells & whistles panel). Only in Fun mode, and only once it's unlocked. */
export function startGame(mode: GameMode) {
  if (!isFunMode(getFun()) || !isUnlocked(`game:${mode}`)) return;
  window.dispatchEvent(new CustomEvent<GameMode>(GAME_EVENT, { detail: mode }));
}

const KEYMAP: Record<string, string> = {
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowUp: "up",
  w: "up",
  W: "up",
  " ": "fire",
  p: "pause",
  P: "pause",
};

type Board = { initials: string; score: number }[];

/**
 * The game layer: a full-screen canvas over a blurred page, a small HUD, touch
 * controls where they're needed, and a game-over card with leaderboards.
 */
export function GameLayer() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  // One mutable input object for the game's lifetime (handlers write, the loop reads).
  const [input] = useState<Input>(() => ({ keys: new Set(), taps: [] }));
  const game = useRef<Game | null>(null);
  const started = useRef(0);
  const opener = useRef<Element | null>(null);

  const exit = useCallback(() => {
    // Leaving mid-game (some games have a secret for that).
    if (game.current && !game.current.over) game.current.onExit?.();
    setMode(null);
    delete document.documentElement.dataset.game;
    (opener.current as HTMLElement | null)?.focus?.();
  }, []);

  useEffect(() => {
    const onStart = (e: Event) => {
      opener.current = document.activeElement;
      setMode((e as CustomEvent<GameMode>).detail);
      setOver(false);
      setScore(0);
      setRun((r) => r + 1);
    };
    window.addEventListener(GAME_EVENT, onStart);
    return () => window.removeEventListener(GAME_EVENT, onStart);
  }, []);

  // Switching to Boring mode closes the game layer.
  useEffect(() => {
    if (!mode) return;
    return subscribeFun(() => {
      if (!isFunMode(getFun())) exit();
    });
  }, [mode, exit]);

  // Esc leaves the game at any point, including the game-over card.
  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, exit]);

  // The game loop.
  useEffect(() => {
    if (!mode || over) return;
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    const colors = { ink: cssVar("--ink") || "#e7efec", accent: cssVar("--kelp") || "#6cc9a8", muted: cssVar("--muted") || "#9db0b8", surface: cssVar("--surface") || "#13232c" };
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = innerWidth * dpr;
      el.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    document.documentElement.dataset.game = mode;
    game.current =
      mode === "asteroids" ? new Asteroids(colors) : mode === "keepy" ? new KeepyUppy() : mode === "flabby" ? new FlabbyRun(prefersReducedMotion()) : new Stacker(colors);
    // The QA suite reaches the running game through its canvas (to test the in-game secrets).
    (el as HTMLCanvasElement & { game?: Game }).game = game.current;
    started.current = performance.now();
    clearInput(input, true);
    el.focus();

    let frame = 0;
    let last = performance.now();
    let lastHud = 0;
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const g = game.current!;
      g.update(dt, dt / 16.67, input, now);
      clearInput(input);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      g.draw(ctx, now);
      if (now - lastHud > 100) {
        lastHud = now;
        setScore(g.score);
        setBanner(g.banner && now < g.banner.until ? g.banner.text : null);
        setPaused(!!g.paused);
      }
      if (g.over) {
        setScore(g.score);
        setElapsed(now - started.current);
        setOver(true);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const down = (e: KeyboardEvent) => {
      const k = KEYMAP[e.key];
      if (!k || (e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault();
      input.keys.add(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = KEYMAP[e.key];
      // "fire" is consumed by the games that use it as a single press.
      // "pause" is a single press too (the game consumes it), so a quick tap isn't lost.
      if (k && k !== "fire" && k !== "pause") input.keys.delete(k);
      if (k === "fire" && mode === "asteroids") input.keys.delete(k);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("resize", size);
    };
  }, [mode, over, run, exit, input]);

  if (!mode) return null;
  const info = GAMES.find((g) => g.id === mode)!;
  const hold = (k: string, label: string) => {
    const release = (e: React.PointerEvent<HTMLButtonElement>) => {
      input.keys.delete(k);
      delete e.currentTarget.dataset.held;
    };
    return {
      "aria-label": label,
      onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        input.keys.add(k);
        e.currentTarget.dataset.held = "";
      },
      onPointerUp: release,
      onPointerLeave: release,
      onPointerCancel: release,
      // Screen readers (and switch access) activate with a click and no pointer down: a short press.
      onClick: (e: React.MouseEvent) => {
        if (e.detail !== 0) return;
        input.keys.add(k);
        window.setTimeout(() => input.keys.delete(k), 250);
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };
  };

  return (
    <section aria-label={`${info.label} game`} className="game-layer" data-game-layer={mode}>
      <canvas
        ref={canvas}
        tabIndex={-1}
        aria-label={`${info.label}. ${info.how}`}
        className="game-canvas"
        onPointerDown={(e) => input.taps.push({ x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" })}
      />
      <div className="game-hud">
        <p className="font-display font-semibold">{info.label}</p>
        <p className="tabular-nums" aria-live="off">
          Score <strong>{score}</strong>
          <span className="text-muted"> · Best {Math.max(bestLocal(mode), over ? score : 0)}</span>
        </p>
        {mode === "flabby" && !over ? (
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => {
              game.current?.togglePause?.();
              setPaused(!!game.current?.paused);
              canvas.current?.focus();
            }}
            className="game-button"
          >
            {paused ? "Resume" : "Pause"} <kbd className="hidden sm:inline">P</kbd>
          </button>
        ) : null}
        <button type="button" onClick={exit} className="game-button">
          Exit <kbd className="hidden sm:inline">Esc</kbd>
        </button>
      </div>
      {banner && !over ? (
        <p className="game-banner" aria-hidden="true">
          {banner}
        </p>
      ) : null}
      {mode === "asteroids" && !over ? (
        // Keyboard players use the arrow keys, so the pad stays out of the Tab order.
        <div className="game-pad" role="group" aria-label="Ship controls">
          <div className="game-pad-group">
            <button type="button" tabIndex={-1} {...hold("left", "Turn left")}>
              <span aria-hidden="true">⟲</span>
            </button>
            <button type="button" tabIndex={-1} {...hold("right", "Turn right")}>
              <span aria-hidden="true">⟳</span>
            </button>
          </div>
          <div className="game-pad-group">
            <button type="button" tabIndex={-1} {...hold("up", "Thrust")}>
              <span aria-hidden="true">▲</span>
            </button>
            <button type="button" tabIndex={-1} {...hold("fire", "Fire")}>
              <span aria-hidden="true">●</span>
            </button>
          </div>
        </div>
      ) : null}
      {over ? (
        <GameOver
          mode={mode}
          score={score}
          ms={elapsed}
          onAgain={() => {
            setOver(false);
            setScore(0);
            setRun((r) => r + 1);
          }}
          onExit={exit}
        />
      ) : null}
    </section>
  );
}

function GameOver({ mode, score, ms, onAgain, onExit }: { mode: GameMode; score: number; ms: number; onAgain: () => void; onExit: () => void }) {
  const headingId = useId();
  const [initials, setInitials] = useState("");
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState<Score[]>(() => localScores(mode));
  const [global, setGlobal] = useState<Board | "unavailable" | null>(null);
  const [tab, setTab] = useState<"local" | "global">("local");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/scores?mode=${mode}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { connected?: boolean; scores: Board }) => live && setGlobal(d.connected === false ? "unavailable" : d.scores))
      .catch(() => live && setGlobal("unavailable"));
    return () => {
      live = false;
    };
  }, [mode]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = initials.toUpperCase();
    if (!/^[A-Z]{3}$/.test(name)) return setError("Use three letters, like AAA.");
    setError(null);
    saveLocalScore(mode, { initials: name, score, at: Date.now() });
    setLocal(localScores(mode));
    setSaved(true);
    if (global === "unavailable") return;
    try {
      const r = await fetch("/api/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, initials: name, score, ms: Math.round(ms) }) });
      const d = await r.json();
      if (r.ok) setGlobal(d.scores);
      else setError(d.error ?? "Couldn't save to the global board.");
    } catch {
      setError("Couldn't reach the global board. Your score is saved here.");
    }
  };

  const board = tab === "local" ? local : global;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={headingId} className="game-over">
      <h2 id={headingId} className="font-display text-2xl font-semibold tracking-tight">
        Game over
      </h2>
      <p className="mt-1 text-muted">
        You scored <strong className="text-ink">{score}</strong>.
      </p>
      {!saved && score > 0 ? (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">
            Your initials
            <input
              autoFocus
              value={initials}
              onChange={(e) => setInitials(e.target.value.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase())}
              maxLength={3}
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-24 rounded-lg border border-line bg-paper px-3 text-center font-mono text-lg tracking-[0.3em] uppercase"
            />
          </label>
          <button type="submit" className="game-button game-button-primary">
            Save score
          </button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex gap-1 text-sm" role="tablist" aria-label="Leaderboards">
        {(["local", "global"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="game-tab">
            {t === "local" ? "This browser" : "Everyone"}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-2 min-h-28">
        {board === "unavailable" ? (
          <p className="text-sm text-muted">The global leaderboard isn&apos;t connected yet. Scores are saved in this browser.</p>
        ) : board === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : board.length ? (
          <ol className="grid gap-1 text-sm tabular-nums">
            {board.map((s, i) => (
              <li key={`${s.initials}-${s.score}-${i}`} className="flex justify-between gap-6 border-b border-line py-1 last:border-0">
                <span>
                  {i + 1}. <span className="font-mono">{s.initials}</span>
                </span>
                <span>{s.score}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">No scores yet. Be the first.</p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onAgain} className="game-button game-button-primary">
          Play again
        </button>
        <button type="button" onClick={onExit} className="game-button">
          Back to the site
        </button>
      </div>
    </div>
  );
}
