"""Teste ponta a ponta do Mês Inteiro com o servidor.py de verdade (v21 = v20 + ganchos do Mês Inteiro).

Uso (fora da VPS, numa pasta qualquer):
  pip install fastapi httpx anthropic
  python testes/teste_mesinteiro.py
Monta uma cópia do servidor numa pasta temporária, com MOCK_IA=1 e sem Resend (os e-mails vão para dados/emails_teste).
Os módulos dos outros produtos (folego.py, casamento.py, clube.py) entram vazios. Para conferir que a venda do Fôlego
continua indo para o Fôlego, aponte FOLEGO_PY para o folego.py da VPS (ou do repositório do Fôlego).
"""
import datetime as dt, json, os, pathlib, shutil, subprocess, sys, tempfile, time

RAIZ = pathlib.Path(__file__).resolve().parents[1]
TMP = pathlib.Path(tempfile.mkdtemp(prefix="mesinteiro-teste-"))
for f in ("servidor.py", "mesinteiro.py", "mesinteiro_exemplo.json"):
    shutil.copy(RAIZ / "servidor" / f, TMP / f)
VAZIO = ("from fastapi import APIRouter\nrouter = APIRouter()\n"
         "def tabelas(): pass\ndef iniciar(): pass\ndef eh_folego(n): return False\ndef eh_casamento(n): return False\n")
FOLEGO = pathlib.Path(os.environ.get("FOLEGO_PY", "/nao-existe"))
if FOLEGO.exists():
    shutil.copy(FOLEGO, TMP / "folego.py")
for nome in ("folego.py", "casamento.py", "clube.py"):
    if not (TMP / nome).exists():
        (TMP / nome).write_text(VAZIO)
AMBIENTE = {"WEBHOOK_SEGREDO": "segredo", "MOCK_IA": "1", "RESEND_API_KEY": "", "ADMIN_EMAIL": "", "EMAIL_RESPOSTA": "atendimento@meusanto.teste",
            "MESINTEIRO_CHECKOUT": "XyZ123", "MESINTEIRO_REMETENTE": "plano@folegofinanceiro.shop",
            "MESINTEIRO_CONTATO": "ajuda@folegofinanceiro.shop", "MESINTEIRO_TRABALHADOR": "0", "FOLEGO_CHECKOUT": "FoLeGo1"}
os.environ.update(AMBIENTE)
sys.path.insert(0, str(TMP)); os.chdir(TMP)

from fastapi.testclient import TestClient  # noqa: E402
import servidor  # noqa: E402
import mesinteiro as M  # noqa: E402

OK = []
EX = json.loads((TMP / "mesinteiro_exemplo.json").read_text())
EMAILS = TMP / "dados" / "emails_teste"
PRODUTO = "Mês Inteiro: plano do salário"
BUMP = "Acompanhamento do Mês Inteiro: 4 semanas por e-mail"


def confere(cond, msg):
    print(("✔ " if cond else "✘ ") + msg)
    OK.append(bool(cond))
    if not cond:
        raise SystemExit(f"FALHOU: {msg}")


def emails(trecho):
    return sorted(EMAILS.glob(f"*{trecho.replace('@', '_').replace('.', '_')}*")) if EMAILS.exists() else []


def kiwify(cli, evento, order, email, produtos, sck=None, metodo="pix", esperado=200, extra=None):
    st = {"order_approved": "paid", "pix_created": "waiting_payment", "order_refunded": "refunded", "order_rejected": "refused"}.get(evento, evento)
    p = {"order_id": order, "order_status": st, "webhook_event_type": evento, "payment_method": metodo,
         "Product": {"product_id": "p1", "product_name": produtos[0]},
         "Customer": {"full_name": "Ana Teste", "first_name": "Ana", "email": email, "mobile": "+5511987654321"},
         "Commissions": {"charge_amount": 2990}, "TrackingParameters": {"sck": sck} if sck else {},
         "checkout_link": "https://pay.kiwify.com.br/XyZ123"}
    if len(produtos) > 1:
        p["order_bumps"] = [{"product_id": f"b{i}", "name": n} for i, n in enumerate(produtos[1:])]
    p.update(extra or {})
    r = cli.post("/webhook/kiwify/segredo", json=p)
    confere(r.status_code == esperado, f"webhook {evento} {produtos[0][:34]} → {r.status_code}")
    return r


def espera(cond, seg=15):
    t0 = time.time()
    while time.time() - t0 < seg:
        if cond():
            return True
        time.sleep(0.2)
    return False


def plano(cli, ref, **kw):
    """Chama /plano até sair do 202 (a IA de mentira responde na hora)."""
    for _ in range(50):
        r = cli.post("/api/mesinteiro/plano", json={"ref": ref, **kw})
        if r.status_code != 202:
            return r
        time.sleep(0.2)
    return r


def quiz(cli, email, nome="Ana Teste"):
    contato = {"nome": nome, "email": email, "telefone": "11987654321"}
    r = cli.post("/api/mesinteiro/lead", json={"evento": "quiz_concluido", "contato": contato, "respostas": EX["respostas"],
                                              "resumo": {k: v for k, v in EX["resumo"].items() if k != "desafio"},
                                              "origem": {"utm_source": "fb"}})
    confere(r.status_code == 200 and r.json().get("token"), f"quiz concluído guardado ({email.split('@')[0]})")
    return r.json()["token"], contato


def checkout(cli, contato, origem=None):
    r = cli.post("/api/mesinteiro/checkout", json={"respostas": EX["respostas"], "contato": contato, "resumo": EX["resumo"],
                                                  "dadosIA": EX["dadosIA"], "origem": origem or {"utm_source": "fb", "utm_campaign": "c1", "lixo": "x"}})
    confere(r.status_code == 200, f"checkout → {r.status_code}")
    return r.json()["ref"], r.json()["url"]


def envelhecer(tabela, coluna, horas, onde, args):
    with servidor._lock, servidor.db() as c:
        c.execute(f"UPDATE {tabela} SET {coluna}=? WHERE {onde}",
                  ((dt.datetime.now() - dt.timedelta(hours=horas)).isoformat(timespec="seconds"), *args))


with TestClient(servidor.app) as cli:
    # 0. servidor de pé, CORS do site novo, nada quebrado
    confere(cli.get("/health").json()["ok"] is True, "servidor de pé (health)")
    r = cli.options("/api/mesinteiro/checkout", headers={"Origin": "https://mesinteiro.folegofinanceiro.shop", "Access-Control-Request-Method": "POST",
                                                          "Access-Control-Request-Headers": "Content-Type"})
    confere(r.headers.get("access-control-allow-origin") == "https://mesinteiro.folegofinanceiro.shop", "CORS libera o site do Mês Inteiro")
    r = cli.options("/api/mesinteiro/checkout", headers={"Origin": "https://site-estranho.com", "Access-Control-Request-Method": "POST"})
    confere(r.headers.get("access-control-allow-origin") is None, "CORS não libera site estranho")

    # 1. quiz: início, conclusão, resultado em outro aparelho
    confere(cli.post("/api/mesinteiro/lead", json={"evento": "quiz_iniciado", "contato": {"nome": "X", "email": "sem-arroba"}}).status_code == 400,
            "contato inválido recusado")
    confere(cli.post("/api/mesinteiro/lead", json={"evento": "quiz_iniciado", "contato": {"nome": "Ana", "email": "ana@teste.com"}}).status_code == 200,
            "quiz iniciado")
    confere(cli.post("/api/mesinteiro/lead", json={"evento": "quiz_concluido", "contato": {"nome": "Ana", "email": "ana@teste.com"},
                                                    "respostas": {"nome": "Ana"}}).status_code == 400, "respostas incompletas recusadas")
    token, contato = quiz(cli, "ana@teste.com")
    r = cli.get(f"/api/mesinteiro/resultado?r={token}")
    confere(r.status_code == 200 and r.json()["respostas"]["rendaMensal"] == EX["respostas"]["rendaMensal"], "resultado abre pelo token")
    confere(cli.get("/api/mesinteiro/resultado?r=nao-existe-1234567890123").status_code == 404, "token inexistente → 404")
    confere(cli.post("/api/mesinteiro/lead", content=b"x" * 300_000, headers={"Content-Type": "application/json"}).status_code == 413,
            "corpo grande demais recusado")

    # 2. checkout: link da Kiwify com sck e utm
    os.environ["MESINTEIRO_CHECKOUT"] = ""
    confere(cli.post("/api/mesinteiro/checkout", json={"respostas": EX["respostas"]}).status_code == 503, "sem checkout configurado → 503")
    os.environ["MESINTEIRO_CHECKOUT"] = "XyZ123"
    ref, url = checkout(cli, contato)
    confere(ref.startswith("mi-") and url.startswith(f"https://pay.kiwify.com.br/XyZ123?sck={ref}") and "utm_source=fb" in url
            and "email=ana%40teste.com" in url and "lixo" not in url, "link da Kiwify com sck, e-mail e utm (sem lixo)")
    r = cli.post("/api/mesinteiro/plano", json={"ref": ref})
    confere(r.status_code == 402 and r.json()["urlPagamento"] == url, "plano antes de pagar → 402 com o link de pagamento")
    confere(cli.post("/api/mesinteiro/plano", json={"ref": "mi-falso"}).status_code == 400, "referência malformada → 400")
    confere(cli.post("/api/mesinteiro/plano", json={"ref": "mi-000000000000-0000000000000000"}).status_code == 404, "pedido inexistente → 404")

    # 3. Pix gerado → recuperação pendente; depois pago com o bump no mesmo aviso
    kiwify(cli, "pix_created", "K1", "ana@teste.com", [PRODUTO], sck=ref)
    with servidor.db() as c:
        confere(c.execute("SELECT status FROM mesinteiro_recup WHERE email='ana@teste.com'").fetchone()["status"] == "pendente",
                "Pix pendente vira recuperação pendente")
    confere(cli.post("/api/mesinteiro/plano", json={"ref": ref}).status_code == 402, "Pix pendente ainda não libera")
    kiwify(cli, "order_approved", "K1", "ana@teste.com", [PRODUTO, BUMP], sck=ref, metodo="credit_card")
    with servidor.db() as c:
        compra = c.execute("SELECT * FROM mesinteiro_compras WHERE order_id='K1'").fetchone()
        confere(compra["status"] == "pago" and json.loads(compra["skus"]) == ["acompanhamento", "plano"] and compra["ref"] == ref,
                "compra paga com plano + acompanhamento, ligada ao pedido")
        confere(c.execute("SELECT status FROM mesinteiro_recup WHERE email='ana@teste.com'").fetchone()["status"] == "pago",
                "recuperação cancelada ao pagar")
        confere(c.execute("SELECT COUNT(*) FROM compras").fetchone()[0] == 0, "nada entrou nas compras do Meu Santo")
    r = plano(cli, ref)
    j = r.json()
    confere(r.status_code == 200 and j["ia"]["recado"].endswith("(texto de teste)") and j["acompanhamento"] is True
            and j["respostas"]["nome"] == EX["respostas"]["nome"], "plano liberado com texto da IA e acompanhamento")
    confere(espera(lambda: any("Seu plano do M" in e.read_text() for e in emails("ana@teste.com"))), "e-mail com o link do plano")
    e = next(e for e in emails("ana@teste.com") if "Seu plano do M" in e.read_text()).read_text()
    confere("de: Mês Inteiro <plano@folegofinanceiro.shop>" in e and f"/plano?ref={ref}" in e and "meusanto" not in e.lower(),
            "e-mail sai do remetente do Mês Inteiro, com o link do plano")
    n_emails = len(emails("ana@teste.com"))

    # 4. aviso repetido não duplica nada
    kiwify(cli, "order_approved", "K1", "ana@teste.com", [PRODUTO, BUMP], sck=ref, metodo="credit_card")
    time.sleep(0.5)
    with servidor.db() as c:
        confere(c.execute("SELECT COUNT(*) FROM mesinteiro_compras").fetchone()[0] == 1, "aviso repetido não cria outra compra")
    confere(len(emails("ana@teste.com")) == n_emails, "aviso repetido não manda outro e-mail")

    # 5. vendas dos outros produtos continuam com eles
    kiwify(cli, "order_approved", "S1", "maria@teste.com", ["Devocionário do Meu Santo Protetor"])
    with servidor.db() as c:
        confere(c.execute("SELECT COUNT(*) FROM compras WHERE email='maria@teste.com'").fetchone()[0] >= 1, "venda do Meu Santo vai para o Meu Santo")
        confere(c.execute("SELECT COUNT(*) FROM mesinteiro_compras WHERE email='maria@teste.com'").fetchone()[0] == 0, "e não entra no Mês Inteiro")
    if FOLEGO.exists():
        kiwify(cli, "order_approved", "F1", "joao@teste.com", ["Fôlego: plano para sair das dívidas"])
        with servidor.db() as c:
            confere(c.execute("SELECT COUNT(*) FROM folego_compras WHERE email='joao@teste.com'").fetchone()[0] == 1, "venda do Fôlego vai para o Fôlego")
            confere(c.execute("SELECT COUNT(*) FROM mesinteiro_compras WHERE email='joao@teste.com'").fetchone()[0] == 0, "e não entra no Mês Inteiro")
        # upsell da página de obrigado: plano do Fôlego, pago sem o quiz do Fôlego → lembretes até fazer o quiz
        kiwify(cli, "order_approved", "UP1", "ana@teste.com", ["Fôlego: plano para sair das dívidas"], sck=ref, metodo="credit_card")
        confere(M.lembretes_folego() == 0, "upsell do Fôlego: espera uns minutos antes do lembrete")
        envelhecer("folego_compras", "criado", 0.3, "order_id=?", ("UP1",))
        confere(M.lembretes_folego() == 1 and any("quiz do Fôlego" in e.read_text() for e in emails("ana@teste.com")),
                "upsell do Fôlego sem quiz: lembrete para fazer o quiz do Fôlego")
        confere(M.lembretes_folego() == 0, "lembrete do Fôlego não repete")
        envelhecer("folego_compras", "criado", 21, "order_id=?", ("UP1",))
        confere(M.lembretes_folego() == 1, "segundo lembrete do Fôlego (~20 h)")
        with servidor._lock, servidor.db() as c:
            c.execute("UPDATE folego_compras SET ref='fl-feito' WHERE order_id='UP1'")
        envelhecer("folego_compras", "criado", 69, "order_id=?", ("UP1",))
        confere(M.lembretes_folego() == 0, "fez o quiz do Fôlego: os lembretes param")
    else:
        print("· (sem FOLEGO_PY: a venda do Fôlego não foi conferida)")
        confere(M.lembretes_folego() == 0, "sem o Fôlego no servidor, o lembrete do upsell não quebra")

    # 6. bump num aviso separado → vai para o pedido mais recente do mesmo e-mail
    token_b, contato_b = quiz(cli, "bia@teste.com", "Bia Teste")
    ref_b, _ = checkout(cli, contato_b)
    kiwify(cli, "order_approved", "B1", "bia@teste.com", [PRODUTO], sck=ref_b)
    confere(plano(cli, ref_b).json()["acompanhamento"] is False, "sem bump: acompanhamento desligado")
    kiwify(cli, "order_approved", "B2", "bia@teste.com", [BUMP])
    confere(plano(cli, ref_b).json()["acompanhamento"] is True, "bump em aviso separado liga ao pedido da mesma pessoa")

    # 7. reembolso tira o acesso
    kiwify(cli, "order_refunded", "B1", "bia@teste.com", [PRODUTO], sck=ref_b)
    confere(cli.post("/api/mesinteiro/plano", json={"ref": ref_b}).status_code == 402, "reembolso → plano bloqueado")
    kiwify(cli, "order_approved", "B1", "bia@teste.com", [PRODUTO], sck=ref_b)
    with servidor.db() as c:
        confere(c.execute("SELECT status FROM mesinteiro_compras WHERE order_id='B1'").fetchone()["status"] == "reembolsado",
                "aviso de pagamento atrasado não desfaz o reembolso")

    # 8. compra sem quiz (link direto): lembretes e depois o quiz com o mesmo e-mail leva ao plano
    kiwify(cli, "order_approved", "D1", "caio@teste.com", [PRODUTO])
    with servidor.db() as c:
        confere(c.execute("SELECT ref FROM mesinteiro_compras WHERE order_id='D1'").fetchone()["ref"] is None, "compra sem quiz fica sem pedido")
    envelhecer("mesinteiro_compras", "criado", 0.2, "order_id=?", ("D1",))
    M.lembretes()
    confere(any("Falta só o quiz" in e.read_text() for e in emails("caio@teste.com")), "lembrete pede o quiz (logo depois da compra)")
    M.lembretes()
    confere(sum("Falta só o quiz" in e.read_text() for e in emails("caio@teste.com")) == 1, "lembrete não repete na mesma hora")
    envelhecer("mesinteiro_compras", "criado", 21, "order_id=?", ("D1",))
    M.lembretes()
    confere(any("está esperando" in e.read_text() for e in emails("caio@teste.com")), "segundo lembrete (~20 h)")
    _, contato_c = quiz(cli, "caio@teste.com", "Caio Teste")
    ref_c, url_c = checkout(cli, contato_c)
    confere(url_c.endswith(f"/plano?ref={ref_c}"), "quem já pagou vai direto para o plano no checkout")
    confere(plano(cli, ref_c).status_code == 200, "plano liberado depois do quiz")
    with servidor.db() as c:
        confere(c.execute("SELECT ref FROM mesinteiro_compras WHERE order_id='D1'").fetchone()["ref"] == ref_c, "compra ligada ao pedido novo")

    # 9. "paguei com outro e-mail"
    kiwify(cli, "order_approved", "V1", "outro@teste.com", [PRODUTO])
    _, contato_v = quiz(cli, "dani@teste.com", "Dani Teste")
    ref_v, _ = checkout(cli, contato_v)
    confere(cli.post("/api/mesinteiro/vincular", json={"ref": ref_v, "email": "ninguem@teste.com"}).status_code == 404, "vincular sem compra → 404")
    confere(cli.post("/api/mesinteiro/vincular", json={"ref": ref_v, "email": "outro@teste.com"}).status_code == 200, "vincular com o e-mail da compra")
    confere(plano(cli, ref_v).status_code == 200, "plano liberado depois de vincular")

    # 10. reenviar o link (responde sempre igual)
    confere(cli.post("/api/mesinteiro/reenviar", json={"email": "ninguem@teste.com"}).json() == {"ok": True}, "reenviar não revela quem é cliente")
    antes = len(emails("ana@teste.com"))
    confere(cli.post("/api/mesinteiro/reenviar", json={"email": "ana@teste.com"}).json() == {"ok": True}, "reenviar para quem comprou")
    confere(espera(lambda: len(emails("ana@teste.com")) == antes + 1), "link reenviado por e-mail")

    # 11. recuperação de quem fez o quiz e não comprou: 1 h, 24 h, 72 h
    token_e, contato_e = quiz(cli, "edu@teste.com", "Edu Teste")
    confere(M.recuperar_quiz() == 0, "nada sai antes de 1 h")
    envelhecer("mesinteiro_resultados", "criado", 2, "token=?", (token_e,))
    confere(M.recuperar_quiz() == 1, "1 h depois: e-mail com o resultado")
    m = emails("edu@teste.com")[-1].read_text()
    confere(f"/resultado?r={token_e}" in m and "utm_campaign=resultado" in m and "/sair?e=" in m, "e-mail com o link do resultado e o descadastro")
    envelhecer("mesinteiro_resultados", "criado", 26, "token=?", (token_e,))
    confere(M.recuperar_quiz() == 0, "no máximo um e-mail a cada 12 h")
    envelhecer("mesinteiro_envios", "enviado", 13, "email=?", ("edu@teste.com",))
    confere(M.recuperar_quiz() == 1 and "dia 25" in emails("edu@teste.com")[-1].read_text(), "24 h depois: e-mail do plano")
    confere(not any("Seu tipo de mês" in e.read_text() and "dia 25" in e.read_text() for e in emails("edu@teste.com")), "uma etapa por e-mail")
    # descadastro: link assinado, só POST
    from urllib.parse import parse_qs, urlparse
    q = parse_qs(urlparse(M.link_sair("edu@teste.com", direto=True)).query)
    confere(cli.post(f"/api/mesinteiro/sair?e=edu@teste.com&t={'0' * 32}").status_code == 400, "descadastro com assinatura errada → 400")
    confere(cli.get(f"/api/mesinteiro/sair?e=edu@teste.com&t={q['t'][0]}").status_code == 405, "descadastro não aceita GET (robôs)")
    r = cli.post(f"/api/mesinteiro/sair?e=edu@teste.com&t={q['t'][0]}", headers={"Accept": "text/html"}, follow_redirects=False)
    confere(r.status_code == 303 and r.headers["location"].endswith("/sair?feito=1"), "descadastro pelo link volta para a página do site")
    envelhecer("mesinteiro_resultados", "criado", 80, "token=?", (token_e,))
    envelhecer("mesinteiro_envios", "enviado", 30, "email=?", ("edu@teste.com",))
    confere(M.recuperar_quiz() == 0, "descadastrado não recebe mais")
    # quem compra sai da sequência
    token_f, contato_f = quiz(cli, "fabi@teste.com", "Fabi Teste")
    ref_f, _ = checkout(cli, contato_f)
    kiwify(cli, "order_approved", "F2", "fabi@teste.com", [PRODUTO], sck=ref_f)
    envelhecer("mesinteiro_resultados", "criado", 2, "token=?", (token_f,))
    confere(M.recuperar_quiz() == 0, "quem comprou não recebe recuperação")

    # 12. recuperação da Kiwify: cartão recusado (15 min) e carrinho abandonado (90 min)
    kiwify(cli, "order_rejected", "R1", "gil@teste.com", [PRODUTO], metodo="credit_card")
    M.recuperar_kiwify()
    confere(not emails("gil@teste.com"), "recusado: espera 15 min")
    envelhecer("mesinteiro_recup", "criado", 0.3, "email=?", ("gil@teste.com",))
    M.recuperar_kiwify()
    confere(any("não foi aprovado" in e.read_text() for e in emails("gil@teste.com")), "recusado: e-mail para tentar de novo")
    r = cli.post("/webhook/kiwify/segredo", json={"webhook_event_type": "abandoned_cart", "status": "abandoned", "email": "hel@teste.com",
                                                  "name": "Hel", "product_name": PRODUTO, "checkout_link": "https://pay.kiwify.com.br/XyZ123"})
    confere(r.status_code == 200, "carrinho abandonado recebido")
    envelhecer("mesinteiro_recup", "criado", 1.6, "email=?", ("hel@teste.com",))
    M.recuperar_kiwify()
    confere(any("ficou pela metade" in e.read_text() and "kiwify_carrinho" in e.read_text() for e in emails("hel@teste.com")),
            "carrinho: e-mail com o link de volta")

    # 13. acompanhamento do bump: um e-mail por semana + fechamento
    with servidor.db() as c:
        criado = c.execute("SELECT criado FROM mesinteiro_compras WHERE order_id='K1'").fetchone()["criado"]
    datas = M._segundas(criado)
    M.acompanhamento(datas[0] - dt.timedelta(hours=1))
    confere(not any("Semana 1" in e.read_text() for e in emails("ana@teste.com")), "acompanhamento espera a segunda-feira")
    M.acompanhamento(datas[0] + dt.timedelta(hours=1))
    M.acompanhamento(datas[0] + dt.timedelta(hours=2))
    confere(sum("Semana 1 do seu m" in e.read_text() for e in emails("ana@teste.com")) == 1, "semana 1 sai uma vez só")
    for k in range(1, 5):
        M.acompanhamento(datas[k] + dt.timedelta(hours=1))
    confere(any("Hora de fechar o m" in e.read_text() for e in emails("ana@teste.com")), "fechamento do mês no fim das 4 semanas")
    with servidor.db() as c:
        confere(c.execute("SELECT COUNT(*) FROM mesinteiro_envios WHERE email='ana@teste.com' AND etapa LIKE 'acomp%'").fetchone()[0] == 5,
                "5 e-mails do acompanhamento ao todo")
        confere(c.execute("SELECT COUNT(*) FROM mesinteiro_envios WHERE etapa LIKE 'acomp%:B2'").fetchone()[0] == 0,
                "acompanhamento para quando o plano foi reembolsado")

    # 14. IA fora do ar: o plano sai na versão padrão e a IA tenta de novo depois
    os.environ["MESINTEIRO_MOCK_FALHA"] = "1"
    _, contato_g = quiz(cli, "ivo@teste.com", "Ivo Teste")
    ref_g, _ = checkout(cli, contato_g)
    kiwify(cli, "order_approved", "G1", "ivo@teste.com", [PRODUTO], sck=ref_g)
    j = plano(cli, ref_g).json()
    confere(j["ia"] is None and j["podeRegenerar"] is True, "IA falhou: plano sai na versão padrão (o site completa)")
    os.environ["MESINTEIRO_MOCK_FALHA"] = "0"
    envelhecer("mesinteiro_pedidos", "atualizado", 1, "ref=?", (ref_g,))
    M._refila_ia()
    confere(espera(lambda: M._pedido(ref_g)["ia"] is not None), "a IA tenta de novo sozinha e o texto aparece no mesmo link")

    # 15. promessa de resultado não passa
    ruim = dict(EX["ia"]); ruim["recado"] = "Com o plano, o seu dinheiro nunca mais vai faltar, resultado garantido."
    confere(M.conferir(ruim)["recado"] == "", "promessa de resultado é derrubada (o site usa o recado padrão)")

    # 16. webhook com erro → 500 (a Kiwify manda de novo)
    original = M.evento_kiwify
    M.evento_kiwify = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("falha simulada"))
    kiwify(cli, "order_approved", "E1", "jo@teste.com", [PRODUTO], esperado=500)
    M.evento_kiwify = original
    kiwify(cli, "order_approved", "E1", "jo@teste.com", [PRODUTO])

    # 17. contador do funil
    for ev in ("Entrou", "QuizInicio", "Resultado", "Checkout"):
        cli.post("/api/evento", json={"s": "sessao-teste-1", "e": ev, "p": "mesinteiro", "src": "fb"})
    with servidor.db() as c:
        confere(c.execute("SELECT COUNT(*) FROM eventos WHERE pagina='mesinteiro'").fetchone()[0] == 4, "contador do funil grava p=mesinteiro")

    # 18. limpeza: respostas do quiz de quem não comprou, depois de 60 dias
    envelhecer("mesinteiro_resultados", "criado", 61 * 24, "email=?", ("edu@teste.com",))
    envelhecer("mesinteiro_resultados", "criado", 61 * 24, "email=?", ("ana@teste.com",))
    M._limpar()
    with servidor.db() as c:
        confere(c.execute("SELECT COUNT(*) FROM mesinteiro_resultados WHERE email='edu@teste.com'").fetchone()[0] == 0, "quiz antigo sem compra apagado")
        confere(c.execute("SELECT COUNT(*) FROM mesinteiro_resultados WHERE email='ana@teste.com'").fetchone()[0] == 1, "quiz de quem comprou fica")

# 19. comandos da VPS
amb = {**os.environ, "PYTHONPATH": str(TMP)}
for cmd in (["diagnostico"], ["status"], ["funil", "7"], ["buscar", "ana@teste.com"], ["leads", "30"], ["teste", "teste@teste.com"]):
    r = subprocess.run([sys.executable, "mesinteiro.py", *cmd], cwd=TMP, env=amb, capture_output=True, text=True, timeout=120)
    confere(r.returncode == 0, f"mesinteiro.py {' '.join(cmd)} roda" + ("" if r.returncode == 0 else f"\n{r.stderr[-1500:]}"))
    if cmd[0] == "funil":
        confere("Começou o quiz" in r.stdout and "     1" in r.stdout, "funil mostra os eventos da página")
    if cmd[0] == "teste":
        confere("11 de 11 enviados" in r.stdout, "teste manda os 11 e-mails de exemplo" + ("" if "11 de 11" in r.stdout else f"\n{r.stdout}"))
    if cmd[0] == "leads":
        confere(r.stdout.count("\n") >= 5 and "ana@teste.com" in r.stdout, "planilha de leads")

print(f"\n{sum(OK)} conferências OK. Pasta do teste: {TMP}")
