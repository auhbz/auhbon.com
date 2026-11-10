"use client";

import { reveal } from "@/components/easter-eggs";

/** A Contact "link" that only shows while Bells & whistles is on. It politely refuses. */
export function PodBayDoors() {
  return (
    <button type="button" data-pod-bay className="text-link cursor-pointer" onClick={() => reveal("podbay", "I'm sorry, Dave. I'm afraid I can't do that.")}>
      Open the pod bay doors
    </button>
  );
}
