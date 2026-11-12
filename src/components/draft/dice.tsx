"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { DiceTray, d6, type Mark } from "@/lib/draft/dice-physics";
import { revealDraft } from "@/lib/draft/store";
import { prefersReducedMotion } from "@/lib/events";
import { sound } from "@/lib/fx";

type GameId = "push" | "pig" | "free";
const GAMES: { id: GameId; label: string }[] = [
  { id: "push", label: "Push your luck" },
  { id: "pig", label: "Pig" },
  { id: "free", label: "Free roll" },
];
const noSubscribe = () => () => {};

/**
 * Board games theme (draft): a felt dice tray with real-feeling dice (drag
 * one and let go to throw it), and a little panel to switch between dice
 * games: Auhbon's Push your luck, Pig against the house, and a free roll.
 */
export function BoardGames() {
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);
  const [tray] = useState(() => new DiceTray());
  const [game, setGame] = useState<GameId>("push");
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState("");
  const tabsId = useId();

  useEffect(() => {
    tray.setReduced(reduced);
  }, [tray, reduced]);

  // The tray: sized to its box, stepped and drawn every frame while anything moves.
  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    const fit = () => {
      const w = box.current!.clientWidth;
      const h = w < 420 ? 170 : 210;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = w * dpr;
      el.height = h * dpr;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tray.resize(w, h);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box.current!);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const f = Math.min(3, (now - last) / 16.67);
      last = now;
      tray.step(f);
      tray.draw(ctx);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [tray]);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <div className="draft-boardgames mt-10 rounded-xl border border-line bg-surface p-3 sm:p-4" data-boardgames>
      <div role="tablist" aria-label="Dice games" className="flex flex-wrap gap-1.5" id={tabsId}>
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={game === g.id}
            data-dice-game={g.id}
            onClick={() => {
              setGame(g.id);
              sound("toggle");
            }}
            className="min-h-10 rounded-full border border-line px-3 text-sm font-medium aria-selected:border-kelp aria-selected:bg-kelp aria-selected:text-kelp-ink"
          >
            {g.label}
          </button>
        ))}
      </div>
      <div ref={box} className="draft-tray mt-3 overflow-hidden rounded-lg">
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Dice tray. ${summary || "No dice yet."}`}
          data-dice-tray
          className="block w-full touch-none"
          onPointerDown={(e) => {
            const [x, y] = point(e);
            if (tray.down(x, y)) e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const [x, y] = point(e);
            tray.move(x, y);
          }}
          onPointerUp={() => tray.up()}
          onPointerCancel={() => tray.up()}
        />
      </div>
      <div className="mt-3" role="tabpanel" aria-label={GAMES.find((g) => g.id === game)!.label}>
        {game === "push" ? <PushYourLuck key="push" tray={tray} onSummary={setSummary} /> : null}
        {game === "pig" ? <Pig key="pig" tray={tray} onSummary={setSummary} /> : null}
        {game === "free" ? <FreeRoll key="free" tray={tray} onSummary={setSummary} /> : null}
      </div>
    </div>
  );
}

type GameProps = { tray: DiceTray; onSummary: (s: string) => void };

const btn = "min-h-11 rounded-lg border border-line px-3 text-sm font-medium hover:border-ink/40 disabled:opacity-50";
const primary = "min-h-11 rounded-lg border border-kelp bg-kelp px-3 text-sm font-medium text-kelp-ink hover:opacity-90 disabled:opacity-50";

// ------------------------------------------------------------ Push your luck

/**
 * Auhbon's push-your-luck: five dice and a limit. Get as close to the limit
 * as you can without going over. To reroll dice you have to spend one (it
 * leaves the game), so every reroll costs you something.
 */
function PushYourLuck({ tray, onSummary }: GameProps) {
  const [limit, setLimit] = useState(() => 16 + Math.floor(Math.random() * 9));
  const [dice, setDice] = useState<{ id: number; value: number }[]>([]);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [phase, setPhase] = useState<"start" | "rolling" | "choose" | "done">("start");
  const [spent, setSpent] = useState(0);
  const [result, setResult] = useState("");
  const [best, setBest] = useState(0);

  const total = dice.reduce((n, d) => n + d.value, 0);

  useEffect(() => {
    tray.set([3, 5, 2, 6, 4]);
    tray.configure({
      onSettled: (values) => {
        setDice(values);
        setPhase("choose");
        sound("pop");
      },
    });
  }, [tray]);

  useEffect(() => {
    tray.setMarks(new Map(Object.entries(marks).map(([k, v]) => [Number(k), v])));
    onSummary(dice.length ? `Dice: ${dice.map((d) => d.value).join(", ")}. Total ${total}.` : "");
  }, [tray, marks, dice, total, onSummary]);

  const start = () => {
    const next = 16 + Math.floor(Math.random() * 9);
    setLimit(next);
    setMarks({});
    setSpent(0);
    setResult("");
    tray.set([1, 1, 1, 1, 1]);
    setPhase("rolling");
    tray.throw([0, 1, 2, 3, 4]);
    sound("pop");
  };

  const cycle = (id: number) => {
    setMarks((m) => {
      const cur = m[id] ?? null;
      const next: Mark = cur === null ? "reroll" : cur === "reroll" ? "spend" : null;
      const out = { ...m, [id]: next };
      // Only one die can be spent per reroll.
      if (next === "spend") for (const k of Object.keys(out)) if (Number(k) !== id && out[Number(k)] === "spend") out[Number(k)] = null;
      return out;
    });
  };

  const toSpend = Object.entries(marks).find(([, v]) => v === "spend")?.[0];
  const toReroll = Object.entries(marks)
    .filter(([, v]) => v === "reroll")
    .map(([k]) => Number(k));
  const canReroll = phase === "choose" && toSpend !== undefined && toReroll.length > 0;

  const reroll = () => {
    if (!canReroll) return;
    const id = Number(toSpend);
    tray.remove(id);
    setDice((d) => d.filter((x) => x.id !== id));
    setSpent((n) => n + 1);
    setMarks({});
    setPhase("rolling");
    tray.throw(toReroll);
    sound("pop");
  };

  const stand = () => {
    setPhase("done");
    setMarks({});
    if (total > limit) {
      setResult(`Bust! ${total} is over ${limit}. Score: 0.`);
      sound("hit");
      return;
    }
    setBest((b) => Math.max(b, total));
    if (total === limit) {
      setResult(`Bullseye! Exactly ${limit}.`);
      revealDraft("d-bullseye", "Bullseye!");
      if (spent <= 1) revealDraft("d-thrifty", "Waste not: right on the limit, hardly a die spent.");
    } else setResult(`You stood on ${total}, ${limit - total} under the limit. Score: ${total}.`);
    sound("secret");
  };

  return (
    <div data-push data-phase={phase} data-total={total} data-limit={limit}>
      <p className="text-sm text-muted">
        Get as close to <strong className="text-ink">{limit}</strong> as you can without going over. To reroll dice, spend one: it leaves the game. Stand when
        you&apos;re happy.
      </p>
      {dice.length && phase !== "start" ? (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Your dice">
          {dice.map((d) => {
            const m = marks[d.id] ?? null;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={phase !== "choose"}
                  data-die={d.id}
                  data-mark={m ?? "keep"}
                  aria-label={`Die showing ${d.value}: ${m === "reroll" ? "reroll" : m === "spend" ? "spend" : "keep"}. Press to change.`}
                  onClick={() => cycle(d.id)}
                  className={`min-h-11 min-w-16 rounded-lg border px-2 text-sm tabular-nums ${m === "reroll" ? "border-kelp" : m === "spend" ? "border-dashed border-muted line-through" : "border-line"}`}
                >
                  <span className="font-semibold">{d.value}</span>{" "}
                  <span className="text-muted">{m === "reroll" ? "reroll" : m === "spend" ? "spend" : "keep"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {phase === "start" || phase === "done" ? (
          <button type="button" className={primary} onClick={start} data-push-start>
            {phase === "start" ? "Roll five dice" : "New round"}
          </button>
        ) : (
          <>
            <button type="button" className={btn} onClick={reroll} disabled={!canReroll} data-push-reroll>
              Spend one, reroll {toReroll.length || ""}
            </button>
            <button type="button" className={primary} onClick={stand} disabled={phase !== "choose"} data-push-stand>
              Stand on {total}
            </button>
          </>
        )}
        <p className="text-sm tabular-nums" aria-live="polite">
          {result ||
            (phase === "choose" ? `Total ${total} of ${limit}. Tap a die to mark it reroll, tap again to spend it.` : phase === "rolling" ? "Rolling…" : "")}
          {best ? <span className="ml-2 text-muted">Best {best}</span> : null}
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Pig

const PIG_GOAL = 50;
const HOUSE_HOLDS = 15;

/** Pig: roll to build a turn total, hold to bank it; a 1 loses the turn. First to 50 beats the house. */
function Pig({ tray, onSummary }: GameProps) {
  const [you, setYou] = useState(0);
  const [house, setHouse] = useState(0);
  const [turn, setTurn] = useState(0);
  const [who, setWho] = useState<"you" | "house" | "over">("you");
  const [rolling, setRolling] = useState(false);
  const [note, setNote] = useState("Roll as often as you like. Hold to bank this turn's points. Roll a 1 and you lose them.");
  // The latest state, for the settle callback and the house's turns.
  const s = useRef({ you, house, turn, who });
  useEffect(() => {
    s.current = { you, house, turn, who };
  }, [you, house, turn, who]);

  useEffect(() => {
    tray.set([4]);
    tray.configure({
      canThrow: () => s.current.who === "you",
      onThrow: () => setRolling(true),
      onSettled: ([d]) => {
        setRolling(false);
        const { who: w, turn: t, house: h } = s.current;
        if (!d) return;
        sound(d.value === 1 ? "hit" : "pop");
        if (w === "you") {
          if (d.value === 1) {
            setTurn(0);
            setWho("house");
            setNote("A 1! You lose this turn's points. The house's turn.");
          } else {
            setTurn(t + d.value);
            setNote(`You rolled ${d.value}. Turn total ${t + d.value}.`);
          }
        } else if (w === "house") {
          if (d.value === 1) {
            setTurn(0);
            setWho("you");
            setNote("The house rolled a 1. Your turn.");
          } else {
            const nt = t + d.value;
            if (nt >= HOUSE_HOLDS || h + nt >= PIG_GOAL) {
              const banked = h + nt;
              setHouse(banked);
              setTurn(0);
              if (banked >= PIG_GOAL) {
                setWho("over");
                setNote(`The house wins, ${banked} to ${s.current.you}.`);
              } else {
                setWho("you");
                setNote(`The house holds on ${nt}. Your turn.`);
              }
            } else {
              setTurn(nt);
              setNote(`The house rolled ${d.value}. Turn total ${nt}.`);
            }
          }
        }
      },
    });
  }, [tray]);

  // The house plays its turn one roll at a time.
  useEffect(() => {
    if (who !== "house" || rolling) return;
    const id = window.setTimeout(() => {
      setRolling(true);
      tray.throw([0]);
    }, 900);
    return () => window.clearTimeout(id);
  }, [who, rolling, turn, tray]);

  useEffect(() => {
    onSummary(`Pig. You ${you}, the house ${house}.`);
  }, [you, house, onSummary]);

  const roll = () => {
    setRolling(true);
    tray.throw([0]);
  };
  const hold = () => {
    const banked = you + turn;
    setYou(banked);
    setTurn(0);
    sound("pop");
    if (banked >= PIG_GOAL) {
      setWho("over");
      setNote(`You win, ${banked} to ${house}!`);
      revealDraft("d-pig", "Hog wild! You beat the house.");
    } else {
      setWho("house");
      setNote(`You banked ${turn}. The house's turn.`);
    }
  };
  const again = () => {
    setYou(0);
    setHouse(0);
    setTurn(0);
    setWho("you");
    setNote("New game. Your roll.");
  };

  return (
    <div data-pig data-who={who}>
      <p className="text-sm text-muted">First to {PIG_GOAL} wins. Drag the die and let go to throw it, or press Roll.</p>
      <p className="mt-2 flex flex-wrap gap-x-5 text-sm tabular-nums">
        <span>
          You <strong data-pig-you>{you}</strong>
        </span>
        <span>
          House <strong data-pig-house>{house}</strong>
        </span>
        <span className="text-muted">
          This turn <strong className="text-ink">{turn}</strong>
        </span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {who === "over" ? (
          <button type="button" className={primary} onClick={again}>
            Play again
          </button>
        ) : (
          <>
            <button type="button" className={primary} onClick={roll} disabled={who !== "you" || rolling} data-pig-roll>
              Roll
            </button>
            <button type="button" className={btn} onClick={hold} disabled={who !== "you" || rolling || turn === 0} data-pig-hold>
              Hold {turn ? turn : ""}
            </button>
          </>
        )}
        <p className="text-sm" aria-live="polite">
          {note}
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Free roll

/** Two dice, no rules. Snake eyes and three doubles in a row are draft secrets. */
function FreeRoll({ tray, onSummary }: GameProps) {
  const [message, setMessage] = useState("Throw the dice: drag one and let go, or press Roll.");
  const [streak, setStreak] = useState(0);
  const streakRef = useRef(0);

  useEffect(() => {
    tray.set([d6(), d6()]);
    tray.configure({
      canThrow: () => true,
      onSettled: (values, thrown) => {
        if (!thrown.length) return;
        const [a, b] = values.map((v) => v.value);
        const doubles = a === b;
        const next = doubles ? streakRef.current + 1 : 0;
        streakRef.current = next === 3 ? 0 : next;
        setStreak(streakRef.current);
        sound("pop");
        let note = doubles ? ` Doubles! ${next} in a row.` : "";
        if (a === 1 && b === 1) {
          note = " Snake eyes!";
          revealDraft("d-snake", "Snake eyes.");
        }
        if (next === 3) revealDraft("d-hot", "Three doubles in a row. Hot dice!");
        setMessage(`Rolled ${a} and ${b}.${note}`);
        onSummary(`Showing ${a} and ${b}.`);
      },
    });
  }, [tray, onSummary]);

  return (
    <div className="flex flex-wrap items-center gap-2" data-free>
      <button type="button" className={primary} onClick={() => tray.throw([0, 1])} data-dice-roll>
        Roll
      </button>
      <p id="draft-dice-result" aria-live="polite" className="text-sm text-muted">
        {message}
        {streak > 0 ? <span className="ml-2 font-medium text-ink">Streak: {streak}</span> : null}
      </p>
    </div>
  );
}
