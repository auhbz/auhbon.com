"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const anchors = new Map<string, HTMLDivElement>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** React owns the position of this empty container and commits its ref before portals can use it. */
export function PageSlotAnchor({ id }: { id: string }) {
  const register = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    anchors.set(id, node);
    listeners.forEach((listener) => listener());
    return () => {
      if (anchors.get(id) !== node) return;
      anchors.delete(id);
      listeners.forEach((listener) => listener());
    };
  }, [id]);
  return <div ref={register} />;
}

export function Slot({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const anchor = useSyncExternalStore(subscribe, () => anchors.get(id) ?? null, () => null);
  return anchor ? createPortal(<div data-page-slot={id} className={className}>{children}</div>, anchor) : null;
}
