"use client";

import { useEffect } from "react";
import { burst, sound, toast } from "@/lib/fx";
import { findSecret, getFun, SECRETS, setFunOn, type Secret } from "@/lib/fun";

export const HERO_WAVE_EVENT = "portfolio:hero-wave";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Celebrate a secret; the first find also shows progress. */
export function reveal(id: Secret, message: string) {
  const first = findSecret(id);
  const found = getFun().secrets.length;
  toast(first ? `${message} Secret ${found} of ${SECRETS.length} found.` : message);
  sound(first ? "secret" : "pop");
}

/**
 * Hidden delights that never change the default look: they only respond when
 * someone does something unusual. All are mouse/keyboard optional extras, and
 * nothing here is needed to use the site.
 */
export function EasterEggs({ email }: { email: string }) {
  useEffect(() => {
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
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      // ↑ ↑ ↓ ↓ ← → ← → B A
      konami = e.key.toLowerCase() === KONAMI[konami].toLowerCase() ? konami + 1 : e.key === "ArrowUp" ? 1 : 0;
      if (konami === KONAMI.length) {
        konami = 0;
        setFunOn(true);
        burst("confetti");
        reveal("konami", "Cheat code accepted. Bells and whistles on.");
      }
      // Typing "hire" anywhere on the page.
      if (e.key.length === 1) {
        typed = (typed + e.key.toLowerCase()).slice(-4);
        if (typed === "hire") {
          burst("confetti");
          reveal("hire", `Excellent idea. ${email}`);
        }
      }
    };

    // Clicking my name five times in a row.
    let clicks = 0;
    let clickTimer = 0;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest("#hero-name")) {
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

    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      window.clearTimeout(clickTimer);
    };
  }, [email]);

  return null;
}
