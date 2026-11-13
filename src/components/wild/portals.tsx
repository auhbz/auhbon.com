"use client";

import { useState, type ReactNode } from "react";
import { Slot } from "@/components/page-slot";
import { reveal } from "@/components/easter-eggs";
import { useExtraVisible } from "@/lib/unlocks";
import { burst, sound, toast } from "@/lib/fx";

/**
 * Portal puzzles: an extra ("extra:portal") that unlocks with secrets and can be
 * hidden from Bells & whistles → "Unlocked toys, features, & elements".
 * A generic sci-fi device is tucked into Education.
 * Picking it up opens three small test chambers around the page, made of white
 * panels that take portals. Place an orange and a blue portal; whatever sits
 * on one panel comes out of the other, and falls onto whatever is below it.
 *
 *  1. Lost word: send "hello" from Skills to the blank in Contact.
 *  2. Drop zone: drop the rock onto the target in Experience.
 *  3. Cake: drop the rock on the vault button, then deliver the cake to the plate.
 *
 * Every panel is a real button, so it all works from the keyboard.
 */

type Thing = "word" | "rock" | "cake";
type Surface =
  | "word-shelf"
  | "blank"
  | "ledge"
  | "panel-a"
  | "panel-b"
  | "panel-c"
  | "vault-shelf"
  | "over-button"
  | "over-plate";
type Color = "orange" | "blue";

const SURFACE_NAMES: Record<Surface, string> = {
  "word-shelf": "the lost word's shelf",
  blank: "the blank in “Say ___ anytime”",
  ledge: "the rock's ledge",
  "panel-a": "ceiling panel 1, over the wall",
  "panel-b": "ceiling panel 2, over the wall",
  "panel-c": "ceiling panel 3, over the target",
  "vault-shelf": "the cake's shelf, inside the vault",
  "over-button": "the panel over the vault button",
  "over-plate": "the panel over the plate",
};

const THING_LABEL: Record<Thing, string> = { word: "the word “hello”", rock: "a rock", cake: "a cake" };

type State = {
  held: boolean;
  next: Color;
  portals: Partial<Record<Color, Surface>>;
  things: Partial<Record<Surface, Thing>>;
  solved: { word: boolean; target: boolean; vault: boolean; cake: boolean };
  arrived: number;
};

const START: State = {
  held: false,
  next: "orange",
  portals: {},
  things: { "word-shelf": "word", ledge: "rock", "vault-shelf": "cake" },
  solved: { word: false, target: false, vault: false, cake: false },
  arrived: 0,
};

export function Portals() {
  const visible = useExtraVisible("extra:portal");
  return visible ? <PortalPuzzles /> : null;
}

function PortalPuzzles() {
  const [s, setS] = useState<State>(START);

  const pickUp = () => {
    setS((p) => ({ ...p, held: true }));
    sound("secret");
    toast("You picked up a portal device. Three test chambers just opened around the page: look for the white panels.");
  };

  const place = (surface: Surface) => {
    if (!s.held) return;
    if (surface === "vault-shelf" && !s.solved.vault) {
      toast("Portals don't stick to the vault's glass. Maybe there's a button.");
      sound("hit");
      return;
    }
    const color = s.next;
    const other: Color = color === "orange" ? "blue" : "orange";
    const portals = { ...s.portals, [color]: surface };
    if (portals[other] === surface) delete portals[other];
    let next: State = { ...s, portals, next: other };
    sound("pop");
    next = transfer(next);
    setS(next);
  };

  /** If one portal panel holds something and the other is free, it goes through. */
  const transfer = (st: State): State => {
    const a = st.portals.orange;
    const b = st.portals.blue;
    if (!a || !b) return st;
    const from = st.things[a] ? a : st.things[b] ? b : null;
    if (!from) return st;
    const to = from === a ? b : a;
    if (st.things[to]) {
      toast("Something's already on the other side.");
      return st;
    }
    const thing = st.things[from]!;
    const things = { ...st.things };
    delete things[from];
    const solved = { ...st.solved };
    const at = rectOf(to);

    if (thing === "word" && to === "blank") {
      things.blank = "word";
      solved.word = true;
      burst("confetti", at.x, at.y);
      toast("Test chamber 1 complete: the word found its way home.");
    } else if (thing === "rock" && to === "panel-c") {
      things.ledge = "rock"; // it bounces off the target and a new rock appears on the ledge
      solved.target = true;
      burst("sparks", at.x, at.y + 40);
      toast("Bullseye! Test chamber 2 complete.");
    } else if (thing === "rock" && to === "over-button") {
      things.ledge = "rock";
      solved.vault = true;
      burst("sparks", at.x, at.y + 40);
      toast("Click. The vault door slides open.");
    } else if (thing === "cake" && to === "over-plate") {
      solved.cake = true;
      burst("confetti", at.x, at.y + 40);
      reveal("portal-cake", "It was a lie.");
    } else {
      things[to] = thing;
      toast(`${capitalize(THING_LABEL[thing])} came out of the ${from === a ? "blue" : "orange"} portal.`);
    }
    return { ...st, things, solved, arrived: st.arrived + 1 };
  };

  const surface = (id: Surface) => <PortalPanel id={id} state={s} onPlace={place} />;

  return (
    <>
      {/* The device itself, tucked into the corner of Education. */}
      <Slot id="portal-gun" className="mt-6 flex justify-end">
        {s.held ? null : (
          <button type="button" onClick={pickUp} data-portal-gun aria-label="A strange device. Pick it up" title="Hmm, what's this?" className="portal-gun rounded-md p-1 opacity-70 hover:opacity-100">
            <GunArt />
          </button>
        )}
      </Slot>

      {s.held ? (
        <>
          <Hud state={s} setState={setS} />

          <Slot id="chamber-word" className="mt-10">
            <Chamber n={1} title="Lost word" hint="This word wandered off from Contact. Put a portal under it, and one where it belongs.">
              {surface("word-shelf")}
            </Chamber>
          </Slot>
          <Slot id="chamber-blank" className="mt-8">
            <p className="flex flex-wrap items-center gap-2 font-display text-xl font-medium tracking-tight">
              Say {surface("blank")} anytime.
            </p>
          </Slot>

          <Slot id="chamber-ledge" className="mb-10">
            <Chamber n={2} title="Drop zone" hint="Get the rock onto the target in Experience. Whatever comes out of a ceiling panel falls straight down.">
              {surface("ledge")}
            </Chamber>
          </Slot>
          <Slot id="chamber-target" className="mt-10">
            <div className="portal-chamber grid grid-cols-3 gap-2 rounded-lg border border-line p-3" aria-label="Drop zone: three ceiling panels over a target" role="group">
              {(["panel-a", "panel-b", "panel-c"] as const).map((p) => (
                <div key={p} className="flex flex-col items-center gap-2">
                  {surface(p)}
                  {p === "panel-c" ? (
                    <span aria-hidden="true" className="text-2xl">
                      🎯
                    </span>
                  ) : (
                    <span aria-hidden="true" className="portal-wall" />
                  )}
                  <span className="sr-only">{p === "panel-c" ? "A target, behind glass" : "A wall"}</span>
                </div>
              ))}
            </div>
            {s.solved.target ? <p className="mt-2 text-sm text-muted">Target hit.</p> : null}
          </Slot>

          <Slot id="chamber-vault" className="mt-6">
            <Chamber n={3} title="The cake" hint="The cake is locked in a vault. Something heavy on the button might help. Then the plate is in Contact.">
              <div className="flex flex-wrap items-end gap-4">
                <div className={`portal-vault rounded-md border-2 p-2 ${s.solved.vault ? "border-kelp" : "border-dashed border-muted"}`}>
                  <span className="mb-1 block text-xs text-muted">{s.solved.vault ? "Vault: open" : "Vault: locked behind glass"}</span>
                  {surface("vault-shelf")}
                </div>
                <div className="flex flex-col items-center gap-2">
                  {surface("over-button")}
                  <span aria-hidden="true" className={`portal-vault-button ${s.solved.vault ? "is-pressed" : ""}`} />
                  <span className="sr-only">{s.solved.vault ? "The vault button, pressed" : "The vault button"}</span>
                </div>
              </div>
            </Chamber>
          </Slot>
          <Slot id="chamber-plate" className="mt-8">
            <div className="flex flex-col items-start gap-2">
              {surface("over-plate")}
              <span aria-hidden="true" className="text-3xl">
                🍽️
              </span>
              <span className="text-sm text-muted">{s.solved.cake ? "The plate is empty. The cake was a lie." : "An empty plate, waiting."}</span>
            </div>
          </Slot>
        </>
      ) : null}
    </>
  );
}

function capitalize(t: string) {
  return t[0].toUpperCase() + t.slice(1);
}

function rectOf(id: Surface) {
  const r = document.querySelector(`[data-portal-surface="${id}"]`)?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
}

function Chamber({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <div className="portal-chamber rounded-lg border border-line p-4" role="group" aria-label={`Test chamber ${n}: ${title}`}>
      <p className="font-mono text-sm font-semibold">
        Test chamber {n}: {title}
      </p>
      <p className="mt-1 mb-3 text-sm text-muted">{hint}</p>
      {children}
    </div>
  );
}

function PortalPanel({ id, state, onPlace }: { id: Surface; state: State; onPlace: (s: Surface) => void }) {
  const portal = state.portals.orange === id ? "orange" : state.portals.blue === id ? "blue" : null;
  const thing = state.things[id];
  const locked = id === "vault-shelf" && !state.solved.vault;
  const name = SURFACE_NAMES[id];
  const label = [`Panel: ${name}`, thing ? `holding ${THING_LABEL[thing]}` : "empty", portal ? `${portal} portal here` : null, locked ? "behind glass" : null]
    .filter(Boolean)
    .join(", ");
  return (
    <button
      type="button"
      data-portal-surface={id}
      data-portal={portal ?? undefined}
      data-locked={locked || undefined}
      aria-label={`${label}. Place the ${state.next} portal`}
      onClick={() => onPlace(id)}
      className="portal-panel relative inline-flex min-h-11 min-w-24 items-center justify-center rounded-md px-3 py-1 text-sm font-medium"
    >
      {thing ? (
        <span key={`${thing}-${state.arrived}`} className="portal-thing" aria-hidden="true">
          {thing === "word" ? <span className="font-display text-xl">hello</span> : thing === "rock" ? <span className="portal-rock" /> : <span className="text-2xl">🎂</span>}
        </span>
      ) : (
        <span aria-hidden="true" className="text-xs text-muted">
          {id === "blank" ? "_____" : "panel"}
        </span>
      )}
      {portal ? (
        <span aria-hidden="true" className="portal-tag">
          {portal}
        </span>
      ) : null}
    </button>
  );
}

function Hud({ state, setState }: { state: State; setState: (f: (s: State) => State) => void }) {
  const done = Object.values(state.solved).filter(Boolean).length;
  return (
    <div role="group" aria-label="Portal device" data-portal-hud data-wild-ui className="fixed top-28 right-3 z-[57] flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 text-sm shadow-lg sm:top-20">
      <span className="flex items-center gap-1.5 px-1">
        <span aria-hidden="true" className={`portal-dot is-${state.next}`} />
        Next: <strong>{state.next}</strong>
      </span>
      <button
        type="button"
        onClick={() => setState((s) => ({ ...s, next: s.next === "orange" ? "blue" : "orange" }))}
        className="min-h-11 rounded-full border border-line px-3 hover:border-ink/40"
      >
        Swap color
      </button>
      <button type="button" onClick={() => setState((s) => ({ ...s, portals: {}, next: "orange" }))} className="min-h-11 rounded-full border border-line px-3 hover:border-ink/40">
        Clear portals
      </button>
      <span className="px-1 text-muted">{done} of 4 steps</span>
      <button type="button" onClick={() => setState(() => START)} className="min-h-11 rounded-full border border-line px-3 hover:border-ink/40">
        Put it down
      </button>
    </div>
  );
}

function GunArt() {
  return (
    <svg width="56" height="32" viewBox="0 0 56 32" aria-hidden="true">
      <rect x="6" y="8" width="34" height="14" rx="7" fill="#eef1f3" stroke="#56636b" strokeWidth="1.5" />
      <path d="M14 22l-4 9h8l3-9z" fill="#4a545a" />
      <rect x="38" y="10" width="8" height="10" rx="2" fill="#56636b" />
      <circle cx="50" cy="15" r="4" fill="#7ad7ff" />
      <circle cx="50" cy="15" r="6.5" fill="none" stroke="#7ad7ff" strokeOpacity=".45" strokeWidth="2" />
      <path d="M12 12h18" stroke="#9aa6ad" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
