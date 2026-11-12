import { DEV_AS_OF } from "@/content/dev";
import { DevPageHeader, DevSection, devMetadata } from "@/components/dev/ui";
import { AreaCounts, GoalsTracker } from "@/components/dev/fun-dev";

export const metadata = devMetadata("Goals", "/dev/goals", "Long-term goals for the playground on auhbon.com, with live counts.");

export default function Goals() {
  return (
    <>
      <DevPageHeader
        title="Goals"
        asOf={DEV_AS_OF}
        intro="Where the playground is headed. Every count comes straight from the code, so this page updates itself as features ship."
      />
      <DevSection id="goals" title="Long-term goals">
        <GoalsTracker />
      </DevSection>
      <DevSection id="areas" title="Secrets by area" intro="How many live secrets each part of the site has.">
        <AreaCounts />
      </DevSection>
    </>
  );
}
