import type { MetadataRoute } from "next";
import { SITE } from "@/lib/api";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = SITE;
  return [
    { url: site, changeFrequency: "monthly", priority: 1 },
    { url: `${site}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
