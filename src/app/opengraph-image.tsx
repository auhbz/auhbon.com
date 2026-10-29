import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { profile } from "@/content/profile";

export const alt = `${profile.name}, ${profile.role.toLowerCase()} in ${profile.location}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The share card LinkedIn and others show when the link is posted.
export default async function Image() {
  const font = await readFile(
    join(process.cwd(), "node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#13232c",
          color: "#e5ecea",
          fontFamily: "Plex",
        }}
      >
        <div style={{ fontSize: 30, color: "#6cc7ae" }}>{profile.domain}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 120, lineHeight: 0.95, letterSpacing: "-0.04em" }}>{profile.name}</div>
          <div style={{ fontSize: 40, color: "#9fb0b5" }}>
            {profile.role}, {profile.location}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Plex", data: font, weight: 600, style: "normal" }] },
  );
}
