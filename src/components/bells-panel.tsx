"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  blockedByMotion,
  CATEGORIES,
  DEFAULT_FUN,
  getFun,
  LOOKS,
  markWelcomed,
  MILESTONES,
  modesUnlocked,
  unlockAllSecrets,
  resetSecrets,
  dueMilestones,
  markCelebrated,
  peekSecret,
  SECRET_GOAL,
  SECRET_LIST,
  type Secret,
  setEffectOn,
  setFunOn,
  setHaptics,
  setMotion,
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
import { GoblinGuide } from "@/components/goblin";
import { celebrate } from "@/components/celebrations";
import { startGame } from "@/components/game-layer";
import { GAMES } from "@/lib/games";
import { canTilt, canVibrate, haptic, onShake, requestMotionPermission } from "@/lib/device";
import { DraftPanelSection } from "@/components/draft/panel-section"; // draft-only

const PANEL_ID = "bells-panel";
const SECRETS_ID = "secrets-panel";
const noSubscribe = () => () => {};

/** Shuffle everything, with the confetti, sound and toast (the button, or a shake). */
function shuffleWithFanfare() {
  const picks = shuffle();
  burst("confetti");
  sound("toggle");
  toast(`Shuffled: ${picks.join(", ")}`);
}

/**
 * On phones the panels are bottom sheets (see globals.css), with a grab handle.
 * Dragging the handle down far enough closes the sheet. Decorative for assistive
 * tech: the Close button, Esc and tapping outside all still work.
 */
function SheetHandle({ panelId }: { panelId: string }) {
  const drag = useRef<{ id: number; y: number; t: number; dy: number } | null>(null);
  const panel = () => document.getElementById(panelId);
  const reset = () => {
    const p = panel();
    if (p) {
      p.style.transform = "";
      p.style.transition = "";
    }
    drag.current = null;
  };
  return (
    <div
      aria-hidden="true"
      className="sheet-handle"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        drag.current = { id: e.pointerId, y: e.clientY, t: performance.now(), dy: 0 };
        const p = panel();
        if (p) p.style.transition = "none";
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        const p = panel();
        if (!d || d.id !== e.pointerId || !p) return;
        d.dy = Math.max(0, e.clientY - d.y);
        p.style.transform = d.dy ? `translateY(${d.dy}px)` : "";
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const fast = d.dy / Math.max(1, performance.now() - d.t) > 0.5;
        if (d.dy > 90 || (fast && d.dy > 30)) panel()?.hidePopover();
        reset();
      }}
      onPointerCancel={reset}
    >
      <span className="sheet-grip" />
    </div>
  );
}

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

  // Motion controls: shaking the phone shuffles, like the button (at most every 2s).
  const shake = fun.on && fun.motion;
  useEffect(() => (shake ? onShake(shuffleWithFanfare, 2000) : undefined), [shake]);

  return (
    <>
      {/* The trophy sits left of the badge, so the guide goblin has room on the badge's right. */}
      <SecretsChip />
      <span className="relative inline-flex">
        <button
          type="button"
          popoverTarget={PANEL_ID}
          aria-label="Bells and whistles"
          title="Bells and whistles"
          data-on={fun.on || undefined}
          onClick={markWelcomed}
          className="bells-button relative inline-flex h-11 items-center justify-center rounded-full border border-line px-2 text-ink hover:border-ink/40"
        >
          <BellsAndWhistlesIcon />
        </button>
        <GoblinGuide />
      </span>

      <div
        id={PANEL_ID}
        popover="auto"
        role="dialog"
        aria-labelledby={headingId}
        className="bells-panel fixed inset-auto top-16 right-4 m-0 max-h-[calc(100dvh-5rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl"
      >
        <SheetHandle panelId={PANEL_ID} />
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

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-paper p-3">
          <Switch label="Enable bells and whistles" checked={fun.on} onChange={toggleAll} className="flex-1 font-medium" />
        </div>
        <button
          type="button"
          onClick={shuffleWithFanfare}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line font-medium hover:border-ink/40"
        >
          <ShuffleIcon /> Shuffle everything
        </button>

        <div className="mt-4 space-y-1">
          {CATEGORIES.map((c) => (
            <EffectRow key={c.id} category={c.id} reduced={reduced} />
          ))}
          <PhoneSwitches />
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

        <ModeSection />

        {/* Draft-only: renders nothing outside /dev/draft (see src/components/draft/). */}
        <DraftPanelSection />
      </div>
    </>
  );
}

/**
 * Phone-only switches: Motion controls (where the device has motion sensors) and
 * Haptics (where it can vibrate, i.e. Android). Desktop never shows them.
 */
function PhoneSwitches() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const tilt = useSyncExternalStore(noSubscribe, canTilt, () => false);
  const vibrate = useSyncExternalStore(noSubscribe, canVibrate, () => false);
  const [denied, setDenied] = useState(false);
  if (!tilt && !vibrate) return null;

  const toggleMotion = () => {
    if (fun.motion) {
      setMotion(false);
      return;
    }
    // iOS: this must run straight from the tap, so the permission prompt can show.
    requestMotionPermission().then((ok) => {
      setDenied(!ok);
      if (ok) {
        setMotion(true);
        sound("toggle");
      }
    });
  };

  return (
    <>
      {tilt ? (
        <div className="py-2">
          <Switch
            label="Motion controls"
            description="Tilt to steer bubbles and aim the slingshot; shake to shuffle"
            checked={fun.motion}
            onChange={toggleMotion}
          />
          <p role="status" className="mt-1 text-sm text-muted empty:hidden">
            {denied ? "Motion access was turned down, so this stays off. You can allow it in your browser settings." : ""}
          </p>
        </div>
      ) : null}
      {vibrate ? (
        <div className="py-2">
          <Switch label="Haptics" description="A light buzz when you press things" checked={fun.haptics} onChange={() => setHaptics(!fun.haptics)} />
        </div>
      ) : null}
    </>
  );
}

/** Game modes: locked until every secret is found (or unlocked with my favorite number). */
function ModeSection() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const unlocked = modesUnlocked(fun);
  return (
    <fieldset className="mt-4" data-modes={unlocked ? "unlocked" : "locked"}>
      <legend className="text-sm text-muted">Mode</legend>
      {unlocked ? (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button type="button" aria-pressed="true" className="min-h-11 rounded-lg border border-kelp bg-kelp px-2 text-sm text-kelp-ink">
            Standard
          </button>
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              title={g.how}
              onClick={() => {
                document.getElementById(PANEL_ID)?.hidePopover();
                startGame(g.id);
              }}
              className="min-h-11 rounded-lg border border-line px-2 text-sm hover:border-ink/40"
            >
              {g.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1 rounded-lg border border-dashed border-line p-3 text-sm text-muted">
          <span aria-hidden="true">🔒 </span>Find every secret to unlock three game modes. Know my favorite number? Try the trophy button.
        </p>
      )}
    </fieldset>
  );
}

/**
 * The secrets tracker lives beside the Bells & whistles badge (not inside its
 * panel), and it's always there, so visitors know secrets exist from the start.
 */
function SecretsChip() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const headingId = useId();
  if (!mounted) return null;
  const n = fun.secrets.length;
  return (
    <>
      <button
        type="button"
        popoverTarget={SECRETS_ID}
        aria-label={`Secrets: ${n} of ${SECRET_GOAL} found`}
        title="Secrets"
        data-secrets-chip
        className="pill inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium tabular-nums hover:border-ink/40 max-sm:min-w-11 max-sm:justify-center max-sm:gap-1 max-sm:px-2"
      >
        <TrophyIcon />
        {n}
      </button>
      <div
        id={SECRETS_ID}
        popover="auto"
        role="dialog"
        aria-labelledby={headingId}
        className="bells-panel fixed inset-auto top-16 right-4 m-0 max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl"
      >
        <SheetHandle panelId={SECRETS_ID} />
        <div className="flex items-start justify-between gap-3">
          <h2 id={headingId} className="font-display text-xl font-semibold tracking-tight">
            Secrets
          </h2>
          <button
            type="button"
            popoverTarget={SECRETS_ID}
            popoverTargetAction="hide"
            aria-label="Close secrets"
            className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <SecretsProgress found={fun.secrets} peeked={fun.peeked} />
        <UnlockAll />
      </div>
    </>
  );
}

/** "Unlock all secrets", behind a numpad: only for people who know my favorite number. */
function UnlockAll() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const all = modesUnlocked(fun);
  const dialog = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  // "code" → enter the number; "confirm" → the right number, now spell out what happens.
  const [stage, setStage] = useState<"code" | "confirm">("code");
  const [resetting, setResetting] = useState(false);
  const titleId = useId();
  const missing = SECRET_LIST.length - fun.secrets.filter((id) => SECRET_LIST.some((x) => x.id === id)).length;

  const press = (d: string) => {
    if (stage !== "code") return;
    setWrong(false);
    setCode((c) => (c + d).slice(0, 6));
  };
  const submit = () => {
    if (stage === "confirm") return unlock();
    if (code === "137") {
      setStage("confirm");
      sound("toggle");
    } else {
      setWrong(true);
      setCode("");
      sound("hit");
    }
  };
  const unlock = () => {
    dialog.current?.close();
    unlockAllSecrets();
    burst("confetti");
    sound("secret");
    haptic("secret");
    toast("You know my favorite number. Every secret unlocked, and the game modes too.");
    for (const m of dueMilestones(getFun())) {
      markCelebrated(m.at);
      window.setTimeout(() => celebrate(m.at), 1400);
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-3">
      <Switch
        label="Unlock all secrets"
        description={all ? "Everything's unlocked" : "If you know my favorite number"}
        checked={all}
        disabled={all}
        onChange={() => {
          setCode("");
          setWrong(false);
          setStage("code");
          dialog.current?.showModal();
        }}
        className="text-sm"
      />
      {resetting ? (
        <div role="group" aria-label="Reset all secrets?" className="rounded-lg border border-line p-3 text-sm">
          <p>
            This clears the {fun.secrets.length} {fun.secrets.length === 1 ? "secret" : "secrets"} you&apos;ve found, the hints you peeked at, the
            milestone parties and the goblin&apos;s hiding place. Game modes lock again. Your effect settings stay as they are.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetSecrets();
                setResetting(false);
                toast("All secrets reset. Happy hunting.");
              }}
              className="min-h-10 rounded-full bg-kelp px-4 font-medium text-kelp-ink"
            >
              Reset everything
            </button>
            <button type="button" onClick={() => setResetting(false)} className="min-h-10 rounded-full border border-line px-4">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setResetting(true)}
          disabled={!fun.secrets.length && !fun.peeked.length}
          className="min-h-10 text-sm text-muted underline underline-offset-4 hover:text-ink disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
        >
          Reset all secrets
        </button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        onKeyDown={(e) => {
          if (/^[0-9]$/.test(e.key)) press(e.key);
          else if (e.key === "Backspace") setCode((c) => c.slice(0, -1));
          else if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="numpad m-auto w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight">
          {stage === "code" ? "What's my favorite number?" : "137. You know me. Unlock everything?"}
        </h2>
        {stage === "code" ? (
          <>
            <output
              aria-live="polite"
              className={`mt-3 flex h-12 items-center justify-center rounded-lg bg-paper font-mono text-2xl tracking-[0.4em] tabular-nums ${wrong ? "numpad-wrong" : ""}`}
            >
              {wrong ? "Nope" : code || "\u00a0"}
            </output>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button key={d} type="button" onClick={() => press(d)} className="numpad-key">
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => setCode("")} className="numpad-key text-sm" aria-label="Clear">
                Clear
              </button>
              <button type="button" onClick={() => press("0")} className="numpad-key">
                0
              </button>
              <button type="button" onClick={submit} className="numpad-key numpad-enter text-sm">
                Enter
              </button>
            </div>
          </>
        ) : (
          <>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              <li>
                The {missing} {missing === 1 ? "secret" : "secrets"} you haven&apos;t found yet will be marked found, without you finding them.
              </li>
              <li>The three game modes unlock.</li>
              <li>Any milestone parties you pass will play.</li>
              <li>You can undo it any time with &ldquo;Reset all secrets&rdquo;, which clears every secret, including the ones you found yourself.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={unlock} className="numpad-key numpad-enter flex-1 px-3 text-sm" autoFocus>
                Unlock everything
              </button>
              <button type="button" onClick={() => dialog.current?.close()} className="numpad-key flex-1 px-3 text-sm">
                Cancel
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
    </svg>
  );
}

/**
 * Achievements: a progress bar that opens into a badge list. Locked badges are
 * blurred; tapping one reveals its icon as a hint (the title stays hidden).
 */
function SecretsProgress({ found, peeked }: { found: string[]; peeked: string[] }) {
  const [open, setOpen] = useState(true);
  const [detail, setDetail] = useState<string | null>(null);
  const listId = useId();
  const selected = SECRET_LIST.find((x) => x.id === detail);
  const total = SECRET_GOAL;
  const pct = Math.min(100, (found.length / total) * 100);
  const next = MILESTONES.find((m) => found.length < m.at);
  const reached = MILESTONES.filter((m) => found.length >= m.at);

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
        {/* Notches mark each milestone, so it's clear there's something to reach. */}
        <span aria-hidden="true" className="relative mt-2 block h-2 rounded-full bg-paper">
          <span className="block h-full rounded-full bg-kelp transition-[width] duration-500" style={{ width: `${pct}%` }} />
          {MILESTONES.slice(0, -1).map((m) => (
            <span
              key={m.at}
              data-notch={m.at}
              className={`absolute -top-0.5 h-3 w-0.5 -translate-x-1/2 rounded-full ${found.length >= m.at ? "bg-kelp-ink/70" : "bg-muted"}`}
              style={{ left: `${m.at}%` }}
            />
          ))}
        </span>
        <span className="mt-1.5 block text-xs text-muted">
          {next ? `Next celebration at ${next.at}` : "Every celebration unlocked"}
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
              : `Tap a locked badge to peek at its hint; tap a found one to see how you got it. ${SECRET_LIST.length} secrets are hidden so far, with more on the way.`}
        </p>
      ) : null}
      {open && reached.length ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Replay:</span>
          {reached.map((m) => (
            <button
              key={m.at}
              type="button"
              onClick={() => celebrate(m.at)}
              className="min-h-9 rounded-full border border-line px-3 hover:border-ink/40"
            >
              <span aria-hidden="true">{m.icon}</span> {m.name}
            </button>
          ))}
        </div>
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
          className={`mt-2 grid gap-1.5 ${def.options.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
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
    <svg width="88" height="31" viewBox="0 0 80 28" fill="currentColor" aria-hidden="true" className="bells-icon max-sm:h-[23px] max-sm:w-16">
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
