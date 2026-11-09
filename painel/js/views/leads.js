import { h, fmtDateTime } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";

// Leads, duas fontes:
// 1. Redes: comentários e DMs do Instagram/Facebook com intenção de compra (social_inbox.lead_status). Chegam pela
//    função "meta" (quando a Meta entrega) e pela rotina do Chrome que lê a caixa do Instagram (só leitura).
// 2. LP motion: pedidos de vídeo enviados pela LP andersonbrito.com/motion (motion_pedidos).
const ST = { novo: "Novos", contatado: "Contatados", pago: "Pagos", em_producao: "Em produção", alteracao_1: "Alteração 1", alteracao_2: "Alteração 2", entregue: "Entregues", cancelado: "Cancelados" };
const PROX = { novo: "contatado", contatado: "pago", pago: "em_producao", em_producao: "entregue", alteracao_1: "entregue", alteracao_2: "entregue" };
const SST = { novo: "Novos", contatado: "Contatados", convertido: "Viraram cliente", descartado: "Descartados" };
const SPROX = { novo: "contatado", contatado: "convertido" };
const KIND = { comment: "Comentário", dm: "DM", lead: "Formulário" };
const waLink = (n) => "https://wa.me/55" + String(n || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

export default async function leads({ sb, query, go, refresh }) {
  const fonte = ["lp", "pesq"].includes(query.f) ? query.f : "redes";
  if (fonte === "pesq") {
    const [ps, rq] = await Promise.all([
      sb.from("prospects").select("*").is("archived_at", null).order("destaque", { ascending: false }).order("nome").limit(2000),
      sb.from("claude_requests").select("id, status, payload, result_note, created_at").eq("kind", "pesquisa_leads").is("archived_at", null).order("created_at", { ascending: false }).limit(20),
    ]);
    return h("div", { class: "page" }, pageHead("Leads", "base de prospecção para abordar"), abas(go, fonte, null, null), pesquisas(sb, query, go, refresh, ps, rq));
  }
  const [lp, rd] = await Promise.all([
    sb.from("motion_pedidos").select("*").is("archived_at", null).order("created_at", { ascending: false }).limit(500),
    sb.from("social_inbox").select("id, platform, kind, external_id, permalink, author_name, text, lead_status, lead_reason, received_at, version")
      .not("lead_status", "is", null).is("archived_at", null).order("received_at", { ascending: false }).limit(500),
  ]);
  const novosLp = (lp.data || []).filter((l) => l.status === "novo").length;
  const novosRd = (rd.data || []).filter((l) => l.lead_status === "novo").length;
  const tabs = abas(go, fonte, novosRd, novosLp);
  const body = fonte === "lp" ? motion(sb, query, go, refresh, lp) : redes(sb, query, go, refresh, rd);
  return h("div", { class: "page" }, pageHead("Leads", fonte === "lp" ? "pedidos da LP de vídeo motion" : "quem demonstrou interesse nas redes"), tabs, body);
}

function abas(go, fonte, nRd, nLp) {
  const tab = (id, label, n) => h("button", { type: "button", class: "chip" + (fonte === id ? " on" : ""), onclick: () => go("/leads" + (id === "redes" ? "" : "?f=" + id)) }, label, n != null && h("sup", null, n));
  return h("div", { class: "mfilters" }, tab("redes", "Instagram e Facebook", nRd), tab("lp", "LP motion", nLp), tab("pesq", "Pesquisas", null));
}

// Pesquisas: base de prospecção (tabela prospects). Scripts prontos por segmento; o Direct não aceita texto pronto,
// então o botão copia o script e abre a conversa. WhatsApp abre wa.me (o app padrão do Mac, o WhatsApp Business).
const PST = { novo: "A abordar", contatado: "Contatados", respondeu: "Responderam", fechou: "Fecharam", descartado: "Descartados" };
const SCRIPTS = {
  igreja: (p) => "A paz, pastor! Fiz um vídeo de convite de Natal para igrejas e faço um igual para a " + p.nome + ", com o nome, a data e o horário do culto de vocês, pronto em 24h para postar e mandar no WhatsApp da igreja.\n\nO valor é R$97, com pagamento antecipado via Pix. Se quiser, é só me mandar a data do culto que eu já começo.",
  negocio: (p) => "Oi! Tudo bem? Vi o perfil da " + p.nome + " e faço vídeos motion para " + (p.segmento || "negócios").toLowerCase() + ", prontos em até 24h para anúncio, Reels, Stories e status do WhatsApp, com 2 alterações inclusas.\n\nO valor é R$97, com pagamento antecipado via Pix. Posso te mandar um exemplo do seu segmento?",
};
const ASSUNTO = { igreja: "Vídeo de convite de Natal para a igreja", negocio: "Vídeo motion para o seu negócio em 24h" };
const tipoDe = (p) => /igreja/i.test(p.segmento || "") ? "igreja" : "negocio";

function pesquisas(sb, query, go, refresh, { data, error }, reqs) {
  if (error) return alertBox(/prospects/.test(error.message || "") ? "Falta aplicar a migration 0039 (prospects) no Supabase para as pesquisas aparecerem aqui." : "Não foi possível carregar as pesquisas.");
  const all = data || [];
  const st = Object.keys(PST).includes(query.st) ? query.st : "novo";
  const nomes = [...new Set(all.map((p) => p.pesquisa))];
  const pq = nomes.includes(query.p) ? query.p : "";
  const cid = query.c || "";
  const base = all.filter((p) => (!pq || p.pesquisa === pq));
  const cidades = [...new Set(base.map((p) => p.cidade).filter(Boolean))].sort();
  const list = base.filter((p) => p.status === st && (!cid || p.cidade === cid));
  const url = (o) => { const q = new URLSearchParams({ f: "pesq", ...(o.p ?? pq ? { p: o.p ?? pq } : {}), ...(o.c ?? cid ? { c: o.c ?? cid } : {}), ...((o.st ?? st) !== "novo" ? { st: o.st ?? st } : {}) }); return "/leads?" + q.toString(); };
  const mover = async (p, status) => {
    const rows = { status }; if (status === "contatado" && !p.contatado_em) rows.contatado_em = new Date().toISOString();
    const { data: d } = await sb.from("prospects").update(rows).eq("id", p.id).eq("version", p.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast("Movido para " + PST[status] + "."); refresh();
  };
  const copiar = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };
  const card = (p) => {
    const tp = tipoDe(p), script = SCRIPTS[tp](p);
    const ig = p.instagram && "https://ig.me/m/" + p.instagram;
    return h("article", { class: "job" },
      h("div", { class: "flex" }, p.destaque && h("span", { class: "ptag p-instagram" }, "prioridade"), h("b", { class: "truncate" }, p.nome), h("div", { class: "grow" }), h("span", { class: "muted small" }, [p.cidade, p.uf].filter(Boolean).join("/"))),
      h("div", { class: "muted" }, [p.segmento, p.instagram && "@" + p.instagram, p.seguidores && p.seguidores + " seguidores", p.whatsapp && "WhatsApp " + p.whatsapp, p.site, p.notas].filter(Boolean).join(" · ")),
      h("details", null, h("summary", { class: "small" }, "Script"), h("p", { class: "sxtext" }, script)),
      h("div", { class: "flex jbar" },
        ig && h("button", { class: "btn btn-sm", type: "button", onclick: async () => { const ok = await copiar(script); window.open(ig, "_blank", "noopener"); toast(ok ? "Script copiado. Cole no Direct." : "Abra o Script e copie à mão."); } }, "Direct"),
        p.whatsapp && h("a", { class: "btn btn-sm", href: waLink(p.whatsapp) + "?text=" + encodeURIComponent(script), target: "_blank", rel: "noopener" }, "WhatsApp"),
        p.email && h("a", { class: "btn btn-sm", href: "mailto:" + p.email + "?subject=" + encodeURIComponent(ASSUNTO[tp]) + "&body=" + encodeURIComponent(script) }, "E-mail"),
        p.instagram && h("a", { class: "btn btn-ghost btn-sm", href: "https://www.instagram.com/" + p.instagram + "/", target: "_blank", rel: "noopener" }, "Perfil"),
        p.site && h("a", { class: "btn btn-ghost btn-sm", href: /^https?:/.test(p.site) ? p.site : "https://" + p.site, target: "_blank", rel: "noopener" }, "Site"),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: async () => toast((await copiar(script)) ? "Script copiado." : "Não consegui copiar.") }, "Copiar script"),
        ...({ novo: ["contatado"], contatado: ["respondeu"], respondeu: ["fechou"], fechou: [], descartado: ["novo"] }[p.status] || []).map((s) => h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(p, s) }, "→ " + PST[s])),
        !["descartado", "fechou"].includes(p.status) && h("button", { class: "btn btn-ghost btn-sm danger", type: "button", onclick: () => mover(p, "descartado") }, "Descartar")));
  };
  const chip = (id) => h("button", { type: "button", class: "chip" + (st === id ? " on" : ""), onclick: () => go(url({ st: id })) }, PST[id], h("sup", null, base.filter((p) => p.status === id && (!cid || p.cidade === cid)).length));
  const sel = (val, opts, ph, on) => h("select", { class: "input", "aria-label": ph, onchange: (e) => on(e.target.value) }, h("option", { value: "" }, ph), ...opts.map((o) => h("option", { value: o, selected: o === val }, o)));
  // Pedir nova pesquisa: vira claude_requests kind 'pesquisa_leads' para a rotina leads-pesquisas.
  const form = h("form", { class: "flex jbar", onsubmit: async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const payload = { cidades: String(f.get("cidades") || "").trim(), segmento: String(f.get("segmento") || "").trim(), obs: String(f.get("obs") || "").trim() };
    if (!payload.cidades) return toast("Diga as cidades.", { kind: "err" });
    const { error: er } = await sb.from("claude_requests").insert({ kind: "pesquisa_leads", payload });
    if (er) return toast(/check/.test(er.message || "") ? "Falta aplicar a migration 0039." : "Não foi possível pedir.", { kind: "err" });
    toast("Pedido enviado. O Claude pesquisa e a lista aparece aqui."); refresh();
  } },
    h("input", { class: "input", name: "cidades", placeholder: "cidades (ex.: Limeira, Americana)", "aria-label": "Cidades" }),
    h("input", { class: "input", name: "segmento", placeholder: "segmento (igrejas, barbearias, açaí...)", "aria-label": "Segmento" }),
    h("input", { class: "input", name: "obs", placeholder: "observação (opcional)", "aria-label": "Observação" }),
    h("button", { class: "btn btn-sm", type: "submit" }, "Pedir nova pesquisa"));
  const pedidos = (reqs.data || []).filter((r) => r.status !== "cancelado").slice(0, 5);
  return h("div", null,
    h("p", { class: "muted small" }, "Negócios e igrejas achados em pesquisa pública. Direct copia o script e abre a conversa (cole e envie); WhatsApp abre o seu WhatsApp Business com o texto pronto. Mande 10 a 15 por dia."),
    form,
    pedidos.length ? h("div", { class: "muted small" }, ...pedidos.map((r) => h("div", null, fmtDateTime(r.created_at) + " · " + [r.payload?.segmento, r.payload?.cidades].filter(Boolean).join(" em ") + " · " + ({ aberto: "na fila", gerando: "pesquisando", feito: "pronto" }[r.status] || r.status) + (r.result_note ? " · " + r.result_note : "")))) : null,
    h("div", { class: "mfilters" }, sel(pq, nomes, "Todas as pesquisas", (v) => go(url({ p: v, c: "" }))), sel(cid, cidades, "Todas as cidades", (v) => go(url({ c: v })))),
    h("div", { class: "mfilters" }, ...Object.keys(PST).map(chip)),
    list.length ? h("div", { class: "jobs" }, ...list.map(card)) : h("p", { class: "empty" }, all.length ? "Nada aqui." : "Nenhuma pesquisa ainda. Peça uma acima."));
}

function redes(sb, query, go, refresh, { data, error }) {
  if (error) return alertBox(/lead_status/.test(error.message || "") ? "Falta aplicar a migration 0032 (social_leads) no Supabase para os leads das redes aparecerem aqui." : "Não foi possível carregar os leads das redes.");
  const st = Object.keys(SST).includes(query.st) ? query.st : "novo";
  const all = data || [];
  const list = all.filter((l) => l.lead_status === st);
  const mover = async (l, lead_status) => {
    const { data: d } = await sb.from("social_inbox").update({ lead_status }).eq("id", l.id).eq("version", l.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast("Movido para " + SST[lead_status] + "."); refresh();
  };
  const perfil = (l) => l.platform === "instagram" && /^@[\w.]+$/.test(l.author_name || "") ? "https://www.instagram.com/" + l.author_name.slice(1) + "/" : null;
  const card = (l) => h("article", { class: "job" },
    h("div", { class: "flex" }, h("span", { class: "ptag p-" + (l.platform === "instagram" ? "instagram" : "outro") }, l.platform === "instagram" ? "IG" : "FB"),
      h("b", { class: "truncate" }, l.author_name || "alguém"), h("div", { class: "grow" }), h("span", { class: "muted small" }, fmtDateTime(l.received_at))),
    h("div", { class: "muted" }, [KIND[l.kind], l.lead_reason, String(l.external_id).startsWith("chrome:") ? "lido pelo Chrome" : "pela API"].filter(Boolean).join(" · ")),
    h("p", { class: "sxtext" }, l.text || "(sem texto)"),
    h("div", { class: "flex jbar" },
      l.permalink && h("a", { class: "btn btn-sm", href: l.permalink, target: "_blank", rel: "noopener" }, l.kind === "dm" ? "Abrir conversa" : "Ver post"),
      perfil(l) && h("a", { class: "btn btn-ghost btn-sm", href: perfil(l), target: "_blank", rel: "noopener" }, "Perfil"),
      h("a", { class: "btn btn-ghost btn-sm", href: "#/social?st=todos" }, "Responder no SociaL_"),
      SPROX[l.lead_status] && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(l, SPROX[l.lead_status]) }, "→ " + SST[SPROX[l.lead_status]]),
      l.lead_status !== "descartado" ? h("button", { class: "btn btn-ghost btn-sm danger", type: "button", onclick: () => mover(l, "descartado") }, "Não é lead")
        : h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(l, "novo") }, "Voltar pra novos")));
  const chip = (id) => h("button", { type: "button", class: "chip" + (st === id ? " on" : ""), onclick: () => go("/leads" + (id === "novo" ? "" : "?st=" + id)) }, SST[id], h("sup", null, all.filter((l) => l.lead_status === id).length));
  return h("div", null,
    h("p", { class: "muted small" }, "Comentário ou DM com pergunta de preço, interesse, pedido de contato ou de link entra aqui sozinho. Só fica o que a pessoa mandou para o perfil (nome público, texto e link); descarte o que não for lead."),
    h("div", { class: "mfilters" }, ...Object.keys(SST).map(chip)),
    list.length ? h("div", { class: "jobs" }, ...list.map(card)) : h("p", { class: "empty" }, st === "novo" ? "Nenhum lead novo das redes. A rotina do Chrome lê a caixa do Instagram e traz quem pediu preço, link ou contato." : "Nada aqui."));
}

function motion(sb, query, go, refresh, { data, error }) {
  if (error) return alertBox("Não foi possível carregar os leads.");
  const st = Object.keys(ST).includes(query.st) ? query.st : "novo";
  const all = data || [];
  const list = all.filter((l) => l.status === st);
  const mover = async (l, status) => {
    const { data: d } = await sb.from("motion_pedidos").update({ status }).eq("id", l.id).eq("version", l.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast("Movido para " + ST[status] + "."); refresh();
  };
  const linha = (rot, v) => v && h("div", { class: "small" }, h("b", null, rot + ": "), v);
  const card = (l) => h("article", { class: "job" },
    h("div", { class: "flex" }, h("b", null, l.marca), h("div", { class: "grow" }), h("span", { class: "muted small" }, fmtDateTime(l.created_at))),
    h("div", { class: "muted" }, [l.responsavel, l.cidade, l.segmento, l.canal === "email" ? "via e-mail" : "via WhatsApp"].filter(Boolean).join(" · ")),
    linha("Produto", l.produto), linha("Uso", l.objetivo), linha("Oferta", l.oferta), linha("Instagram", l.instagram), linha("Site", l.site),
    linha("Referências", l.referencias), linha("Obs.", l.observacoes), l.extras?.length ? linha("Extras", l.extras.join(", ")) : null,
    h("div", { class: "flex jbar" },
      h("a", { class: "btn btn-sm", href: waLink(l.whatsapp), target: "_blank", rel: "noopener" }, "WhatsApp"),
      l.email && h("a", { class: "btn btn-ghost btn-sm", href: "mailto:" + l.email }, "E-mail"),
      PROX[l.status] && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(l, PROX[l.status]) }, "→ " + ST[PROX[l.status]]),
      l.status === "entregue" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(l, "alteracao_1") }, "Alteração 1"),
      l.status === "alteracao_1" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(l, "alteracao_2") }, "Alteração 2"),
      l.status !== "cancelado" && h("button", { class: "btn btn-ghost btn-sm danger", type: "button", onclick: () => mover(l, "cancelado") }, "Cancelar")));
  const chip = (id) => h("button", { type: "button", class: "chip" + (st === id ? " on" : ""), onclick: () => go("/leads?f=lp" + (id === "novo" ? "" : "&st=" + id)) }, ST[id], h("sup", null, all.filter((l) => l.status === id).length));
  return h("div", null,
    h("div", { class: "mfilters" }, ...Object.keys(ST).map(chip)),
    list.length ? h("div", { class: "jobs" }, ...list.map(card)) : h("p", { class: "empty" }, st === "novo" ? "Nenhum pedido novo da LP ainda." : "Nada aqui."));
}
