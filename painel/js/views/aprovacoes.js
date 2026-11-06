// AprovaçõeS_: tudo que os agentes produziram e esperam o OK do Anderson. Prévia (vídeo/imagem do Storage privado),
// legenda com botão de copiar, e as decisões: Aprovar, Pedir ajuste (com comentário), Reprovar, Marcar publicado.
// Os agentes leem a decisão e o comentário pela tabela aprovacoes; reenvio volta para "pendente" e acende o ponto.
import { h, fmtDateTime } from "../util.js";
import { toast, pageHead } from "../ui.js";

const BUCKET = "anderson-os-arquivos";
const ABAS = [["pendente", "Para aprovar"], ["ajustar", "Ajustes pedidos"], ["aprovado", "Aprovados (publicar)"], ["publicado", "Publicados"], ["reprovado", "Reprovados"]];
const ST = { pendente: ["para aprovar", "warn"], ajustar: ["ajuste pedido", "accent"], aprovado: ["aprovado", "ok"], publicado: ["publicado", "ok"], reprovado: ["reprovado", "danger"] };
const isVideo = (p) => /\.(mp4|mov|m4v|webm)$/i.test(p || "");

export async function contaPendentes(sb) {
  const { count, error } = await sb.from("aprovacoes").select("id", { count: "exact", head: true }).is("archived_at", null).eq("status", "pendente");
  return error ? null : count ?? 0;
}

export default async function aprovacoes({ sb, query, go }) {
  const { data, error } = await sb.from("aprovacoes").select("*").is("archived_at", null).order("created_at", { ascending: false }).limit(500);
  if (error) return h("p", { class: "alert" }, "Não foi possível carregar as aprovações. A migration 0033 foi aplicada?");
  const all = data || [];
  const { data: pf } = await sb.from("perfis").select("slug, handle").is("archived_at", null);
  const nome = (s) => (pf || []).find((p) => p.slug === s)?.handle || s;
  let aba = ABAS.some(([k]) => k === query.aba) ? query.aba : "pendente", perfil = query.perfil || "";

  // URLs assinadas em lote (1 h), só para os itens que aparecem
  const urls = new Map();
  const assinar = async (paths) => {
    const falta = [...new Set(paths.filter((p) => p && !urls.has(p)))];
    if (!falta.length) return;
    const { data: s } = await sb.storage.from(BUCKET).createSignedUrls(falta, 3600);
    (s || []).forEach((x) => x.signedUrl && urls.set(x.path, x.signedUrl));
  };

  const salvar = async (a, patch, msg) => {
    const { data: d, error: e } = await sb.from("aprovacoes").update(patch).eq("id", a.id).eq("version", a.version).select("*").maybeSingle();
    if (e || !d) return toast("Não salvou (o item mudou; recarregue).", { kind: "err" });
    Object.assign(a, d); toast(msg); draw();
  };
  const agora = () => new Date().toISOString();
  const copiar = async (t) => { try { await navigator.clipboard.writeText(t || ""); toast("Legenda copiada."); } catch { toast("Não deu para copiar.", { kind: "err" }); } };

  const media = (path) => {
    const u = urls.get(path);
    if (!u) return h("div", { class: "ap-empty" }, "sem prévia");
    return isVideo(path) ? h("video", { src: u, controls: true, playsinline: true, preload: "metadata", loop: true }) : h("img", { src: u, alt: "", loading: "lazy" });
  };
  const card = (a) => {
    const [sl, sc] = ST[a.status] || ST.pendente;
    const acoes = a.status === "pendente" || a.status === "ajustar"
      ? [h("button", { class: "btn btn-sm ap-ok", type: "button", onclick: () => salvar(a, { status: "aprovado", decidido_em: agora(), comentario: null }, "Aprovado.") }, "Aprovar"),
         h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { const c = prompt("O que ajustar? (o agente lê isso)", a.comentario || ""); if (c?.trim()) salvar(a, { status: "ajustar", comentario: c.trim(), decidido_em: agora() }, "Ajuste pedido."); } }, "Pedir ajuste"),
         h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { const c = prompt("Motivo (opcional):", ""); if (c !== null) salvar(a, { status: "reprovado", comentario: c.trim() || null, decidido_em: agora() }, "Reprovado."); } }, "Reprovar")]
      : a.status === "aprovado"
        ? [h("a", { class: "btn btn-sm", href: urls.get(a.arquivo) || "#", download: a.arquivo.split("/").pop(), target: "_blank", rel: "noopener" }, "Baixar"),
           h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { const u = prompt("Link do post publicado (opcional):", ""); if (u !== null) salvar(a, { status: "publicado", publicado_em: agora(), url_publicado: u.trim() || null }, "Marcado como publicado."); } }, "Marcar publicado"),
           h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => salvar(a, { status: "pendente" }, "Voltou para aprovação.") }, "Desfazer")]
        : [a.url_publicado && h("a", { class: "btn btn-ghost btn-sm", href: a.url_publicado, target: "_blank", rel: "noopener" }, "Ver post ↗"),
           h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => salvar(a, { status: "pendente" }, "Voltou para aprovação.") }, "Voltar para aprovação")];
    return h("article", { class: "panel ap-card" },
      h("div", { class: "ap-media" }, media(a.arquivo)),
      a.extras?.length ? h("div", { class: "ap-extras" }, ...a.extras.map((p) => h("a", { href: urls.get(p) || "#", target: "_blank", rel: "noopener" }, isVideo(p) ? h("span", null, "▶") : h("img", { src: urls.get(p) || "", alt: "", loading: "lazy" })))) : null,
      h("div", { class: "panel-body" },
        h("div", { class: "flex wrap", style: { gap: "6px" } }, h("span", { class: `chip ${sc}` }, sl), h("span", { class: "chip accent" }, nome(a.perfil)), h("span", { class: "chip" }, a.tipo), a.creditos ? h("span", { class: "chip warn" }, `${a.creditos} créditos`) : null),
        h("b", { class: "st-title", style: { marginTop: "8px" } }, a.titulo),
        a.comentario && h("p", { class: "small ap-coment" }, "Seu comentário: ", a.comentario),
        a.legenda && h("details", { class: "ap-leg" }, h("summary", { class: "small" }, "Legenda"), h("p", { class: "small pre" }, a.legenda)),
        h("div", { class: "flex wrap", style: { marginTop: "8px" } }, ...acoes, a.legenda && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => copiar(a.legenda) }, "Copiar legenda")),
        h("p", { class: "mono muted", style: { marginTop: "8px" } }, fmtDateTime(a.updated_at || a.created_at), a.ferramentas ? ` · ${a.ferramentas}` : "")));
  };

  const tabs = h("div", { class: "flex wrap ap-tabs" });
  const perfis = h("div", { class: "flex wrap ap-tabs" });
  const grid = h("div", { class: "ap-grid" });
  const draw = async () => {
    const conta = (k) => all.filter((a) => a.status === k && (!perfil || a.perfil === perfil)).length;
    tabs.replaceChildren(...ABAS.map(([k, l]) => h("button", { type: "button", class: `chip${aba === k ? " accent" : ""}`, onclick: () => { aba = k; draw(); } }, `${l} (${conta(k)})`)));
    const slugs = [...new Set(all.filter((a) => a.status === aba).map((a) => a.perfil))];
    perfis.replaceChildren(h("button", { type: "button", class: `chip${!perfil ? " accent" : ""}`, onclick: () => { perfil = ""; draw(); } }, "todos os perfis"), ...slugs.map((s) => h("button", { type: "button", class: `chip${perfil === s ? " accent" : ""}`, onclick: () => { perfil = s; draw(); } }, `${nome(s)} (${all.filter((a) => a.status === aba && a.perfil === s).length})`)));
    const vis = all.filter((a) => a.status === aba && (!perfil || a.perfil === perfil));
    await assinar(vis.flatMap((a) => [a.arquivo, ...(a.extras || [])]));
    grid.replaceChildren(...(vis.length ? vis.map(card) : [h("p", { class: "empty" }, aba === "pendente" ? "Nada esperando aprovação. Quando um agente terminar uma peça, ela aparece aqui e o ponto do menu acende." : "Nada aqui.")]));
  };
  await draw();
  return h("div", { class: "page wide" },
    pageHead("AprovaçõeS_", "conteúdo dos agentes esperando o seu OK"),
    h("p", { class: "muted small", style: { marginBottom: "12px" } }, "Aprovar libera para publicar. Pedir ajuste manda o seu comentário para o agente, que refaz e reenvia (volta para \"Para aprovar\"). Nada é publicado sem você."),
    tabs, perfis, grid);
}
