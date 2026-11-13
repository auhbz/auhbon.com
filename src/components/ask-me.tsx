"use client";

import { useEffect, useState } from "react";
import { FUN_EVENT, getFun } from "@/lib/fun";
import { funMode } from "@/lib/unlocks";
import { openPalette } from "@/lib/events";

/**
 * Questions that nudge visitors toward the typed secret words without giving
 * them away. They show up in Fun mode as an occasional "Quick question" bubble,
 * and in Quick actions under "Ask me". Typing the answer anywhere still works.
 */
export const ASK_QUESTIONS: { id: string; question: string; hint: string }[] = [
  { id: "pho", question: "What's my favorite food?", hint: "It's a soup." },
  { id: "hire", question: "What should you do after reading my resume?", hint: "One short word, and a great idea." },
  { id: "meeple", question: "What are the little wooden people in board games called?", hint: "It's a fun word to say." },
  { id: "auhbon", question: "Some secrets are hidden in ordinary words.", hint: "Try typing a word you associate with this site." },
];

/** Questions whose answers haven't been typed yet. */
export const openQuestions = () => ASK_QUESTIONS.filter((q) => !getFun().secrets.includes(q.id));

const FIRST_MS = 40_000;
const SHOW_MS = 16_000;

/**
 * The "Quick question" bubble: once per visit, about 40 seconds into Fun mode,
 * if there's an unanswered question. Small, bottom-left, dismissable, and it
 * leaves on its own. "Another one" asks a different question.
 */
export function AskMe() {
  const [q, setQ] = useState<(typeof ASK_QUESTIONS)[number] | null>(null);

  useEffect(() => {
    let shown = false;
    let timer = 0;
    const arm = () => {
      if (shown || timer || funMode(getFun()) !== "fun") return;
      timer = window.setTimeout(() => {
        timer = 0;
        const open = openQuestions();
        // Not over a mini game, a dozing page, or once everything is answered.
        if (!open.length || funMode(getFun()) !== "fun" || document.documentElement.dataset.game || document.documentElement.dataset.dozing) return;
        shown = true;
        setQ(open[Math.floor(Math.random() * open.length)]);
      }, FIRST_MS);
    };
    arm();
    window.addEventListener(FUN_EVENT, arm);
    return () => {
      window.removeEventListener(FUN_EVENT, arm);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!q) return;
    // Answered (typed anywhere) or ignored: it bows out.
    const onFun = () => {
      if (getFun().secrets.includes(q.id)) setQ(null);
    };
    window.addEventListener(FUN_EVENT, onFun);
    const t = window.setTimeout(() => setQ(null), SHOW_MS);
    return () => {
      window.removeEventListener(FUN_EVENT, onFun);
      window.clearTimeout(t);
    };
  }, [q]);

  if (!q) return null;
  const others = openQuestions().filter((x) => x.id !== q.id);
  // Phones have no keyboard on the page; Quick actions takes typed words there.
  const touch = window.matchMedia("(pointer: coarse)").matches;
  return (
    <aside aria-label="A question for you" className="ask-me" data-ask-me>
      <p className="ask-me-q">
        <span aria-hidden="true">💭 </span>
        Quick question: {q.question}
      </p>
      <p className="ask-me-nudge">
        {q.hint} {touch ? "Type your answer in Quick actions." : "Type your answer anywhere on the page."}
      </p>
      <div className="ask-me-actions">
        {touch ? (
          <button
            type="button"
            className="ask-me-btn"
            onClick={() => {
              setQ(null);
              openPalette();
            }}
          >
            Answer
          </button>
        ) : null}
        {others.length ? (
          <button type="button" className="ask-me-btn" onClick={() => setQ(others[Math.floor(Math.random() * others.length)])}>
            Another one
          </button>
        ) : null}
        <button type="button" className="ask-me-btn" onClick={() => setQ(null)}>
          Close
        </button>
      </div>
    </aside>
  );
}
