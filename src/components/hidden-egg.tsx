"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { reveal } from "@/components/easter-eggs";
import { burst } from "@/lib/fx";
import { activeVariant, DEFAULT_FUN, getFun, subscribeFun } from "@/lib/fun";

/**
 * A secret that only exists while selected. The egg is invisible and can't be
 * clicked until it's part of a text selection (Select All / Ctrl+A, or a drag),
 * so a stray click never finds it by accident.
 */
export function HiddenEgg() {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  // Hold the Fire cursor trail over the revealed egg and it cooks.
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const fire = activeVariant(fun, "trail") === "fire";
  const [cooked, setCooked] = useState(false);
  const heat = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    const onSelection = () => {
      const sel = document.getSelection();
      const el = ref.current;
      setShown(Boolean(sel && el && !sel.isCollapsed && sel.containsNode(el, true)));
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-hidden-egg
      className={`hidden-egg${shown ? " is-shown" : ""}`}
      // pointerdown runs before the click clears the selection.
      onPointerMove={(e) => {
        if (!shown || cooked || !fire) return;
        heat.current += Math.min(100, e.timeStamp - last.current);
        last.current = e.timeStamp;
        if (heat.current > 900) {
          setCooked(true);
          reveal("overeasy", "Over easy! You cooked the hidden egg.");
        }
      }}
      onPointerDown={(e) => {
        if (!shown) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        burst("confetti", r.left + r.width / 2, r.top + r.height / 2);
        document.getSelection()?.removeAllRanges();
        reveal("egg", "You found the egg hiding in plain sight.");
      }}
    >
      {cooked ? "🍳" : "🥚"}
    </span>
  );
}
