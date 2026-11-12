"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_FUN, getFun, lookActive, subscribeFun } from "@/lib/fun";
import { useFunMode } from "@/lib/unlocks";
import { reveal } from "@/components/easter-eggs";
import { sound } from "@/lib/fx";

const SLURPS = 5;

type Kind = "lime" | "basil" | "sprouts" | "jalapeno";
type Counts = Record<Kind, number>;

const TOPPINGS: { id: Kind; label: string; one: string; max: number }[] = [
  { id: "lime", label: "Limes", one: "a lime wedge", max: 3 },
  { id: "basil", label: "Thai basil", one: "a sprig of Thai basil", max: 5 },
  { id: "sprouts", label: "Bean sprouts", one: "some bean sprouts", max: 5 },
  { id: "jalapeno", label: "Jalapeños", one: "a jalapeño slice", max: 5 },
];
const EMPTY: Counts = { lime: 0, basil: 0, sprouts: 0, jalapeno: 0 };
const total = (c: Counts) => c.lime + c.basil + c.sprouts + c.jalapeno;
/** Auhbon's way: exactly 3 limes, every jalapeño and every basil sprig (sprouts don't matter). */
const isAuhbonsWay = (c: Counts) => c.lime === 3 && c.jalapeno === 5 && c.basil === 5;

/** Where each topping lands, as [x across the broth (-1 to 1), y below its surface, tilt]. Fixed so a bowl looks the same every time. */
const SPOTS: Record<Kind, [number, number, number][]> = {
  lime: [
    [0.62, 2, -10],
    [-0.7, 3, 14],
    [0.18, 6, 4],
  ],
  basil: [
    [-0.35, 2, -24],
    [0.38, 4, 30],
    [-0.05, 1, 70],
    [0.72, 6, -40],
    [-0.62, 6, 10],
  ],
  sprouts: [
    [0.05, 4, 8],
    [-0.48, 7, -12],
    [0.5, 8, 20],
    [-0.2, 9, -30],
    [0.3, 1, -4],
  ],
  jalapeno: [
    [-0.15, 5, 0],
    [0.42, 1, 0],
    [-0.55, 1, 0],
    [0.12, 9, 0],
    [0.75, 3, 0],
  ],
};

/** One topping, drawn around (0, 0). */
function Topping({ kind }: { kind: Kind }) {
  if (kind === "lime")
    return (
      <g>
        <path d="M-7 0a7 7 0 0 1 14 0z" fill="#a6d64b" stroke="#6c9a24" strokeWidth="1.4" />
        <path d="M0 0v-5.5M0 0l-4-3.6M0 0l4-3.6" stroke="#e9f5c6" strokeWidth="0.8" />
      </g>
    );
  if (kind === "basil")
    return (
      <g>
        <ellipse rx="6.5" ry="3.3" fill="#3f8f3a" />
        <path d="M-6 0h11" stroke="#7dbb5a" strokeWidth="0.8" />
      </g>
    );
  if (kind === "sprouts")
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M-8 2q7-7 15-2" stroke="#f6f1da" strokeWidth="2.2" />
        <path d="M-6 4q6-4 13 0" stroke="#efe8c8" strokeWidth="1.8" />
        <circle cx="7.5" cy="0" r="1.8" fill="#e3d47e" />
        <circle cx="7" cy="4" r="1.5" fill="#e3d47e" />
      </g>
    );
  return (
    <g>
      <circle r="4.6" fill="#3f8f2a" stroke="#285d18" strokeWidth="1" />
      <circle r="2.7" fill="#d9eeb0" />
      <circle cx="-0.9" cy="-0.6" r="0.6" fill="#f6f1da" />
      <circle cx="1" cy="0.4" r="0.6" fill="#f6f1da" />
      <circle cx="-0.2" cy="1.2" r="0.6" fill="#f6f1da" />
    </g>
  );
}

/** The bowl in the Pho theme's hero. Renders nothing in any other theme or in Boring mode. */
export function PhoBowl() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const mode = useFunMode();
  if (mode !== "fun" || lookActive(fun) !== "pho") return null;
  return <Bowl />;
}

function Bowl() {
  const [left, setLeft] = useState(SLURPS);
  const [counts, setCounts] = useState<Counts>(EMPTY);
  // Toppings in the order they went in (so each new one plops in on its own).
  const [order, setOrder] = useState<Kind[]>([]);
  const [status, setStatus] = useState("");
  const [drag, setDrag] = useState<{ kind: Kind; x: number; y: number; over: boolean } | null>(null);
  const bowlRef = useRef<HTMLButtonElement>(null);
  const press = useRef<{ kind: Kind; id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const add = (kind: Kind) => {
    const t = TOPPINGS.find((x) => x.id === kind)!;
    if (left === 0) {
      setStatus("The bowl's empty. Slurp it again for a fresh one.");
      return;
    }
    if (counts[kind] >= t.max) {
      setStatus(`That's all the ${t.label.toLowerCase()}.`);
      sound("pop");
      return;
    }
    const next = { ...counts, [kind]: counts[kind] + 1 };
    setCounts(next);
    setOrder((o) => [...o, kind]);
    sound("pop");
    setStatus(`Added ${t.one}. ${next[kind]} of ${t.max}.`);
    if (isAuhbonsWay(next)) reveal("auhbonsway", "Three limes, all the jalapeños, all the basil. Auhbon's way. 🌶️");
  };

  const fresh = () => {
    setLeft(SLURPS);
    setCounts(EMPTY);
    setOrder([]);
  };

  const slurp = () => {
    sound("pop");
    if (left === 0) {
      fresh();
      setStatus("A fresh bowl. Top it however you like.");
      return;
    }
    const next = left - 1;
    setLeft(next);
    if (next > 0) {
      setStatus(`Slurp! ${next} of ${SLURPS} slurps left.`);
      return;
    }
    // Finished. A plain bowl and a topped bowl are different secrets, so only one fires.
    if (total(counts) === 0) reveal("naturalist", "Just broth and noodles. A naturalist.");
    else reveal("cleanbowl", "Not a drop left.");
    setStatus("All gone. Press the bowl for a fresh one.");
  };

  // Dragging a topping from its plate to the bowl. A press without a drag is a click (adds one).
  const overBowl = (x: number, y: number) => {
    const r = bowlRef.current?.getBoundingClientRect();
    return !!r && x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 12 && y <= r.bottom + 12;
  };
  useEffect(() => {
    const p = press.current;
    if (!drag || !p) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== p.id) return;
      setDrag({ kind: p.kind, x: e.clientX, y: e.clientY, over: overBowl(e.clientX, e.clientY) });
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== p.id) return;
      if (overBowl(e.clientX, e.clientY)) add(p.kind);
      press.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  });

  const fill = left / SLURPS;
  const surface = 56 + (1 - fill) * 42;
  // Half-width of the broth at its surface (the bowl is half an ellipse, 68 wide and 52 deep).
  const half = 68 * Math.sqrt(Math.max(0, 1 - ((surface - 56) / 52) ** 2)) - 10;
  const seen: Counts = { ...EMPTY };

  return (
    <div className="pho-bowl-wrap mt-10 flex flex-wrap items-center gap-x-6 gap-y-4" data-pho>
      <button
        ref={bowlRef}
        type="button"
        onClick={slurp}
        data-pho-bowl
        data-left={left}
        data-toppings={`${counts.lime}-${counts.basil}-${counts.sprouts}-${counts.jalapeno}`}
        {...(drag?.over ? { "data-drop-target": "" } : {})}
        aria-label={left ? `Slurp the pho (${left} of ${SLURPS} slurps left)` : "Get a fresh bowl"}
        className="pho-bowl relative h-[9.75rem] w-52 shrink-0 rounded-xl hover:bg-surface"
      >
        {left ? <span aria-hidden="true" className="pho-steam" /> : null}
        <svg viewBox="0 0 160 120" aria-hidden="true" className="relative size-full overflow-visible">
          <clipPath id="pho-bowl-inside">
            <path d="M12 56h136a68 52 0 0 1-136 0z" />
          </clipPath>
          <g clipPath="url(#pho-bowl-inside)">
            <rect x="0" y={surface} width="160" height="70" fill="#d9822b" />
            {fill > 0.2 ? (
              <g fill="none" stroke="#f6e7c1" strokeWidth="2.5" strokeLinecap="round">
                <path d={`M36 ${surface + 8}q9-6 18 0t18 0 18 0 18 0`} />
                <path d={`M44 ${surface + 15}q9-6 18 0t18 0 18 0`} />
              </g>
            ) : null}
          </g>
          {left
            ? order.map((kind) => {
                const n = seen[kind]++;
                const [fx, dy, tilt] = SPOTS[kind][n];
                return (
                  <g key={`${kind}-${n}`} transform={`translate(${80 + fx * half} ${surface + dy}) rotate(${tilt}) scale(1.3)`}>
                    <g className="pho-topping" data-topping={kind}>
                      <Topping kind={kind} />
                    </g>
                  </g>
                );
              })
            : null}
          <path d="M12 56h136a68 52 0 0 1-136 0z" fill="none" stroke="#f4ede0" strokeWidth="4" />
          <path d="M12 56h136" stroke="#f4ede0" strokeWidth="5" strokeLinecap="round" />
          <path d="M52 110h56" stroke="#f4ede0" strokeWidth="5" strokeLinecap="round" />
          {/* chopsticks resting on the rim */}
          <path d="M88 54L146 8M97 55l52-42" stroke="#a0683a" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="min-w-0">
        <ul className="flex flex-wrap gap-3" aria-label="Side plates">
          {TOPPINGS.map((t) => {
            const have = counts[t.id];
            const remaining = t.max - have;
            const done = remaining === 0 || left === 0;
            return (
              <li key={t.id} className="grid justify-items-center gap-1">
                <button
                  type="button"
                  data-plate={t.id}
                  aria-disabled={done}
                  aria-label={`Add ${t.one} to the bowl (${have} of ${t.max} added)`}
                  onPointerDown={(e) => {
                    if (done || e.button !== 0) return;
                    press.current = { kind: t.id, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
                  }}
                  onPointerMove={(e) => {
                    const p = press.current;
                    if (!p || p.kind !== t.id || p.moved || e.pointerId !== p.id) return;
                    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
                    p.moved = true;
                    suppressClick.current = true;
                    setDrag({ kind: t.id, x: e.clientX, y: e.clientY, over: false });
                  }}
                  onPointerUp={() => {
                    if (!press.current?.moved) press.current = null;
                  }}
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    add(t.id);
                  }}
                  className="pho-plate"
                >
                  <svg viewBox="-20 -20 40 40" aria-hidden="true">
                    {Array.from({ length: remaining }, (_, i) => {
                      const a = (i / t.max) * Math.PI * 2 - Math.PI / 2;
                      const r = t.max === 1 ? 0 : 8;
                      return (
                        <g key={i} transform={`translate(${Math.cos(a) * r} ${Math.sin(a) * r}) rotate(${(i * 47) % 360})`}>
                          <Topping kind={t.id} />
                        </g>
                      );
                    })}
                  </svg>
                </button>
                <span className="text-xs text-muted tabular-nums" aria-hidden="true">
                  {t.label} {have}/{t.max}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <p aria-live="polite" className="min-h-5">
            {status || "Drag toppings onto the bowl (or tap a plate), then tap the bowl to slurp."}
          </p>
          {total(counts) || left < SLURPS ? (
            <button
              type="button"
              onClick={() => {
                fresh();
                setStatus("A fresh bowl. Top it however you like.");
              }}
              className="min-h-10 underline underline-offset-4 hover:text-ink"
            >
              Fresh bowl
            </button>
          ) : null}
        </div>
      </div>

      {drag ? (
        <Ghost x={drag.x} y={drag.y}>
          <Topping kind={drag.kind} />
        </Ghost>
      ) : null}
    </div>
  );
}

function Ghost({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true" className="pho-ghost" style={{ left: x, top: y }}>
      {children}
    </svg>
  );
}
