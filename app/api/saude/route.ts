import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailConfigurado } from "@/lib/email";
import { tokensKiwify } from "@/lib/kiwify";
import { modoPagamento } from "@/lib/pagamento";

export const runtime = "nodejs";

/** Checagem rápida depois de instalar: diz o que está ligado, sem mostrar nenhuma chave. */
export async function GET() {
  let banco = false;
  try {
    db().prepare("SELECT 1").get();
    banco = true;
  } catch (erro) {
    console.error("[saude] banco:", erro instanceof Error ? erro.message : erro);
  }
  return NextResponse.json(
    {
      ok: banco,
      banco,
      pagamento: modoPagamento(),
      webhookKiwify: Boolean(process.env.KIWIFY_WEBHOOK_SEGREDO),
      assinaturaKiwify: tokensKiwify().length > 0,
      ia: Boolean(process.env.ANTHROPIC_API_KEY),
      email: emailConfigurado(),
      siteUrl: Boolean(process.env.SITE_URL),
    },
    { status: banco ? 200 : 503 },
  );
}
