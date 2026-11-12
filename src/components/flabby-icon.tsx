"use client";

import { useEffect, useRef } from "react";
import { drawSprite, FLABBY, type Sprite } from "@/lib/flabby";
import { getFun } from "@/lib/fun";
import { useFunMode } from "@/lib/unlocks";
import { reveal } from "@/components/easter-eggs";
import { startGame } from "@/components/game-layer";

/** A static 8×8 sprite on a tiny canvas, scaled up with crisp pixels. */
export function SpriteCanvas({ sprite, className }: { sprite: Sprite; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 8, 8);
    drawSprite(ctx, sprite, 0, 0);
  }, [sprite]);
  return <canvas ref={ref} width={8} height={8} aria-hidden="true" className={className} />;
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
        <SpriteCanvas sprite={FLABBY.fall} className="size-6" />
      </button>
    </span>
  );
}
