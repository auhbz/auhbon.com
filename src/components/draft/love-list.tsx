import type { CSSProperties } from "react";
import { LOVE_SEPARATOR, LOVES } from "@/content/draft";

/**
 * "I ❤️": the things Auhbon loves, set as a staircase where every line is a
 * little longer than the one above. The staircase is decoration; screen
 * readers get the same items as one plain list.
 */
export function LoveList() {
  const items = LOVES.flat();
  const longest = Math.max(...LOVES.map((row) => row.join(LOVE_SEPARATOR).length));
  return (
    <section id="loves" aria-labelledby="loves-heading" className="border-t border-line">
      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[13rem_1fr] lg:gap-12">
        <div>
          <h2 id="loves-heading" tabIndex={-1} className="font-display text-2xl font-semibold tracking-tight focus:outline-none lg:sticky lg:top-24">
            I <span aria-hidden="true">❤️</span>
            <span className="sr-only">love</span>
          </h2>
        </div>
        <div className="min-w-0">
          <ul className="sr-only">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div aria-hidden="true" className="draft-loves" style={{ "--longest": longest } as CSSProperties}>
            {LOVES.map((row, i) => (
              <p key={row.join()} className="draft-loves-row" style={{ "--i": i, "--n": LOVES.length } as CSSProperties}>
                {row.map((item, j) => (
                  <span key={item}>
                    {j ? <span className="draft-loves-sep">{LOVE_SEPARATOR}</span> : null}
                    {item}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
