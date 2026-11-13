"use client";

import { useState, useSyncExternalStore } from "react";
import { DEFAULT_FUN, getFun, lookActive, subscribeFun } from "@/lib/fun";
import { addGlimmers } from "@/components/clay-pots";
import { workbench } from "@/lib/availability";

export function NatureGlimmers() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const [cut, setCut] = useState<number[]>([]);
  if (!workbench || lookActive(fun) !== "nature") return null;
  return (
    <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2 px-5 pb-6">
      {[1, 2, 3, 4, 5].map((patch) => (
        <button key={patch} type="button" disabled={cut.includes(patch)} aria-label={`Cut grass patch ${patch}`}
          className="min-h-11 min-w-11 rounded border border-line text-xl disabled:opacity-40"
          onClick={() => {
            setCut((previous) => [...previous, patch]);
            addGlimmers(1);
          }}>{cut.includes(patch) ? "·" : "🌿"}</button>
      ))}
    </div>
  );
}
