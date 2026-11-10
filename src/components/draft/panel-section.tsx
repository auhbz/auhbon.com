"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { useIsDraft } from "@/components/draft/draft-root";
import {
  DEFAULT_DRAFT,
  DRAFT_LOOKS,
  DRAFT_SECRETS,
  getDraft,
  peekDraftSecret,
  resetDraftSecrets,
  setChaos,
  setDraftLook,
  subscribeDraft,
  type DraftSecret,
} from "@/lib/draft/store";
import { sound } from "@/lib/fx";

/** The small "draft" tag on every draft-only item. */
export function DraftTag() {
  return <span className="draft-tag">draft</span>;
}

/**
 * Draft-only items in the Bells & whistles panel. Renders nothing anywhere
 * but /dev/draft, so the live panel is unchanged.
 */
export function DraftPanelSection() {
  const isDraft = useIsDraft();
  if (!isDraft) return null;
  return <DraftPanelBody />;
}

function DraftPanelBody() {
  const draft = useSyncExternalStore(subscribeDraft, getDraft, () => DEFAULT_DRAFT);
  const headingId = useId();
  const chaosId = useId();
  const groupId = useId();

  return (
    <section aria-labelledby={headingId} data-draft-panel className="mt-4 rounded-lg border border-dashed border-muted p-3">
      <h3 id={headingId} className="flex items-center gap-2 font-medium">
        Draft playground <DraftTag />
      </h3>
      <p className="text-sm text-muted">Only on this page, for testing. Draft secrets don&apos;t count toward your total.</p>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <span id={chaosId} className="flex items-center gap-2">
            Chaos <DraftTag />
          </span>
          <span className="block text-sm text-muted">{draft.chaos ? "Monkeys multiply, steal things, and love bananas" : "Passive, page-wide mischief"}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={draft.chaos}
          aria-labelledby={chaosId}
          onClick={() => {
            setChaos(!draft.chaos);
            sound("toggle");
          }}
          className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-muted transition-colors aria-checked:bg-kelp"
        >
          <span aria-hidden="true" className={`inline-block size-5 rounded-full bg-paper shadow transition-transform ${draft.chaos ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      {draft.chaos ? (
        <div role="radiogroup" aria-labelledby={groupId} className="mt-2 grid grid-cols-1 gap-1.5">
          <span id={groupId} className="sr-only">
            Chaos style
          </span>
          <button type="button" role="radio" aria-checked="true" className="min-h-10 rounded-md border border-kelp bg-kelp px-1.5 text-sm text-kelp-ink">
            Unleash the monkeys
          </button>
        </div>
      ) : null}

      <fieldset className="mt-3">
        <legend className="flex items-center gap-2 text-sm text-muted">
          Draft themes <DraftTag />
        </legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {[{ id: null, label: "None", description: "No draft theme" }, ...DRAFT_LOOKS].map((l) => (
            <label
              key={l.id ?? "none"}
              title={l.description}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line px-1.5 text-center text-sm leading-tight has-checked:border-kelp has-checked:bg-kelp has-checked:text-kelp-ink has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)]"
            >
              <input
                type="radio"
                name="draft-look"
                checked={draft.look === l.id}
                onChange={() => {
                  setDraftLook(l.id);
                  sound("toggle");
                }}
                className="sr-only"
              />
              {l.label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-sm text-muted">Pico-8 extras (a little climber and Flabby&apos;s game) show up with the Pico-8 theme above.</p>
      </fieldset>

      <DraftSecretsList found={draft.secrets} peeked={draft.peeked} />
    </section>
  );
}

function DraftSecretsList({ found, peeked }: { found: DraftSecret[]; peeked: DraftSecret[] }) {
  const [detail, setDetail] = useState<DraftSecret | null>(null);
  const selected = DRAFT_SECRETS.find((s) => s.id === detail);
  return (
    <div className="mt-3">
      <p className="flex items-center gap-2 text-sm">
        <span className="font-medium">Draft secrets</span> <DraftTag />
        <span className="text-muted" data-draft-secret-count>
          {found.length} of {DRAFT_SECRETS.length}
        </span>
      </p>
      <ul className="mt-2 grid grid-cols-5 gap-2" aria-label="Draft secrets">
        {DRAFT_SECRETS.map((s, i) => {
          const isFound = found.includes(s.id);
          const isPeeked = peeked.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={detail === s.id}
                aria-label={isFound ? `Found: ${s.title}. ${s.how}` : isPeeked ? `Locked draft secret ${i + 1}. Hint icon: ${s.icon}` : `Locked draft secret ${i + 1}. Tap to peek at its hint icon`}
                onClick={() => {
                  if (!isFound) peekDraftSecret(s.id);
                  setDetail(s.id);
                }}
                className={`flex aspect-square w-full items-center justify-center rounded-lg border text-xl aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-[var(--focus)] ${isFound ? "border-kelp bg-paper" : "border-dashed border-line"}`}
              >
                <span aria-hidden="true" className={isFound ? "" : isPeeked ? "opacity-70 grayscale" : "blur-[6px] grayscale"}>
                  {s.icon}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 min-h-6 text-sm text-muted" aria-live="polite">
        {selected ? (found.includes(selected.id) ? `${selected.title}: ${selected.how}.` : "Still locked. The icon is your hint.") : ""}
      </p>
      {found.length || peeked.length ? (
        <button type="button" onClick={resetDraftSecrets} className="min-h-10 text-sm text-muted underline underline-offset-4 hover:text-ink">
          Reset draft secrets
        </button>
      ) : null}
    </div>
  );
}
