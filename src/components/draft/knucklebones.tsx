"use client";

import { useState } from "react";
import { d6 } from "@/lib/draft/dice-physics";
import { revealDraft } from "@/lib/draft/store";

type Board = number[][];
const empty = (): Board => [[], [], []];
const score = (board: Board) => board.reduce((total, column) =>
  total + column.reduce((sum, die) => sum + die * column.filter((other) => other === die).length, 0), 0);
const full = (board: Board) => board.every((column) => column.length === 3);

function place(board: Board, opponent: Board, column: number, die: number): [Board, Board] {
  return [
    board.map((values, index) => index === column ? [...values, die] : values),
    opponent.map((values, index) => index === column ? values.filter((value) => value !== die) : values),
  ];
}

export function Knucklebones() {
  const [you, setYou] = useState(empty);
  const [house, setHouse] = useState(empty);
  const [die, setDie] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("Roll a die to start.");

  function play(column: number) {
    if (die === null || done || you[column].length === 3) return;
    let [player, lamb] = place(you, house, column, die);
    let reply = "";
    if (!full(player)) {
      const roll = d6();
      const choice = lamb.map((values, index) => ({ index, values }))
        .filter(({ values }) => values.length < 3)
        .map(({ index }) => {
          const [a, b] = place(lamb, player, index, roll);
          return { index, a, b, advantage: score(a) - score(b) };
        })
        .sort((a, b) => b.advantage - a.advantage)[0];
      if (choice) {
        [lamb, player] = [choice.a, choice.b];
        reply = `The lamb rolled ${roll} into column ${choice.index + 1}.`;
      }
    }
    setYou(player);
    setHouse(lamb);
    setDie(null);
    if (!full(player) && !full(lamb)) {
      setNote(`${reply} Your roll.`.trim());
      return;
    }
    setDone(true);
    const margin = score(player) - score(lamb);
    setNote(margin > 0 ? "You beat the lamb." : margin < 0 ? "The lamb wins." : "The match is tied.");
    revealDraft("d-finish-knucklebones", "You finished Knucklebones.");
    if (margin > 0) revealDraft("d-win-knucklebones", "You beat the house at Knucklebones.");
  }

  return (
    <div className="space-y-3" data-knucklebones>
      <p className="text-sm text-muted">Roll and choose a column. Matching dice in your column multiply their points. A matching die in the opposite column is removed. The game ends when either board fills.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <h4 className="font-semibold">You · {score(you)}</h4>
          <div className="grid grid-cols-3 gap-1">
            {you.map((column, index) => (
              <button key={index} type="button" disabled={done || die === null || column.length === 3}
                onClick={() => play(index)} className="min-h-14 rounded border border-line px-1 disabled:opacity-60"
                aria-label={`Your column ${index + 1}: ${column.join(", ") || "empty"}`}>
                {column.join(" · ") || "—"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="flex items-center gap-2 font-semibold">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
              <path d="M8 13 4 3l9 6m11 4 4-10-9 6" fill="#a92c39" />
              <path d="M4 15a5 5 0 0 1 6-5 7 7 0 0 1 12 0 5 5 0 0 1 6 5l-5 5v4a7 7 0 0 1-14 0v-4z" fill="#e8dfcf" />
              <path d="m10 19 4 2m8-2-4 2m-4 5h4" fill="none" stroke="#871a32" strokeWidth="2" strokeLinecap="round" />
            </svg>
            The wicked lamb · {score(house)}
          </h4>
          <div className="grid grid-cols-3 gap-1">
            {house.map((column, index) => (
              <div key={index} className="grid min-h-14 place-items-center rounded border border-line" aria-label={`House column ${index + 1}`}>
                {column.join(" · ") || "—"}
              </div>
            ))}
          </div>
        </div>
      </div>
      <button type="button" disabled={!done && die !== null} className="min-h-11 rounded-full border border-line px-4"
        onClick={() => {
          if (done) {
            setYou(empty());
            setHouse(empty());
            setDone(false);
            setNote("Roll a die to start.");
          } else {
            const roll = d6();
            setDie(roll);
            setNote(`You rolled ${roll}. Choose a column.`);
          }
        }}>
        {done ? "Play again" : "Roll"}
      </button>
      <p role="status">{note}</p>
    </div>
  );
}
