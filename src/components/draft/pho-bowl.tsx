"use client";

import { useState } from "react";
import { revealDraft } from "@/lib/draft/store";
import { sound } from "@/lib/fx";

const SLURPS = 5;

/**
 * Pho theme: a steaming bowl in the hero. Each press is a slurp; finishing the
 * bowl is a draft secret, and then it's refilled.
 */
export function PhoBowl() {
  const [left, setLeft] = useState(SLURPS);

  const slurp = () => {
    sound("pop");
    if (left === 0) {
      setLeft(SLURPS);
      return;
    }
    const next = left - 1;
    setLeft(next);
    if (next === 0) revealDraft("d-slurp", "Not a drop left.");
  };

  const fill = left / SLURPS;
  return (
    <div className="draft-pho mt-8 flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={slurp}
        data-pho-bowl
        data-left={left}
        aria-label={left ? `Slurp the pho (${left} of ${SLURPS} slurps left)` : "Refill the bowl"}
        className="relative h-24 w-32 rounded-xl hover:bg-surface"
      >
        <span aria-hidden="true" className="draft-steam" />
        <svg viewBox="0 0 128 96" aria-hidden="true" className="relative size-full">
          {/* broth (sinks as you slurp), noodles and herbs */}
          <clipPath id="pho-bowl-inside">
            <path d="M14 48h100a50 40 0 0 1-100 0z" />
          </clipPath>
          <g clipPath="url(#pho-bowl-inside)">
            <rect x="0" y={48 + (1 - fill) * 34} width="128" height="48" fill="#d9822b" />
            {fill > 0.2 ? (
              <g fill="none" stroke="#f6e7c1" strokeWidth="2.5" strokeLinecap="round">
                <path d={`M30 ${54 + (1 - fill) * 30}q8-6 16 0t16 0 16 0 16 0`} />
                <path d={`M36 ${60 + (1 - fill) * 26}q8-6 16 0t16 0 16 0`} />
              </g>
            ) : null}
          </g>
          {fill > 0.4 ? (
            <g>
              <ellipse cx="44" cy="50" rx="7" ry="4" fill="#3f8f3a" transform="rotate(-20 44 50)" />
              <ellipse cx="54" cy="47" rx="6" ry="3.5" fill="#56a64a" transform="rotate(25 54 47)" />
              <path d="M80 44a8 8 0 0 1 14 6z" fill="#a6d64b" stroke="#6c9a24" strokeWidth="1.5" />
              <circle cx="68" cy="52" r="2.5" fill="#7dbb5a" />
              <circle cx="72" cy="49" r="2" fill="#7dbb5a" />
            </g>
          ) : null}
          <path d="M14 48h100a50 40 0 0 1-100 0z" fill="none" stroke="#f4ede0" strokeWidth="4" />
          <path d="M14 48h100" stroke="#f4ede0" strokeWidth="5" strokeLinecap="round" />
          <path d="M40 86h48" stroke="#f4ede0" strokeWidth="5" strokeLinecap="round" />
          {/* chopsticks resting on the rim */}
          <path d="M70 46L118 6M78 47l44-36" stroke="#a0683a" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </button>
      <p className="text-sm text-muted">{left ? "A bowl of pho, fresh herbs on top." : "All gone. Press for a refill."}</p>
    </div>
  );
}
