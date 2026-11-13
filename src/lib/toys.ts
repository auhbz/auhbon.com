/**
 * Toys: things a visitor pulls out of the toy box (Fun mode only). Which toy is
 * in hand is per visit (not saved); each toy's unlock comes from unlocks.ts.
 */
import { useSyncExternalStore } from "react";

export type ToyId = "brush" | "notes" | "plane" | "smoke";

export const TOYS: { id: ToyId; unlock: string; label: string; description: string }[] = [
  { id: "brush", unlock: "toy:brush", label: "Paint brush", description: "Paint all over the site, then wash it off" },
  { id: "notes", unlock: "toy:notes", label: "Sticky notes", description: "Write or doodle on notes and stick them anywhere" },
  { id: "plane", unlock: "toy:plane", label: "Paper airplane", description: "Fold it, throw it, watch it loop, and glide" },
  { id: "smoke", unlock: "toy:smoke", label: "Smoke bombs", description: "Throw one for a puff of smoke. Poof!" },
];

const EVENT = "portfolio:toy";
let held: ToyId | null = null;

export function holdToy(id: ToyId | null) {
  if (held === id) return;
  held = id;
  const d = document.documentElement.dataset;
  if (id) d.toyHeld = id;
  else delete d.toyHeld;
  window.dispatchEvent(new Event(EVENT));
}
export const heldToy = () => held;

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}
export const useHeldToy = () => useSyncExternalStore(subscribe, heldToy, () => null);
