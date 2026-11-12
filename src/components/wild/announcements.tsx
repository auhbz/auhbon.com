"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { CELEBRATE_EVENT, PARADE_END_EVENT } from "@/components/celebrations";
import { markSeen, useWild } from "@/lib/wild/store";
import { unlockDef, unlockedBySecrets, useExtraVisible, useFunMode } from "@/lib/unlocks";
import { DEFAULT_FUN, getFun, subscribeFun } from "@/lib/fun";
import { prefersReducedMotion } from "@/lib/events";
import { sound } from "@/lib/fx";

type Note = "wild" | "toy:box" | "extra:portal";

const NOTES: Record<Exclude<Note, "wild">, { title: string; text: string }> = {
  "toy:box": {
    title: "You found a toy box!",
    text: "It's at the bottom right. Open it to pull toys out, and put them back when you're done. You can hide it any time in Bells & whistles, under “Unlocked toys, features, & elements”.",
  },
  "extra:portal": {
    title: "A portal device appeared",
    text: "It's tucked into Education. Pick it up for three little test chambers. Don't want it around? Hide it in Bells & whistles, under “Unlocked toys, features, & elements”.",
  },
};

const openPanel = () => {
  const p = document.getElementById("bells-panel");
  try {
    p?.showPopover();
  } catch {
    // Already open.
  }
};

/**
 * One-time "you unlocked something" moments, one at a time:
 * - Wild & Wondrous: after the animal parade walks off, one monkey from it
 *   comes back on screen to announce the new category. (If the parade already
 *   happened, it shows the first time the category is available.)
 * - The toy box and the portal device appear on their own, with a note that
 *   says they can be hidden.
 * Never during a milestone party, and never more than one at once.
 */
export function Announcements() {
  const fun = useFunMode() === "fun";
  const wild = useWild();
  // Only unlocks earned with secrets get a moment: a cheat is a deliberate choice, no surprise needed.
  const state = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const earned = (id: string) => unlockedBySecrets(unlockDef(id)!, state);
  const wildOpen = earned("wild:monkeys");
  const box = useExtraVisible("toy:box") && earned("toy:box");
  const portal = useExtraVisible("extra:portal") && earned("extra:portal");
  const [active, setActive] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const pending: Note | null = !fun
    ? null
    : wildOpen && !wild.seen.includes("wild")
      ? "wild"
      : box && !wild.seen.includes("toy:box")
        ? "toy:box"
        : portal && !wild.seen.includes("extra:portal")
          ? "extra:portal"
          : null;

  // Milestone parties come first: wait for the parade to finish.
  useEffect(() => {
    let timer = 0;
    const onCelebrate = () => {
      setBusy(true);
      window.clearTimeout(timer);
      // Reduced motion has no parade (just a toast); otherwise wait for it, with a safety net.
      timer = window.setTimeout(() => setBusy(false), prefersReducedMotion() ? 3500 : 16000);
    };
    const onParadeEnd = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setBusy(false), 500);
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    window.addEventListener(PARADE_END_EVENT, onParadeEnd);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      window.removeEventListener(PARADE_END_EVENT, onParadeEnd);
      window.clearTimeout(timer);
    };
  }, []);

  // A short grace period first, so a milestone party that's about to start goes first.
  useEffect(() => {
    if (active || busy || !pending) return;
    const t = window.setTimeout(() => {
      setActive(pending);
      markSeen(pending);
      sound("secret");
    }, 2200);
    return () => window.clearTimeout(t);
  }, [active, busy, pending]);

  const done = useCallback(() => setActive(null), []);
  if (!active || !fun) return null;
  return active === "wild" ? <MonkeyHerald onDone={done} /> : <UnlockNote note={NOTES[active]} onDone={done} />;
}

function MonkeyHerald({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), 9000);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDone, prefersReducedMotion() ? 0 : 1300);
    return () => window.clearTimeout(t);
  }, [leaving, onDone]);
  return (
    <section aria-label="New in Bells & whistles" data-wild-ui data-wild-herald={leaving ? "leaving" : "here"} className="wild-herald">
      <p role="status" className="sr-only">
        Wild &amp; Wondrous unlocked! Try Monkey Mode in Bells &amp; whistles.
      </p>
      <span aria-hidden="true" className="wild-herald-monkey">
        <span className="wild-herald-hop">🐒</span>
      </span>
      <div className="wild-herald-bubble rounded-2xl border border-line bg-surface px-4 py-3 text-ink shadow-xl">
        <p aria-hidden="true" className="font-display text-lg font-bold tracking-tight">
          Wild &amp; Wondrous unlocked!!!!
        </p>
        <p className="mt-0.5 text-sm text-muted">Try Monkey Mode in Bells &amp; whistles.</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              openPanel();
              setLeaving(true);
            }}
            className="min-h-10 rounded-full bg-kelp px-3 text-sm font-medium text-kelp-ink"
          >
            Show me
          </button>
          <button type="button" onClick={() => setLeaving(true)} className="min-h-10 rounded-full border border-line px-3 text-sm">
            Later
          </button>
        </div>
      </div>
    </section>
  );
}

function UnlockNote({ note, onDone }: { note: { title: string; text: string }; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 16000);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <section aria-label={note.title} data-wild-ui data-unlock-note className="wild-note fixed inset-x-3 bottom-24 z-[59] mx-auto max-w-sm rounded-xl border border-line bg-surface p-4 text-ink shadow-2xl">
      <p role="status" className="font-display font-semibold tracking-tight">
        {note.title}
      </p>
      <p className="mt-1 text-sm text-muted">{note.text}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onDone} className="min-h-10 rounded-full bg-kelp px-4 text-sm font-medium text-kelp-ink">
          Got it
        </button>
        <button
          type="button"
          onClick={() => {
            openPanel();
            onDone();
          }}
          className="min-h-10 rounded-full border border-line px-3 text-sm"
        >
          Open Bells &amp; whistles
        </button>
      </div>
    </section>
  );
}
