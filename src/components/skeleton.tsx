/**
 * A small skeleton lying at the bottom of the Experience timeline (only while
 * Bells & whistles is on). Decorative: with the Cursed trail, hold still over it
 * (or long-press it) and the ghost possesses it. The engine does the rest.
 */
export function Skeleton() {
  return (
    <div aria-hidden="true" className="fun-only mt-6 -ml-1 h-7">
      <span data-skeleton className="skeleton" title="Rest in peace">
        <svg width="84" height="26" viewBox="0 0 84 26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {/* Skull, on its side */}
          <path d="M3 13a7 7 0 0 1 12.5-4.3c.9 1.2 1.3 2.6 1.3 4.1 0 2.4-1.3 4-3 4.8V20h-6.2v-2.2C5.4 17 3 15.4 3 13Z" fill="var(--paper)" />
          <circle cx="7.6" cy="12.4" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12.2" cy="12.4" r="1.4" fill="currentColor" stroke="none" />
          <path d="M9 17.6v2.2M11.4 17.6v2.2" strokeWidth="1" />
          {/* Spine and ribs */}
          <path d="M17 15h29" />
          <path d="M22 9.5c-1.5 2-1.5 9 0 11M27 9c-1.5 2.2-1.5 9.8 0 12M32 9.5c-1.5 2-1.5 9 0 11M37 10.5c-1.2 1.7-1.2 7.3 0 9" />
          {/* Arms resting along the body */}
          <g className="skeleton-arms">
            <path d="M20 8.5l9-1.5 9 1.2M20 21.5l9 1.5 9-1.2" />
            <path d="M38 8.2l2 .4M38 21.8l2-.4" strokeWidth="2.2" />
          </g>
          {/* Pelvis and legs */}
          <path d="M46 11c3-1.5 5-1.5 6 1.5v5c-1 3-3 3-6 1.5" fill="var(--paper)" />
          <path d="M52 12.5l13-.5 13 .8M52 17.5l13 .5 13-.8" />
          <path d="M78 11.5l3-.6M78 19l3 .6" strokeWidth="2.2" />
        </svg>
      </span>
    </div>
  );
}
