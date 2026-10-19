import { h } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";

// Meu setup: equipamento principal, PC e sugestões de upgrade (o Claude pesquisa e insere as sugestões).
const SECTIONS = [["principal", "Principal · trabalho"], ["pc", "PC · jogos e edição"], ["upgrade", "Sugestões de upgrade · 2027"]];

export default async function setup({ sb, refresh }) {
  const { data, error } = await sb.from("setup_items").select("id, section, category, name, note, url, price, position, version").is("archived_at", null).order("position").limit(300);
  if (error) return h("div", { class: "page" }, pageHead("Meu setup", ""), alertBox("Não foi possível carregar o setup."));
  const items = data || [];
  const update = async (it, patch, ok) => {
    const { data: d } = await sb.from("setup_items").update(patch).eq("id", it.id).eq("version", it.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast(ok); refresh();
  };
  const addForm = (section) => {
    const catIn = h("input", { class: "input", placeholder: "Categoria (ex.: Mouse)", required: true, maxlength: 60 });
    const nameIn = h("input", { class: "input", placeholder: "Item", required: true, maxlength: 160 });
    const f = h("form", { class: "favadd" }, catIn, nameIn, h("button", { class: "btn btn-sm", type: "submit" }, "Adicionar"));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const max = items.filter((i) => i.section === section).reduce((m, i) => Math.max(m, i.position), 0);
      const { error: err } = await sb.from("setup_items").insert({ section, category: catIn.value.trim(), name: nameIn.value.trim(), position: max + 1 });
      if (err) return toast("Não foi possível salvar.", { kind: "err" }); toast("Adicionado."); refresh();
    });
    return f;
  };
  const row = (it) => h("div", { class: "surow" },
    h("span", { class: "mono muted" }, it.category),
    h("div", { class: "grow" },
      h("div", null, it.url ? h("a", { href: it.url, target: "_blank", rel: "noopener" }, it.name, " ↗") : it.name, it.price && h("span", { class: "mono accent" }, "  ", it.price)),
      it.note && h("p", { class: "muted small", style: { margin: "4px 0 0" } }, it.note)),
    h("button", { class: "x", type: "button", title: "Remover", "aria-label": `Remover ${it.name}`, onclick: () => update(it, { archived_at: new Date().toISOString() }, "Removido.") }, "×"));
  return h("div", { class: "page" },
    pageHead("Meu setup", "equipamentos e upgrades"),
    ...SECTIONS.map(([id, label]) => h("section", { class: "panel", style: { marginBottom: "20px" } },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, label), h("span", { class: "mono" }, String(items.filter((i) => i.section === id).length))),
      h("div", { class: "panel-body" },
        id === "upgrade" && h("p", { class: "muted small", style: { marginTop: 0 } }, "O Claude pesquisa e atualiza estas sugestões. Metas: MacBook Pro pra rodar várias IAs ao mesmo tempo, com mais armazenamento, e PC com GeForce pra GTA 6 no PC."),
        ...items.filter((i) => i.section === id).map(row), addForm(id)))));
}
