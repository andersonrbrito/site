import { h, fmtDate, todayISO, dayOf } from "../util.js";
import { pageHead, alertBox, toast, icon } from "../ui.js";

// MineR_: garimpo de referências (vídeos do Instagram, X etc.). Dados em miner_links / miner_profiles.
const PLAT = { instagram: "Instagram", x: "X / Twitter", tiktok: "TikTok", youtube: "YouTube", outro: "Link" };
const PLAT_TAG = { instagram: "IG", x: "X", tiktok: "TT", youtube: "YT", outro: "↗" };

export function platformOf(url) {
  const u = url.toLowerCase();
  if (/instagram\.com/.test(u)) return "instagram";
  if (/(^|\/\/|\.)(x|twitter)\.com/.test(u)) return "x";
  if (/tiktok\.com/.test(u)) return "tiktok";
  if (/(youtube\.com|youtu\.be)/.test(u)) return "youtube";
  return "outro";
}
export function handleOf(url) {
  const m = url.match(/(?:instagram|x|twitter|tiktok)\.com\/@?([A-Za-z0-9_.]+)/i);
  return m && !["p", "reel", "reels", "i", "status", "tv"].includes(m[1].toLowerCase()) ? "@" + m[1] : null;
}

export default async function miner({ sb, query, go, refresh }) {
  const [links, profiles] = await Promise.all([
    sb.from("miner_links").select("id, url, platform, collection, author, note, idea, target, format, status, thumbnail_url, saved_at, version").is("archived_at", null).order("saved_at", { ascending: false }).limit(500),
    sb.from("miner_profiles").select("id, url, platform, handle, display_name, photo, note, followers, checked_at, version").is("archived_at", null).order("handle").limit(200),
  ]);
  if (links.error || profiles.error) return h("div", { class: "page" }, pageHead("Garimpo criativo.", "MineR_"), alertBox("Não foi possível carregar o garimpo. Atualize a página."));

  const all = links.data || [];
  const status = ["inbox", "usado"].includes(query.status) ? query.status : "todos";
  const col = query.col || "";
  const q = (query.q || "").toLowerCase();
  const today = todayISO();
  const collections = [...new Set(all.map((l) => l.collection))].sort();
  const shown = all.filter((l) => (status === "todos" || l.status === status) && (!col || l.collection === col) && (!q || `${l.url} ${l.note} ${l.author || ""}`.toLowerCase().includes(q)));
  const nav = (patch) => { const p = new URLSearchParams({ ...(status !== "todos" && { status }), ...(col && { col }), ...(q && { q }), ...patch }); [...p].forEach(([k, v]) => !v && p.delete(k)); go("/miner" + (p.toString() ? "?" + p : "")); };

  // ---- formulário: colar novo link ----
  const urlIn = h("input", { class: "input", name: "url", type: "url", placeholder: "Cole o link do post, reel ou vídeo", required: true, autocomplete: "off" });
  const noteIn = h("input", { class: "input", name: "note", placeholder: "Nota (por que salvou, ideia de uso)", maxlength: 500 });
  const colIn = h("input", { class: "input", name: "collection", list: "miner-cols", value: col || collections[0] || "andersonbrito.mp4", placeholder: "Coleção / perfil" });
  const addForm = h("form", { class: "miner-add", hidden: !query.novo },
    urlIn, noteIn, colIn, h("datalist", { id: "miner-cols" }, ...collections.map((c) => h("option", { value: c }))),
    h("button", { class: "btn", type: "submit" }, "Garimpar"));
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlIn.value.trim();
    if (!/^https?:\/\//i.test(url)) return toast("Cole um link completo (começando com https://).", { kind: "err" });
    const btn = addForm.querySelector("button"); btn.disabled = true;
    const { error } = await sb.from("miner_links").insert({ url, platform: platformOf(url), author: handleOf(url), note: noteIn.value.trim(), collection: colIn.value.trim() || "andersonbrito.mp4" });
    btn.disabled = false;
    if (error) return toast(/duplicate|unique/i.test(error.message) ? "Esse link já está no garimpo." : "Não foi possível salvar o link.", { kind: "err" });
    toast("Link garimpado."); refresh();
  });

  // ---- ações nos cards (com controle de versão) ----
  const setLink = async (l, patch, ok) => {
    const { data, error } = await sb.from("miner_links").update(patch).eq("id", l.id).eq("version", l.version).select("id").maybeSingle();
    if (error || !data) return toast("O link mudou enquanto você olhava. Recarregue.", { kind: "err" });
    toast(ok); refresh();
  };

  const card = (l) => h("article", { class: "mcard" + (l.status === "usado" ? " used" : "") },
    h("header", null, h("span", { class: "ptag p-" + l.platform }, PLAT_TAG[l.platform]), h("span", { class: "mono" }, PLAT[l.platform]),
      h("button", { class: "x", type: "button", title: "Arquivar", "aria-label": "Arquivar link", onclick: () => setLink(l, { archived_at: new Date().toISOString() }, "Link arquivado.") }, "×")),
    h("a", { class: "thumb", href: l.url, target: "_blank", rel: "noopener" },
      l.thumbnail_url && h("img", { src: l.thumbnail_url, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: (e) => e.target.remove() }),
      h("span", { class: "play" }, "▶"), h("span", { class: "open mono" }, "Abrir ↗")),
    h("div", { class: "mbody" },
      h("div", { class: "mono mcol" }, h("i"), l.collection, l.author && h("span", { class: "muted" }, " · ", l.author)),
      l.note && h("p", { class: "mnote" }, l.note),
      l.idea && h("p", { class: "midea" }, h("b", null, "Recriar: "), l.idea),
      (l.target || l.format) && h("div", { class: "flex", style: { gap: "6px", marginTop: "6px" } }, l.target && h("span", { class: "chip accent" }, "@" + l.target), l.format && h("span", { class: "chip" }, l.format))),
    h("footer", null, h("span", { class: "mono muted" }, fmtDate(dayOf(l.saved_at), false)),
      l.status === "usado"
        ? h("button", { class: "mono link", type: "button", onclick: () => setLink(l, { status: "inbox" }, "Voltou pro inbox.") }, "↶ Voltar")
        : h("button", { class: "mono link", type: "button", onclick: () => setLink(l, { status: "usado" }, "Marcado como usado.") }, "Marcar usado")));

  // ---- perfis de referência: link, nome, @ e foto (automática pelo @ ou colada com Cmd+V) ----
  const autoPhoto = (url, handle) => { const hd = (handle || "").replace(/^@/, ""), pl = platformOf(url); return hd && ["instagram", "x", "tiktok", "youtube"].includes(pl) ? `https://unavatar.io/${pl === "x" ? "x" : pl}/${hd}` : null; };
  let photo = null;
  const profIn = h("input", { class: "input", type: "url", placeholder: "Link do perfil (Instagram, X…)", required: true });
  const nameIn = h("input", { class: "input", placeholder: "Nome do perfil", maxlength: 120 });
  const atIn = h("input", { class: "input", placeholder: "@usuario", maxlength: 60 });
  const prevImg = h("img", { alt: "", hidden: true, referrerpolicy: "no-referrer", onerror: (e) => { e.target.hidden = true; } });
  const showPhoto = (src) => { photo = src; prevImg.hidden = !src; if (src) prevImg.src = src; };
  const fillAuto = () => { const url = profIn.value.trim(); if (!url) return; if (!atIn.value) atIn.value = handleOf(url) || ""; if (!photo || photo.startsWith("https://unavatar.io/")) showPhoto(autoPhoto(url, atIn.value)); };
  profIn.addEventListener("change", fillAuto); atIn.addEventListener("change", fillAuto);
  const drop = h("div", { class: "photodrop", tabindex: 0, title: "Clique aqui e cole a foto (Cmd+V)" }, prevImg, h("span", { class: "muted small" }, "Foto: sai sozinha pelo @ ou clique aqui e cole (Cmd+V)"));
  drop.addEventListener("paste", (e) => {
    const file = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"))?.getAsFile();
    if (!file) return toast("Nada de imagem na área de transferência.", { kind: "err" });
    e.preventDefault();
    const img = new Image(); img.onload = () => {
      const c = document.createElement("canvas"), n = 160, sz = Math.min(img.width, img.height); c.width = c.height = n;
      c.getContext("2d").drawImage(img, (img.width - sz) / 2, (img.height - sz) / 2, sz, sz, 0, 0, n, n);
      showPhoto(c.toDataURL("image/jpeg", 0.85)); URL.revokeObjectURL(img.src);
    }; img.src = URL.createObjectURL(file);
  });
  const profForm = h("form", { class: "stack", style: { marginTop: "10px" } }, profIn, nameIn, atIn, drop, h("button", { class: "btn btn-ghost btn-sm", type: "submit" }, "+ Adicionar perfil"));
  profForm.addEventListener("submit", async (e) => {
    e.preventDefault(); fillAuto();
    const url = profIn.value.trim();
    if (!/^https?:\/\//i.test(url)) return toast("Cole o link completo do perfil.", { kind: "err" });
    const handle = atIn.value.trim() ? "@" + atIn.value.trim().replace(/^@/, "") : handleOf(url) || url.replace(/^https?:\/\//, "");
    const { error } = await sb.from("miner_profiles").insert({ url, platform: platformOf(url), handle, display_name: nameIn.value.trim() || null, photo });
    if (error) return toast(/duplicate|unique/i.test(error.message) ? "Perfil já está na lista." : "Não foi possível salvar o perfil.", { kind: "err" });
    toast("Perfil adicionado."); refresh();
  });
  const profRow = (p) => h("a", { class: "mprof", href: p.url, target: "_blank", rel: "noopener" },
    p.photo || autoPhoto(p.url, p.handle) ? h("img", { src: p.photo || autoPhoto(p.url, p.handle), alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: (e) => e.target.replaceWith(h("span", { class: "av" })) }) : h("span", { class: "av" }),
    h("div", { class: "grow", style: { minWidth: 0 } }, h("div", { class: "truncate" }, p.display_name || p.handle), h("div", { class: "muted small truncate" }, p.handle, p.followers != null ? ` · ${p.followers >= 1e6 ? (p.followers / 1e6).toFixed(1).replace(".", ",") + " mi" : p.followers >= 1e3 ? Math.round(p.followers / 1e3) + " mil" : p.followers} seguidores` : "")));

  const savedToday = all.filter((l) => dayOf(l.saved_at) === today).length;
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = todayISO(d); return all.filter((l) => dayOf(l.saved_at) === k).length; });
  const maxBar = Math.max(1, ...last7);
  const count = (s) => all.filter((l) => s === "todos" || l.status === s).length;
  const searchIn = h("input", { class: "input", type: "search", placeholder: "⌕ buscar por link ou nota", value: query.q || "" });
  searchIn.addEventListener("keydown", (e) => { if (e.key === "Enter") nav({ q: searchIn.value.trim() }); });

  return h("div", { class: "page miner" },
    h("div", { class: "miner-grid" },
      h("aside", { class: "miner-side" },
        h("div", { class: "mono" }, "Links minerados"),
        h("div", { class: "big" }, String(all.length).padStart(2, "0")),
        h("div", { class: "mono accent" }, `+${savedToday} garimpados hoje`),
        h("div", { class: "bars7" }, ...last7.map((n) => h("i", { style: { height: `${8 + (n / maxBar) * 34}px` }, title: `${n} links` }))),
        h("div", { class: "mono", style: { marginTop: "22px" } }, "Perfis de referência"),
        h("div", { class: "mprofiles" }, ...(profiles.data || []).map(profRow)),
        profForm),
      h("section", null,
        h("div", { class: "page-head" },
          h("div", null, h("div", { class: "mono eyebrow" }, "// biblioteca de referências"), h("h1", null, "Garimpo criativo.")),
          h("button", { class: "btn", type: "button", onclick: () => { addForm.hidden = !addForm.hidden; if (!addForm.hidden) urlIn.focus(); } }, "Colar novo link ↗")),
        addForm,
        (() => { const ideas = all.filter((l) => l.idea && l.status !== "usado").slice(0, 6); return ideas.length ? h("section", { class: "panel", style: { marginBottom: "16px" } },
          h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "grow" }, "Pra replicar hoje"), h("span", { class: "muted small" }, "copiar o que funciona e melhorar com o seu gosto")),
          h("div", { class: "panel-body" }, h("div", { class: "mcards" }, ...ideas.map(card)))) : null; })(),
        h("div", { class: "mfilters" },
          ...["todos", "inbox", "usado"].map((s) => h("button", { type: "button", class: "chip" + (status === s ? " on" : ""), onclick: () => nav({ status: s === "todos" ? "" : s }) }, s[0].toUpperCase() + s.slice(1), h("sup", null, count(s)))),
          h("div", { class: "grow" }), searchIn),
        shown.length ? h("div", { class: "mcards" }, ...shown.map(card))
          : h("p", { class: "empty" }, all.length ? "Nada com esse filtro." : "Nenhum link ainda. Cole o primeiro em “Colar novo link”."))));
}
