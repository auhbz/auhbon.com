"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ToyToolbar, toolButton } from "@/components/toys/toolbar";
import { reveal } from "@/components/easter-eggs";
import { sound } from "@/lib/fx";

/**
 * Sticky notes: write or doodle on them, drag them anywhere, and they stay
 * stuck to that spot on the page (they scroll with it). Saved for the visit in
 * localStorage. Shown whenever the toy box is out, not just while the pad is
 * in hand, because they're stuck on.
 */

type Note = { id: number; x: number; y: number; text: string; doodle: string; color: number; rot: number };

const KEY = "toy-notes-v1";
const EVENT = "portfolio:notes";
const COLORS = [
  { bg: "#ffe36e", label: "Yellow" },
  { bg: "#ffb3c7", label: "Pink" },
  { bg: "#a8e6a1", label: "Green" },
  { bg: "#9fd8ff", label: "Blue" },
];
const MAX = 20;
const SIZE = 168;

let cache: Note[] | null = null;
const EMPTY: Note[] = [];
function read(): Note[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((n) => n && typeof n.id === "number").slice(0, MAX) : [];
  } catch {
    return [];
  }
}
const getNotes = () => (cache ??= read());
function setNotes(next: Note[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Kept for this visit even if it can't be saved.
  }
  window.dispatchEvent(new Event(EVENT));
}
const patch = (id: number, p: Partial<Note>) => setNotes(getNotes().map((n) => (n.id === id ? { ...n, ...p } : n)));
function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function StickyNotes({ held }: { held: boolean }) {
  const notes = useSyncExternalStore(subscribe, getNotes, () => EMPTY);
  const [confirm, setConfirm] = useState(false);
  const [focusId, setFocusId] = useState<number | null>(null);

  const create = () => {
    if (notes.length >= MAX) return;
    const id = Date.now();
    const x = scrollX + Math.max(8, innerWidth / 2 - SIZE / 2 + (Math.random() - 0.5) * 120);
    const y = scrollY + innerHeight * 0.3 + (Math.random() - 0.5) * 80;
    setNotes([...notes, { id, x, y, text: "", doodle: "", color: notes.length % COLORS.length, rot: (Math.random() - 0.5) * 6 }]);
    setFocusId(id);
    sound("pop");
  };

  return (
    <>
      {createPortal(
        <div data-wild-ui data-sticky-notes>
          {notes.map((n) => (
            <StickyNote key={n.id} note={n} autoFocus={focusId === n.id} />
          ))}
        </div>,
        document.body,
      )}
      {held ? (
        <ToyToolbar label="Sticky notes">
          <button type="button" onClick={create} disabled={notes.length >= MAX} className={toolButton}>
            New note
          </button>
          {notes.length ? (
            confirm ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setNotes([]);
                    setConfirm(false);
                  }}
                  className={toolButton}
                >
                  Yes, remove all {notes.length}
                </button>
                <button type="button" onClick={() => setConfirm(false)} className={toolButton}>
                  Keep them
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className={toolButton}>
                Remove all
              </button>
            )
          ) : null}
        </ToyToolbar>
      ) : null}
    </>
  );
}

function StickyNote({ note, autoFocus }: { note: Note; autoFocus: boolean }) {
  const [draw, setDraw] = useState(false);
  const [text, setText] = useState(note.text);
  const canvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const pen = useRef<{ id: number; x: number; y: number } | null>(null);

  // Load the saved doodle once.
  useEffect(() => {
    const cv = canvas.current!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = SIZE * dpr;
    cv.height = SIZE * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    if (note.doodle) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, SIZE, SIZE);
      img.src = note.doodle;
    }
    // Only on mount: later doodles are drawn straight onto the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (autoFocus) area.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // Save text shortly after typing stops.
  useEffect(() => {
    if (text === note.text) return;
    const t = window.setTimeout(() => patch(note.id, { text }), 300);
    return () => window.clearTimeout(t);
  }, [text, note.id, note.text]);

  const startDrag = (e: React.PointerEvent) => {
    if (e.button > 0 || (e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const el = root.current!;
    el.setPointerCapture?.(e.pointerId);
    const start = { x: e.pageX, y: e.pageY, nx: note.x, ny: note.y };
    el.dataset.dragging = "";
    const move = (ev: PointerEvent) => {
      el.style.left = `${start.nx + ev.pageX - start.x}px`;
      el.style.top = `${start.ny + ev.pageY - start.y}px`;
    };
    const up = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      delete el.dataset.dragging;
      const maxX = document.documentElement.scrollWidth - SIZE - 4;
      const x = Math.max(4, Math.min(maxX, start.nx + ev.pageX - start.x));
      const y = Math.max(4, start.ny + ev.pageY - start.y);
      patch(note.id, { x, y });
      sound("pop");
      // Stuck on my name?
      const name = document.getElementById("hero-name")?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (name && r.left < name.right && r.right > name.left && r.top < name.bottom && r.bottom > name.top) {
        reveal("toy-note", "Note to self: hire this guy.");
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const ink = (e: React.PointerEvent<HTMLCanvasElement>, kind: "down" | "move" | "up") => {
    if (!draw) return;
    const r = e.currentTarget.getBoundingClientRect();
    // The note is rotated a little; undo that for a pen that lands where you point.
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const a = (-note.rot * Math.PI) / 180;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const x = SIZE / 2 + dx * Math.cos(a) - dy * Math.sin(a);
    const y = SIZE / 2 + dx * Math.sin(a) + dy * Math.cos(a);
    const ctx = e.currentTarget.getContext("2d")!;
    if (kind === "down") {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      pen.current = { id: e.pointerId, x, y };
      ctx.fillStyle = "#2a2622";
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "move" && pen.current?.id === e.pointerId) {
      ctx.strokeStyle = "#2a2622";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pen.current.x, pen.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      pen.current = { id: e.pointerId, x, y };
    } else if (kind === "up" && pen.current) {
      pen.current = null;
      patch(note.id, { doodle: e.currentTarget.toDataURL("image/png") });
    }
  };

  const color = COLORS[note.color % COLORS.length];
  return (
    <div
      ref={root}
      data-sticky-note
      role="group"
      aria-label="Sticky note"
      className="sticky-note absolute z-[54] flex flex-col shadow-lg"
      style={{ left: note.x, top: note.y, width: SIZE, height: SIZE + 30, background: color.bg, rotate: `${note.rot}deg` }}
    >
      <div onPointerDown={startDrag} className="sticky-note-bar flex h-[30px] shrink-0 cursor-grab touch-none items-center justify-end gap-0.5 px-1" title="Drag to move">
        <span aria-hidden="true" className="mr-auto pl-1 text-xs text-[#5c4a1a]">
          ⠿
        </span>
        <button
          type="button"
          aria-pressed={draw}
          aria-label={draw ? "Doodling. Switch to typing" : "Doodle on this note"}
          title={draw ? "Type" : "Doodle"}
          onClick={() => setDraw((d) => !d)}
          className="sticky-note-tool grid size-7 place-items-center rounded aria-pressed:bg-black/15"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Note color: ${color.label}. Change it`}
          title="Color"
          onClick={() => patch(note.id, { color: (note.color + 1) % COLORS.length })}
          className="sticky-note-tool grid size-7 place-items-center rounded"
        >
          <span aria-hidden="true" className="size-3.5 rounded-full border border-black/40" style={{ background: COLORS[(note.color + 1) % COLORS.length].bg }} />
        </button>
        <button
          type="button"
          aria-label="Delete this note"
          title="Delete"
          onClick={() => {
            setNotes(getNotes().filter((n) => n.id !== note.id));
            sound("pop");
          }}
          className="sticky-note-tool grid size-7 place-items-center rounded"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Sticky note text"
          placeholder="Write something…"
          maxLength={200}
          className="sticky-note-text absolute inset-0 resize-none bg-transparent p-2 font-display text-[1.05rem] leading-snug"
        />
        <canvas
          ref={canvas}
          aria-hidden="true"
          onPointerDown={(e) => ink(e, "down")}
          onPointerMove={(e) => ink(e, "move")}
          onPointerUp={(e) => ink(e, "up")}
          onPointerCancel={(e) => ink(e, "up")}
          className={`absolute top-0 left-0 ${draw ? "cursor-crosshair touch-none" : "pointer-events-none"}`}
          style={{ width: SIZE, height: SIZE }}
        />
      </div>
    </div>
  );
}
