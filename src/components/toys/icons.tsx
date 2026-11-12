import type { ToyId } from "@/lib/toys";

/** Original toy art. Locked toys use the same shapes as silhouettes (see .toy-silhouette). */
export function ToyIcon({ id, className = "" }: { id: ToyId; className?: string }) {
  const common = { viewBox: "0 0 48 48", "aria-hidden": true, className: `size-10 ${className}` } as const;
  switch (id) {
    case "brush":
      return (
        <svg {...common}>
          <rect x="21" y="4" width="6" height="22" rx="3" transform="rotate(35 24 24)" fill="#c98b4a" />
          <rect x="20" y="22" width="8" height="6" transform="rotate(35 24 24)" fill="#b8bfc6" />
          <path d="M14 30c3-2 7-1 8 2 1 4-3 9-11 10 2-3 0-6 1-8 0-2 1-3 2-4z" fill="#e2453c" />
          <circle cx="37" cy="38" r="3" fill="#2f8bd8" />
          <circle cx="31" cy="42" r="2" fill="#f2c230" />
        </svg>
      );
    case "notes":
      return (
        <svg {...common}>
          <rect x="10" y="12" width="26" height="26" rx="2" fill="#7fd1ff" transform="rotate(-8 23 25)" />
          <path d="M12 10h26v22l-6 6H12z" fill="#ffe36e" />
          <path d="M32 38v-6h6z" fill="#e6c443" />
          <path d="M16 18h16M16 23h12M16 28h14" stroke="#8a6d12" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "plane":
      return (
        <svg {...common}>
          <path d="M5 26 43 9 30 41 23 30z" fill="#f4f6f8" stroke="#6b7a85" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M23 30 43 9 18 27z" fill="#d5dce1" stroke="#6b7a85" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m23 30-2 8 5-5" fill="#b9c3ca" stroke="#6b7a85" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "smoke":
      return (
        <svg {...common}>
          <circle cx="34" cy="14" r="6" fill="#cfd5da" />
          <circle cx="40" cy="9" r="4" fill="#e3e7ea" />
          <circle cx="20" cy="29" r="12" fill="#2b2f36" />
          <circle cx="16" cy="25" r="3.5" fill="#fff" opacity=".35" />
          <rect x="24" y="14" width="7" height="6" rx="1.5" transform="rotate(40 27 17)" fill="#6c737b" />
          <path d="M29 13c2-3 4-3 5-2" stroke="#8a6d12" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="35" cy="11" r="2" fill="#ffb02e" />
        </svg>
      );
  }
}

export function BoxIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-9">
      <rect x="6" y="20" width="36" height="22" rx="3" fill="#d9583b" stroke="#7a2614" strokeWidth="2" />
      <path d="M6 28h36" stroke="#7a2614" strokeWidth="2" />
      <circle cx="24" cy="31" r="3" fill="#ffd25e" stroke="#7a2614" strokeWidth="1.5" />
      <path d="M14 36l3-3 3 3M28 36l3-3 3 3" stroke="#ffd25e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g className="toy-box-lid" style={{ transformOrigin: "6px 20px", transform: open ? "rotate(-28deg)" : undefined }}>
        <rect x="4" y="13" width="40" height="8" rx="2.5" fill="#f2784f" stroke="#7a2614" strokeWidth="2" />
      </g>
    </svg>
  );
}
