import { h } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";

// Prompts: links de sites de prompts e prompts próprios (com botão de copiar).
const favicon = (url) => { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } catch { return ""; } };

export default async function prompts({ sb, query, go, refresh }) {
  const { data, error } = await sb.from("prompts").select("id, kind, title, url, body, tags, version, created_at").is("archived_at", null).order("created_at", { ascending: false }).limit(500);
  if (error) return h("div", { class: "page" }, pageHead("Prompts", "links e prompts"), alertBox("Não foi possível carregar os prompts."));
  const all = data || [];
  const f = ["link", "prompt"].includes(query.f) ? query.f : "todos";
  const q = (query.q || "").toLowerCase();
  const shown = all.filter((p) => (f === "todos" || p.kind === f) && (!q || `${p.title} ${p.body || ""} ${p.tags} ${p.url || ""}`.toLowerCase().includes(q)));
  const nav = (patch) => { const p = new URLSearchParams({ ...(f !== "todos" && { f }), ...(q && { q }), ...patch }); [...p].forEach(([k, v]) => !v && p.delete(k)); go("/prompts" + (p.toString() ? "?" + p : "")); };

  let kind = "prompt";
  const titleIn = h("input", { class: "input", placeholder: "Título (ex.: retrato cinematográfico Seedream)", required: true, maxlength: 140 });
  const urlIn = h("input", { class: "input", type: "url", placeholder: "Link (https://…)", hidden: true });
  const bodyIn = h("textarea", { class: "input", rows: 6, placeholder: "Cole o prompt aqui" });
  const tagsIn = h("input", { class: "input", placeholder: "Tags (ex.: seedream, retrato, 9:16)", maxlength: 200 });
  const kindBtns = [["prompt", "Meu prompt"], ["link", "Link de site"]].map(([id, l]) => h("button", { type: "button", class: "chip" + (id === kind ? " on" : ""),
    onclick: (e) => { kind = id; kindBtns.forEach((b) => b.classList.toggle("on", b === e.currentTarget)); urlIn.hidden = kind !== "link"; bodyIn.placeholder = kind === "link" ? "Nota (opcional)" : "Cole o prompt aqui"; } }, l));
  const form = h("form", { class: "panel", hidden: !query.novo },
    h("div", { class: "panel-body stack" }, h("div", { class: "mfilters" }, ...kindBtns), titleIn, urlIn, bodyIn, tagsIn, h("div", null, h("button", { class: "btn", type: "submit" }, "Salvar"))));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlIn.value.trim();
    if (kind === "link" && !/^https?:\/\//i.test(url)) return toast("Cole o link completo.", { kind: "err" });
    if (kind === "prompt" && !bodyIn.value.trim()) return toast("Cole o prompt.", { kind: "err" });
    const { error: err } = await sb.from("prompts").insert({ kind, title: titleIn.value.trim(), url: kind === "link" ? url : null, body: bodyIn.value.trim() || null, tags: tagsIn.value.trim() });
    if (err) return toast("Não foi possível salvar.", { kind: "err" });
    toast("Salvo."); go("/prompts" + (kind === "link" ? "?f=link" : ""));
  });

  const archive = async (p) => {
    const { data: d } = await sb.from("prompts").update({ archived_at: new Date().toISOString() }).eq("id", p.id).eq("version", p.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast("Removido."); refresh();
  };
  const copy = async (p, btn) => { try { await navigator.clipboard.writeText(p.body || ""); btn.textContent = "Copiado"; setTimeout(() => (btn.textContent = "Copiar"), 1500); } catch { toast("Não deu pra copiar.", { kind: "err" }); } };
  const card = (p) => h("article", { class: "prcard" },
    h("header", { class: "flex" },
      p.kind === "link" ? h("img", { src: favicon(p.url), alt: "", width: 18, height: 18 }) : h("span", { class: "ptag" }, "P"),
      p.kind === "link" ? h("a", { class: "grow truncate", href: p.url, target: "_blank", rel: "noopener" }, h("b", null, p.title), " ↗") : h("b", { class: "grow truncate" }, p.title),
      h("button", { class: "x", type: "button", title: "Remover", "aria-label": "Remover", onclick: () => archive(p) }, "×")),
    p.body && h("p", { class: "prbody" }, p.body),
    h("footer", { class: "flex" }, h("span", { class: "mono muted small grow truncate" }, p.tags),
      p.kind === "prompt" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: (e) => copy(p, e.currentTarget) }, "Copiar")));

  const searchIn = h("input", { class: "input", type: "search", placeholder: "⌕ buscar", value: query.q || "" });
  searchIn.addEventListener("keydown", (e) => { if (e.key === "Enter") nav({ q: searchIn.value.trim() }); });
  const chip = (id, label) => h("button", { type: "button", class: "chip" + (f === id ? " on" : ""), onclick: () => nav({ f: id === "todos" ? "" : id }) }, label, h("sup", null, id === "todos" ? all.length : all.filter((p) => p.kind === id).length));

  return h("div", { class: "page" },
    h("div", { class: "page-head" }, h("div", null, h("div", { class: "mono eyebrow" }, "// biblioteca"), h("h1", null, "Prompts")),
      h("button", { class: "btn", type: "button", onclick: () => { form.hidden = !form.hidden; if (!form.hidden) titleIn.focus(); } }, "+ Novo")),
    form,
    h("div", { class: "mfilters" }, chip("todos", "Todos"), chip("prompt", "Meus prompts"), chip("link", "Sites"), h("div", { class: "grow" }), searchIn),
    shown.length ? h("div", { class: "prgrid" }, ...shown.map(card)) : h("p", { class: "empty" }, all.length ? "Nada com esse filtro." : "Nenhum prompt ainda. Clique em + Novo."));
}
