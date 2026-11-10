"use client";

import { useState } from "react";
import { revealDraft } from "@/lib/draft/store";
import { sound } from "@/lib/fx";

const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [3, 1], [1, 3], [3, 3]],
  5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
  6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
};

const roll = () => 1 + Math.floor(Math.random() * 6);

/**
 * Board games theme: a pair of dice in the hero. Snake eyes is a draft
 * secret, and so is rolling doubles three times in a row.
 */
export function Dice() {
  const [faces, setFaces] = useState<[number, number]>([3, 5]);
  const [streak, setStreak] = useState(0);
  const [rolls, setRolls] = useState(0);
  const [message, setMessage] = useState("");

  const onRoll = () => {
    const a = roll();
    const b = roll();
    const doubles = a === b;
    const next = doubles ? streak + 1 : 0;
    setFaces([a, b]);
    setStreak(next);
    setRolls((r) => r + 1);
    sound("pop");
    let note = doubles ? ` Doubles! ${next} in a row.` : "";
    if (a === 1 && b === 1) {
      note = " Snake eyes!";
      revealDraft("d-snake", "Snake eyes.");
    }
    if (next === 3) {
      revealDraft("d-hot", "Three doubles in a row. Hot dice!");
      setStreak(0);
    }
    setMessage(`Rolled ${a} and ${b}.${note}`);
  };

  return (
    <div className="draft-dice mt-8 flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={onRoll}
        data-dice-roll
        data-faces={`${faces[0]}-${faces[1]}`}
        aria-describedby="draft-dice-result"
        className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 font-medium hover:border-ink/40"
      >
        <span key={rolls} className="draft-dice-pair inline-flex gap-2" aria-hidden="true">
          <Die value={faces[0]} />
          <Die value={faces[1]} tilt />
        </span>
        Roll the dice
      </button>
      <p id="draft-dice-result" aria-live="polite" className="text-sm text-muted">
        {message || "Doubles three times running? Snake eyes? Give it a go."}
        {streak > 0 && streak < 3 ? <span className="ml-2 font-medium text-ink">Streak: {streak}</span> : null}
      </p>
    </div>
  );
}

function Die({ value, tilt }: { value: number; tilt?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={`draft-die size-10 ${tilt ? "draft-die-tilt" : ""}`} data-value={value}>
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#f6efe1" stroke="#1b140c" strokeWidth="2" />
      {PIPS[value].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x * 9 + 2} cy={y * 9 + 2} r="3.4" fill={value === 1 ? "#b3202a" : "#1b140c"} />
      ))}
    </svg>
  );
}
