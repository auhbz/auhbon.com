/** Fire-and-forget visual and audio effects, decoupled from the components that trigger them. */

export const TOAST_EVENT = "portfolio:toast";
export const BURST_EVENT = "portfolio:burst";

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: message }));
}

export type Burst = { x: number; y: number; kind: "confetti" | "diamonds" };

/** Confetti/diamond burst at a viewport point (defaults to the center of the screen). */
export function burst(kind: Burst["kind"] = "confetti", x = window.innerWidth / 2, y = window.innerHeight / 3) {
  window.dispatchEvent(new CustomEvent<Burst>(BURST_EVENT, { detail: { x, y, kind } }));
}

let audio: AudioContext | null = null;

/** Tiny synthesized sounds: no audio files to download, nothing plays until a user gesture. */
export function playSound(kind: "click" | "chime" | "fanfare") {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    const notes = kind === "click" ? [880] : kind === "chime" ? [660, 990] : [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * (kind === "click" ? 0 : 0.09);
      const length = kind === "click" ? 0.05 : 0.18;
      osc.type = kind === "click" ? "triangle" : "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === "click" ? 0.04 : 0.07, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + length + 0.02);
    });
  } catch {
    // Web Audio unavailable: stay silent.
  }
}
