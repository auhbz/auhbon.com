"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { applyDraftAttributes, DRAFT_EVENT, getDraft, setDraftLook } from "@/lib/draft/store";
import { FUN_EVENT, getFun, setLook } from "@/lib/fun";

const flag = () => typeof document !== "undefined" && document.documentElement.dataset.draft === "on";
const subscribeFlag = (onChange: () => void) => {
  window.addEventListener(DRAFT_EVENT, onChange);
  return () => window.removeEventListener(DRAFT_EVENT, onChange);
};

/** True only while /dev/draft is on screen (the header panel uses this to show draft extras). */
export function useIsDraft() {
  return useSyncExternalStore(subscribeFlag, flag, () => false);
}

/**
 * Wraps /dev/draft. Marks <html data-draft="on"> while mounted so draft-only
 * CSS and panel items switch on, and cleans every draft attribute up on the
 * way out, so navigating back to the live site leaves no trace.
 *
 * Draft themes and live looks are one choice: picking a draft theme sets the
 * live look to Classic, and picking a live look clears the draft theme.
 */
export function DraftRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    const d = document.documentElement.dataset;
    d.draft = "on";
    applyDraftAttributes(getDraft());
    window.dispatchEvent(new Event(DRAFT_EVENT));
    const onFun = () => {
      if (getFun().look !== "classic" && getDraft().look) setDraftLook(null);
    };
    const onDraft = () => {
      if (getDraft().look && getFun().look !== "classic") setLook("classic");
    };
    onDraft();
    window.addEventListener(FUN_EVENT, onFun);
    window.addEventListener(DRAFT_EVENT, onDraft);
    return () => {
      window.removeEventListener(FUN_EVENT, onFun);
      window.removeEventListener(DRAFT_EVENT, onDraft);
      delete d.draft;
      applyDraftAttributes(getDraft());
      window.dispatchEvent(new Event(DRAFT_EVENT));
    };
  }, []);
  return <div data-draft-root>{children}</div>;
}
