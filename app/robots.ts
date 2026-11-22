import type { MetadataRoute } from "next";
import { SITE } from "@/lib/api";

export const dynamic = "force-static";

/** Só a página inicial e a privacidade interessam a buscadores. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/diagnostico", "/resultado", "/plano", "/sair"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
