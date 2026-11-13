"use client";

export function RevealAllSpoilers() {
  return (
    <label className="inline-flex min-h-11 items-center gap-2">
      <input type="checkbox" onChange={(event) => {
        const scope = event.currentTarget.closest("[data-secret-spoilers]");
        scope?.querySelectorAll<HTMLDetailsElement>("[data-secret-spoiler]").forEach((item) => {
          item.open = event.currentTarget.checked;
        });
      }} />
      Reveal all
    </label>
  );
}

export function SecretSpoiler({ text }: { text: string }) {
  return (
    <details data-secret-spoiler onMouseEnter={(event) => {
      if (window.matchMedia("(hover: hover)").matches) event.currentTarget.open = true;
    }}>
      <summary className="min-h-8 cursor-pointer text-kelp underline">Show how</summary>
      <p>{text}</p>
    </details>
  );
}
