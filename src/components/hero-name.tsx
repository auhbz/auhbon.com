"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { activeVariant, DEFAULT_FUN, getFun, subscribeFun } from "@/lib/fun";
import { HERO_WAVE_EVENT } from "@/components/easter-eggs";
import { enterStage, FarmNarration, node, type Stage } from "@/components/farm-story";
import { reveal } from "@/components/easter-eggs";

const REST = 700; // weight when the pointer is away
const MIN = 380; // letters far from the pointer
const MAX = 820; // the letter under the pointer

const EMOJI = [
  "🍓",
  "🍊",
  "🍋",
  "🍉",
  "🍇",
  "🍒",
  "🍑",
  "🍍",
  "🥝",
  "🍌",
  "🍐",
  "🥥",
  "🥭",
  "🍎",
];
// Less twitchy: the pointer has to be quite close, and fruit changes at most ~3x a second.
const SWAP_MS = 340;
const SWAP_CLOSENESS = 0.72;

/**
 * The name is set in a variable font. Letters near the pointer thicken and the
 * rest thin out, like a spotlight. With bells and whistles on, the dots on the
 * i's become fruit, a slingshot rock (and the goblin who fetches it), bubble makers, or a
 * choose-your-own-adventure farm story. Purely decorative:
 * screen readers get the plain name, and nothing moves under reduced motion.
 */
export function HeroName({ name, id }: { name: string; id: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  // "fruit" | "slingshot" | "bubbles" | "farm" | null (regular dots)
  const dots = activeVariant(fun, "dots");
  const [stage, setStage] = useState<Stage>("start");
  // An egg on the farm can be cooked by holding the Fire trail over it.
  const [cooked, setCooked] = useState<Stage | null>(null);
  const choose = (to: string, at?: { x: number; y: number }) => {
    setStage(to as Stage);
    enterStage(to as Stage, at);
  };
  const fire = activeVariant(fun, "trail") === "fire";

  useEffect(() => {
    const heading = ref.current;
    const area = heading?.closest("section");
    if (!heading || !area) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const letters = Array.from(
      heading.querySelectorAll<HTMLSpanElement>("[data-letter]"),
    );
    const emojiEls = Array.from(
      heading.querySelectorAll<HTMLSpanElement>("[data-emoji]"),
    );
    const lastSwap = new WeakMap<HTMLElement, number>();
    emojiEls.forEach((d, i) => {
      d.dataset.index = String(i * 5);
      d.textContent = EMOJI[(i * 5) % EMOJI.length];
    });

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const paint = () => {
      frame = 0;
      const size = parseFloat(getComputedStyle(heading).fontSize);
      const radius = size * 1.7;
      const now = performance.now();
      for (const letter of letters) {
        let weight = REST;
        let closeness = 0;
        if (pointer) {
          const r = letter.getBoundingClientRect();
          const d = Math.hypot(
            pointer.x - (r.left + r.width / 2),
            pointer.y - (r.top + r.height / 2),
          );
          closeness = Math.max(0, 1 - d / radius);
          if (!motion.matches) weight = MIN + (MAX - MIN) * closeness ** 1.4;
        }
        letter.style.fontWeight = String(Math.round(weight));

        // Emoji dots shuffle while the pointer is near (a content swap, not motion).
        const dot = letter.querySelector<HTMLSpanElement>("[data-emoji]");
        if (
          dot &&
          closeness > SWAP_CLOSENESS &&
          now - (lastSwap.get(dot) ?? 0) > SWAP_MS
        ) {
          lastSwap.set(dot, now);
          const next = (Number(dot.dataset.index) + 1) % EMOJI.length;
          dot.dataset.index = String(next);
          dot.textContent = EMOJI[next];
        }
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => {
      if (motion.matches && !emojiEls.length) return;
      pointer = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onLeave = () => {
      pointer = null;
      schedule();
    };
    // Touch has no hover, so a tap/drag lights the name and lifting the finger resets it.
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") onLeave();
    };
    // Easter egg: five quick clicks on the name make the letters do a wave.
    let waveTimer = 0;
    const onWave = () => {
      if (motion.matches) return;
      heading.classList.remove("hero-wave");
      void heading.offsetWidth; // restart the animation if it's already running
      heading.classList.add("hero-wave");
      window.clearTimeout(waveTimer);
      waveTimer = window.setTimeout(
        () => heading.classList.remove("hero-wave"),
        1600,
      );
    };

    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerdown", onMove);
    area.addEventListener("pointerleave", onLeave);
    area.addEventListener("pointerup", onUp);
    area.addEventListener("pointercancel", onLeave);
    window.addEventListener(HERO_WAVE_EVENT, onWave);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(waveTimer);
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerdown", onMove);
      area.removeEventListener("pointerleave", onLeave);
      area.removeEventListener("pointerup", onUp);
      area.removeEventListener("pointercancel", onLeave);
      window.removeEventListener(HERO_WAVE_EVENT, onWave);
    };
  }, [dots]);

  const words = name.split(" ");
  let n = 0;
  let dotCount = 0;

  return (
    <>
      <h1
        ref={ref}
        id={id}
        className="hero-name font-display text-[clamp(3.25rem,13vw,9.5rem)] leading-[0.88] font-bold tracking-[-0.045em]"
      >
        <span className="sr-only">{name}</span>
        <span aria-hidden="true" className="flex flex-wrap gap-x-[0.22em]">
          {words.map((word, w) => (
            <span key={w} className="whitespace-nowrap">
              {Array.from(word).map((char, i) => {
                const dotted = dots !== null && char === "i";
                const index = n++;
                // Slingshot: one rock; every later i is home to the goblin who fetches it.
                const dotIndex = dotted ? dotCount++ : -1;
                const goblin = dotted && dots === "slingshot" && dotIndex > 0;
                return (
                  <span
                    key={i}
                    data-letter
                    className="hero-letter relative inline-block"
                    style={{ "--i": index } as React.CSSProperties}
                  >
                    {/* Dotless ı (U+0131) so the emoji can take the dot's place. */}
                    {dotted ? "ı" : char}
                    {dotted && dots === "fruit" ? (
                      <span data-emoji className="hero-dot hero-emoji" />
                    ) : null}
                    {/* Slingshot: drag the rock (engine handles the physics); touch-action: none so it doesn't scroll. */}
                    {dotted && dots === "slingshot" && !goblin ? (
                      <span
                        data-rock
                        data-state="ready"
                        className="hero-dot hero-rock"
                      />
                    ) : null}
                    {goblin ? (
                      <span
                        data-goblin
                        data-state="home"
                        className="hero-dot hero-goblin"
                      />
                    ) : null}
                    {/* Farm: the dots tell a little story; clicking one moves it along. */}
                    {dotted && dots === "farm" ? (
                      <FarmDot
                        key={`${stage}-${dotIndex}`}
                        index={dotIndex}
                        stage={stage}
                        fire={fire}
                        cooked={cooked === stage}
                        onCook={() => {
                          setCooked(stage);
                          reveal("sunny", "Sunny side up! You cooked the farm egg.");
                        }}
                        onChoose={choose}
                      />
                    ) : null}
                    {/* Bubbles rise from here; the engine spawns and pops them. */}
                    {dotted && dots === "bubbles" ? (
                      <span data-bubble className="hero-dot hero-bubble" />
                    ) : null}
                  </span>
                );
              })}
            </span>
          ))}
        </span>
      </h1>
      {dots === "farm" ? (
        <FarmNarration stage={stage} onChoose={(to) => choose(to)} />
      ) : null}
    </>
  );
}

/** One farm dot: clicking it moves the story along; an egg can be cooked with the Fire trail. */
function FarmDot({
  index,
  stage,
  fire,
  cooked,
  onCook,
  onChoose,
}: {
  index: number;
  stage: Stage;
  fire: boolean;
  cooked: boolean;
  onCook: () => void;
  onChoose: (to: string, at: { x: number; y: number }) => void;
}) {
  const farm = node(stage);
  const glyph = farm.dots[Math.min(index, 1)];
  const isEgg = glyph === "🥚" && !farm.tint;
  const heat = useRef(0);
  const last = useRef(0);
  return (
    <span
      data-farm-dot={index}
      className={`hero-dot hero-emoji hero-farm${farm.tint && index === 1 ? ` is-${farm.tint}` : ""}`}
      onClick={(e) => {
        const at = { x: e.clientX, y: e.clientY };
        // Endings start over; "are you sure?" moments need the buttons.
        if (farm.ending) onChoose("start", at);
        else if (!farm.askOnly && farm.choices?.[0]) onChoose(farm.choices[0].to, at);
      }}
      onPointerMove={(e) => {
        if (!isEgg || cooked || !fire) return;
        heat.current += Math.min(100, e.timeStamp - last.current);
        last.current = e.timeStamp;
        if (heat.current > 900) onCook();
      }}
    >
      {isEgg && cooked ? "🍳" : glyph}
    </span>
  );
}
