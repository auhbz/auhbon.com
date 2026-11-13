"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { workbench } from "@/lib/availability";
import { reveal } from "@/components/easter-eggs";
import { FUN_EVENT, getFun, SHUFFLE_EVENT } from "@/lib/fun";
import { funMode, useFunMode } from "@/lib/unlocks";

const isFun = () => funMode(getFun()) === "fun";
const found = (id: string) => getFun().secrets.includes(id);

/** Visits, remembered by local calendar day (only the dates, nothing else). */
const VISITS_KEY = "fun-visits-v1";
const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Whether this page load is a later-day visit (worked out once per page load). */
let returningVisit: boolean | null = null;
function isReturningVisit() {
  if (returningVisit !== null) return returningVisit;
  returningVisit = false;
  try {
    const v = JSON.parse(localStorage.getItem(VISITS_KEY) ?? "null") as { last?: string } | null;
    returningVisit = typeof v?.last === "string" && v.last < day();
    localStorage.setItem(VISITS_KEY, JSON.stringify({ last: day() }));
  } catch {
    // No storage: the tab-away route still works.
  }
  return returningVisit;
}

const CLICKS_GOAL = 100;
const SHUFFLES_GOAL = 5;
/** A break this long (tab hidden) counts as leaving and coming back. */
const AWAY_MS = 20_000;
/** No input for this long with Fun on and the page dozes off. */
const DOZE_MS = 45_000;

const isEarlyBirdHour = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 8;
};

/**
 * Passive secrets that watch the whole visit: lots of clicks, lots of shuffles,
 * coming back, an early-morning visit, and sitting still long enough that the
 * page dozes off. All of them only count in Fun mode, and none can fire on load.
 */
export function FunSecrets() {
  const [dozing, setDozing] = useState(false);
  const path = usePathname();
  const mode = useFunMode();

  useEffect(() => {
    if (workbench && mode === "fun" && (path === "/dev" || path.startsWith("/dev/"))) reveal("behind-the-scenes", "You found the working notes.");
  }, [mode, path]);

  useEffect(() => {
    let lastInput = performance.now();

    // --- Welcome back: another day, or a break of 20 seconds or more.
    let returning = isReturningVisit();
    const welcome = () => {
      if (returning && isFun() && !found("back")) reveal("back", "Welcome back! Good to see you again. 👋");
    };
    const firstCheck = window.setTimeout(welcome, 2500);
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) {
        returning = true;
        welcome();
      }
      hiddenAt = 0;
      lastInput = performance.now();
    };

    // --- Early bird: Fun mode on between 5 and 8 a.m. (checked now, on changes, and each minute).
    const earlyBird = () => {
      if (isFun() && !found("earlybird") && isEarlyBirdHour()) reveal("earlybird", "Early bird! Up with the sun. 🐦");
    };
    const birdTimer = window.setInterval(earlyBird, 60_000);
    const firstBird = window.setTimeout(earlyBird, 1500);
    const onFun = () => {
      earlyBird();
      welcome();
    };

    // --- Click happy: 100 clicks or taps in one visit (only those made in Fun mode count).
    let clicks = 0;
    const onDown = () => {
      if (!isFun()) return;
      clicks += 1;
      if (clicks === CLICKS_GOAL && !found("clicky")) reveal("clicky", "Click happy! That's 100 clicks. Your finger okay?");
    };

    // --- Every day I'm… : five shuffles in one visit.
    let shuffles = 0;
    const onShuffle = () => {
      shuffles += 1;
      if (shuffles === SHUFFLES_GOAL && isFun() && !found("shuffling")) reveal("shuffling", "Every day I'm… never mind. 🔀");
    };

    // --- Forty winks: no input for 45 seconds and the page dozes off.
    let asleep = false;
    const wake = () => {
      lastInput = performance.now();
      if (asleep) {
        asleep = false;
        setDozing(false);
      }
    };
    const dozeTimer = window.setInterval(() => {
      if (asleep || document.visibilityState !== "visible" || !isFun()) return;
      // Not while a mini game is running (nobody is idle in the middle of one).
      if (document.documentElement.dataset.game) {
        lastInput = performance.now();
        return;
      }
      if (performance.now() - lastInput < DOZE_MS) return;
      asleep = true;
      setDozing(true);
      if (!found("sleepy")) reveal("sleepy", "Zzz… oh! Forty winks. Move or press a key to wake the page.");
    }, 1000);
    const wakeEvents = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    for (const t of wakeEvents) window.addEventListener(t, wake, { passive: true });

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener(SHUFFLE_EVENT, onShuffle);
    window.addEventListener(FUN_EVENT, onFun);
    return () => {
      window.clearTimeout(firstCheck);
      window.clearTimeout(firstBird);
      window.clearInterval(birdTimer);
      window.clearInterval(dozeTimer);
      for (const t of wakeEvents) window.removeEventListener(t, wake);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener(SHUFFLE_EVENT, onShuffle);
      window.removeEventListener(FUN_EVENT, onFun);
    };
  }, []);

  useEffect(() => {
    const d = document.documentElement.dataset;
    if (dozing) d.dozing = "true";
    else delete d.dozing;
    return () => {
      delete d.dozing;
    };
  }, [dozing]);

  if (!dozing) return null;
  return (
    <div aria-hidden="true" className="doze">
      <span className="doze-moon">🌙</span>
      <span className="doze-z" style={{ "--i": 0 } as React.CSSProperties}>Z</span>
      <span className="doze-z" style={{ "--i": 1 } as React.CSSProperties}>z</span>
      <span className="doze-z" style={{ "--i": 2 } as React.CSSProperties}>z</span>
    </div>
  );
}
