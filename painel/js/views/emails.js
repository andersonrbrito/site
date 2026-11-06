// E-mails importantes no PaineL_: a rotina "emails-importantes" lê o Gmail (contato@andersonbrito.com) e grava
// um resumo por e-mail na tabela emails. Aqui só aparece o que importa, com o que fazer e link para abrir no Gmail.
import { h, fmtDateTime } from "../util.js";
import { toast } from "../ui.js";

const PRI = { alta: ["alta", "danger"], media: ["média", "warn"], baixa: ["baixa", ""] };

export async function emailsBox(sb) {
  const { data, error } = await sb.from("emails").select("id, de, assunto, resumo, acao, recebido_em, prioridade, categoria, link, lido, version, created_at").is("archived_at", null).eq("lido", false).order("recebido_em", { ascending: false }).limit(12);
  if (error) return null;
  const items = (data || []).sort((a, b) => ["alta", "media", "baixa"].indexOf(a.prioridade) - ["alta", "media", "baixa"].indexOf(b.prioridade));
  const last = (data || []).reduce((m, e) => (e.created_at > m ? e.created_at : m), "");
  const list = h("div", { class: "stack" });
  const done = async (e, row) => {
    const { data: d } = await sb.from("emails").update({ lido: true }).eq("id", e.id).eq("version", e.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" });
    row.remove(); if (!list.children.length) list.append(h("p", { class: "empty" }, "Nada importante pendente."));
  };
  for (const e of items) {
    const [pl, pc] = PRI[e.prioridade] || PRI.media;
    const row = h("div", { class: "em-row" },
      h("div", { class: "flex wrap", style: { gap: "6px" } }, h("span", { class: `chip ${pc}` }, pl), e.categoria && h("span", { class: "chip" }, e.categoria), h("span", { class: "mono muted" }, e.recebido_em ? fmtDateTime(e.recebido_em) : "")),
      h("b", { class: "em-subj" }, e.assunto || "(sem assunto)"),
      h("div", { class: "muted small" }, e.de || ""),
      e.resumo && h("p", { class: "small", style: { margin: "4px 0 0" } }, e.resumo),
      e.acao && h("p", { class: "small", style: { margin: "4px 0 0", color: "var(--accent)" } }, "→ ", e.acao),
      h("div", { class: "flex", style: { marginTop: "6px" } },
        e.link && h("a", { class: "btn btn-ghost btn-sm", href: e.link, target: "_blank", rel: "noopener" }, "Abrir no Gmail ↗"),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: (ev) => done(e, ev.currentTarget.closest(".em-row")) }, "Visto")));
    list.append(row);
  }
  if (!items.length) list.append(h("p", { class: "empty" }, last ? "Nada importante pendente." : "A rotina de e-mails lê o Gmail a cada 2 horas (7h às 22h) e traz aqui só o que importa."));
  return h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#ea4335" } }), h("h2", { class: "mono grow" }, "E-mails importantes"), h("a", { class: "mono", href: "https://mail.google.com/", target: "_blank", rel: "noopener" }, "Gmail ↗")),
    h("div", { class: "panel-body" }, last && h("p", { class: "mono muted", style: { marginBottom: "8px" } }, "lido em " + fmtDateTime(last)), list));
}
