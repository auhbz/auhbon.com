"use client";

import { useEffect } from "react";
import { burst, SECRET_EVENT, sound, toast } from "@/lib/fx";
import { applyFunAttributes, comboSecrets, findSecret, FUN_EVENT, funActive, getFun, isFunMode, liveSecretCount, scaledMilestones, SECRETS, TYPED_SECRETS, type Secret } from "@/lib/fun";
import { unlockDef, unlockedIds } from "@/lib/unlocks";
import { celebrateDue } from "@/components/celebrations";
import { enterFunMode } from "@/components/fun-toggle";
import { haptic } from "@/lib/device";

export const HERO_WAVE_EVENT = "portfolio:hero-wave";

export const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** "a, b, and c" (Oxford comma). */
export function listJoin(items: string[]) {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Celebrate a secret; the first find also shows progress, any milestone it
 * crosses, and any fun features it unlocks. Does nothing in Boring mode.
 */
export function reveal(id: Secret, message: string) {
  if (!isFunMode(getFun())) return;
  const before = unlockedIds(getFun());
  const first = findSecret(id);
  const found = getFun().secrets.length;
  toast(first ? `${message} Secret ${found} of ${liveSecretCount()} found.` : message);
  sound(first ? "secret" : "pop");
  if (!first) return;
  haptic("secret");
  // Crossing a milestone throws a little party (once each; they can be replayed from the secrets list).
  const milestone = scaledMilestones().some((m) => m.count === found && !getFun().celebrated.includes(m.at));
  celebrateDue();
  const fresh = unlockedIds(getFun()).filter((u) => !before.includes(u));
  if (fresh.length) {
    const names = fresh.map((u) => unlockDef(u)?.label ?? u);
    window.setTimeout(() => toast(`Unlocked: ${listJoin(names)}.`), milestone ? 4200 : 2600);
  }
}

/** The Konami code, entered on the keyboard or the on-screen gamepad: it switches to Fun mode. */
export function konamiDone() {
  const wasFun = isFunMode(getFun());
  if (!wasFun) enterFunMode();
  else burst("confetti");
  reveal("konami", wasFun ? "Cheat code accepted. You're already in Fun mode." : "Cheat code accepted: Fun mode is on.");
}

/** What each typed word says when it's found (see TYPED_SECRETS). */
export function typedSecret(word: string, email: string) {
  const s = TYPED_SECRETS.find((t) => t.word === word);
  if (!s || !isFunMode(getFun())) return;
  burst("confetti");
  const messages: Record<string, string> = {
    hire: `Excellent idea. ${email}`,
    auhbon: "That's me! Nice to meet you.",
    meeple: "Meeple people! Up for a board game night?",
    pho: "Pho real. Best soup there is. 🍜",
  };
  reveal(s.id, messages[word] ?? "You typed a secret word.");
}

/** Which typed word, if any, `text` ends with. */
export function endsWithSecretWord(text: string) {
  const t = text.toLowerCase().replace(/[^a-z]/g, "");
  return TYPED_SECRETS.find((s) => t.endsWith(s.word))?.word ?? null;
}

/** Messages for secrets reported from elsewhere (the games, the canvas engine). */
const EVENT_MESSAGES: Partial<Record<Secret, string>> = {
  cookie: "Cookie monster! Om nom nom.",
  double: "Double trouble! 40 in Keepy Uppy.",
  perfect: "Perfectionist: three perfect drops in a row.",
  cadet: "Space cadet: first wave cleared.",
  leaf: "You caught the golden leaf!",
  skeleton: "Possessed! The ghost took the skeleton for a dance.",
  whatsthis: "This? It's a secret. You found it by asking.",
  podbay: "I'm sorry, Dave. I'm afraid I can't do that.",
  // MP5 (EFFECTS)
  breakaway: "Breakaway! That wheel is free (the hamster is fine, just dizzy).",
  sweep: "Clean sweep! Not a bubble in sight.",
  overload: "Short circuit! Easy on the buttons, they're only human.",
  scorched: "Scorched earth: every heading, toasted.",
  shakeoff: "Shake it off! The ghost lost its grip. It'll be back.",
  donuts: "Donut shop! Eight seconds of smoking tires.",
  deepspace: "Deep space: wave 4 and still flying.",
  pacifist: "Pacifist: thirty seconds, not one shot fired.",
  warmup: "Warmed up: 15 in Keepy Uppy.",
  skyhigh: "Sky high! Three bounces off the ceiling.",
  tower: "Tower: 10 blocks high.",
  skyscraper: "Skyscraper: 20 blocks! Don't look down.",
  // MP5 (THEMES)
  flap10: "Flap happy! 10 in Flabby.",
  flap25: "Frequent flapper! 25 in Flabby.",
  coward: "Coward! (Flabby's words, not mine.)",
  dazed: "Bonk! He's seeing stars.",
};

/** Combination secrets: certain effects and themes switched on together. */
const COMBO_MESSAGES: Partial<Record<Secret, string>> = {
  elements: "Elementalist: lightning, fire and water.",
  wild: "Back to nature.",
  haunted: "Creepy clown. 🎈",
  oldmac: "Old MacDonald had a farm. E-I-E-I-O!",
  breakfast: "Breakfast of champions: cookies, cereal and fruit.",
  hacker: "Hacker mode: I'm in.",
  arcade: "Insert coin. Player one, ready.",
  bigtop: "Welcome to the big top! 🎪",
};

const isNightOwlHour = () => {
  const h = new Date().getHours();
  return h >= 0 && h < 4;
};

/**
 * Hidden delights that never change the default look: they only respond when
 * someone does something unusual. All are mouse/keyboard optional extras, and
 * nothing here is needed to use the site.
 */
export function EasterEggs({ email }: { email: string }) {
  useEffect(() => {
    // The pre-hydration script paints the basics; this fills in the rest (and any lock fallbacks).
    applyFunAttributes(getFun());
    // A hello for anyone who opens dev tools.
    console.log(
      `%cHi, fellow developer 👋%c\nThis site hides ${SECRETS.length} secrets. Source: https://github.com/auhbz/auhbon.com\nLike what you see? ${email}`,
      "font: 600 16px system-ui; color: #1d6b58",
      "font: 13px system-ui",
    );

    let konami = 0;
    let typed = "";
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

    const onKey = (e: KeyboardEvent) => {
      // Any key at all, anywhere, while Bells & whistles is on. (Passive secrets stay
      // off on the clean site, so a keyboard user never gets a surprise toast.)
      if (funActive(getFun()) && !getFun().secrets.includes("keys")) {
        reveal("keys", "Keyboard warrior! There may be more secrets that need the keyboard…");
      }
      // Quick actions checks its own input for typed words (see CommandPalette).
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      // ↑ ↑ ↓ ↓ ← → ← → B A
      konami = e.key.toLowerCase() === KONAMI[konami].toLowerCase() ? konami + 1 : e.key === "ArrowUp" ? 1 : 0;
      if (konami === KONAMI.length) {
        konami = 0;
        konamiDone();
      }
      // Typing a secret word anywhere on the page.
      if (e.key.length === 1) {
        typed = (typed + e.key.toLowerCase()).slice(-12);
        const word = endsWithSecretWord(typed);
        if (word) {
          typed = "";
          typedSecret(word, email);
        }
      }
    };

    // Clicking my name five times in a row.
    let clicks = 0;
    let clickTimer = 0;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Boring mode: the name and the timeline are plain content.
      if (!isFunMode(getFun())) return;

      // (A hamster wheel on an i is its own toy, not a click on the name.)
      if (target.closest("#hero-name") && !target.closest("[data-hamster]")) {
        clicks += 1;
        window.clearTimeout(clickTimer);
        clickTimer = window.setTimeout(() => (clicks = 0), 900);
        if (clicks === 5) {
          clicks = 0;
          window.dispatchEvent(new Event(HERO_WAVE_EVENT));
          reveal("name", "You found the name trick.");
        }
      }

      // The current-job dot on the experience timeline (I work at a jewelry company).
      const dot = target.closest<HTMLElement>("[data-egg='dot']");
      if (dot) {
        const r = dot.getBoundingClientRect();
        burst("diamonds", r.left + r.width / 2, r.top + r.height / 2);
        if (dot.dataset.current === "true") reveal("diamond", "Shine bright.");
        else sound("pop");
      }
    };

    // Night owl: Bells & whistles on between midnight and 4 a.m. (checked now, on changes, and each minute).
    const nightOwl = () => {
      const f = getFun();
      if (funActive(f) && !f.secrets.includes("nightowl") && isNightOwlHour()) reveal("nightowl", "Night owl! Up late? Me too. 🦉");
    };
    const nightTimer = window.setInterval(nightOwl, 60_000);
    const firstNight = window.setTimeout(nightOwl, 1500);

    const onFun = () => {
      for (const combo of comboSecrets(getFun())) {
        if (getFun().secrets.includes(combo)) continue;
        burst("confetti");
        reveal(combo, COMBO_MESSAGES[combo] ?? "A secret combination.");
      }
      nightOwl();
    };

    const onSecret = (e: Event) => {
      const id = (e as CustomEvent<string>).detail as Secret;
      if (!SECRETS.includes(id) || !isFunMode(getFun())) return;
      reveal(id, EVENT_MESSAGES[id] ?? "You found a secret.");
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    window.addEventListener(FUN_EVENT, onFun);
    window.addEventListener(SECRET_EVENT, onSecret);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      window.removeEventListener(FUN_EVENT, onFun);
      window.removeEventListener(SECRET_EVENT, onSecret);
      window.clearTimeout(clickTimer);
      window.clearInterval(nightTimer);
      window.clearTimeout(firstNight);
    };
  }, [email]);

  return null;
}
