"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { DEFAULT_FUN, funActive, getFun, subscribeFun } from "@/lib/fun";
import { reveal } from "@/components/easter-eggs";

/**
 * The "oo" in "looking" (Contact). With Bells & whistles on, each o grows a pupil
 * that follows the cursor; clicking one is a secret. Off, it's just text.
 * Screen readers always read the plain word.
 */
export function GooglyOs() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const ref = useRef<HTMLSpanElement>(null);
  const active = funActive(fun);

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const eyes = Array.from(root.querySelectorAll<HTMLElement>("[data-googly]"));
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const eye of eyes) {
          const r = eye.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height * 0.58;
          const a = Math.atan2(e.clientY - cy, e.clientX - cx);
          const reach = Math.min(1, Math.hypot(e.clientX - cx, e.clientY - cy) / 60) * r.width * 0.18;
          eye.style.setProperty("--gx", `${(Math.cos(a) * reach).toFixed(2)}px`);
          eye.style.setProperty("--gy", `${(Math.sin(a) * reach).toFixed(2)}px`);
        }
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [active]);

  const eye = (k: number) => (
    <span
      key={k}
      data-googly
      className="googly"
      onClick={() => {
        if (funActive(getFun())) reveal("eyes", "Eye spy! They were watching you the whole time.");
      }}
    >
      o
    </span>
  );
  return <span ref={ref}>{[eye(0), eye(1)]}</span>;
}
