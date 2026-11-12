"use client";

import { useId, useState } from "react";
import { liveSecretCount, MILESTONES, SECRET_GOAL, scaledMilestones, scaledThreshold } from "@/lib/fun";
import { UNLOCK_KINDS, UNLOCKS, type UnlockKind } from "@/lib/unlocks";

const MIN = 10;
const pct = (v: number, max: number) => `${(v / max) * 100}%`;

/** Readable ticks for an axis from 0 to max (always including max). */
function ticks(max: number) {
  const step = max <= 20 ? 2 : max <= 50 ? 5 : 10;
  const out: number[] = [];
  for (let v = 0; v < max; v += step) if (max - v >= step / 2) out.push(v);
  return [...out, max];
}

/** Kind styles: shape plus shade, so kinds never depend on color alone. */
const KIND_STYLE: Record<UnlockKind, { shape: string; className: string }> = {
  effect: { shape: "rounded-full", className: "bg-kelp" },
  theme: { shape: "rounded-[1px]", className: "bg-ink" },
  game: { shape: "rounded-[1px] rotate-45", className: "bg-kelp ring-2 ring-ink" },
  wild: { shape: "rounded-full", className: "border-2 border-kelp bg-paper" },
  toy: { shape: "rounded-[1px]", className: "border-2 border-ink bg-paper" },
  extra: { shape: "rounded-full", className: "bg-muted" },
};

function Axis({ max, label, side }: { max: number; label: string; side: "top" | "bottom" }) {
  return (
    <div className="relative h-0">
      <div className="absolute inset-x-0 border-t-2 border-ink" />
      {ticks(max).map((t) => (
        <span key={t} className="absolute" style={{ left: pct(t, max) }}>
          <span className={`absolute h-2 w-px -translate-x-1/2 bg-ink ${side === "top" ? "-top-2" : "top-0"}`} />
          <span className={`absolute -translate-x-1/2 text-[11px] text-muted tabular-nums ${side === "top" ? "-top-6" : "top-2"}`}>{t}</span>
        </span>
      ))}
      <span className={`absolute right-full mr-3 text-xs font-medium whitespace-nowrap text-muted max-sm:hidden ${side === "top" ? "-top-2.5" : "-top-2"}`}>{label}</span>
    </div>
  );
}

/** Lines from each 100-scale value (top) to its scaled value (bottom). */
function Connectors({ pairs, height, max, faint }: { pairs: [number, number][]; height: number; max: number; faint?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }}>
      {pairs.map(([a, b], i) => (
        <line
          key={i}
          x1={(a / SECRET_GOAL) * 100}
          y1={0}
          x2={(b / max) * 100}
          y2={height}
          stroke={faint ? "var(--muted)" : "var(--kelp)"}
          strokeOpacity={faint ? 0.45 : 0.9}
          strokeWidth={faint ? 1 : 1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

/**
 * The scaling explorer on /dev/milestones: pick how many secrets exist and see
 * where every milestone celebration and unlock threshold lands, against its
 * 100-scale value, with today's count marked.
 */
export function MilestonesWidget() {
  const today = liveSecretCount();
  const [n, setN] = useState(Math.max(MIN, Math.min(SECRET_GOAL, today)));
  const sliderId = useId();
  const listId = useId();
  const ms = scaledMilestones(n);
  const msToday = scaledMilestones(today);

  // Unlocks that go by count, stacked where several share a value.
  const counted = UNLOCKS.filter((u) => !(u.secret && u.at === 0));
  const stack = (vals: number[]) => {
    const seen = new Map<number, number>();
    return vals.map((v) => {
      const k = seen.get(v) ?? 0;
      seen.set(v, k + 1);
      return k;
    });
  };
  const topStack = stack(counted.map((u) => u.at));
  const bottomStack = stack(counted.map((u) => scaledThreshold(u.at, n)));
  const depth = Math.max(1, ...topStack.map((k) => k + 1), ...bottomStack.map((k) => k + 1));
  const usedKinds = UNLOCK_KINDS.filter((k) => counted.some((u) => u.kind === k.id));

  return (
    <div>
      {/* The control */}
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label htmlFor={sliderId} className="font-medium">
            Total secrets implemented
          </label>
          <output htmlFor={sliderId} className="font-display text-4xl font-bold tracking-tight tabular-nums" aria-live="polite">
            {n}
          </output>
        </div>
        <div className="relative mt-3">
          <input
            id={sliderId}
            type="range"
            min={MIN}
            max={SECRET_GOAL}
            value={n}
            list={listId}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-full accent-[var(--kelp)]"
            aria-describedby={`${sliderId}-today`}
          />
          <datalist id={listId}>
            <option value={today} label="Today" />
          </datalist>
          {today >= MIN ? (
            <span aria-hidden="true" className="pointer-events-none absolute top-full text-[11px] font-medium text-kelp" style={{ left: `calc(${((today - MIN) / (SECRET_GOAL - MIN)) * 100}% + ${8 - ((today - MIN) / (SECRET_GOAL - MIN)) * 16}px)` }}>
              <span className="block -translate-x-1/2">▲ today</span>
            </span>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span id={`${sliderId}-today`} className="text-muted">
            Today: {today} live secrets.
          </span>
          {[today, 50, 75, 100].map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setN(Math.max(MIN, v))}
              aria-pressed={n === v}
              className="min-h-9 rounded-full border border-line px-3 tabular-nums hover:border-ink/40 aria-pressed:border-kelp aria-pressed:bg-kelp aria-pressed:text-kelp-ink"
            >
              {v === today ? `Today (${today})` : v}
            </button>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <h3 className="mt-10 font-display text-lg font-semibold tracking-tight">Milestone celebrations</h3>
      <p className="mt-1 max-w-prose text-sm text-muted">Top: the 100-scale value. Bottom: where it lands with {n} secrets (the last always lands on {n}).</p>
      <div aria-hidden="true" className="mt-4 px-3 sm:pl-24">
        <div className="relative h-8">
          {MILESTONES.map((m) => (
            <span key={m.at} className="absolute bottom-1 -translate-x-1/2 text-lg leading-none" style={{ left: pct(m.at, SECRET_GOAL) }} title={`${m.name}: ${m.at}`}>
              {m.icon}
            </span>
          ))}
        </div>
        <div className="relative">
          <Axis max={SECRET_GOAL} label="100 scale" side="top" />
          {/* Today's count on the goal ruler */}
          <span className="absolute -top-9 h-12 border-l-2 border-dashed border-kelp" style={{ left: pct(today, SECRET_GOAL) }}>
            <span className="absolute -top-4 left-1 text-[11px] font-semibold whitespace-nowrap text-kelp">today: {today}</span>
          </span>
        </div>
        <Connectors pairs={ms.map((m) => [m.at, m.count])} height={90} max={n} />
        <Axis max={n} label={`${n} secrets`} side="bottom" />
        <div className="relative mt-7 h-8">
          {ms.map((m) => (
            <span key={m.at} className="absolute top-0 -translate-x-1/2 text-lg leading-none" style={{ left: pct(m.count, n) }} title={`${m.name}: ${m.count}`}>
              {m.icon}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left text-[0.95rem]">
          <caption className="sr-only">Milestones: 100-scale value, value with {n} secrets, and today&apos;s value</caption>
          <thead>
            <tr className="text-sm text-muted">
              <th scope="col" className="border-b border-line py-2 pr-4 font-semibold">Milestone</th>
              <th scope="col" className="border-b border-line py-2 pr-4 font-semibold">100 scale</th>
              <th scope="col" className="border-b border-line py-2 pr-4 font-semibold">With {n}</th>
              <th scope="col" className="border-b border-line py-2 font-semibold">Today ({today})</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {ms.map((m, i) => (
              <tr key={m.at}>
                <th scope="row" className="border-b border-line py-2 pr-4 font-medium">
                  <span aria-hidden="true">{m.icon}</span> {m.name}
                </th>
                <td className="border-b border-line py-2 pr-4 text-muted">{m.at}</td>
                <td className="border-b border-line py-2 pr-4 font-semibold">{m.count}</td>
                <td className="border-b border-line py-2">{msToday[i].count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unlocks */}
      <h3 className="mt-12 font-display text-lg font-semibold tracking-tight">Unlock thresholds</h3>
      <p className="mt-1 max-w-prose text-sm text-muted">
        Every fun feature that unlocks by count ({counted.length}), stacked where several share a value. Features unlocked by one particular secret aren&apos;t
        shown.
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legend">
        {usedKinds.map((k) => (
          <li key={k.id} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`inline-block size-2.5 ${KIND_STYLE[k.id].shape} ${KIND_STYLE[k.id].className}`} />
            {k.label}
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="mt-4 px-3 sm:pl-24">
        <div className="relative" style={{ height: depth * 9 + 6 }}>
          {counted.map((u, i) => (
            <span
              key={u.id}
              title={`${u.label}: ${u.at}`}
              className={`absolute size-[7px] -translate-x-1/2 ${KIND_STYLE[u.kind].shape} ${KIND_STYLE[u.kind].className}`}
              style={{ left: pct(u.at, SECRET_GOAL), bottom: 4 + topStack[i] * 9 }}
            />
          ))}
        </div>
        <Axis max={SECRET_GOAL} label="100 scale" side="top" />
        <Connectors pairs={[...new Set(counted.map((u) => u.at))].map((a) => [a, scaledThreshold(a, n)])} height={70} max={n} faint />
        <Axis max={n} label={`${n} secrets`} side="bottom" />
        <div className="relative mt-7" style={{ height: depth * 9 + 6 }}>
          {counted.map((u, i) => (
            <span
              key={u.id}
              title={`${u.label}: ${scaledThreshold(u.at, n)}`}
              className={`absolute size-[7px] -translate-x-1/2 ${KIND_STYLE[u.kind].shape} ${KIND_STYLE[u.kind].className}`}
              style={{ left: pct(scaledThreshold(u.at, n), n), top: bottomStack[i] * 9 }}
            />
          ))}
        </div>
      </div>

      <details className="group mt-4 rounded-lg border border-line bg-surface px-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-kelp underline decoration-1 underline-offset-[0.2em]">
          <span className="group-open:hidden">Show every threshold</span>
          <span className="hidden group-open:inline">Hide every threshold</span>
        </summary>
        <div className="overflow-x-auto pb-3">
          <table className="w-full min-w-[30rem] border-collapse text-left text-[0.95rem]">
            <caption className="sr-only">Unlock thresholds: 100-scale value, value with {n} secrets, and today&apos;s value</caption>
            <thead>
              <tr className="text-sm text-muted">
                <th scope="col" className="border-b border-line py-2 pr-4 font-semibold">Fun feature</th>
                <th scope="col" className="border-b border-line py-2 pr-4 font-semibold">100 scale</th>
                <th scope="col" className="border-b border-line py-2 pr-4 font-semibold">With {n}</th>
                <th scope="col" className="border-b border-line py-2 font-semibold">Today ({today})</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {counted.map((u) => (
                <tr key={u.id}>
                  <th scope="row" className="border-b border-line py-1.5 pr-4 font-normal">
                    {u.label}
                  </th>
                  <td className="border-b border-line py-1.5 pr-4 text-muted">{u.at}</td>
                  <td className="border-b border-line py-1.5 pr-4 font-semibold">{scaledThreshold(u.at, n)}</td>
                  <td className="border-b border-line py-1.5">{scaledThreshold(u.at, today)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
