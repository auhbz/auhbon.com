"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { DEFAULT_FUN, getFun, subscribeFun } from "@/lib/fun";
import { isUnlocked, useExtraVisible, useUnlocked } from "@/lib/unlocks";
import { holdToy, TOYS, useHeldToy, type ToyId } from "@/lib/toys";
import { toGoLabel } from "@/lib/wild/store";
import { sound } from "@/lib/fx";
import { BoxIcon, ToyIcon } from "@/components/toys/icons";
import { PaintLayer } from "@/components/toys/paint";
import { StickyNotes } from "@/components/toys/sticky-notes";
import { PaperAirplane } from "@/components/toys/paper-airplane";
import { SmokeBombs } from "@/components/toys/smoke-bombs";

const PANEL = "toy-box-panel";

/**
 * The toy box: a small box docked at the bottom right (Fun mode, once
 * unlocked, and only while the visitor hasn't hidden it). It opens like an
 * inventory: pull a toy out to use it, put it back when you're done. Locked
 * toys show as silhouettes, with how many more secrets they need.
 */
export function ToyBox() {
  const visible = useExtraVisible("toy:box");
  const held = useHeldToy();
  const brush = useUnlocked("toy:brush");
  const notes = useUnlocked("toy:notes");

  // Hiding the box (or Boring mode) puts the toy away.
  useEffect(() => {
    if (!visible) holdToy(null);
  }, [visible]);

  // Esc puts the toy back (unless you're typing on a sticky note).
  useEffect(() => {
    if (!held) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "Escape" || t?.closest("textarea, input, [popover], dialog")) return;
      holdToy(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [held]);

  if (!visible) return null;
  return (
    <>
      {brush ? <PaintLayer held={held === "brush"} /> : null}
      {notes ? <StickyNotes held={held === "notes"} /> : null}
      {held === "plane" ? <PaperAirplane /> : null}
      {held === "smoke" ? <SmokeBombs /> : null}

      <button
        type="button"
        popoverTarget={PANEL}
        data-wild-ui
        data-toy-box
        aria-label={held ? "Toy box (you're holding a toy)" : "Toy box"}
        title="Toy box"
        className="toy-box-button fixed right-3 bottom-3 z-[58] grid size-12 place-items-center rounded-xl border border-line bg-surface shadow-lg hover:border-ink/40"
      >
        <BoxIcon open={!!held} />
      </button>
      <ToyBoxPanel held={held} />
    </>
  );
}

function ToyBoxPanel({ held }: { held: ToyId | null }) {
  const headingId = useId();
  const state = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const next = TOYS.find((toy) => !isUnlocked(toy.unlock, state));
  return (
    <div
      id={PANEL}
      popover="auto"
      role="dialog"
      aria-labelledby={headingId}
      data-wild-ui
      className="toy-box-panel fixed inset-auto right-3 bottom-[4.25rem] m-0 w-[min(17rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-surface p-3 text-ink shadow-2xl"
    >
      <h2 id={headingId} className="font-display text-lg font-semibold tracking-tight">
        Toy box
      </h2>
      <p className="text-sm text-muted">Pull a toy out to play. Put it back when you&apos;re done.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2" aria-label="Toys">
        {TOYS.map((t) => (
          <ToySlot key={t.id} toy={t} held={held === t.id} next={next === t} />
        ))}
      </ul>
    </div>
  );
}

function ToySlot({ toy, held, next }: { toy: (typeof TOYS)[number]; held: boolean; next: boolean }) {
  const unlocked = useUnlocked(toy.unlock);
  if (!unlocked) {
    const need = toGoLabel(toy.unlock);
    return (
      <li>
        <button
          type="button"
          aria-disabled="true"
          aria-label={next ? `Locked toy. ${need} to unlock it` : "Locked toy"}
          title={next ? need : undefined}
          data-toy-slot={toy.id}
          data-locked
          onClick={() => sound("hit")}
          className="toy-slot flex aspect-square w-full cursor-not-allowed flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line p-1 text-center"
        >
          <ToyIcon id={toy.id} className={next ? "toy-silhouette" : "toy-silhouette blur-sm"} />
          <span className="text-xs leading-tight text-muted">{next ? need : "Locked"}</span>
        </button>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        data-toy-slot={toy.id}
        aria-label={held ? `Put the ${toy.label.toLowerCase()} back` : `Take out the ${toy.label.toLowerCase()}. ${toy.description}`}
        title={toy.description}
        data-out={held || undefined}
        onClick={() => {
          holdToy(held ? null : toy.id);
          sound(held ? "pop" : "toggle");
          document.getElementById(PANEL)?.hidePopover();
        }}
        className="toy-slot flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-line bg-paper p-1 text-center hover:border-ink/40"
      >
        {held ? <span aria-hidden="true" className="toy-slot-empty size-10" /> : <ToyIcon id={toy.id} />}
        <span className="text-xs leading-tight font-medium">{held ? "Put back" : toy.label}</span>
      </button>
    </li>
  );
}
