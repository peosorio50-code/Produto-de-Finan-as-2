import { NextResponse, type NextRequest } from "next/server";
import { modoPagamento } from "@/lib/pagamento";
import { referenciaValida } from "@/lib/pedido";
import { buscarPedido, pedidoPago, vincularCompraSemPedido } from "@/lib/registros";

export const runtime = "nodejs";

/**
 * "Paguei com outro e-mail": liga ao pedido `ref` uma compra aprovada da
 * Kiwify que chegou sem pedido, feita com o e-mail informado.
 */
export async function POST(requisicao: NextRequest) {
  const corpo = await requisicao.json().catch(() => null);
  const ref: unknown = corpo?.ref;
  const email = typeof corpo?.email === "string" ? corpo.email.trim().toLowerCase().slice(0, 120) : "";
  if (!referenciaValida(ref) || !email.includes("@") || modoPagamento() !== "kiwify") {
    return NextResponse.json({ erro: "pedido_invalido" }, { status: 400 });
  }
  if (!buscarPedido(ref)) return NextResponse.json({ erro: "pedido_nao_encontrado" }, { status: 404 });
  if (pedidoPago(ref)) return NextResponse.json({ ok: true });
  if (vincularCompraSemPedido(email, ref)) return NextResponse.json({ ok: true });
  return NextResponse.json({ erro: "compra_nao_encontrada" }, { status: 404 });
}
