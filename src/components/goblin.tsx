"use client";

import { useState, useSyncExternalStore } from "react";
import { advanceHide, DEFAULT_FUN, getFun, HIDE_SPOTS, subscribeFun } from "@/lib/fun";
import { burst, sound, toast } from "@/lib/fx";
import { reveal } from "@/components/easter-eggs";

const noSubscribe = () => () => {};
const useMounted = () => useSyncExternalStore(noSubscribe, () => true, () => false);

/** The same goblin who fetches slingshot rocks, drawn as SVG. */
function GoblinArt({ pointing = false, className = "" }: { pointing?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {pointing ? (
        // One arm stretched up and to the right, toward the Bells & whistles button.
        <path d="M40 40 L56 14" stroke="#4d8f2c" strokeWidth="5" strokeLinecap="round" />
      ) : null}
      {/* Body: a little brown tunic. */}
      <ellipse cx="32" cy="50" rx="11" ry="10" fill="#7a4a22" />
      {/* Ears. */}
      <path d="M20 26 L3 14 L21 33 Z M44 26 L61 14 L43 33 Z" fill="#5fa83a" />
      {/* Head. */}
      <circle cx="32" cy="29" r="14" fill="#6cb447" />
      <circle cx="26.5" cy="27" r="3" fill="#ffe14d" />
      <circle cx="37.5" cy="27" r="3" fill="#ffe14d" />
      <circle cx="27.3" cy="27.4" r="1.3" fill="#1d3a0e" />
      <circle cx="38.3" cy="27.4" r="1.3" fill="#1d3a0e" />
      {/* A toothy grin. */}
      <path d="M25 34 Q32 40 39 34" fill="none" stroke="#1d3a0e" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M29 35.6 L30 38 L31 36.2 M33 36.2 L34 38 L35 35.6" fill="#fff" stroke="#fff" strokeWidth="0.8" />
      {pointing ? <circle cx="56.5" cy="13.5" r="3.4" fill="#6cb447" /> : null}
    </svg>
  );
}

/**
 * Before anyone has opened Bells & whistles, a goblin stands under the button
 * pointing at it. The first click sends him running off to hide.
 * Decorative: the button itself already has its name.
 */
export function GoblinGuide() {
  const mounted = useMounted();
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  // Only visitors who arrived un-welcomed see him (and then see him leave).
  const [wasWelcomed] = useState(() => typeof window !== "undefined" && getFun().welcomed);
  const [gone, setGone] = useState(false);
  if (!mounted || wasWelcomed || gone) return null;

  return (
    <div
      aria-hidden="true"
      data-goblin-guide
      className={`goblin-guide${fun.welcomed ? " is-leaving" : ""}`}
      onAnimationEnd={(e) => {
        if (e.animationName === "goblin-run") setGone(true);
      }}
    >
      <span className="goblin-bubble">Click it!!!!</span>
      <GoblinArt pointing className="goblin-guide-art" />
    </div>
  );
}

/**
 * One of the goblin's hiding places. He only peeks out while Bells & whistles
 * is on (the clean site stays clean). Find him in all three for a secret.
 */
export function GoblinSpot({ spot }: { spot: number }) {
  const mounted = useMounted();
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  if (!mounted || !fun.on || !fun.welcomed || fun.hideSpot !== spot) return null;

  return (
    <button
      type="button"
      data-goblin-spot={spot}
      aria-label="Something is peeking out"
      className="goblin-spot"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        burst("sparks", r.left + r.width / 2, r.top + r.height / 2);
        const next = advanceHide();
        if (next >= HIDE_SPOTS) reveal("goblin", "You found the goblin every time. He gives up!");
        else {
          sound("pop");
          toast(`Found him! He ran off to hide somewhere else. (${next} of ${HIDE_SPOTS})`);
        }
      }}
    >
      <GoblinArt className="goblin-spot-art" />
    </button>
  );
}
