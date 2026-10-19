import { h } from "./util.js";
import { toast } from "./ui.js";

// Barra de favoritos agrupada por tipo (Cursos, Ferramentas…), com ícone do site.
const favicon = (url) => { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } catch { return ""; } };

export async function favoritesBar(sb, refresh) {
  const { data, error } = await sb.from("favorites").select("id, grp, name, url, position, version").is("archived_at", null).order("position").limit(300);
  if (error) return h("p", { class: "muted small" }, "Não foi possível carregar os favoritos.");
  const favs = data || [];
  const groups = [...new Set(favs.map((f) => f.grp))];
  let editing = false;

  const root = h("section", { class: "favs" });
  const draw = () => {
    const nameIn = h("input", { class: "input", placeholder: "Nome (ex.: curso de edição)", required: true, maxlength: 80 });
    const urlIn = h("input", { class: "input", type: "url", placeholder: "https://…", required: true });
    const grpIn = h("input", { class: "input", list: "fav-groups", placeholder: "Grupo (ex.: Cursos)", value: groups[0] || "Cursos", required: true, maxlength: 40 });
    const add = h("form", { class: "favadd", hidden: !editing }, nameIn, urlIn, grpIn, h("datalist", { id: "fav-groups" }, ...groups.map((g) => h("option", { value: g }))), h("button", { class: "btn btn-sm", type: "submit" }, "Adicionar"));
    add.addEventListener("submit", async (e) => {
      e.preventDefault();
      const max = favs.reduce((m, f) => Math.max(m, f.position), 0);
      const { error: err } = await sb.from("favorites").insert({ name: nameIn.value.trim(), url: urlIn.value.trim(), grp: grpIn.value.trim() || "Geral", position: max + 1 });
      if (err) return toast("Não foi possível salvar o favorito.", { kind: "err" });
      toast("Favorito adicionado."); refresh();
    });
    const update = async (f, patch, ok) => {
      const { data: d } = await sb.from("favorites").update(patch).eq("id", f.id).eq("version", f.version).select("id").maybeSingle();
      if (!d) return toast("Recarregue a página.", { kind: "err" }); toast(ok); refresh();
    };
    const item = (f) => editing
      ? h("span", { class: "fav edit" }, h("img", { src: favicon(f.url), alt: "", width: 16, height: 16, loading: "lazy" }),
          h("button", { type: "button", title: "Renomear", onclick: () => { const n = prompt("Nome do favorito", f.name); if (n && n.trim() && n.trim() !== f.name) update(f, { name: n.trim() }, "Renomeado."); } }, f.name),
          h("button", { type: "button", class: "rm", title: "Remover", "aria-label": `Remover ${f.name}`, onclick: () => update(f, { archived_at: new Date().toISOString() }, "Favorito removido.") }, "×"))
      : h("a", { class: "fav", href: f.url, target: "_blank", rel: "noopener", title: f.url }, h("img", { src: favicon(f.url), alt: "", width: 16, height: 16, loading: "lazy" }), h("span", null, f.name));
    root.replaceChildren(
      h("div", { class: "favrow" },
        ...groups.map((g) => h("div", { class: "favgrp" }, h("span", { class: "mono" }, g), ...favs.filter((f) => f.grp === g).map(item))),
        !favs.length && h("span", { class: "muted small" }, "Nenhum favorito ainda."),
        h("button", { class: "favtoggle mono", type: "button", onclick: () => { editing = !editing; draw(); } }, editing ? "Pronto" : "Editar")),
      add);
  };
  draw();
  return root;
}
