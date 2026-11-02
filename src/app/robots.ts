import type { MetadataRoute } from "next";
import { profile } from "@/content/profile";

export default function robots(): MetadataRoute.Robots {
  return {
    // /dev holds working notes, reachable only by URL (and noindexed on the pages themselves).
    rules: { userAgent: "*", allow: "/", disallow: "/dev" },
    sitemap: `${profile.siteUrl}/sitemap.xml`,
  };
}
