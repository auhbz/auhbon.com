/**
 * Phone-only extras: haptics and motion sensors. Everything here is gated on a
 * touch-first device (coarse pointer), so desktop browsers that happen to expose
 * these APIs (Chrome has both) keep behaving exactly as before.
 */
import { getFun } from "@/lib/fun";

const coarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** Tilt and shake need DeviceOrientationEvent (iOS and Android both have it). */
export const canTilt = () => coarse() && "DeviceOrientationEvent" in window;

/** Vibration exists on Android; iOS Safari has no navigator.vibrate. */
export const canVibrate = () => coarse() && typeof navigator.vibrate === "function";

let quietUntil = 0;

/**
 * A light buzz for a press, or a short pattern for a found secret. Never
 * vibrates while Bells & whistles is off or the Haptics switch is off.
 */
export function haptic(kind: "tap" | "secret") {
  const s = getFun();
  if (!s.on || !s.haptics || !canVibrate()) return;
  const now = performance.now();
  // A secret's pattern isn't cut short by the tap from the press that found it.
  if (kind === "tap" && now < quietUntil) return;
  if (kind === "secret") quietUntil = now + 600;
  try {
    navigator.vibrate(kind === "tap" ? 10 : [24, 60, 24, 60, 70]);
  } catch {
    // Some browsers refuse without a recent tap; it's only a nicety.
  }
}

type PermissionFn = () => Promise<PermissionState | "granted" | "denied">;
type WithPermission = { requestPermission?: PermissionFn };

/**
 * iOS asks before a page can read motion sensors, and only from a tap: call this
 * straight from the click handler (before any await). Elsewhere it's a no-op
 * that resolves true. Resolves false if the visitor (or the browser) says no.
 */
export async function requestMotionPermission(): Promise<boolean> {
  const orientation = window.DeviceOrientationEvent as unknown as WithPermission | undefined;
  if (typeof orientation?.requestPermission !== "function") return true;
  try {
    if ((await orientation.requestPermission()) !== "granted") return false;
    // Shake uses devicemotion. iOS shares one "Motion & Orientation" permission,
    // so this resolves without a second prompt.
    const motion = window.DeviceMotionEvent as unknown as WithPermission | undefined;
    if (typeof motion?.requestPermission === "function") await motion.requestPermission().catch(() => "granted");
    return true;
  } catch {
    return false;
  }
}

/**
 * Calls `onShake` when the phone is shaken, at most once every `gapMs`.
 * Returns a function that stops listening.
 */
export function onShake(onShakeFn: () => void, gapMs = 2000) {
  let last = -Infinity;
  let jolts: number[] = [];
  const listener = (e: DeviceMotionEvent) => {
    const a = e.acceleration;
    const g = e.accelerationIncludingGravity;
    // Prefer acceleration without gravity; fall back to subtracting ~1 g.
    const mag = a && a.x != null ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) : g && g.x != null ? Math.abs(Math.hypot(g.x ?? 0, g.y ?? 0, g.z ?? 0) - 9.81) : 0;
    const now = performance.now();
    if (mag < 13) return;
    // Two hard jolts within half a second is a shake (one alone is a bump).
    jolts = [...jolts.filter((t) => now - t < 500), now];
    if (jolts.length >= 2 && now - last > gapMs) {
      last = now;
      jolts = [];
      onShakeFn();
    }
  };
  window.addEventListener("devicemotion", listener);
  return () => window.removeEventListener("devicemotion", listener);
}
