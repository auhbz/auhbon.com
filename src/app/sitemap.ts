import type { MetadataRoute } from "next";
import { profile } from "@/content/profile";

// Only the home page. The /dev working notes are deliberately left out.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: profile.siteUrl, changeFrequency: "weekly", priority: 1 }];
}
