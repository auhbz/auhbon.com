"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GravityEngine, type GravitySecret, type GravityStatus } from "@/lib/wild/gravity";
import { acquireGhostLayer } from "@/lib/wild/loot";
import { prefersReducedMotion } from "@/lib/events";
import { sound, toast } from "@/lib/fx";
import { reveal } from "@/components/easter-eggs";
import { shakePage } from "@/components/wild/shake";
import { whenHydrated } from "@/lib/hydrated";

const noSubscribe = () => () => {};

const MESSAGES: Record<GravitySecret, string> = {
  "gravity-toss": "Escape velocity! That one nearly left the page.",
  "gravity-name": "Down to earth. Careful, that's my name!",
};

/**
 * Gravity Mode: what's on screen comes loose and falls. A small dock at the
 * bottom left puts everything back, drops more, or throws it all in the air.
 */
export function GravityMode() {
  const engine = useRef<GravityEngine | null>(null);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);
  const [status, setStatus] = useState<GravityStatus>({ loose: 0, returning: false });

  useEffect(() => {
    const release = acquireGhostLayer();
    const fx = new GravityEngine({ reduced: prefersReducedMotion(), onSecret: (id) => reveal(id, MESSAGES[id]), onStatus: setStatus, onSound: sound });
    engine.current = fx;
    (window as unknown as { __wildGravity?: GravityEngine }).__wildGravity = fx;
    // A rumble, then the page lets go.
    shakePage(2);
    let t = 0;
    const cancel = whenHydrated("main section", () => (t = window.setTimeout(() => fx.loosen(), 250)), 3000);
    return () => {
      cancel();
      window.clearTimeout(t);
      fx.destroy();
      release();
      engine.current = null;
      delete (window as unknown as { __wildGravity?: GravityEngine }).__wildGravity;
    };
  }, []);

  useEffect(() => engine.current?.setReduced(reduced), [reduced]);

  const dropMore = () => {
    const n = engine.current?.loosen() ?? 0;
    if (!n) toast("Nothing left on screen to drop. Scroll somewhere else and try again.");
    else shakePage(1);
  };

  return (
    <div role="group" aria-label="Gravity Mode controls" data-wild-ui data-gravity-dock className="wild-dock fixed bottom-3 left-3 z-[57] flex flex-wrap items-end gap-2">
      <button
        type="button"
        onClick={() => engine.current?.putBack()}
        disabled={!status.loose}
        className="min-h-11 rounded-full bg-kelp px-4 text-sm font-medium text-kelp-ink shadow hover:opacity-90 disabled:opacity-60"
      >
        Put everything back
      </button>
      <button type="button" onClick={dropMore} className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink shadow hover:border-ink/40">
        Drop more
      </button>
      {reduced ? null : (
        <button
          type="button"
          onClick={() => engine.current?.shake()}
          disabled={!status.loose}
          className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink shadow hover:border-ink/40 disabled:opacity-60"
        >
          Toss it all
        </button>
      )}
      <p className="sr-only" role="status" data-gravity-status>
        {status.loose ? `${status.loose} ${status.loose === 1 ? "piece" : "pieces"} of the page fell down.` : "Everything is in its place."}
      </p>
    </div>
  );
}
