"use client";

import { useId, useRef, useState } from "react";
import { sound } from "@/lib/fx";
import { KONAMI, konamiDone } from "@/components/easter-eggs";

type Key = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "b" | "a";

const ARROWS: { key: Key; label: string; area: string; path: string }[] = [
  { key: "ArrowUp", label: "Up", area: "up", path: "M12 7l5 7H7z" },
  { key: "ArrowLeft", label: "Left", area: "left", path: "M7 12l7-5v10z" },
  { key: "ArrowRight", label: "Right", area: "right", path: "M17 12l-7 5V7z" },
  { key: "ArrowDown", label: "Down", area: "down", path: "M12 17l-5-7h10z" },
];

/**
 * Phones have no arrow keys, so the Konami code gets an on-screen gamepad: a
 * tiny controller icon in the footer (touch devices, Bells & whistles on) opens
 * a bigger pad with a D-pad and B and A. An original design, no branding.
 */
export function KonamiPad() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const titleId = useId();

  const press = (key: Key) => {
    sound("pop");
    const next = key === KONAMI[step] ? step + 1 : key === "ArrowUp" ? 1 : 0;
    if (next === KONAMI.length) {
      setStep(0);
      dialog.current?.close();
      konamiDone();
      return;
    }
    setStep(next);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Gamepad"
        title="Gamepad"
        data-konami-pad
        onClick={() => {
          setStep(0);
          dialog.current?.showModal();
        }}
        className="fun-only touch-only -my-2.5 inline-flex size-10 items-center justify-center rounded-full text-muted hover:text-ink"
      >
        <GamepadIcon />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto w-[min(21rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight">
              Gamepad
            </h2>
            <p className="text-sm text-muted">Know a cheat code?</p>
          </div>
          <button
            type="button"
            aria-label="Close gamepad"
            onClick={() => dialog.current?.close()}
            className="-mt-1 -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="gamepad mt-3">
          <p className="gamepad-progress" aria-hidden="true">
            {KONAMI.map((_, i) => (
              <span key={i} data-lit={i < step || undefined} />
            ))}
          </p>
          <div className="gamepad-face" role="group" aria-label="Gamepad buttons">
            <div className="gamepad-dpad">
              {ARROWS.map((a) => (
                <button key={a.key} type="button" aria-label={a.label} data-pad={a.key} style={{ gridArea: a.area }} onClick={() => press(a.key)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={a.path} />
                  </svg>
                </button>
              ))}
              <span aria-hidden="true" style={{ gridArea: "mid" }} />
            </div>
            <div className="gamepad-ab">
              {(["b", "a"] as const).map((k) => (
                <span key={k} className="gamepad-round">
                  <button type="button" aria-label={k.toUpperCase()} data-pad={k} onClick={() => press(k)} />
                  <span aria-hidden="true">{k.toUpperCase()}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

function GamepadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <path d="M7 10v4M5 12h4" strokeLinecap="round" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="11" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
