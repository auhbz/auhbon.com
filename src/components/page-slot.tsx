"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders client-only extras inside a section of the (unchanged) home page:
 * a detached <div> is created on the client, attached to `target` after
 * mount and removed on unmount. The home page's own markup is never edited,
 * and the slot only exists in the browser, so there's nothing to hydrate.
 */
const slots = new Map<string, HTMLElement>();
const noSubscribe = () => () => {};

function slotFor(id: string, className: string) {
  let el = slots.get(id);
  if (!el) {
    el = document.createElement("div");
    el.dataset.pageSlot = id;
    el.className = className;
    slots.set(id, el);
  }
  return el;
}

export function Slot({
  id,
  target,
  prepend = false,
  className = "",
  children,
}: {
  id: string;
  /** CSS selector for the element to attach to. */
  target: string;
  prepend?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const el = useSyncExternalStore(noSubscribe, () => slotFor(id, className), () => null);
  useEffect(() => {
    if (!el) return;
    const host = document.querySelector(target);
    if (!host) return;
    if (prepend) host.prepend(el);
    else host.append(el);
    return () => el.remove();
  }, [el, target, prepend]);
  return el ? createPortal(children, el) : null;
}
