import { h, fmtDateTime } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";

// Leads: pedidos de vídeo motion (R$150) enviados pela LP andersonbrito.com/motion. O cliente manda por WhatsApp ou e-mail; aqui fica a cópia.
const ST = { novo: "Novos", contatado: "Contatados", pago: "Pagos", em_producao: "Em produção", alteracao_1: "Alteração 1", alteracao_2: "Alteração 2", entregue: "Entregues", cancelado: "Cancelados" };
const PROX = { novo: "contatado", contatado: "pago", pago: "em_producao", em_producao: "entregue", alteracao_1: "entregue", alteracao_2: "entregue" };
const waLink = (n) => "https://wa.me/55" + String(n || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

export default async function leads({ sb, query, go, refresh }) {
  const st = Object.keys(ST).includes(query.st) ? query.st : "novo";
  const { data, error } = await sb.from("motion_pedidos").select("*").is("archived_at", null).order("created_at", { ascending: false }).limit(500);
  if (error) return h("div", { class: "page" }, pageHead("Leads", "pedidos de vídeo motion"), alertBox("Não foi possível carregar os leads."));
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
  const chip = (id) => h("button", { type: "button", class: "chip" + (st === id ? " on" : ""), onclick: () => go("/leads" + (id === "novo" ? "" : "?st=" + id)) }, ST[id], h("sup", null, all.filter((l) => l.status === id).length));
  return h("div", { class: "page" },
    pageHead("Leads", "pedidos da LP de vídeo motion R$150"),
    h("div", { class: "mfilters" }, ...Object.keys(ST).map(chip)),
    list.length ? h("div", { class: "jobs" }, ...list.map(card)) : h("p", { class: "empty" }, st === "novo" ? "Nenhum lead novo ainda." : "Nada aqui."));
}
