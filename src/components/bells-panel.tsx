"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  blockedByMotion,
  CATEGORIES,
  DEFAULT_FUN,
  effectId,
  funActive,
  getFun,
  isFunMode,
  liveSecretCount,
  LOOKS,
  markWelcomed,
  resetSecrets,
  hintSecret,
  peekSecret,
  scaledMilestones,
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
  themeId,
  type Category,
  type Look,
} from "@/lib/fun";
import { isUnlocked, lockInfo, lockText } from "@/lib/unlocks";
import { prefersReducedMotion } from "@/lib/events";
import { burst, sound, toast } from "@/lib/fx";
import { celebrate } from "@/components/celebrations";
import { startGame } from "@/components/game-layer";
import { GAMES } from "@/lib/games";
import { canTilt, canVibrate, onShake, requestMotionPermission } from "@/lib/device";
import { SecretsBar } from "@/components/secrets-bar";
import { DraftPanelSection } from "@/components/draft/panel-section"; // draft-only
import { CheatsSection } from "@/components/cheats";
import { LockIcon, Switch } from "@/components/panel-bits";

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
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
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
  const shake = funActive(fun) && fun.motion;
  useEffect(() => (shake ? onShake(shuffleWithFanfare, 2000) : undefined), [shake]);

  // Boring mode: no playground at all. (Before hydration, CSS hides the button
  // via <html data-mode>, so the server HTML matches and nothing flashes.)
  if (mounted && !isFunMode(fun)) return null;

  return (
    <>
      <SecretsChip />
      <span className="relative inline-flex">
        <button
          type="button"
          popoverTarget={PANEL_ID}
          aria-label="Bells and whistles"
          title="Bells and whistles"
          data-on={fun.on || undefined}
          onClick={markWelcomed}
          className="bells-button fun-mode-only fun-arrive relative inline-flex h-11 items-center justify-center rounded-full border border-line px-2 text-ink hover:border-ink/40"
        >
          <BellsAndWhistlesIcon />
        </button>
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
            <p className="mt-1 text-sm text-muted">Find secrets to unlock more. Boring mode, at the top, is the plain site.</p>
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

        <ThemeSection />

        <MiniGamesSection />

        <CheatsSection />

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

/**
 * The caption under a picker: what a tapped locked option needs, or else the
 * next thing that unlocks ("Next: Bubbles, after 1 more secret.").
 */
function LockCaption({ note, options }: { note: string; options: { id: string; label: string }[] }) {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  let text = note;
  if (!text) {
    const next = options
      .map((o) => ({ ...o, info: lockInfo(o.id, fun) }))
      .filter((o) => o.info?.more != null)
      .sort((x, y) => x.info!.more! - y.info!.more!)[0];
    if (next) text = `Next: ${next.label}, after ${next.info!.more} more ${next.info!.more === 1 ? "secret" : "secrets"}.`;
  }
  return (
    <p aria-live="polite" data-lock-caption className="mt-1 flex items-center gap-1.5 text-sm text-muted empty:hidden">
      {text ? (
        <>
          <LockIcon />
          {text}
        </>
      ) : null}
    </p>
  );
}

/** Themes (shown as "Theme"; the code calls them looks). Locked ones show what they need. */
function ThemeSection() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const [note, setNote] = useState("");
  return (
    <fieldset className="mt-4">
      <legend className="text-sm text-muted">Theme</legend>
      <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {LOOKS.map((l) => {
          const id = themeId(l.id);
          const locked = l.id !== "classic" && !isUnlocked(id, fun);
          if (locked) {
            return (
              <button
                key={l.id}
                type="button"
                aria-disabled="true"
                data-locked
                data-look-option={l.id}
                aria-label={`${l.label} theme, locked. ${lockText(id, fun)}.`}
                title={`${l.label}: ${lockText(id, fun)}`}
                onClick={() => setNote(lockNote(`${l.label} theme`, id))}
                className="locked-option flex min-h-11 items-center justify-center gap-1 rounded-lg border border-dashed border-line px-1.5 text-center text-sm leading-tight text-muted"
              >
                <LockIcon />
                {l.label}
              </button>
            );
          }
          return (
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
          );
        })}
      </div>
      <LockCaption note={note} options={LOOKS.map((l) => ({ id: themeId(l.id), label: `${l.label} theme` }))} />
    </fieldset>
  );
}

/** "Nature theme: find 2 more secrets to unlock it." */
function lockNote(name: string, id: string) {
  const t = lockText(id, getFun());
  return t.startsWith("Find") ? `${name}: f${t.slice(1)} to unlock it.` : `${name}: ${t.toLowerCase()}.`;
}

/** Mini games: each unlocks on its own as secrets are found (or with cheats). */
function MiniGamesSection() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const [note, setNote] = useState("");
  const open = GAMES.filter((g) => isUnlocked(`game:${g.id}`, fun)).length;
  return (
    <fieldset className="mt-4" data-games={open} data-modes={open === GAMES.length ? "unlocked" : open ? "some" : "locked"}>
      <legend className="text-sm text-muted">Mini games</legend>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {GAMES.map((g) => {
          const id = `game:${g.id}`;
          const locked = !isUnlocked(id, fun);
          return (
            <button
              key={g.id}
              type="button"
              title={locked ? `${g.label}: ${lockText(id, fun)}` : g.how}
              aria-disabled={locked || undefined}
              aria-label={locked ? `${g.label} mini game, locked. ${lockText(id, fun)}.` : `Play ${g.label}`}
              data-locked={locked || undefined}
              data-game-option={g.id}
              onClick={() => {
                if (locked) return setNote(lockNote(g.label, id));
                document.getElementById(PANEL_ID)?.hidePopover();
                startGame(g.id);
              }}
              className={`flex min-h-11 items-center justify-center gap-1 rounded-lg border px-1.5 text-sm leading-tight ${locked ? "locked-option border-dashed border-line text-muted" : "border-line hover:border-ink/40"}`}
            >
              {locked ? <LockIcon /> : null}
              {g.label}
            </button>
          );
        })}
      </div>
      <LockCaption note={note} options={GAMES.map((g) => ({ id: `game:${g.id}`, label: g.label }))} />
    </fieldset>
  );
}

/**
 * The secrets tracker lives beside the Bells & whistles badge (not inside its
 * panel), and it's there whenever Fun mode is on, so visitors know secrets exist.
 */
function SecretsChip() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const headingId = useId();
  if (!mounted || !isFunMode(fun)) return null;
  const n = fun.secrets.length;
  return (
    <>
      <button
        type="button"
        popoverTarget={SECRETS_ID}
        aria-label={`Secrets: ${n} of ${liveSecretCount()} found`}
        title="Secrets"
        data-secrets-chip
        className="pill fun-arrive inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium tabular-nums hover:border-ink/40 max-sm:min-w-11 max-sm:justify-center max-sm:gap-1 max-sm:px-2"
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
        <SecretsProgress found={fun.secrets} peeked={fun.peeked} hinted={fun.hinted} />
        <ResetSecrets />
      </div>
    </>
  );
}

/** "Reset all secrets", with a confirm step. Cheats (and settings) are left alone. */
function ResetSecrets() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const [resetting, setResetting] = useState(false);
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-3">
      {resetting ? (
        <div role="group" aria-label="Reset all secrets?" className="rounded-lg border border-line p-3 text-sm">
          <p>
            This clears the {fun.secrets.length} {fun.secrets.length === 1 ? "secret" : "secrets"} you&apos;ve found, the badges and hints you revealed, the
            milestone parties, and the goblin&apos;s hiding place. Fun features they unlocked lock again (cheats stay as they are). Your effect settings stay
            too, unless a style locks.
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
          disabled={!fun.secrets.length && !fun.peeked.length && !fun.hinted.length}
          className="min-h-10 text-sm text-muted underline underline-offset-4 hover:text-ink disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
        >
          Reset all secrets
        </button>
      )}
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
function SecretsProgress({ found, peeked, hinted }: { found: string[]; peeked: string[]; hinted: string[] }) {
  const [open, setOpen] = useState(true);
  const [detail, setDetail] = useState<string | null>(null);
  const listId = useId();
  const selected = SECRET_LIST.find((x) => x.id === detail);
  // Only `live` secrets exist today; milestones are scaled to that (see scaledMilestones).
  const live = liveSecretCount();
  const milestones = scaledMilestones(live);
  const next = milestones.find((m) => found.length < m.count);
  const reached = milestones.filter((m) => found.length >= m.count);

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
            {found.length} of {live}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`ml-1 inline transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </span>
        {/* Solid up to today's secrets, hatched "coming soon" to the goal; notches mark each milestone. */}
        <SecretsBar className="mt-2" found={found.length} live={live} goal={SECRET_GOAL} notches={milestones.slice(0, -1).map((m) => m.count)} />
        <span className="mt-1.5 block text-xs text-muted">
          {next ? `Next celebration at ${next.count}. ` : "Every celebration unlocked. "}
          {live} secrets so far; the goal is {SECRET_GOAL}.
        </span>
      </button>
      {open ? (
        <ul id={listId} className="mt-2 grid grid-cols-5 gap-2" aria-label="Secrets">
          {SECRET_LIST.map((secret, i) => {
            const isFound = found.includes(secret.id);
            const isHinted = !isFound && hinted.includes(secret.id);
            const isPeeked = !isFound && (isHinted || peeked.includes(secret.id));
            // Locked badges take two steps: reveal the icon, then (if wanted) a one-word hint.
            const ask = isFound || isHinted ? null : isPeeked ? "One-word hint?" : "Reveal badge?";
            return (
              <li key={secret.id}>
                <button
                  type="button"
                  data-badge={isFound ? "found" : isHinted ? "hinted" : isPeeked ? "revealed" : "locked"}
                  title={isFound ? `${secret.title}: ${secret.how}` : (ask ?? `Hint: ${secret.hint}`)}
                  aria-label={
                    isFound
                      ? `Found: ${secret.title}. ${secret.how}`
                      : isHinted
                        ? `Locked secret ${i + 1}, hint icon ${secret.icon}, hint: ${secret.hint}`
                        : isPeeked
                          ? `Locked secret ${i + 1}, hint icon ${secret.icon}. One-word hint?`
                          : `Locked secret ${i + 1}. Reveal badge?`
                  }
                  aria-pressed={detail === secret.id}
                  onClick={() => {
                    if (!isFound && !isPeeked) peekSecret(secret.id as Secret);
                    else if (!isFound && !isHinted) hintSecret(secret.id as Secret);
                    setDetail(secret.id);
                  }}
                  className={`group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-lg border text-2xl aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-[var(--focus)] ${isFound ? "border-kelp bg-paper" : "border-line border-dashed"}`}
                >
                  <span aria-hidden="true" className={isFound ? "" : isPeeked ? "opacity-70 grayscale" : "blur-[6px] grayscale"}>
                    {secret.icon}
                  </span>
                  {isHinted ? (
                    <span aria-hidden="true" data-badge-hint className="mt-0.5 max-w-full px-0.5 text-[10px] leading-none font-medium break-words text-ink">
                      {secret.hint}
                    </span>
                  ) : null}
                  {ask ? (
                    // Shown on hover (mouse) or keyboard focus; on touch, the live region below explains the next tap.
                    <span
                      aria-hidden="true"
                      data-badge-ask
                      className="absolute inset-0 hidden items-center justify-center bg-surface/90 px-0.5 text-center text-[11px] leading-tight font-medium text-ink group-hover:flex group-focus-visible:flex"
                    >
                      {ask}
                    </span>
                  ) : null}
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
              : hinted.includes(selected.id)
                ? `Hint: “${selected.hint}”. The icon is a clue too.`
                : "Badge revealed. Select it again for a one-word hint."
            : found.length >= live
              ? `You found every secret so far. Nice. More are on the way (the goal is ${SECRET_GOAL}).`
              : `Select a locked badge to reveal it, then again for a one-word hint; select a found one to see how you got it. ${SECRET_LIST.length} secrets are hidden so far, with more on the way.`}
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
              aria-label={`Replay ${m.name} (${m.count} secrets)`}
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
  const [note, setNote] = useState("");

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
          data-count={def.options.length}
          className="style-picker mt-2"
        >
          <span id={groupId} className="sr-only">
            {def.label} style
          </span>
          {def.options.map((o) => {
            const selected = effect.variant === o.id;
            const id = effectId(category, o.id);
            // Locked styles still show (with what they need), so people know they exist.
            if (!isUnlocked(id, fun)) {
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked="false"
                  aria-disabled="true"
                  aria-label={`${o.label}, locked. ${lockText(id, fun)}.`}
                  data-locked
                  title={`${o.label}: ${lockText(id, fun)}`}
                  onClick={() => setNote(lockNote(o.label, id))}
                  className="locked-option inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-md border border-dashed border-line px-1.5 text-sm leading-tight text-muted"
                >
                  <LockIcon />
                  {o.label}
                </button>
              );
            }
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                title={o.description}
                onClick={() => {
                  setNote("");
                  setVariant(category, o.id);
                  sound("toggle");
                }}
                className="min-h-10 min-w-0 rounded-md border border-line px-1.5 text-sm leading-tight aria-checked:border-kelp aria-checked:bg-kelp aria-checked:text-kelp-ink"
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {on ? <LockCaption note={note} options={def.options.map((o) => ({ id: effectId(category, o.id), label: o.label }))} /> : null}
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
