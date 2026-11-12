"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_FUN, getFun, SECRET_LIST, setCheatsEnabled, setCheatUnlocked, subscribeFun, unlockAllSecrets } from "@/lib/fun";
import { isUnlocked, UNLOCK_KINDS, UNLOCKS, unlockedBySecrets } from "@/lib/unlocks";
import { burst, sound, toast } from "@/lib/fx";
import { haptic } from "@/lib/device";
import { celebrateDue } from "@/components/celebrations";
import { Switch } from "@/components/panel-bits";

/**
 * Cheats, behind a numpad: only for people who know my favorite number. Once
 * on, a Cheats section unlocks fun features one at a time or all at once,
 * without touching secrets (so every secret can still be found), plus the old
 * "Unlock all secrets" for anyone who'd rather skip the hunt.
 */
export function CheatsSection() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const dialog = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  // "code" → enter the number; "confirm" → the right number, now spell out what happens.
  const [stage, setStage] = useState<"code" | "confirm">("code");
  const titleId = useId();
  const enabled = fun.cheats.enabled;

  const press = (d: string) => {
    if (stage !== "code") return;
    setWrong(false);
    setCode((c) => (c + d).slice(0, 6));
  };
  const submit = () => {
    if (stage === "confirm") return enable();
    if (code === "137") {
      setStage("confirm");
      sound("toggle");
    } else {
      setWrong(true);
      setCode("");
      sound("hit");
    }
  };
  const enable = () => {
    dialog.current?.close();
    setCheatsEnabled(true);
    burst("confetti");
    sound("secret");
    haptic("secret");
    toast("You know my favorite number. Cheats are on: see the Cheats section.");
    // Bring the new section into view inside the panel.
    window.setTimeout(() => document.querySelector("[data-cheats='on']")?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
  };

  return (
    <section className="mt-4 border-t border-line pt-3" data-cheats={enabled ? "on" : "off"} aria-label="Cheats">
      {enabled ? (
        <CheatsPanel />
      ) : (
        <Switch
          label="Enable cheats"
          description="If you know my favorite number"
          checked={false}
          onChange={() => {
            setCode("");
            setWrong(false);
            setStage("code");
            dialog.current?.showModal();
          }}
          className="text-sm"
        />
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
          {stage === "code" ? "What's my favorite number?" : "137. You know me. Enable cheats?"}
        </h2>
        {stage === "code" ? (
          <>
            <output
              aria-live="polite"
              className={`mt-3 flex h-12 items-center justify-center rounded-lg bg-paper font-mono text-2xl tracking-[0.4em] tabular-nums ${wrong ? "numpad-wrong" : ""}`}
            >
              {wrong ? "Nope" : code || " "}
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
              <li>A Cheats section opens at the bottom of Bells &amp; whistles.</li>
              <li>Unlock every effect, theme, mini game, and more at once, or pick them one at a time.</li>
              <li>Cheats don&apos;t find secrets for you, so you can still hunt for every one (there&apos;s an &ldquo;Unlock all secrets&rdquo; cheat if you&apos;d rather not).</li>
              <li>Turn cheats off any time. Secrets you found stay found.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={enable} className="numpad-key numpad-enter flex-1 px-3 text-sm" autoFocus>
                Enable cheats
              </button>
              <button type="button" onClick={() => dialog.current?.close()} className="numpad-key flex-1 px-3 text-sm">
                Cancel
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}

/** What cheats can do, once they're on. */
function CheatsPanel() {
  const fun = useSyncExternalStore(subscribeFun, getFun, () => DEFAULT_FUN);
  const [confirmSecrets, setConfirmSecrets] = useState(false);
  const allIds = UNLOCKS.map((u) => u.id);
  const everything = UNLOCKS.every((u) => isUnlocked(u.id, fun));
  const byCheat = fun.cheats.unlocked.filter((id) => allIds.includes(id)).length;
  const missing = SECRET_LIST.length - fun.secrets.filter((id) => SECRET_LIST.some((x) => x.id === id)).length;

  const unlockSecrets = () => {
    setConfirmSecrets(false);
    unlockAllSecrets();
    burst("confetti");
    sound("secret");
    haptic("secret");
    toast("Every secret marked found.");
    celebrateDue(1400);
  };

  return (
    <>
      <h3 className="font-display text-lg font-semibold tracking-tight">Cheats</h3>
      <p className="mt-0.5 text-sm text-muted">Unlock fun features without finding secrets. Secrets still only count when you find them.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          data-cheat="everything"
          onClick={() => {
            setCheatUnlocked(allIds, !everything);
            sound("toggle");
            toast(!everything ? "Cheat: every fun feature unlocked." : "Cheat unlocks cleared. What your secrets unlocked stays open.");
          }}
          disabled={everything && byCheat === 0}
          className="min-h-11 rounded-lg border border-line px-2 text-sm font-medium hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {everything ? (byCheat ? "Undo unlock everything" : "Everything's unlocked") : "Unlock everything"}
        </button>
        <button
          type="button"
          data-cheat="secrets"
          onClick={() => setConfirmSecrets(true)}
          disabled={missing === 0}
          className="min-h-11 rounded-lg border border-line px-2 text-sm font-medium hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {missing === 0 ? "All secrets found" : "Unlock all secrets"}
        </button>
      </div>
      {confirmSecrets ? (
        <div role="group" aria-label="Unlock all secrets?" className="mt-2 rounded-lg border border-line p-3 text-sm">
          <p>
            The {missing} {missing === 1 ? "secret" : "secrets"} you haven&apos;t found will be marked found, without you finding them, and any milestone
            parties you pass will play. &ldquo;Reset all secrets&rdquo; (in the secrets list) undoes it, but it clears the ones you found yourself too.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={unlockSecrets} className="min-h-10 rounded-full bg-kelp px-4 font-medium text-kelp-ink">
              Unlock all secrets
            </button>
            <button type="button" onClick={() => setConfirmSecrets(false)} className="min-h-10 rounded-full border border-line px-4">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <details className="group mt-3 rounded-lg border border-line px-3">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-medium">
          Pick fun features
          <span className="text-muted">
            {UNLOCKS.filter((u) => isUnlocked(u.id, fun)).length} of {UNLOCKS.length} unlocked
          </span>
        </summary>
        <div className="pb-3">
          {UNLOCK_KINDS.map((kind) => {
            const defs = UNLOCKS.filter((u) => u.kind === kind.id);
            if (!defs.length) return null;
            return (
              <div key={kind.id} role="group" aria-label={kind.label} className="mt-2 first:mt-0">
                <p className="pt-1 text-sm text-muted">{kind.label}</p>
                {defs.map((def) => {
                  const natural = unlockedBySecrets(def, fun);
                  return (
                    <Switch
                      key={def.id}
                      label={def.label}
                      description={natural ? "Unlocked by your secrets" : undefined}
                      checked={natural || fun.cheats.unlocked.includes(def.id)}
                      disabled={natural}
                      onChange={() => setCheatUnlocked([def.id], !fun.cheats.unlocked.includes(def.id))}
                      className="py-1 text-sm"
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </details>

      <button
        type="button"
        data-cheat="off"
        onClick={() => {
          setCheatsEnabled(false);
          sound("toggle");
          toast("Cheats off. Everything your secrets unlocked stays open.");
        }}
        className="mt-2 min-h-10 text-sm text-muted underline underline-offset-4 hover:text-ink"
      >
        Turn cheats off
      </button>
    </>
  );
}
