import type { MetadataRoute } from "next";
import { urlPublica } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = urlPublica();
  return [
    { url: site, changeFrequency: "monthly", priority: 1 },
    { url: `${site}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
