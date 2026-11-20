import type { MetadataRoute } from "next";
import { urlPublica } from "@/lib/site";

/** Só a página inicial e a privacidade interessam a buscadores. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/diagnostico", "/resultado", "/plano", "/pagamento-teste", "/sair"],
    },
    sitemap: `${urlPublica()}/sitemap.xml`,
  };
}
