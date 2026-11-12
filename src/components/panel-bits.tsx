"use client";

import { useId } from "react";

/** An on/off switch with a visible label and optional description (shared by the playground panels). */
export function Switch({
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

/** A small padlock for locked fun features. Decorative: the text says it's locked. */
export function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`inline-block shrink-0 ${className}`}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
