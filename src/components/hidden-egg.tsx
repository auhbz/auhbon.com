"use client";

import { useEffect, useRef, useState } from "react";
import { reveal } from "@/components/easter-eggs";
import { burst } from "@/lib/fx";

/**
 * A secret that only exists while selected. The egg is invisible and can't be
 * clicked until it's part of a text selection (Select All / Ctrl+A, or a drag),
 * so a stray click never finds it by accident.
 */
export function HiddenEgg() {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

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
      onPointerDown={(e) => {
        if (!shown) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        burst("confetti", r.left + r.width / 2, r.top + r.height / 2);
        document.getSelection()?.removeAllRanges();
        reveal("egg", "You found the egg hiding in plain sight.");
      }}
    >
      🥚
    </span>
  );
}
