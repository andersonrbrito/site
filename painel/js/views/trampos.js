import { h, fmtDateTime } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";

// Trampos: vagas remotas que a rotina encontra no LinkedIn (5h, 13h e 18h). Quem se candidata é o Anderson.
const ST = { nova: "Novas", interesse: "Interesse", candidatado: "Candidatei", descartada: "Descartadas" };
// Origem pelo link: LinkedIn ou Vagas DR (garimpadas nos Discords de direct response).
const ORIG = { linkedin: "LinkedIn", dr: "Vagas DR" };
const origem = (j) => (/linkedin\.com/i.test(j.url) ? "linkedin" : "dr");
const estrelas = (n) => "★".repeat(n || 0) + "☆".repeat(5 - (n || 0));

export default async function trampos({ sb, query, go, refresh }) {
  const og = query.o === "dr" ? "dr" : "linkedin";
  const st = Object.keys(ST).includes(query.st) ? query.st : "nova";
  const { data, error } = await sb.from("jobs").select("*").is("archived_at", null).order("found_at", { ascending: false }).limit(500);
  if (error) return h("div", { class: "page" }, pageHead("Trampos", "vagas remotas"), alertBox("Não foi possível carregar as vagas."));
  const todas = data || [];
  const all = todas.filter((j) => origem(j) === og);
  const qs = (o, s) => { const p = []; if (o !== "linkedin") p.push("o=" + o); if (s !== "nova") p.push("st=" + s); return "/trampos" + (p.length ? "?" + p.join("&") : ""); };
  const list = all.filter((j) => j.status === st).sort((a, b) => (b.score || 0) - (a.score || 0) || b.found_at.localeCompare(a.found_at));
  const last = all.reduce((m, j) => (j.found_at > m ? j.found_at : m), "");
  const mover = async (j, status, ok) => {
    const { data: d } = await sb.from("jobs").update({ status }).eq("id", j.id).eq("version", j.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast(ok); refresh();
  };
  const card = (j) => h("article", { class: "job" + (j.score >= 4 ? " top" : "") },
    h("div", { class: "flex" }, h("span", { class: "jscore", title: `${j.score}/5` }, estrelas(j.score)), h("div", { class: "grow" }), h("span", { class: "muted small" }, fmtDateTime(j.found_at))),
    h("a", { class: "jtitle", href: j.url, target: "_blank", rel: "noopener" }, j.title, " ↗"),
    h("div", { class: "muted" }, [j.company, j.location, j.regime].filter(Boolean).join(" · ")),
    j.salary && h("div", { class: "jsal" }, "💰 ", j.salary),
    j.why && h("p", { class: "small", style: { margin: "6px 0 0" } }, j.why),
    j.highlight && h("p", { class: "small jhl" }, h("b", null, "Destacar: "), j.highlight),
    h("div", { class: "flex jbar" },
      h("a", { class: "btn btn-sm", href: j.url, target: "_blank", rel: "noopener" }, "Abrir vaga"),
      j.status !== "interesse" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(j, "interesse", "Marcada com interesse.") }, "Tenho interesse"),
      j.status !== "candidatado" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(j, "candidatado", "Boa! Marcada como candidatada.") }, "Me candidatei"),
      j.status !== "descartada" && h("button", { class: "btn btn-ghost btn-sm danger", type: "button", onclick: () => mover(j, "descartada", "Descartada.") }, "Descartar"),
      j.status !== "nova" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mover(j, "nova", "Voltou pra novas.") }, "Voltar")));
  const chip = (id) => h("button", { type: "button", class: "chip" + (st === id ? " on" : ""), onclick: () => go(qs(og, id)) }, ST[id], h("sup", null, all.filter((j) => j.status === id).length));
  const aba = (id) => h("button", { type: "button", class: "chip" + (og === id ? " on" : ""), onclick: () => go(qs(id, "nova")) }, ORIG[id], h("sup", null, todas.filter((j) => origem(j) === id && j.status === "nova").length));
  return h("div", { class: "page" },
    pageHead("Trampos", og === "dr" ? "vagas DR garimpadas nos Discords" : "vagas remotas no LinkedIn · busca às 5h, 13h e 18h"),
    h("div", { class: "mfilters jorig" }, aba("linkedin"), aba("dr")),
    h("div", { class: "mfilters" }, ...Object.keys(ST).map(chip), h("div", { class: "grow" }), h("span", { class: "muted small" }, last ? `última busca ${fmtDateTime(last)}` : "nenhuma busca ainda")),
    list.length ? h("div", { class: "jobs" }, ...list.map(card)) : h("p", { class: "empty" }, st === "nova" ? "Nenhuma vaga nova agora. A próxima busca traz as novas aqui." : "Nada aqui."));
}
