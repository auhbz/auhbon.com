import { DevPageHeader, DevSection, devMetadata } from "@/components/dev/ui";
import { StoryTree } from "@/components/draft/visuals/story-tree";
import { Architecture } from "@/components/draft/visuals/architecture";
import { Releases } from "@/components/draft/visuals/releases";
import { EffectsCatalog } from "@/components/draft/visuals/effects-catalog";
import "../draft/draft.css";
import "./visuals.css";

export const metadata = devMetadata("Visuals", "/dev/visuals", "Small diagrams of how auhbon.com works.");

export default function Visuals() {
  return (
    <>
      <DevPageHeader title="Visuals" intro="Small diagrams of how the site works. Each one is generated from the code or content it shows, so it stays in sync." />
      <DevSection id="farm" title="The farm story" intro="Every path through the Farm i-dots story: situations, the choices between them, and the 16 endings. Three endings hide a secret.">
        <StoryTree />
      </DevSection>
      <DevSection id="architecture" title="Site architecture" intro="How a visit reaches the code, and how the pages, components, stores and canvases connect.">
        <Architecture />
      </DevSection>
      <DevSection id="releases" title="Release sizes" intro="How many changes each version's notes list in CHANGELOG.md, oldest first.">
        <Releases />
      </DevSection>
      <DevSection id="catalog" title="Effects catalog" intro="Every Bells & whistles option and theme, live and draft, from the same lists the panel uses.">
        <EffectsCatalog />
      </DevSection>
    </>
  );
}
