"use client";

import { useState, useSyncExternalStore } from "react";
import { Switch, LockIcon } from "@/components/panel-bits";
import { DEFAULT_FUN, getFun, subscribeFun } from "@/lib/fun";
import { isUnlocked, lockText, setExtraVisible, UNLOCKS, useExtraVisible, useFunMode, useUnlocked } from "@/lib/unlocks";
import { setWildMode, setWildOn, useWild, WILD_MODES } from "@/lib/wild/store";
import { sound } from "@/lib/fx";

/**
 * Wild & Wondrous, a Bells & whistles category: page-wide modes, one at a
 * time. It appears once its first mode (Monkey Mode) is unlocked.
 */
export function WildRow() {
  const fun = useFunMode() === "fun";
  const open = useUnlocked("wild:monkeys");
  const wild = useWild();
  const state = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const [note, setNote] = useState("");
  if (!fun || !open) return null;
  const current = WILD_MODES.find((m) => m.id === wild.mode)!;
  const on = wild.on && isUnlocked(current.unlock, state);
  return (
    <div className="rounded-lg py-2" data-wild-section>
      <Switch
        label="Wild & Wondrous"
        description={on ? current.description : "Page-wide mischief, one mode at a time. The page always goes back to normal"}
        checked={on}
        onChange={() => {
          setWildOn(!on);
          sound("toggle");
        }}
      />
      {on ? (
        <div role="radiogroup" aria-label="Wild & Wondrous mode" data-count={WILD_MODES.length} className="style-picker mt-2">
          {WILD_MODES.map((m) => {
            const locked = !isUnlocked(m.unlock, state);
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={wild.mode === m.id}
                aria-disabled={locked || undefined}
                aria-label={locked ? `${m.label}, locked. ${lockText(m.unlock, state)}.` : m.label}
                title={locked ? lockText(m.unlock, state) : m.description}
                data-wild-option={m.id}
                data-locked={locked || undefined}
                onClick={() => {
                  if (locked) return setNote(`${m.label}: ${lockText(m.unlock, state).toLowerCase()} to unlock it.`);
                  setNote("");
                  setWildMode(m.id);
                  sound("toggle");
                }}
                className={`flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-md border px-1.5 text-sm leading-tight aria-checked:border-kelp aria-checked:bg-kelp aria-checked:text-kelp-ink ${locked ? "locked-option border-dashed border-line text-muted" : "border-line"}`}
              >
                {locked ? <LockIcon /> : null}
                {m.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <p aria-live="polite" className="mt-1 text-sm text-muted empty:hidden">
        {note}
      </p>
    </div>
  );
}

const DESCRIPTIONS: Record<string, string> = {
  "toy:box": "The box of toys at the bottom right",
  "extra:portal": "The portal device in Education, and its test chambers",
};

/** Ids that get a show/hide switch: the toy box, and every extra. */
const TOGGLEABLE = UNLOCKS.filter((u) => u.kind === "extra" || u.id === "toy:box");

/**
 * "Unlocked toys, features, & elements": declutter (or reclutter) the page.
 * One switch for every toy box or extra that's unlocked, listed automatically
 * from UNLOCKS. Hiding never locks anything.
 */
export function ExtrasSection() {
  const fun = useFunMode() === "fun";
  const ids = useSyncExternalStore(
    subscribeFun,
    () => TOGGLEABLE.filter((u) => isUnlocked(u.id)).map((u) => u.id).join(","),
    () => "",
  );
  if (!fun || !ids) return null;
  return (
    <fieldset className="mt-4" data-extras-section>
      <legend className="text-sm text-muted">Unlocked toys, features, &amp; elements</legend>
      <div className="mt-1 space-y-1 rounded-lg border border-line px-3 py-1">
        {ids.split(",").map((id) => (
          <ExtraRow key={id} id={id} />
        ))}
      </div>
    </fieldset>
  );
}

function ExtraRow({ id }: { id: string }) {
  const shown = useExtraVisible(id);
  const def = UNLOCKS.find((u) => u.id === id)!;
  return (
    <Switch
      label={def.label}
      description={DESCRIPTIONS[id] ?? (shown ? "Showing on the page" : "Hidden for now")}
      checked={shown}
      onChange={() => {
        setExtraVisible(id, !shown);
        sound("toggle");
      }}
      className="py-1.5 text-sm"
    />
  );
}
