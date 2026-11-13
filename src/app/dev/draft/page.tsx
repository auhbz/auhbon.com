import { Home } from "@/components/home";
import { devMetadata } from "@/components/dev/ui";
import { DraftBanner } from "@/components/draft/draft-banner";
import { DraftExtras } from "@/components/draft/draft-extras";
import { DraftRoot } from "@/components/draft/draft-root";
import { CelebrationLab } from "@/components/draft/celebration-lab";
import { workbench } from "@/lib/availability";
import "./draft.css";

export const metadata = devMetadata("Draft playground", "/dev/draft", "The live home page plus ideas being tested before they go live.");

/**
 * The draft playground: the live home page, rendered from the very same
 * component (so it can never drift), plus draft-only extras. Every extra is
 * listed on /dev/draft/diff (src/content/draft.ts).
 */
export default function DraftPage() {
  return (
    <DraftRoot>
      <DraftBanner />
      <Home heroExtra={<DraftExtras />} />
      {workbench ? <CelebrationLab /> : null}
    </DraftRoot>
  );
}
