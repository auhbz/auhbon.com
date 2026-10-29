/** Fire-and-forget effects, decoupled from the components that trigger them. */
import type { SoundEvent } from "@/lib/sound";

export const TOAST_EVENT = "portfolio:toast";
export const BURST_EVENT = "portfolio:burst";
export const SOUND_EVENT = "portfolio:sound";

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

export type Burst = { x: number; y: number; kind: "confetti" | "diamonds" | "sparks" | "droplets" };

/** Particle burst at a viewport point (defaults to the upper middle of the screen). */
export function burst(kind: Burst["kind"] = "confetti", x = window.innerWidth / 2, y = window.innerHeight / 3) {
  window.dispatchEvent(new CustomEvent<Burst>(BURST_EVENT, { detail: { x, y, kind } }));
}

/** Plays in the visitor's chosen sound pack, if sound effects are on. */
export function sound(event: SoundEvent) {
  window.dispatchEvent(new CustomEvent<SoundEvent>(SOUND_EVENT, { detail: event }));
}
