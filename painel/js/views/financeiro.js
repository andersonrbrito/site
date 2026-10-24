import { h, fmtDate, todayISO } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";

// Financeiro: assinaturas por cartão. Roxo = pessoal, Cinza = empresa.
// Valores em moeda estrangeira viram real pela cotação do dia (open.er-api.com, grátis e sem chave).
const CARDS = [["cinza", "CARTÃO CINZA NUBANK", "assinaturas da empresa", "#8a8f98"], ["roxo", "CARTÃO ROXO NUBANK", "assinaturas pessoais", "#8a05be"]];
const PER = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SYM = { BRL: "R$", USD: "US$", EUR: "€", EGP: "E£", TRY: "₺", GBP: "£" };
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const favicon = (d) => (d ? `https://www.google.com/s2/favicons?domain=${d}&sz=64` : "");
const NS = "http://www.w3.org/2000/svg";
const svg = (tag, a) => { const e = document.createElementNS(NS, tag); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
const PALETTE = ["#ff4f32", "#ff8a00", "#ffd166", "#2ec86e", "#40a9ff", "#9b6dff", "#ff6fae", "#7ad7f0", "#c0c0c0", "#ffdca9", "#6ee7b7", "#f472b6"];

async function rates() {
  try { const j = await (await fetch("https://open.er-api.com/v6/latest/BRL")).json(); return { ok: true, r: j.rates, when: j.time_last_update_utc }; }
  catch { return { ok: false, r: { BRL: 1 } }; }
}

function donut(items) {
  const s = svg("svg", { viewBox: "0 0 120 120", class: "fdonut" }), tot = items.reduce((n, i) => n + i.v, 0) || 1;
  let a = -Math.PI / 2;
  items.forEach((it, i) => {
    const b = a + (it.v / tot) * Math.PI * 2, large = b - a > Math.PI ? 1 : 0;
    const p = (ang, r) => `${60 + r * Math.cos(ang)},${60 + r * Math.sin(ang)}`;
    s.append(svg("path", { d: `M${p(a, 54)} A54 54 0 ${large} 1 ${p(b, 54)} L${p(b, 34)} A34 34 0 ${large} 0 ${p(a, 34)} Z`, fill: PALETTE[i % PALETTE.length] }));
    a = b;
  });
  return s;
}

export default async function financeiro({ sb, refresh }) {
  const [{ data, error }, fx] = await Promise.all([
    sb.from("subscriptions").select("*").is("archived_at", null).order("name"),
    rates(),
  ]);
  if (error) return h("div", { class: "page" }, pageHead("Financeiro", "assinaturas"), alertBox("Não foi possível carregar as assinaturas."));
  const today = todayISO();
  const toBRL = (s) => (s.currency === "BRL" ? +s.amount : fx.r[s.currency] ? +s.amount / fx.r[s.currency] : null);
  const mensal = (s) => { const v = toBRL(s); return v == null ? null : v / PER[s.period]; };
  const ativa = (s) => !s.starts_on || s.starts_on <= today;

  const arquivar = async (s) => {
    const { data: d } = await sb.from("subscriptions").update({ archived_at: new Date().toISOString() }).eq("id", s.id).eq("version", s.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast("Removida."); refresh();
  };

  const coluna = ([card, titulo, sub, cor]) => {
    const list = (data || []).filter((s) => s.card === card);
    const agora = list.filter(ativa), futuras = list.filter((s) => !ativa(s));
    const totAgora = agora.reduce((n, s) => n + (mensal(s) || 0), 0), totFuturo = list.reduce((n, s) => n + (mensal(s) || 0), 0);
    const anualTotal = list.reduce((n, s) => n + (mensal(s) || 0) * 12, 0);
    const fatias = list.map((s) => ({ v: mensal(s) || 0, s })).sort((a, b) => b.v - a.v);
    const linha = (s, i) => {
      const v = toBRL(s), m = mensal(s);
      const quando = s.period === "mensal" ? (s.billing_day ? `todo dia ${s.billing_day}` : "mensal") : `${s.period}${s.billing_month ? " · " + MES[s.billing_month - 1] : ""}`;
      return h("div", { class: "frow" + (ativa(s) ? "" : " futura") },
        h("i", { class: "fdot", style: { background: PALETTE[fatias.findIndex((f) => f.s === s) % PALETTE.length] } }),
        s.site ? h("img", { src: favicon(s.site), alt: "", width: 22, height: 22 }) : h("span", { class: "fico" }),
        h("div", { class: "grow", style: { minWidth: 0 } },
          h("b", { class: "truncate" }, s.name),
          h("div", { class: "muted small" }, quando, s.starts_on && !ativa(s) ? ` · a partir de ${fmtDate(s.starts_on, false)}` : "", s.note ? ` · ${s.note}` : "")),
        h("div", { class: "fval" },
          h("b", null, m == null ? "?" : brl(m)), h("span", { class: "muted small" }, s.period === "mensal" ? "/mês" : "/mês (média)"),
          (s.currency !== "BRL" || s.period !== "mensal") && h("span", { class: "muted small" }, `${SYM[s.currency]} ${(+s.amount).toLocaleString("pt-BR")} ${({ mensal: "", trimestral: "/trimestre", semestral: "/semestre", anual: "/ano" })[s.period]}${s.currency !== "BRL" && v != null ? " ≈ " + brl(v) : ""}`)),
        h("button", { class: "x", type: "button", title: "Remover", "aria-label": `Remover ${s.name}`, onclick: () => arquivar(s) }, "×"));
    };
    return h("section", { class: "panel fcol" },
      h("div", { class: "panel-head", style: { borderTop: `4px solid ${cor}` } }, h("span", { class: "pd", style: { background: cor } }), h("h2", { class: "mono grow" }, titulo), h("span", { class: "muted small" }, sub)),
      h("div", { class: "panel-body" },
        h("div", { class: "ftop" }, donut(fatias),
          h("div", { class: "stack" },
            h("div", null, h("span", { class: "mono" }, "POR MÊS HOJE"), h("div", { class: "fbig" }, brl(totAgora))),
            futuras.length ? h("div", null, h("span", { class: "mono" }, "POR MÊS COM AS NOVAS"), h("div", { class: "fmid" }, brl(totFuturo))) : null,
            h("div", null, h("span", { class: "mono" }, "POR ANO"), h("div", { class: "fmid" }, brl(anualTotal))))),
        list.length ? h("div", { class: "flist" }, ...list.sort((a, b) => (mensal(b) || 0) - (mensal(a) || 0)).map(linha)) : h("p", { class: "empty" }, "Nenhuma assinatura ainda."),
        addForm(card)));
  };

  const addForm = (card) => {
    const nome = h("input", { class: "input", placeholder: "Nome (ex.: Netflix)", required: true, maxlength: 60 });
    const site = h("input", { class: "input", placeholder: "site p/ ícone (ex.: netflix.com)", maxlength: 80 });
    const valor = h("input", { class: "input", type: "number", step: "0.01", min: "0", placeholder: "valor", required: true });
    const moeda = h("select", { class: "input" }, ...Object.keys(SYM).map((c) => h("option", { value: c }, c)));
    const per = h("select", { class: "input" }, ...Object.keys(PER).map((p) => h("option", { value: p }, p)));
    const dia = h("input", { class: "input", type: "number", min: "1", max: "31", placeholder: "dia" });
    const f = h("details", { class: "fadd" }, h("summary", { class: "mono" }, "+ adicionar assinatura"),
      h("form", { class: "fform" }, nome, site, valor, moeda, per, dia, h("button", { class: "btn btn-sm", type: "submit" }, "Salvar")));
    f.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error: err } = await sb.from("subscriptions").insert({ card, name: nome.value.trim(), site: site.value.trim() || null, amount: +valor.value, currency: moeda.value, period: per.value, billing_day: +dia.value || null });
      if (err) return toast("Não foi possível salvar.", { kind: "err" }); toast("Adicionada."); refresh();
    });
    return f;
  };

  const all = data || [];
  const geral = all.reduce((n, s) => n + (ativa(s) ? mensal(s) || 0 : 0), 0);
  return h("div", { class: "page wide" },
    pageHead("Financeiro", "assinaturas por cartão"),
    h("div", { class: "fsum" },
      h("div", null, h("span", { class: "mono" }, "TOTAL POR MÊS (HOJE)"), h("b", null, brl(geral))),
      h("div", null, h("span", { class: "mono" }, "TOTAL POR ANO"), h("b", null, brl(all.reduce((n, s) => n + (mensal(s) || 0) * 12, 0)))),
      h("span", { class: "muted small grow", style: { textAlign: "right" } }, fx.ok ? `Cotação do dia: US$ 1 = ${brl(1 / fx.r.USD)} · E£ 1 = ${brl(1 / fx.r.EGP)} · ₺ 1 = ${brl(1 / fx.r.TRY)}` : "Cotação indisponível agora: valores em moeda estrangeira aparecem com ?")),
    h("div", { class: "fgrid" }, ...CARDS.map(coluna)));
}
