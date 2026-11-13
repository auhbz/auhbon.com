"use client";

import { useEffect, useId, useState } from "react";
import { SectionAnchor } from "@/components/section-anchor";
import { reveal } from "@/components/easter-eggs";
import { toast } from "@/lib/fx";
import { activeVariant, getFun } from "@/lib/fun";
import { extraSound } from "@/lib/sound";
import { useExtraVisible } from "@/lib/unlocks";

/** Glimmers: the little gems that tumble out of a broken pot. Saved across visits. */
const KEY = "fun-glimmers-v1";
export const GLIMMER_GOAL = 10;
/** Where pots hide: the bottom corner of these sections, in their empty padding. */
const SPOTS = ["work", "education", "skills"] as const;
const REGROW_MS = 60_000;
const COLORS = ["#3fbf6f", "#4aa3ff", "#ff5d6c", "#f5c542"];

function readGlimmers() {
  try {
    const n = Number(localStorage.getItem(KEY) ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function addGlimmers(amount: number) {
  const total = readGlimmers() + amount;
  try {
    localStorage.setItem(KEY, String(total));
  } catch {
    // Storage can be unavailable in a private browsing context.
  }
  toast(`+${amount} glimmers (${total} in all)`);
  return total;
}

type Drop = { id: number; color: string; dx: number; delay: number };

/**
 * Small clay pots tucked into the corners of a few sections (Fun mode, once
 * unlocked). Breaking one spills a few glimmers, which collect themselves;
 * gather ten for a secret. Pots mend themselves after a minute. Original art.
 */
export function ClayPots() {
  const visible = useExtraVisible("extra:pots");
  if (!visible) return null;
  return (
    <>
      {SPOTS.map((id, i) => (
        <SectionAnchor key={id} id={id}>
          <Pot index={i} />
        </SectionAnchor>
      ))}
    </>
  );
}

function Pot({ index }: { index: number }) {
  const [broken, setBroken] = useState(false);
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    if (!broken) return;
    const t = window.setTimeout(() => {
      setBroken(false);
      setDrops([]);
    }, REGROW_MS);
    return () => window.clearTimeout(t);
  }, [broken]);

  const smash = () => {
    if (broken) return;
    const n = 2 + Math.floor(Math.random() * 3);
    setBroken(true);
    setDrops(Array.from({ length: n }, (_, i) => ({ id: Date.now() + i, color: COLORS[Math.floor(Math.random() * COLORS.length)], dx: (i - (n - 1) / 2) * 1.1 + (Math.random() - 0.5) * 0.4, delay: i * 0.06 })));
    if (activeVariant(getFun(), "sound")) extraSound.smash(n);
    const total = addGlimmers(n);
    if (total >= GLIMMER_GOAL && !getFun().secrets.includes("gems")) reveal("gems", `Pot luck! ${total} glimmers collected. ✨`);
  };

  return (
    <span className="pot-spot" data-pot={index}>
      {broken ? (
        <span className="pot-broken" aria-hidden="true">
          <PotArt className="pot-shard pot-shard-l" />
          <PotArt className="pot-shard pot-shard-r" />
          {drops.map((d) => (
            <span key={d.id} className="glimmer" style={{ "--dx": `${d.dx}rem`, "--delay": `${d.delay}s`, color: d.color } as React.CSSProperties}>
              <svg viewBox="0 0 10 14" aria-hidden="true">
                <path d="M5 0 L10 4 L10 10 L5 14 L0 10 L0 4 Z" fill="currentColor" />
                <path d="M5 0 L10 4 L5 6 L0 4 Z" fill="#fff" opacity="0.45" />
                <path d="M5 6 L5 14 L0 10 L0 4 Z" fill="#000" opacity="0.18" />
              </svg>
            </span>
          ))}
        </span>
      ) : (
        <button type="button" className="pot" onClick={smash} aria-label="A clay pot. It looks breakable.">
          <PotArt />
        </button>
      )}
    </span>
  );
}

function PotArt({ className }: { className?: string }) {
  const clay = `pot-clay-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 24 26" className={className ?? "pot-art"} aria-hidden="true">
      <defs>
        <linearGradient id={clay} x1="0" x2="1">
          <stop offset="0" stopColor="#b5562e" />
          <stop offset="0.45" stopColor="#d9784a" />
          <stop offset="1" stopColor="#8e3f20" />
        </linearGradient>
      </defs>
      <path d="M7 2 H17 V4 C17 5 16 5.5 16 6.5 C21 8.5 22.5 13 21 18 C19.7 22.5 16 25 12 25 C8 25 4.3 22.5 3 18 C1.5 13 3 8.5 8 6.5 C8 5.5 7 5 7 4 Z" fill={`url(#${clay})`} stroke="#5a2914" strokeWidth="0.8" />
      <path d="M3.4 13.5 C9 15.6 15 15.6 20.6 13.5" fill="none" stroke="#f2c08f" strokeWidth="1.2" opacity="0.8" />
      <path d="M4.5 17.5 C9.5 19.3 14.5 19.3 19.5 17.5" fill="none" stroke="#5a2914" strokeWidth="0.7" strokeDasharray="1.4 1.6" opacity="0.7" />
      <ellipse cx="12" cy="2.6" rx="5" ry="1" fill="#3a1a0c" />
    </svg>
  );
}
