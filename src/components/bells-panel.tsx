"use client";

import { useId, useState, useSyncExternalStore } from "react";
import {
  blockedByMotion,
  CATEGORIES,
  DEFAULT_FUN,
  getFun,
  LOOKS,
  peekSecret,
  SECRET_LIST,
  type Secret,
  setEffectOn,
  setFunOn,
  setSoundHover,
  setLook,
  setVariant,
  shuffle,
  subscribeFun,
  type Category,
  type Look,
} from "@/lib/fun";
import { prefersReducedMotion } from "@/lib/events";
import { burst, sound, toast } from "@/lib/fx";

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
      sound("toggle");
    }
  };

  const onShuffle = () => {
    const picks = shuffle();
    burst("confetti");
    sound("toggle");
    toast(`Shuffled: ${picks.join(", ")}`);
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={PANEL_ID}
        aria-label="Bells and whistles"
        title="Bells and whistles"
        data-on={fun.on || undefined}
        className="bells-button relative inline-flex h-11 items-center justify-center rounded-full border border-line px-2 text-ink hover:border-ink/40"
      >
        <BellsAndWhistlesIcon />
      </button>

      <div
        id={PANEL_ID}
        popover="auto"
        role="dialog"
        aria-labelledby={headingId}
        className="bells-panel fixed inset-auto top-16 right-4 m-0 max-h-[calc(100dvh-5rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={headingId} className="font-display text-xl font-semibold tracking-tight">
              Bells and whistles
            </h2>
            <p className="mt-1 text-sm text-muted">Optional extras. The regular site is always one click away.</p>
          </div>
          <button
            type="button"
            popoverTarget={PANEL_ID}
            popoverTargetAction="hide"
            aria-label="Close"
            className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {fun.on ? <SecretsProgress found={fun.secrets} peeked={fun.peeked} /> : null}

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-paper p-3">
          <Switch label="Enable bells and whistles" checked={fun.on} onChange={toggleAll} className="flex-1 font-medium" />
        </div>
        <button
          type="button"
          onClick={onShuffle}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line font-medium hover:border-ink/40"
        >
          <ShuffleIcon /> Shuffle everything
        </button>

        <div className="mt-4 space-y-1">
          {CATEGORIES.map((c) => (
            <EffectRow key={c.id} category={c.id} reduced={reduced} />
          ))}
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm text-muted">Theme</legend>
          <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {LOOKS.map((l) => (
              <label
                key={l.id}
                title={l.description}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line px-1.5 text-center text-sm leading-tight has-checked:border-kelp has-checked:bg-kelp has-checked:text-kelp-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)]"
              >
                <input
                  type="radio"
                  name="look"
                  value={l.id}
                  checked={fun.look === l.id}
                  onChange={() => {
                    setLook(l.id as Look);
                    sound("toggle");
                  }}
                  className="sr-only"
                />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>

      </div>
    </>
  );
}

/**
 * Achievements: a progress bar that opens into a badge list. Locked badges are
 * blurred; tapping one reveals its icon as a hint (the title stays hidden).
 */
function SecretsProgress({ found, peeked }: { found: string[]; peeked: string[] }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const listId = useId();
  const selected = SECRET_LIST.find((x) => x.id === detail);
  const total = SECRET_LIST.length;
  const pct = Math.round((found.length / total) * 100);

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-lg border border-line p-3 text-left hover:border-ink/40"
      >
        <span className="flex items-center justify-between text-sm">
          <span className="font-medium">Secrets found</span>
          <span className="text-muted">
            {found.length} of {total}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`ml-1 inline transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </span>
        <span aria-hidden="true" className="mt-2 block h-2 overflow-hidden rounded-full bg-paper">
          <span className="block h-full rounded-full bg-kelp transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </span>
      </button>
      {open ? (
        <ul id={listId} className="mt-2 grid grid-cols-5 gap-2" aria-label="Secrets">
          {SECRET_LIST.map((secret, i) => {
            const isFound = found.includes(secret.id);
            const isPeeked = peeked.includes(secret.id);
            return (
              <li key={secret.id}>
                <button
                  type="button"
                  title={isFound ? `${secret.title}: ${secret.how}` : isPeeked ? "Still locked" : "Tap to peek at the hint"}
                  aria-label={isFound ? `Found: ${secret.title}. ${secret.how}` : isPeeked ? `Locked secret ${i + 1}. Hint icon: ${secret.icon}` : `Locked secret ${i + 1}. Tap to peek at its hint icon`}
                  aria-pressed={detail === secret.id}
                  onClick={() => {
                    if (!isFound) peekSecret(secret.id as Secret);
                    setDetail(secret.id);
                  }}
                  className={`flex aspect-square w-full flex-col items-center justify-center rounded-lg border text-2xl aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-[var(--focus)] ${isFound ? "border-kelp bg-paper" : "border-line border-dashed"}`}
                >
                  <span aria-hidden="true" className={isFound ? "" : isPeeked ? "opacity-70 grayscale" : "blur-[6px] grayscale"}>
                    {secret.icon}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open ? (
        <p className="mt-2 min-h-8 text-sm text-muted" aria-live="polite">
          {selected
            ? found.includes(selected.id)
              ? `${selected.title}: ${selected.how}.`
              : "Still locked. The icon is your hint."
            : found.length === total
              ? "You found them all. Nice."
              : "Tap a locked badge to peek at its hint; tap a found one to see how you got it."}
        </p>
      ) : null}
    </div>
  );
}

/** A category switch; when on, its options appear underneath as a segmented choice. */
function EffectRow({ category, reduced }: { category: Category; reduced: boolean }) {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const def = CATEGORIES.find((c) => c.id === category)!;
  const effect = fun.effects[category];
  const on = effect.on; // each switch reflects only itself
  const option = def.options.find((o) => o.id === effect.variant)!;
  const blocked = reduced && blockedByMotion(category, effect.variant);
  const groupId = useId();

  return (
    <div className="rounded-lg py-2">
      <Switch
        label={def.label}
        description={blocked ? "Paused because your device asks for reduced motion" : on ? option.description : def.description}
        checked={on}
        onChange={() => {
          setEffectOn(category, !on);
          sound("toggle");
        }}
      />
      {on ? (
        <div
          role="radiogroup"
          aria-labelledby={groupId}
          className={`mt-2 grid gap-1.5 ${def.options.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
        >
          <span id={groupId} className="sr-only">
            {def.label} style
          </span>
          {def.options.map((o) => {
            const selected = effect.variant === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                title={o.description}
                onClick={() => {
                  setVariant(category, o.id);
                  sound("toggle");
                }}
                className="min-h-10 rounded-md border border-line px-1.5 text-sm leading-tight aria-checked:border-kelp aria-checked:bg-kelp aria-checked:text-kelp-ink"
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {on && category === "sound" ? (
        <Switch
          label="Hover sounds"
          description="Off keeps sounds for presses, pops and launches only"
          checked={effect.hover !== false}
          onChange={() => setSoundHover(effect.hover === false)}
          className="mt-2 pl-3 text-sm"
        />
      ) : null}
    </div>
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

/**
 * Literally "bells & whistles": two splayed bells, an ampersand, two splayed
 * whistles. Solid silhouettes read best at header size; the front shapes get a
 * background-colored outline so the overlap stays crisp in every theme and look.
 */
function BellsAndWhistlesIcon() {
  const bell = "M0-8.5C3.6-8.5 5.6-5.6 5.6-1.6V3.2L7.6 6.2H-7.6L-5.6 3.2V-1.6C-5.6-5.6-3.6-8.5 0-8.5Z";
  const whistle = "M-1-4H10.5a1 1 0 0 1 1 1V0.5a1 1 0 0 1-1 1H4.2A5.2 5.2 0 1 1-1-4Z";
  const cut = { stroke: "var(--paper)", strokeWidth: 1.2, paintOrder: "stroke" } as const;
  return (
    <svg width="88" height="31" viewBox="0 0 80 28" fill="currentColor" aria-hidden="true" className="bells-icon">
      <g className="bell-back" transform="translate(10 14.5) rotate(-20)" opacity="0.5">
        <path d={bell} />
        <circle cy="-9.6" r="1.3" />
        <circle cy="8.2" r="1.8" />
      </g>
      <g className="bell-front" transform="translate(17.5 13.5) rotate(14)">
        <path d={bell} {...cut} />
        <circle cy="-9.6" r="1.3" />
        <circle cy="8.2" r="1.8" />
      </g>
      <text x="39.5" y="19.5" textAnchor="middle" fontSize="17" fontWeight="700" className="font-display">
        &amp;
      </text>
      <g transform="translate(59 9.5) rotate(-26)" opacity="0.5">
        <path d={whistle} />
        <circle cx="-5.6" cy="-4.4" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </g>
      <g transform="translate(60 17) rotate(8)">
        <path d={whistle} {...cut} />
        <circle cx="-1" cy="1.2" r="1.7" fill="var(--paper)" />
        <circle cx="-5.6" cy="-4.4" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h3.5c2 0 3.2 1 4.5 3l2 4c1.3 2 2.5 3 4.5 3H21M18 14l3 3-3 3M3 17h3.5c1.2 0 2.1-.4 2.9-1.1M13.6 8.1C14.4 7.4 15.3 7 16.5 7H21M18 4l3 3-3 3" />
    </svg>
  );
}
