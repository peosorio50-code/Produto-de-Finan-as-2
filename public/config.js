/*
 * Configuração do site do Mês Inteiro (mesinteiro.folegofinanceiro.shop).
 * Para mudar: edite aqui, salve e suba a pasta do site de novo no Cloudflare Pages
 * (projeto mesinteiro). Não precisa compilar nada. Nada aqui é segredo: não coloque
 * chaves nem tokens neste arquivo (eles ficam só no /opt/mapadaalma/.env da VPS).
 */
window.MESINTEIRO_CONFIG = {
  // Servidor (o mesmo do Meu Santo Protetor). Não mude.
  API: "https://api.mapadaalma.online",

  // false fecha a venda: o resultado mostra "Em breve" no lugar do botão de compra.
  VENDA_ABERTA: true,

  // E-mail de atendimento mostrado no site (rodapé, privacidade, página do plano). Vazio = escondido.
  CONTATO_EMAIL: "",

  // true mostra "receber o link do plano por e-mail". Só ligue depois de pôr o
  // MESINTEIRO_REMETENTE no .env (domínio folegofinanceiro.shop verificado na Resend).
  REENVIO: false,

  // Pixel da Meta: só o número. Vazio = sem pixel.
  META_PIXEL_ID: "",

  // Link completo do checkout do plano na Kiwify (https://pay.kiwify.com.br/XXXX).
  // Só é usado se o servidor não responder: a compra entra e o servidor pede o quiz por e-mail.
  CHECKOUT_RESERVA: "",

  // Upsell de 1 clique na página de obrigado (o plano das dívidas do Fôlego, oferta de R$ 19,90).
  // UPSELL_ID: o trecho depois de "kiwify-upsell-trigger-" no código do "Gerador de upsell" da Kiwify.
  // Vazio = sem upsell (a página de obrigado vai direto ao plano).
  UPSELL_ID: "",
  // Confira com o <script src="..."> do código que a Kiwify gerar; se for outro, troque aqui.
  UPSELL_SCRIPT: "https://snippets.kiwify.com/upsell/upsell.min.js",
  // Link do checkout da mesma oferta: reserva para quem pagou no Pix (Pix não tem 1 clique).
  CHECKOUT_UPSELL: "",
  PRECO_UPSELL: "19,90",
  PRECO_NORMAL_UPSELL: "29,90",
};
