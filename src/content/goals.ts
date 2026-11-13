/**
 * Long-term goals for the playground, with counts computed from the code (so
 * they can't drift). Shown on /dev/goals. Imports the unlocks contract, so use
 * it from client components only.
 */
import { CATEGORIES, LOOKS, SECRET_AREA_LABELS, SECRET_AREAS, SECRET_LIST } from "@/lib/fun";
import { GAMES } from "@/lib/games";
import { UNLOCKS, type UnlockKind } from "@/lib/unlocks";

export type Goal = { id: string; label: string; goal: number; current: number; note: string };

const kindCount = (kind: UnlockKind) => UNLOCKS.filter((u) => u.kind === kind).length;

export function goals(): Goal[] {
  return [
    { id: "secrets", label: "Secrets", goal: 100, current: SECRET_LIST.length, note: "Live secrets in SECRET_LIST (draft secrets don't count)." },
    { id: "effects", label: "Effect options", goal: 40, current: CATEGORIES.reduce((n, c) => n + c.options.length, 0), note: "Styles across i-dots, buttons, cursor trails, and sounds." },
    { id: "themes", label: "Themes", goal: 12, current: LOOKS.length, note: "Including Classic." },
    { id: "games", label: "Mini games", goal: 8, current: GAMES.length, note: "Playable from the Mini games section." },
    { id: "wild", label: "Wild & Wondrous modes", goal: 6, current: kindCount("wild"), note: "Counted from UNLOCKS entries of kind “wild”." },
    { id: "toys", label: "Toys", goal: 12, current: kindCount("toy"), note: "Counted from UNLOCKS entries of kind “toy”." },
  ];
}

/** How many live secrets each area has. */
export const secretsByArea = () => SECRET_AREAS.map((area) => ({ area, label: SECRET_AREA_LABELS[area], count: SECRET_LIST.filter((s) => s.area === area).length }));
