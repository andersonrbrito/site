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
  const fonte = query.f === "lp" ? "lp" : "redes";
  const [lp, rd] = await Promise.all([
    sb.from("motion_pedidos").select("*").is("archived_at", null).order("created_at", { ascending: false }).limit(500),
    sb.from("social_inbox").select("id, platform, kind, external_id, permalink, author_name, text, lead_status, lead_reason, received_at, version")
      .not("lead_status", "is", null).is("archived_at", null).order("received_at", { ascending: false }).limit(500),
  ]);
  const novosLp = (lp.data || []).filter((l) => l.status === "novo").length;
  const novosRd = (rd.data || []).filter((l) => l.lead_status === "novo").length;
  const tab = (id, label, n) => h("button", { type: "button", class: "chip" + (fonte === id ? " on" : ""), onclick: () => go("/leads" + (id === "redes" ? "" : "?f=" + id)) }, label, h("sup", null, n));
  const tabs = h("div", { class: "mfilters" }, tab("redes", "Instagram e Facebook", novosRd), tab("lp", "LP motion", novosLp));
  const body = fonte === "lp" ? motion(sb, query, go, refresh, lp) : redes(sb, query, go, refresh, rd);
  return h("div", { class: "page" }, pageHead("Leads", fonte === "lp" ? "pedidos da LP de vídeo motion" : "quem demonstrou interesse nas redes"), tabs, body);
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
