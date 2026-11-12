"use client";

import { FLABBY, PICO_PALETTE, type Sprite } from "@/lib/flabby";
import { getFun } from "@/lib/fun";
import { useFunMode } from "@/lib/unlocks";
import { reveal } from "@/components/easter-eggs";
import { startGame } from "@/components/game-layer";

/** A static 8×8 sprite as crisp SVG pixels (no canvas, so it never gets mistaken for an effects layer). */
export function SpriteSvg({ sprite, className }: { sprite: Sprite; className?: string }) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges" className={className}>
      {sprite.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PICO_PALETTE[parseInt(ch, 16)]} />)),
      )}
    </svg>
  );
}

/**
 * Tiny Flabby beside his project's "Source code" link (Fun mode only).
 * Finding him is a secret that unlocks his mini game; after that he's a
 * shortcut to it.
 */
export function FlabbyIcon() {
  const mode = useFunMode();
  if (mode !== "fun") return null;
  return (
    <span className="flabby-icon inline-flex items-center">
      <button
        type="button"
        data-flabby-icon
        aria-label="Flabby, the little guy from this game"
        title="Flabby"
        onClick={() => {
          const first = !getFun().secrets.includes("flabby");
          if (first) {
            reveal("flabby", "You found Flabby! His game is in Mini games now.");
            window.setTimeout(() => startGame("flabby"), 900);
          } else startGame("flabby");
        }}
        className="flabby-hop inline-grid size-8 place-items-center rounded-md hover:bg-surface"
      >
        <SpriteSvg sprite={FLABBY.fall} className="size-6" />
      </button>
    </span>
  );
}
