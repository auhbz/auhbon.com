"use client";

import { reveal } from "@/components/easter-eggs";
import { burst, sound } from "@/lib/fx";
import type { Secret } from "@/lib/fun";

/**
 * The "Farm" i-dots: a choose-your-own-adventure told by the two dots on the i's.
 * Four rounds of two choices (each set by the ones before) lead to 16 endings:
 * three special endings award a secret, the rest are the common "back to the
 * coop" ending. Clicking a dot picks the first choice; the narration row under
 * the name has real buttons, so keyboard and screen-reader visitors can play too.
 *
 * Emoji are all from Emoji 11 (2018) or earlier so they show up everywhere.
 */
type Choice = { label: string; to: string };
type Node = {
  dots: [string, string];
  text: string;
  choices?: Choice[];
  /** Clicking a dot never answers this one (an "are you sure?" moment). */
  askOnly?: boolean;
  /** Endings: "common" or the secret a special ending awards. */
  ending?: "common" | { secret: Secret; name: string };
  /** Render the second dot as a chocolate (brown) egg, or a golden one. */
  tint?: "chocolate" | "gold";
};

const COOP = "The end: back to the coop.";

export const STORY = {
  start: {
    dots: ["🐣", "🐛"],
    text: "A chick hatches, hungry. A worm wiggles past.",
    choices: [
      { label: "Eat the worm", to: "fed" },
      { label: "Befriend the worm", to: "friends" },
    ],
  },
  // Round 2
  fed: {
    dots: ["🐥", "👨‍🌾"],
    text: "Full and growing fast, the chick catches the farmer's eye.",
    choices: [
      { label: "Follow the farmer", to: "barn" },
      { label: "Wander toward the road", to: "road" },
    ],
  },
  friends: {
    dots: ["🐥", "🐛"],
    text: "The chick and the worm become best friends and set off on an adventure.",
    choices: [
      { label: "Visit the kitchen", to: "kitchen" },
      { label: "Visit the art studio", to: "studio" },
    ],
  },
  // Round 3
  barn: {
    dots: ["🐔", "👨‍🌾"],
    text: "Now a grown hen, she lays an egg in the barn.",
    choices: [
      { label: "Take it to market", to: "market" },
      { label: "Keep it warm", to: "warm" },
    ],
  },
  road: {
    dots: ["🐔", "🚗"],
    text: "She reaches a busy road. Cars whiz by.",
    choices: [
      { label: "Cross the road", to: "cross" },
      { label: "Stay on this side", to: "stay" },
    ],
  },
  kitchen: {
    dots: ["🐥", "👨‍🍳"],
    text: "The chef is very happy to see you. Suspiciously happy.",
    choices: [
      { label: "Ask what's for dinner", to: "dinner" },
      { label: "Run!", to: "run" },
    ],
  },
  studio: {
    dots: ["🐥", "👨‍🎨"],
    text: "The painter is decorating eggs for spring.",
    choices: [
      { label: "Offer to help", to: "help" },
      { label: "Pose for a portrait", to: "portrait" },
    ],
  },
  // Round 4
  market: {
    dots: ["🥚", "👨‍🌾"],
    text: "At the market, a stranger offers a handful of magic beans for the egg.",
    choices: [
      { label: "Trade for the beans", to: "beans" },
      { label: "Keep the egg", to: "noSale" },
    ],
  },
  warm: {
    dots: ["🐔", "🥚"],
    text: "She keeps the egg warm, day and night. It starts to shimmer…",
    choices: [
      { label: "Wait patiently", to: "golden" },
      { label: "Peek under her", to: "pecked" },
    ],
  },
  cross: {
    dots: ["🐔", "🛣️"],
    text: "She made it to the other side!",
    choices: [
      { label: "Ask her why", to: "why" },
      { label: "Keep walking", to: "wander" },
    ],
  },
  stay: {
    dots: ["🐔", "🚗"],
    text: "She waits for a gap in traffic. It never comes.",
    choices: [
      { label: "Wait a little longer", to: "waiting" },
      { label: "Head home", to: "homeward" },
    ],
  },
  dinner: {
    dots: ["🐥", "👨‍🍳"],
    text: "\"Are you sure you want to know?\" asks the chef.",
    askOnly: true,
    choices: [
      { label: "Yes, tell me", to: "fried" },
      { label: "No, never mind", to: "neverMind" },
    ],
  },
  run: {
    dots: ["🐥", "💨"],
    text: "You run! The chef gives up after one lap of the kitchen.",
    choices: [
      { label: "Hide in the barn", to: "hide" },
      { label: "Keep running", to: "marathon" },
    ],
  },
  help: {
    dots: ["🥚", "👨‍🎨"],
    text: "The painter hands you a brush and an egg.",
    choices: [
      { label: "Paint it chocolate brown", to: "bunny" },
      { label: "Paint it rainbow", to: "rainbow" },
    ],
  },
  portrait: {
    dots: ["🐥", "🖼️"],
    text: "You hold perfectly still for three hours. It's a masterpiece.",
    choices: [
      { label: "Hang it in the barn", to: "gallery" },
      { label: "Give it to the worm", to: "gift" },
    ],
  },
  // Special endings (each awards a secret)
  golden: {
    dots: ["🐔", "🥚"],
    tint: "gold",
    text: "The egg turns to solid gold!",
    ending: { secret: "golden", name: "The golden egg" },
  },
  why: {
    dots: ["🐔", "🛣️"],
    text: "\"To get to the other side,\" she says, and winks.",
    ending: { secret: "road", name: "Why did the chicken…" },
  },
  bunny: {
    dots: ["🐰", "🥚"],
    tint: "chocolate",
    text: "A chocolate egg! A rabbit hops over to deliver it.",
    ending: { secret: "bunny", name: "Easter egg easter egg" },
  },
  // Common endings
  beans: { dots: ["🐔", "🌱"], text: `The beans were just beans. ${COOP}`, ending: "common" },
  noSale: { dots: ["🐔", "🥚"], text: `Nobody buys anything. ${COOP}`, ending: "common" },
  pecked: { dots: ["🐔", "😵"], text: `She pecks you. Fair. ${COOP}`, ending: "common" },
  wander: { dots: ["🐔", "🌾"], text: `She wanders home eventually. ${COOP}`, ending: "common" },
  waiting: { dots: ["🐔", "⏳"], text: `Still waiting. Maybe tomorrow. ${COOP}`, ending: "common" },
  homeward: { dots: ["🐔", "🏠"], text: `Home sweet home. ${COOP}`, ending: "common" },
  fried: { dots: ["😱", "🍗"], text: `It's fried chicken. Oh no. ${COOP}, quickly.`, ending: "common" },
  neverMind: { dots: ["🐥", "🥗"], text: `Salad. It was salad. ${COOP}`, ending: "common" },
  hide: { dots: ["🐥", "🌾"], text: `Safe in the hay. ${COOP}`, ending: "common" },
  marathon: { dots: ["🐥", "🏅"], text: `You run a marathon by accident. ${COOP}, tired.`, ending: "common" },
  rainbow: { dots: ["🐥", "🌈"], text: `Very pretty. Very ordinary. ${COOP}`, ending: "common" },
  gallery: { dots: ["🐔", "🖼️"], text: `The cows love it. ${COOP}`, ending: "common" },
  gift: { dots: ["🐛", "🖼️"], text: `The worm is moved to tears. ${COOP}`, ending: "common" },
} satisfies Record<string, Node>;

export type Stage = keyof typeof STORY;

export const SPECIAL_ENDINGS = 3;

export function node(stage: Stage): Node {
  return STORY[stage] as Node;
}

/** Side effects when a stage is entered. */
export function enterStage(to: Stage, at?: { x: number; y: number }) {
  const n = node(to);
  if (n.ending && n.ending !== "common") {
    burst("confetti", at?.x ?? window.innerWidth / 2, at?.y ?? window.innerHeight / 3);
    reveal(n.ending.secret, `Special ending: ${n.ending.name}.`);
  } else if (n.ending) sound("pop");
  else sound("toggle");
}

export function FarmNarration({ stage, onChoose }: { stage: Stage; onChoose: (to: string) => void }) {
  const n = node(stage);
  const ending = n.ending;
  return (
    <div data-farm-story className="hero-rest mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <p aria-live="polite" className="text-muted">
        {n.text}
        {ending ? (
          <span className="ml-2 font-medium text-ink">
            {ending === "common" ? "(A common ending.)" : `(Special ending: ${ending.name}, one of ${SPECIAL_ENDINGS}.)`}
          </span>
        ) : null}
      </p>
      {n.choices?.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => onChoose(c.to)}
          className="pill inline-flex min-h-9 items-center rounded-full border border-ink/25 px-3.5 font-medium hover:border-ink"
        >
          {c.label}
        </button>
      ))}
      {ending ? (
        <button
          type="button"
          onClick={() => onChoose("start")}
          className="pill inline-flex min-h-9 items-center rounded-full border border-ink/25 px-3.5 font-medium hover:border-ink"
        >
          Start over
        </button>
      ) : null}
    </div>
  );
}
