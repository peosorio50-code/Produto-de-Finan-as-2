import Link from "next/link";
import { CalendarioAnotado } from "@/components/CalendarioAnotado";
import { Marca } from "@/components/Marca";
import { Rodape } from "@/components/Rodape";
import { MARCA } from "@/lib/config";

/*
 * A página inicial fala só do quiz gratuito. O plano pago é apresentado
 * depois, na tela do resultado, quando a pessoa já recebeu o raio-x do mês.
 */

const NUMEROS = [
  "Em que dia o seu dinheiro acaba",
  "Quanto do salário já chega com destino certo",
  "Para onde vai cada real, grupo por grupo",
  "Quanto sobra ou falta no fim do mês",
];

const LEITURA = [
  "O nome do seu tipo de mês, de equilibrado a no vermelho",
  "Os vazamentos que mais pesam e quanto custam por ano",
  "Se existe gasto que não aparece nas suas contas",
  "Por onde começar",
];

const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "O quiz é gratuito mesmo?",
    resposta:
      "Sim. Você informa nome, e-mail e WhatsApp, responde às perguntas e vê o resultado na tela, sem pagar nada e sem informar cartão.",
  },
  {
    pergunta: "Que dados vocês pedem?",
    resposta:
      "No início, nome, e-mail e WhatsApp. Depois, valores aproximados: renda, contas fixas, gastos do dia a dia e parcelas. Não pedimos CPF, senha, número de cartão nem nome de banco.",
  },
  {
    pergunta: "Por que pedem e-mail e WhatsApp?",
    resposta:
      "Para falar com você sobre o seu resultado e sobre o plano completo. Sem spam, e você pode pedir para sair quando quiser.",
  },
  {
    pergunta: "Como vocês sabem em que dia o dinheiro acaba?",
    resposta:
      "Contas fixas e parcelas saem logo que o dinheiro entra; o dia a dia vai saindo aos poucos. Com os valores que você informa, o quiz calcula até que dia o dinheiro cobre. Se você contar que ele acaba antes disso, o resultado mostra a diferença: o gasto que não aparece nas suas contas.",
  },
  {
    pergunta: "Preciso saber os valores exatos?",
    resposta:
      "Não. Valores aproximados já servem. Se algum chute ficar longe do real, o resultado aponta a diferença, e você pode corrigir as respostas quando quiser.",
  },
  {
    pergunta: "Serve para quem tem renda que varia?",
    resposta:
      "Sim. Para quem é autônomo, comissionado ou trabalha por aplicativo, o resultado leva isso em conta e usa a média dos últimos meses.",
  },
  {
    pergunta: "Isso é consultoria financeira?",
    resposta:
      "Não. É um material educativo, com estimativas feitas a partir do que você informa. Não indicamos bancos, investimentos nem crédito.",
  },
];

export default function PaginaInicial() {
  return (
    <>
      <header className="pagina topo">
        <Marca />
        <Link href="/diagnostico" className="botao botao--contorno botao--compacto topo__acao">
          Fazer o quiz
        </Link>
      </header>

      <main>
        <section className="pagina abertura">
          <div className="abertura__texto">
            <h1 className="titulo-1">Descubra em que dia o seu salário acaba, e para onde ele vai.</h1>
            <p className="destaque coluna">
              Responda a um quiz rápido sobre renda e gastos. O {MARCA.nome} faz as contas e mostra na hora,
              de graça, quanto do seu dinheiro já chega com destino, onde ele escapa e por onde começar.
            </p>
            <div className="abertura__acao">
              <Link href="/diagnostico" className="botao">
                Fazer o quiz gratuito
              </Link>
              <p className="pequeno apoio">Leva uns 3 minutos. Sem CPF e sem cartão.</p>
            </div>
          </div>
          <CalendarioAnotado />
        </section>

        <section className="secao secao--pautada" id="como-funciona">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Como funciona</h2>
            </div>
            <ol className="etapas">
              <li className="etapa">
                <h3 className="titulo-3">Você responde ao quiz</h3>
                <p className="apoio">
                  Perguntas rápidas, quase todas de um toque: quando o dinheiro acaba, quanto entra e para
                  onde vai. Valores aproximados já servem.
                </p>
              </li>
              <li className="etapa">
                <h3 className="titulo-3">O {MARCA.nome} faz as contas</h3>
                <p className="apoio">
                  Separa contas fixas, parcelas e dia a dia, calcula até que dia o dinheiro cobre e compara
                  com o que você vive.
                </p>
              </li>
              <li className="etapa">
                <h3 className="titulo-3">Você vê o seu mês</h3>
                <p className="apoio">
                  Na mesma hora, na tela: o nome do seu tipo de mês, os seus números, os vazamentos e por
                  onde começar.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="secao" id="o-que-mostra">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">O que o resultado mostra</h2>
              <p className="destaque apoio">
                Os números do seu mês que quase ninguém tem na ponta do lápis, e o que eles querem dizer.
              </p>
            </div>
            <div className="sumario">
              <div className="sumario__grupo">
                <h3 className="titulo-3">Seus números</h3>
                <ul className="sumario__lista">
                  {NUMEROS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="sumario__grupo">
                <h3 className="titulo-3">A leitura do seu caso</h3>
                <ul className="sumario__lista">
                  {LEITURA.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="secao secao--pautada" id="para-quem">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Para quem é, e para quem não é</h2>
            </div>
            <div className="duas-listas">
              <div className="pilha">
                <h3 className="titulo-3">É para você se</h3>
                <ul className="lista-marcada lista-marcada--sim">
                  <li>O salário acaba antes do fim do mês.</li>
                  <li>Fecha o mês no cartão, no limite da conta ou pedindo emprestado.</li>
                  <li>Não sabe direito para onde o dinheiro vai.</li>
                  <li>Quer começar a guardar, mas nunca sobra nada.</li>
                </ul>
              </div>
              <div className="pilha">
                <h3 className="titulo-3">Não é para você se</h3>
                <ul className="lista-marcada lista-marcada--nao">
                  <li>Procura dicas de investimento. O assunto aqui é o mês a mês.</li>
                  <li>Quer ganhar dinheiro rápido. Aqui não tem renda extra milagrosa.</li>
                  <li>Precisa negociar dívidas atrasadas com credores. O foco aqui é fazer o salário durar.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="secao" id="duvidas">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Dúvidas comuns</h2>
            </div>
            <div className="perguntas">
              {PERGUNTAS.map(({ pergunta, resposta }) => (
                <details key={pergunta} className="pergunta">
                  <summary>{pergunta}</summary>
                  <p className="pergunta__resposta">{resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="secao secao--pautada">
          <div className="pagina">
            <div className="secao__cabeca">
              <h2 className="titulo-2">Três minutos para saber para onde vai o seu salário</h2>
              <p className="destaque apoio">
                Dinheiro que a gente não acompanha sempre parece pouco. O quiz mostra onde ele está.
              </p>
            </div>
            <Link href="/diagnostico" className="botao">
              Fazer o quiz gratuito
            </Link>
          </div>
        </section>
      </main>

      <Rodape />
    </>
  );
}
