/**
 * The secrets progress bar with a soft cap. Only N secrets exist today, so the
 * bar is solid up to N (with a labeled marker: "all live secrets") and dimmed,
 * hatched "coming soon" from N to the long-term goal of 100. Milestone notches
 * sit at their scaled positions. Decorative (aria-hidden): callers say the
 * numbers in words.
 */
export function SecretsBar({
  found,
  live,
  goal = 100,
  notches,
  className = "",
}: {
  found: number;
  live: number;
  goal?: number;
  /** Scaled milestone counts to mark (usually every milestone but the last, which is `live`). */
  notches: number[];
  className?: string;
}) {
  const pct = (v: number) => `${Math.min(100, (v / goal) * 100)}%`;
  const liveEdge = Math.min(100, (live / goal) * 100);
  const capped = live >= goal;
  return (
    <span aria-hidden="true" data-secrets-bar className={`block ${className}`}>
      <span className="relative block h-2.5">
        {/* Today's reachable part */}
        <span className="absolute inset-y-0 left-0 rounded-l-full bg-paper ring-1 ring-line ring-inset" style={{ width: pct(live) }} />
        {/* Coming soon: from today's count to the goal */}
        {!capped ? (
          <span
            data-coming-soon
            className="absolute inset-y-0 right-0 rounded-r-full opacity-70"
            style={{
              left: pct(live),
              background: "repeating-linear-gradient(135deg, color-mix(in srgb, var(--muted) 45%, transparent) 0 2px, transparent 2px 6px)",
            }}
          />
        ) : null}
        <span className="absolute inset-y-0 left-0 rounded-full bg-kelp transition-[width] duration-500" style={{ width: pct(found) }} />
        {notches.map((n) => (
          <span
            key={n}
            data-notch={n}
            className={`absolute -top-0.5 h-3.5 w-0.5 -translate-x-1/2 rounded-full ${found >= n ? "bg-kelp-ink/70" : "bg-muted"}`}
            style={{ left: pct(n) }}
          />
        ))}
        {!capped ? <span data-live-marker className="absolute -top-1.5 -bottom-1.5 w-[3px] -translate-x-1/2 rounded-full bg-ink" style={{ left: pct(live) }} /> : null}
      </span>
      <span className="relative mt-1 block h-4 text-[11px] leading-4 text-muted">
        <span
          className="absolute whitespace-nowrap"
          style={liveEdge > 70 ? { right: `${100 - liveEdge}%` } : { left: `${liveEdge}%`, transform: "translateX(-50%)" }}
        >
          {capped ? `All ${live}` : `${live} live`}
        </span>
        {!capped && liveEdge <= 70 ? <span className="absolute right-0 whitespace-nowrap">Goal {goal}</span> : null}
      </span>
    </span>
  );
}
