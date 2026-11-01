"use client";

import { reveal } from "@/components/easter-eggs";
import { burst, sound } from "@/lib/fx";

/**
 * The "Farm" i-dots: a tiny branching story told by the two dots on the i's.
 * Each stage has the two dots, a line of narration, and actions. Clicking a dot
 * does the first action; the narration row has real buttons for keyboard and
 * screen-reader visitors.
 */
export type Stage = "start" | "fed" | "chef" | "confirm" | "fried" | "painter" | "painted";

type Action = { label: string; to: Stage };
type StageDef = { dots: [string, string]; text: string; actions: Action[]; chocolate?: boolean; after?: Stage };

export const STAGES: Record<Stage, StageDef> = {
  start: {
    dots: ["🐣", "🪱"],
    text: "A hungry chick. A wiggly worm.",
    actions: [{ label: "Feed the chick", to: "fed" }],
  },
  fed: {
    dots: ["🐔", "🧑‍🌾"],
    text: "The chick ate the worm and grew into a hen. The farmer has two friends who could help.",
    actions: [
      { label: "Call the chef", to: "chef" },
      { label: "Call the painter", to: "painter" },
    ],
  },
  chef: {
    dots: ["🐔", "🧑‍🍳"],
    text: "The chef looks at the hen. The chef has a recipe in mind.",
    actions: [{ label: "Let him cook", to: "confirm" }],
  },
  confirm: {
    dots: ["🐔", "🧑‍🍳"],
    text: "Are you sure? She's so young.",
    actions: [
      { label: "Yes, I'm sure", to: "fried" },
      { label: "No, save her", to: "fed" },
    ],
  },
  fried: {
    dots: ["🍗", "🧑‍🍳"],
    text: "Well. That happened. The circle of life begins again…",
    actions: [],
    after: "start",
  },
  painter: {
    dots: ["🥚", "🧑‍🎨"],
    text: "The hen laid an egg, and the painter has a brush and some brown paint.",
    actions: [{ label: "Paint the egg", to: "painted" }],
  },
  painted: {
    dots: ["🐰", "🥚"],
    chocolate: true,
    text: "A chocolate egg! A rabbit hops over to deliver it. The story starts over…",
    actions: [],
    after: "start",
  },
};

/** Side effects when a stage is entered. */
export function enterStage(to: Stage, at?: { x: number; y: number }) {
  if (to === "fed") sound("pop");
  else if (to === "fried") sound("hit");
  else if (to === "painted") {
    if (at) burst("confetti", at.x, at.y);
    reveal("bunny", "An easter egg… easter egg.");
  } else sound("toggle");
}

export function FarmNarration({ stage, onChoose }: { stage: Stage; onChoose: (to: Stage) => void }) {
  const def = STAGES[stage];
  return (
    <div data-farm-story className="hero-rest mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <p aria-live="polite" className="text-muted">
        {def.text}
      </p>
      {def.actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => onChoose(a.to)}
          className="pill inline-flex min-h-9 items-center rounded-full border border-ink/25 px-3.5 font-medium hover:border-ink"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
