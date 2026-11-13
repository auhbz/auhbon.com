"use client";

import { useState } from "react";
import { DRAFT_FINALE_EVENT } from "@/components/celebrations";
import { prefersReducedMotion } from "@/lib/events";

const options = [
  { id: "disco", label: "Disco floor", icons: ["💠", "✨", "🕺"] },
  { id: "confetti", label: "Confetti storm", icons: ["🎉", "🎊", "✨"] },
  { id: "sun", label: "Dancing suns", icons: ["☀️", "🌞", "🌟"] },
] as const;

export function CelebrationLab() {
  const [choice, setChoice] = useState<{ id: number; option: (typeof options)[number] } | null>(null);
  const [message, setMessage] = useState("");
  return (
    <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8" aria-labelledby="celebration-lab-title">
      <h2 id="celebration-lab-title" className="font-display text-2xl font-semibold">Celebration ideas</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.id} type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => {
            setMessage(`Playing ${option.label}.`);
            if (!prefersReducedMotion()) setChoice({ id: Date.now(), option });
          }}>{option.label}</button>
        ))}
        <button type="button" className="min-h-11 rounded-full border border-line px-4"
          onClick={() => window.dispatchEvent(new Event(DRAFT_FINALE_EVENT))}>Try the doubled finale</button>
      </div>
      <p role="status" className="mt-2 text-sm text-muted">{message}</p>
      {choice ? (
        <div key={choice.id} className={`draft-party draft-party-${choice.option.id}`} aria-hidden="true"
          onAnimationEnd={(event) => { if (event.target === event.currentTarget) setChoice(null); }}>
          {Array.from({ length: choice.option.id === "sun" ? 10 : 28 }, (_, index) => (
            <span key={index} style={{
              left: `${(index * 37) % 99}%`,
              top: `${(index * 53) % 88}%`,
              animationDelay: `${(index % 7) * 0.18}s`,
              fontSize: `${2 + (index % 4) * (choice.option.id === "sun" ? 1.4 : 0.35)}rem`,
            }}>{choice.option.icons[index % 3]}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
