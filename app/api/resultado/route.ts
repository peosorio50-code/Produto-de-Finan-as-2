import { NextResponse, type NextRequest } from "next/server";
import { buscarResultado } from "@/lib/resultados";

export const runtime = "nodejs";

/**
 * Abre um resultado guardado pelo link secreto dos e-mails
 * (/resultado?r=TOKEN), em qualquer aparelho.
 */
export async function GET(requisicao: NextRequest) {
  const resultado = buscarResultado(requisicao.nextUrl.searchParams.get("r") ?? "");
  if (!resultado) return NextResponse.json({ erro: "nao_encontrado" }, { status: 404 });
  return NextResponse.json(resultado, { headers: { "Cache-Control": "no-store" } });
}
