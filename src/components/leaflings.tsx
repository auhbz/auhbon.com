"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { reveal } from "@/components/easter-eggs";
import { toast } from "@/lib/fx";
import { activeVariant, getFun } from "@/lib/fun";
import { extraSound } from "@/lib/sound";
import { useExtraVisible } from "@/lib/unlocks";

/**
 * Leaflings: tiny forest spirits in leaf masks, hiding one at a time around the
 * page (Fun mode, once unlocked). Find one and it pipes up; find all three for a
 * secret. After one is found, the next one hides somewhere new a minute later.
 * Original characters: a round sprite behind a big leaf with two eye holes.
 */
const KEY = "fun-leaflings-v1";
const NEXT_MS = 60_000;

type Spot = { id: string; section: string; cover: "rock" | "sprig" | "heading"; line: string };
export const LEAFLING_SPOTS: Spot[] = [
  { id: "rock", section: "contact", cover: "rock", line: "Pip-pip! You found me under my rock!" },
  { id: "sprig", section: "github", cover: "sprig", line: "Pip-pip! Nobody ever checks the sprig!" },
  { id: "heading", section: "skills", cover: "heading", line: "Pip-pip! I was hiding behind the heading!" },
];

function readFound(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => LEAFLING_SPOTS.some((s) => s.id === x)) : [];
  } catch {
    return [];
  }
}

export function Leaflings() {
  const visible = useExtraVisible("extra:leaflings");
  const [found, setFound] = useState<string[] | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [popped, setPopped] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setFound(readFound()), 0);
    return () => window.clearTimeout(t);
  }, [visible]);

  const spot = found && !waiting ? LEAFLING_SPOTS.find((s) => !found.includes(s.id)) : undefined;
  const shown = popped ? LEAFLING_SPOTS.find((s) => s.id === popped) : spot;

  useEffect(() => {
    if (!visible || !shown) return;
    const el = document.getElementById(shown.section);
    if (el) el.dataset.leaflingHost = "";
    const t = window.setTimeout(() => setHost(el), 0);
    return () => {
      window.clearTimeout(t);
      if (el) delete el.dataset.leaflingHost;
    };
  }, [visible, shown]);

  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => setWaiting(false), NEXT_MS);
    return () => window.clearTimeout(t);
  }, [waiting]);

  useEffect(() => {
    if (!popped) return;
    const t = window.setTimeout(() => setPopped(null), 4200);
    return () => window.clearTimeout(t);
  }, [popped]);

  if (!visible || !shown || !host) return null;
  const isOut = popped === shown.id;

  const find = () => {
    if (isOut || !found) return;
    const next = [...found, shown.id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Counted for this visit only.
    }
    setFound(next);
    setPopped(shown.id);
    setWaiting(true);
    if (activeVariant(getFun(), "sound")) extraSound.pip();
    if (next.length >= LEAFLING_SPOTS.length) reveal("leaflings", "Hide and leaf! You found all three leaflings. 🍃");
    else toast(`${shown.line} (Leaflings found: ${next.length} of ${LEAFLING_SPOTS.length})`);
  };

  return createPortal(
    <span className="leafling-spot" data-leafling={shown.id} data-out={isOut ? "" : undefined}>
      {isOut ? (
        <span className="leafling-pop" aria-hidden="true">
          <LeaflingArt />
          <span className="leafling-says">Pip-pip!</span>
        </span>
      ) : null}
      <button
        type="button"
        className="leafling-cover"
        data-cover={shown.cover}
        onClick={find}
        aria-label={shown.cover === "rock" ? "A small rock" : shown.cover === "sprig" ? "A little sprig of leaves" : "A leaf poking out"}
        disabled={isOut}
      >
        {shown.cover === "rock" ? (
          <span aria-hidden="true" className="leafling-rock">
            <svg viewBox="0 0 24 16">
              <path d="M2 15 C0 10 4 4 10 3 C15 1 21 4 23 10 C24 13 22 15 20 15 Z" fill="#8c867c" stroke="#4d4842" strokeWidth="0.9" />
              <path d="M7 6 C10 4.5 13 4.5 15 5.5" stroke="#d6d1c8" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        ) : shown.cover === "sprig" ? (
          <span aria-hidden="true">🌿</span>
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden="true" className="leafling-tip">
            <path d="M2 18 C3 9 9 3 18 2 C17 11 11 17 2 18 Z" fill="#5fae4a" stroke="#2f6b26" strokeWidth="0.8" />
            <path d="M2 18 L14 6" stroke="#2f6b26" strokeWidth="0.7" />
          </svg>
        )}
      </button>
    </span>,
    host,
  );
}

/** The sprite: a round, mossy body behind a big leaf mask with two eye holes, and twig legs. */
function LeaflingArt() {
  return (
    <svg viewBox="0 0 40 48" className="leafling-art">
      <path d="M15 40 L13 47 M25 40 L27 47" stroke="#6b4a2b" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="20" cy="31" rx="11" ry="10" fill="#c9a36b" />
      <path d="M20 3 C33 8 36 20 30 30 C26 36 14 36 10 30 C4 20 7 8 20 3 Z" fill="#7bc25b" stroke="#2f6b26" strokeWidth="1.2" />
      <path d="M20 4 L20 34 M20 14 L28 10 M20 20 L30 17 M20 14 L12 10 M20 20 L10 17" stroke="#3f8a32" strokeWidth="0.9" fill="none" />
      <circle cx="15.5" cy="24" r="2.6" fill="#1a1a12" />
      <circle cx="24.5" cy="24" r="2.6" fill="#1a1a12" />
      <circle cx="16.3" cy="23.2" r="0.8" fill="#fff" />
      <circle cx="25.3" cy="23.2" r="0.8" fill="#fff" />
      <path d="M20 3 C21 0 23 -0.5 24 1" stroke="#6b4a2b" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
