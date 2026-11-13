import Link from "next/link";
import { DevPageHeader, devMetadata } from "@/components/dev/ui";
import { PREVIEW_URL } from "@/content/review";

export const metadata = devMetadata("Public, Preview, and Draft", "/dev/environments", "Compare the release, preview, and draft playground.");

const rows = [
  ["Fun/Boring, locks, cheats, progress, and MP5 celebrations", "Release baseline", "Same", "Same", "Approved"],
  ["Hamsters, bubbles, and Flabby", "Release baseline", "Same", "Same", "Approved"],
  ["Pho, typing hint, Pico-8 climber, and portal HUD", "MP6 small fixes", "Same", "Same", "Release checks"],
  ["Monkey Mode", "Approved MP5 version", "Same", "Same for now", "Banana and gorilla redesign pending"],
  ["Board games", "Push your luck, Pig, and Free roll", "Same", "Separate test settings", "Draft game changes pending"],
  ["Toy box and its secrets", "Held", "Available", "Available on preview", "Toy review and locked slots pending"],
  ["Gravity and its secrets", "Held", "Available", "Available on preview", "Drop more needs work"],
  ["Car and Donut shop secret", "Held", "Available", "Available on preview", "Driving changes pending"],
  ["Later celebrations", "MP5 versions", "Same", "Options pending", "Choose effects and order"],
] as const;

export default function EnvironmentsPage() {
  return (
    <>
      <DevPageHeader title="Public, Preview, and Draft" intro="MP6 release inventory. Draft runs on the site you open it from. Use the preview's Draft for the newest experiments." />
      <nav aria-label="Site versions" className="my-5 flex flex-wrap gap-4 text-kelp underline">
        <a href="https://auhbon.com">Public</a>
        <a href={PREVIEW_URL}>Preview</a>
        <a href={`${PREVIEW_URL}/dev/draft`}>Preview Draft</a>
        <Link href="/dev/draft/diff">Draft notes</Link>
        <Link href="/dev/review">Review checklist</Link>
      </nav>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[45rem] border-collapse text-left text-sm">
          <caption className="sr-only">Feature availability and outstanding work</caption>
          <thead><tr>{["Feature", "Public release", "Preview", "Preview Draft", "Attention"].map((label) => (
            <th key={label} scope="col" className="border-b border-line p-3">{label}</th>
          ))}</tr></thead>
          <tbody>{rows.map(([feature, ...cells]) => (
            <tr key={feature}>
              <th scope="row" className="border-b border-line p-3 font-medium">{feature}</th>
              {cells.map((cell, index) => <td key={index} className="border-b border-line p-3">{cell}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
