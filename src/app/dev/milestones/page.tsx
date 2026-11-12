import { DevPageHeader, DevSection, devMetadata } from "@/components/dev/ui";
import { MilestonesWidget } from "@/components/dev/milestones-widget";

export const metadata = devMetadata("Milestones", "/dev/milestones", "How milestones and unlock thresholds scale with the number of secrets.");

export default function Milestones() {
  return (
    <>
      <DevPageHeader
        title="Milestones"
        intro={
          <>
            Milestones and unlock thresholds are written for 100 secrets. While fewer exist, each value is scaled down with f(m) = round(100·N·m / (100·N +
            m·(100 − N))): small values barely move, far ones are pulled back much more, and 100 becomes N. Milestones are then nudged so they stay distinct
            and increasing. Drag the slider to see where everything lands for any number of secrets.
          </>
        }
      />
      <DevSection id="projection" title="Projection">
        <MilestonesWidget />
      </DevSection>
    </>
  );
}
