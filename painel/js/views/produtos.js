// ProdutoS_: PDFs e produtos digitais (e-books, packs, devocional), com o PDF guardado no Storage privado
// (bucket anderson-os-arquivos) e botão para a Kiwify. Preço, status e link editáveis com controle de versão.
import { h } from "../util.js";
import { toast, pageHead } from "../ui.js";

const BUCKET = "anderson-os-arquivos";
const KIWIFY = "https://dashboard.kiwify.com.br/";
const ST = { rascunho: ["rascunho", ""], revisao: ["em revisão", "warn"], a_venda: ["à venda", "ok"], pausado: ["pausado", ""] };
const brl = (v) => (v == null ? "sem preço" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

export default async function produtos({ sb, refresh }) {
  const { data, error } = await sb.from("produtos").select("*").is("archived_at", null).order("created_at");
  if (error) return h("p", { class: "alert" }, "Não foi possível carregar os produtos. A migration 0031 foi aplicada?");
  const list = data || [];
  const abrirPdf = async (p) => {
    const { data: s, error: e } = await sb.storage.from(BUCKET).createSignedUrl(p.arquivo, 600);
    if (e) return toast("Não foi possível abrir o PDF.", { kind: "err" }); window.open(s.signedUrl, "_blank", "noopener");
  };
  const enviarPdf = (p) => {
    const inp = h("input", { type: "file", accept: "application/pdf", hidden: true });
    inp.addEventListener("change", async () => {
      const f = inp.files[0]; inp.remove(); if (!f) return;
      if (f.type !== "application/pdf") return toast("Escolha um arquivo PDF.", { kind: "err" });
      toast("Enviando o PDF…");
      const path = `produtos/${p.slug}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, "_")}`;
      const { error: e } = await sb.storage.from(BUCKET).upload(path, f, { contentType: "application/pdf" });
      if (e) return toast("Falha no envio: " + e.message, { kind: "err" });
      const { data: d } = await sb.from("produtos").update({ arquivo: path }).eq("id", p.id).eq("version", p.version).select("id").maybeSingle();
      if (!d) return toast("O produto mudou; recarregue.", { kind: "err" }); toast("PDF salvo."); refresh();
    });
    document.body.append(inp); inp.click();
  };
  const editar = (p) => {
    const ov = h("div", { class: "overlay", onmousedown: (e) => e.target === ov && ov.remove() });
    const f = h("form", { class: "dialog eco-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Editar produto" },
      h("h2", null, p ? p.nome : "Novo produto"),
      h("label", { class: "field" }, "Nome", h("input", { class: "input", name: "nome", required: true, value: p?.nome || "" })),
      h("div", { class: "grid2" },
        h("label", { class: "field" }, "Preço (R$)", h("input", { class: "input", name: "preco", type: "number", step: "0.01", min: "0", value: p?.preco ?? "" })),
        h("label", { class: "field" }, "Status", h("select", { class: "select", name: "status" }, ...Object.entries(ST).map(([k, [l]]) => h("option", { value: k, selected: (p?.status || "rascunho") === k }, l))))),
      h("label", { class: "field" }, "Link do produto na Kiwify (checkout ou página)", h("input", { class: "input", name: "kiwify_url", type: "url", placeholder: "https://pay.kiwify.com.br/…", value: p?.kiwify_url || "" })),
      h("label", { class: "field" }, "Perfil de origem", h("input", { class: "input", name: "perfil", placeholder: "andersonbrito-mp4, kairos…", value: p?.perfil || "" })),
      h("label", { class: "field" }, "Descrição", h("textarea", { class: "textarea", name: "descricao", rows: 3 }, p?.descricao || "")),
      h("div", { class: "flex", style: { justifyContent: "flex-end", marginTop: "12px" } }, h("button", { class: "btn btn-ghost", type: "button", onclick: () => ov.remove() }, "Cancelar"), h("button", { class: "btn", type: "submit" }, "Salvar")));
    f.addEventListener("submit", async (e) => {
      e.preventDefault(); const fd = new FormData(f);
      const row = { nome: String(fd.get("nome")).trim(), preco: fd.get("preco") === "" ? null : Number(fd.get("preco")), status: fd.get("status"), kiwify_url: String(fd.get("kiwify_url")).trim() || null, perfil: String(fd.get("perfil")).trim() || null, descricao: String(fd.get("descricao")).trim() || null };
      let res;
      if (p) res = await sb.from("produtos").update(row).eq("id", p.id).eq("version", p.version).select("id").maybeSingle();
      else res = await sb.from("produtos").insert({ ...row, slug: row.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "produto-" + Date.now().toString(36) }).select("id");
      if (res.error || !res.data) return toast("Não salvou (nome repetido ou o produto mudou).", { kind: "err" });
      ov.remove(); toast("Produto salvo."); refresh();
    });
    ov.append(f); document.body.append(ov); f.querySelector("input").focus();
  };
  const card = (p) => {
    const [sl, sc] = ST[p.status] || ST.rascunho;
    return h("article", { class: "panel pd-card" },
      h("div", { class: "pd-cover" }, h("span", null, "PDF")),
      h("div", { class: "panel-body" },
        h("b", { class: "st-title" }, p.nome),
        h("div", { class: "flex wrap", style: { gap: "6px", margin: "6px 0 8px" } }, h("span", { class: `chip ${sc}` }, sl), h("span", { class: "chip" }, brl(p.preco)), p.perfil && h("span", { class: "chip" }, p.perfil)),
        p.descricao && h("p", { class: "small muted", style: { marginBottom: "10px" } }, p.descricao),
        h("div", { class: "flex wrap" },
          p.arquivo ? h("button", { class: "btn btn-sm", type: "button", onclick: () => abrirPdf(p) }, "Abrir PDF") : h("button", { class: "btn btn-sm", type: "button", onclick: () => enviarPdf(p) }, "Enviar PDF"),
          h("a", { class: "btn btn-sm kiwify", href: p.kiwify_url || KIWIFY, target: "_blank", rel: "noopener" }, p.kiwify_url ? "Kiwify ↗" : "Criar na Kiwify ↗"),
          h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => editar(p) }, "Editar"),
          p.arquivo && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => enviarPdf(p) }, "Trocar PDF"))));
  };
  return h("div", { class: "page" },
    pageHead("ProdutoS_", "PDFs, e-books e packs à venda", h("a", { class: "btn btn-ghost", href: KIWIFY, target: "_blank", rel: "noopener" }, "Painel da Kiwify ↗"), h("button", { class: "btn", type: "button", onclick: () => editar(null) }, "+ Produto")),
    h("p", { class: "muted small", style: { marginBottom: "14px" } }, "Os PDFs ficam guardados no armazenamento privado do painel (só quem tem login abre). O arquivo-fonte editável de cada um fica em ANDY 1TB/anderson_Os/05_produtos."),
    list.length ? h("div", { class: "st-grid" }, ...list.map(card)) : h("p", { class: "empty" }, "Nenhum produto ainda."));
}
