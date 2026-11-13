export const workbench = process.env.NEXT_PUBLIC_WORKBENCH !== "off";

const held = new Set(["effect:trail:car", "wild:gravity", "donuts", "gravity-toss", "gravity-name", "behind-the-scenes", "jerrys-way"]);

export function isAvailable(id: string) {
  return workbench || (!held.has(id) && !id.startsWith("toy:") && !id.startsWith("toy-"));
}
