/** The Wild & Wondrous modes (plain data, safe for server components). */
export type WildMode = "monkeys" | "gravity";

export const WILD_MODES: { id: WildMode; unlock: string; label: string; description: string }[] = [
  {
    id: "monkeys",
    unlock: "wild:monkeys",
    label: "Monkey Mode",
    description: "Monkeys swing in on vines and steal words and buttons. Bonk them to get things back",
  },
  {
    id: "gravity",
    unlock: "wild:gravity",
    label: "Gravity Mode",
    description: "The page comes loose and falls. Grab the pieces and toss them, then put everything back",
  },
];
