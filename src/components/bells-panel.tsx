"use client";

import { useId, useSyncExternalStore } from "react";
import {
  DEFAULT_FUN,
  FEATURES,
  getFun,
  LOOKS,
  SECRETS,
  setFeature,
  setFunOn,
  setLook,
  subscribeFun,
  type Look,
} from "@/lib/fun";
import { prefersReducedMotion } from "@/lib/events";
import { burst, playSound } from "@/lib/fx";

const PANEL_ID = "bells-panel";
const noSubscribe = () => () => {};

/**
 * Header button + popover with every playful switch. Uses the native Popover
 * API: Esc and clicking outside close it, and focus handling comes for free.
 */
export function BellsPanel() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const reduced = useSyncExternalStore(noSubscribe, prefersReducedMotion, () => false);
  const headingId = useId();

  const toggleAll = () => {
    const next = !fun.on;
    setFunOn(next);
    if (next) {
      burst("confetti");
      if (fun.features.sound) playSound("fanfare");
    }
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={PANEL_ID}
        aria-label="Bells and whistles"
        title="Bells and whistles"
        className="bells-button relative inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-ink"
      >
        <BellIcon filled={fun.on} />
        {fun.on ? <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-kelp" /> : null}
      </button>

      <div
        id={PANEL_ID}
        popover="auto"
        role="dialog"
        aria-labelledby={headingId}
        className="bells-panel fixed inset-auto top-16 right-4 m-0 max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl"
      >
        <h2 id={headingId} className="font-display text-xl font-semibold tracking-tight">
          Bells and whistles
        </h2>
        <p className="mt-1 text-sm text-muted">Optional extras. The regular site is always one click away.</p>

        <Switch
          label="Enable bells and whistles"
          checked={fun.on}
          onChange={toggleAll}
          className="mt-4 rounded-lg bg-paper p-3 font-medium"
        />

        <fieldset className="mt-4" disabled={!fun.on}>
          <legend className="text-sm text-muted">Effects</legend>
          <div className={fun.on ? "" : "opacity-50"}>
            {FEATURES.map((f) => {
              const blocked = f.id === "sparkles" && reduced;
              return (
                <Switch
                  key={f.id}
                  label={f.label}
                  description={blocked ? "Off because your device asks for reduced motion" : f.description}
                  checked={fun.features[f.id] && !blocked}
                  disabled={blocked}
                  onChange={() => setFeature(f.id, !fun.features[f.id])}
                  className="py-2"
                />
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-3" disabled={!fun.on}>
          <legend className="text-sm text-muted">Look</legend>
          <div className={`mt-1 grid grid-cols-3 gap-2 ${fun.on ? "" : "opacity-50"}`}>
            {LOOKS.map((l) => (
              <label
                key={l.id}
                title={l.description}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line px-2 text-sm has-checked:border-kelp has-checked:bg-kelp has-checked:text-kelp-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)]"
              >
                <input
                  type="radio"
                  name="look"
                  value={l.id}
                  checked={fun.look === l.id}
                  onChange={() => setLook(l.id as Look)}
                  className="sr-only"
                />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          Secrets found: <strong className="text-ink">{fun.secrets.length}</strong> of {SECRETS.length}
          {fun.secrets.length < SECRETS.length ? ". Keen eyes and old cheat codes help." : ". You found them all. Nice."}
        </p>
      </div>
    </>
  );
}

function Switch({
  label,
  description,
  checked,
  disabled,
  onChange,
  className = "",
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div>
        <span id={`${id}-label`} className="block">
          {label}
        </span>
        {description ? (
          <span id={`${id}-desc`} className="block text-sm text-muted">
            {description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={onChange}
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-muted transition-colors aria-checked:bg-kelp disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={`inline-block size-5 rounded-full bg-paper shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}
