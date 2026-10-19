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
    sb.from("miner_links").select("id, url, platform, collection, author, note, status, thumbnail_url, saved_at, version").is("archived_at", null).order("saved_at", { ascending: false }).limit(500),
    sb.from("miner_profiles").select("id, url, platform, handle, note, version").is("archived_at", null).order("handle").limit(200),
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
      l.note && h("p", { class: "mnote" }, l.note)),
    h("footer", null, h("span", { class: "mono muted" }, fmtDate(dayOf(l.saved_at), false)),
      l.status === "usado"
        ? h("button", { class: "mono link", type: "button", onclick: () => setLink(l, { status: "inbox" }, "Voltou pro inbox.") }, "↶ Voltar")
        : h("button", { class: "mono link", type: "button", onclick: () => setLink(l, { status: "usado" }, "Marcado como usado.") }, "Marcar usado")));

  // ---- perfis de referência ----
  const profIn = h("input", { class: "input", type: "url", placeholder: "Link do perfil (Instagram, X…)", required: true });
  const profForm = h("form", { class: "flex", style: { marginTop: "10px" } }, profIn, h("button", { class: "btn btn-ghost btn-sm", type: "submit", "aria-label": "Adicionar perfil" }, "+"));
  profForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = profIn.value.trim();
    const { error } = await sb.from("miner_profiles").insert({ url, platform: platformOf(url), handle: handleOf(url) || url.replace(/^https?:\/\//, "") });
    if (error) return toast(/duplicate|unique/i.test(error.message) ? "Perfil já está na lista." : "Não foi possível salvar o perfil.", { kind: "err" });
    toast("Perfil adicionado."); refresh();
  });

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
        h("nav", { class: "mcols" },
          h("button", { type: "button", class: !col ? "on" : "", onclick: () => nav({ col: "" }) }, h("span", null, "Todos os perfis"), h("b", null, all.length)),
          ...collections.map((c) => h("button", { type: "button", class: col === c ? "on" : "", onclick: () => nav({ col: c }) }, h("span", null, "@" + c.replace(/^@/, "")), h("b", null, all.filter((l) => l.collection === c).length)))),
        h("div", { class: "mono", style: { marginTop: "22px" } }, "Perfis de referência"),
        h("ul", { class: "mprofiles" }, ...(profiles.data || []).map((p) => h("li", null, h("a", { href: p.url, target: "_blank", rel: "noopener" }, h("span", { class: "ptag p-" + p.platform }, PLAT_TAG[p.platform]), p.handle)))),
        profForm),
      h("section", null,
        h("div", { class: "page-head" },
          h("div", null, h("div", { class: "mono eyebrow" }, "// biblioteca de referências"), h("h1", null, "Garimpo criativo.")),
          h("button", { class: "btn", type: "button", onclick: () => { addForm.hidden = !addForm.hidden; if (!addForm.hidden) urlIn.focus(); } }, "Colar novo link ↗")),
        addForm,
        h("div", { class: "mfilters" },
          ...["todos", "inbox", "usado"].map((s) => h("button", { type: "button", class: "chip" + (status === s ? " on" : ""), onclick: () => nav({ status: s === "todos" ? "" : s }) }, s[0].toUpperCase() + s.slice(1), h("sup", null, count(s)))),
          h("div", { class: "grow" }), searchIn),
        shown.length ? h("div", { class: "mcards" }, ...shown.map(card))
          : h("p", { class: "empty" }, all.length ? "Nada com esse filtro." : "Nenhum link ainda. Cole o primeiro em “Colar novo link”."))));
}
