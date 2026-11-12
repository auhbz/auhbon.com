"use client";

import { useEffect, useState } from "react";

type Box = { top: number; left: number; width: number; height: number };

/**
 * A layer laid exactly over a page section (in document coordinates), for small
 * extras that live "in" a section without touching its server-rendered DOM (adding
 * nodes there before the page hydrates makes React throw the page away and rebuild
 * it). It lets clicks through; only the extras inside catch them.
 */
export function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return setBox(null);
        const r = el.getBoundingClientRect();
        const next = { top: r.top + scrollY, left: r.left + scrollX, width: r.width, height: r.height };
        setBox((b) => (b && b.top === next.top && b.left === next.left && b.width === next.width && b.height === next.height ? b : next));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    const main = document.getElementById("main");
    if (main) ro.observe(main);
    // Late layout shifts (fonts, images, data that streams in) can move a section without
    // resizing anything observed; a cheap re-measure on scroll keeps the layer in place.
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [id]);

  if (!box) return null;
  return (
    <div className="section-anchor" data-anchor={id} style={{ position: "absolute", zIndex: 5, pointerEvents: "none", top: box.top, left: box.left, width: box.width, height: box.height }}>
      {children}
    </div>
  );
}
