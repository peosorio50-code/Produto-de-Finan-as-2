import type { Metadata } from "next";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { EmailContato, SoComPixel } from "@/components/Contato";
import { MARCA } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacidade e termos",
};

export default function PaginaPrivacidade() {
  return (
    <>
      <header className="documento topo" style={{ paddingBottom: 0 }}>
        <Marca />
      </header>
      <main className="documento">
        <header className="documento__capa">
          <h1 className="titulo-2">Privacidade e termos de uso</h1>
          <p className="apoio">
            Em poucas palavras: pedimos o mínimo, usamos seu contato só para falar com você e não
            vendemos seus dados.
          </p>
        </header>

        <section className="bloco">
          <h2 className="titulo-3">O que pedimos</h2>
          <p>
            No início do quiz, nome, e-mail e WhatsApp. Depois, valores aproximados de renda, contas
            fixas, gastos do dia a dia e parcelas, e algumas respostas de múltipla escolha. Não pedimos
            CPF, senha, número de cartão, conta bancária nem nome de banco.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Para que usamos seu contato</h2>
          <p>
            Para falar com você sobre o seu resultado e sobre o plano completo, por e-mail e WhatsApp.
            Quem termina o quiz e não compra recebe no máximo três e-mails nos dias seguintes: o
            resultado guardado, o que o plano faz e um último lembrete. Quem começa o pagamento e não
            conclui (Pix gerado e não pago, cartão recusado ou pedido pela metade) pode receber um
            e-mail com o link para concluir. Todos têm um link para sair da lista. Para não receber mais mensagens, use esse link, responda a qualquer uma delas
            pedindo para sair
            <EmailContato antes=" ou escreva para " />. Não vendemos nem cedemos seu contato a outras empresas.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Onde suas respostas ficam</h2>
          <p>
            O resultado é calculado no seu aparelho, e as respostas ficam guardadas no armazenamento
            do navegador. Quando você começa o quiz, seu nome, e-mail e WhatsApp são gravados no nosso
            servidor. Quando termina, gravamos as respostas do quiz e um resumo do resultado (o tipo de
            mês, o nível, a renda, os totais de gastos e parcelas e o dia em que o dinheiro acaba),
            para que a conversa seja sobre o seu caso e para que o link do resultado, enviado por
            e-mail, abra em qualquer aparelho. Esse link é secreto: guarde-o como guardaria um
            documento.
          </p>
          <p>
            Quando você clica para comprar o plano completo, gravamos no servidor as respostas do quiz,
            para montar o plano depois do pagamento e para que você possa abri-lo em qualquer
            aparelho pelo link que recebe. O plano gerado fica guardado junto. As respostas também são
            enviadas a um serviço de inteligência artificial (Claude, da Anthropic) apenas para
            escrever o texto do plano. Seu e-mail e seu telefone não vão para a inteligência
            artificial.
          </p>
          <p>
            As respostas do quiz de quem não compra são apagadas do servidor depois de 60 dias. Os
            e-mails são enviados pela Resend, um serviço de envio de e-mails. Para contar quantas
            pessoas passam por cada etapa do site, registramos também etapas como &ldquo;abriu a
            página&rdquo; e &ldquo;terminou o quiz&rdquo;, com um código aleatório de visita e sem
            nenhum dado pessoal.
          </p>
          <p>
            Para apagar o que fica no seu aparelho, limpe os dados de navegação deste site nas
            configurações do seu navegador. Para apagar o que fica no nosso servidor, peça pelo canal
            indicado em &ldquo;Seus direitos sobre os dados&rdquo;.
          </p>
        </section>

        <SoComPixel>
          <section className="bloco">
            <h2 className="titulo-3">Anúncios e medição</h2>
            <p>
              Usamos o pixel da Meta (Facebook e Instagram) para saber quais anúncios trazem pessoas
              ao quiz e às compras. Ele registra no seu navegador as páginas visitadas e etapas como
              começar o quiz, terminá-lo e comprar, sem os valores das suas respostas. A Meta trata
              esses dados conforme a política de privacidade dela. Você pode limitar esse uso nas
              configurações de anúncios da sua conta da Meta ou bloqueando cookies de terceiros no
              navegador.
            </p>
          </section>
        </SoComPixel>

        <section className="bloco">
          <h2 className="titulo-3">Pagamento</h2>
          <p>
            O resultado do quiz é gratuito. O plano completo é opcional e pago uma única vez, sem
            assinatura. O pagamento é processado pela Kiwify, que trata seus dados conforme a
            política de privacidade dela e nos avisa quando o pagamento é aprovado, recusado ou
            devolvido, com seu nome, e-mail e telefone. Não temos acesso aos dados do seu cartão.
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">Garantia e devolução</h2>
          <p>
            Quem compra o plano completo tem {MARCA.garantiaDias} dias, a contar da compra, para pedir
            a devolução integral do valor, sem precisar explicar o motivo.
            <EmailContato antes=" Escreva para " depois=" pelo mesmo e-mail usado no pagamento." />
          </p>
        </section>

        <section className="bloco">
          <h2 className="titulo-3">O que o {MARCA.nome} é, e o que não é</h2>
          <p>
            É um material educativo: um resultado gratuito e, para quem quiser, um plano de
            organização do mês, feitos a partir das informações que você fornece. Os valores e prazos
            são estimativas, calculadas com os números que você informa, e não garantem resultado.
          </p>
          <p>
            Não é instituição financeira, não concede crédito, não indica investimentos e não presta
            consultoria jurídica, contábil ou de investimentos. Parte do texto é escrita por
            inteligência artificial e pode conter imprecisões: confira os valores no seu extrato antes de
            tomar decisões.
          </p>
        </section>

        <section className="bloco bloco--final">
          <h2 className="titulo-3">Seus direitos sobre os dados</h2>
          <p>
            Pela Lei Geral de Proteção de Dados, você pode pedir acesso, correção ou exclusão dos seus
            dados. O que temos é o seu contato, as respostas e o resumo do resultado do quiz e os
            registros de pagamento.
            <EmailContato antes=" Para qualquer pedido, escreva para " depois="." />
          </p>
        </section>
      </main>
      <Rodape />
    </>
  );
}
