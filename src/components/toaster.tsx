"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT } from "@/lib/fx";

/** One polite live region for every confirmation message on the site. */
export function Toaster() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timer = 0;
    const onToast = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      setMessage(text);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(""), 3200);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      {message ? (
        <p key={message} className="toast rounded-full bg-ink px-5 py-2.5 text-center text-[0.95rem] font-medium text-paper shadow-lg">
          {message}
        </p>
      ) : null}
    </div>
  );
}
