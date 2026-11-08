// AprovaçõeS_: tudo que os agentes produziram e esperam o OK do Anderson. Prévia (vídeo/imagem do Storage privado),
// legenda com botão de copiar, e as decisões: Aprovar, Pedir ajuste (com comentário), Reprovar, Marcar publicado.
// Os agentes leem a decisão e o comentário pela tabela aprovacoes; reenvio volta para "pendente" e acende o ponto.
import { h, fmtDateTime } from "../util.js";
import { toast, pageHead, copiarTexto } from "../ui.js?v=20261107b";
import { zip } from "../zip.js?v=20261108c";

const BUCKET = "anderson-os-arquivos";
const ABAS = [["pendente", "Para aprovar"], ["ajustar", "Ajustes pedidos"], ["aprovado", "Aprovados (publicar)"], ["publicado", "Publicados"], ["reprovado", "Reprovados"]];
const ST = { pendente: ["para aprovar", "warn"], ajustar: ["ajuste pedido", "accent"], aprovado: ["aprovado", "ok"], publicado: ["publicado", "ok"], reprovado: ["reprovado", "danger"] };
const isVideo = (p) => /\.(mp4|mov|m4v|webm)$/i.test(p || "");
const isPdf = (p) => /\.pdf$/i.test(p || "");

export async function contaPendentes(sb) {
  const { count, error } = await sb.from("aprovacoes").select("id", { count: "exact", head: true }).is("archived_at", null).eq("status", "pendente");
  return error ? null : count ?? 0;
}

export default async function aprovacoes({ sb, query, go }) {
  // Carrega tudo em páginas de 1000 (o Supabase devolve no máximo 1000 por pedido; com 10 posts/dia por perfil
  // passamos de 500 em um dia e as peças mais antigas sumiam da tela).
  const all = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from("aprovacoes").select("*").is("archived_at", null).order("created_at", { ascending: false }).order("id").range(de, de + 999);
    if (error) return h("p", { class: "alert" }, "Não foi possível carregar as aprovações. A migration 0033 foi aplicada?");
    all.push(...(data || []));
    if (!data || data.length < 1000 || de >= 20000) break;
  }
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
  const copiar = (t) => copiarTexto(t, "Legenda copiada.");
  // story não tem legenda pra postar: o texto é orientação interna e nunca vai pra área de transferência
  const copiavel = (a) => (a.tipo === "story" ? null : a.legenda);

  const media = (path, big) => {
    const u = urls.get(path);
    if (!u) return h("div", { class: "ap-empty" }, "sem prévia");
    return isVideo(path) ? h("video", { src: u, controls: true, playsinline: true, preload: "metadata", loop: true, class: big ? "ap-big" : "" }) : h("img", { src: u, alt: "", loading: "lazy", class: big ? "ap-big ap-zoom" : "", onclick: big ? () => telaCheia([path], 0) : null });
  };

  // Enviar pro iPhone: 1º toque baixa os arquivos (vídeo/imagens), 2º abre o compartilhar do sistema.
  // A legenda vai junto para a área de transferência (no iPhone: "Salvar vídeo", depois colar a legenda no Instagram).
  const iphone = (a) => {
    let pacote = null;
    const rotulo = "Enviar pro iPhone";
    const btn = h("button", { class: "btn btn-sm st-iphone", type: "button" }, rotulo);
    const compartilhar = async () => {
      try {
        await navigator.share({ files: pacote, title: a.titulo });
        toast(copiavel(a) ? "Enviado. A legenda está copiada: é só colar no Instagram." : "Enviado.");
        pacote = null; btn.textContent = rotulo;
      } catch (e) {
        if (e.name === "AbortError") return;
        if (e.name === "NotAllowedError") { btn.textContent = "Tocar de novo para enviar"; return toast("Arquivo pronto. Toque de novo para abrir o compartilhar."); }
        toast("Não deu para compartilhar: " + e.message, { kind: "err" });
      }
    };
    btn.addEventListener("click", async () => {
      // copia a legenda já no toque (o Safari bloqueia a cópia depois de esperas como o download)
      if (copiavel(a)) copiar(copiavel(a));
      if (pacote) return compartilhar();
      const paths = [a.arquivo, ...(a.extras || [])];
      if (!navigator.canShare) {
        toast("Este navegador não abre o compartilhar. Abra o painel no Safari do iPhone ou do Mac. Baixando aqui.", { kind: "err" });
        paths.forEach((p) => { const l = h("a", { href: urls.get(p) || "#", download: p.split("/").pop() }); document.body.append(l); l.click(); l.remove(); });
        return;
      }
      btn.disabled = true; btn.textContent = "Preparando…";
      try {
        const files = [];
        for (const p of paths) {
          const b = await (await fetch(urls.get(p))).blob();
          files.push(new File([b], p.split("/").pop(), { type: isPdf(p) ? "application/pdf" : b.type || (isVideo(p) ? "video/mp4" : "image/jpeg") }));
        }
        if (!navigator.canShare({ files })) throw new Error("o navegador recusou o arquivo");
        pacote = files;
      } catch (e) { btn.textContent = rotulo; toast("Não preparou: " + e.message, { kind: "err" }); return; }
      finally { btn.disabled = false; }
      btn.textContent = "Tocar de novo para enviar";
      return compartilhar();
    });
    return btn;
  };

  // Galeria: todas as lâminas lado a lado (deslizar), contador, setas e miniaturas; toque abre em tela cheia.
  const item = (p, onOpen) => {
    const u = urls.get(p);
    if (!u) return h("div", { class: "ap-gal-item" }, h("div", { class: "ap-empty" }, "sem prévia"));
    return h("div", { class: "ap-gal-item" }, isVideo(p)
      ? h("video", { src: u, controls: true, playsinline: true, preload: "metadata", loop: true })
      : h("img", { src: u, alt: "", loading: "lazy", onclick: onOpen }));
  };
  const trilho = (paths, onOpen, cls = "") => {
    const strip = h("div", { class: "ap-gal-strip" }, ...paths.map((p, i) => item(p, () => onOpen(i))));
    const cont = h("span", { class: "ap-gal-count" }, `1/${paths.length}`);
    const ir = (i) => {
      const x = Math.max(0, Math.min(paths.length - 1, i)) * strip.clientWidth;
      strip.scrollTo({ left: x, behavior: "smooth" });
      setTimeout(() => { if (Math.abs(strip.scrollLeft - x) > 4) strip.scrollLeft = x; marca(); }, 450); // garante o pulo se a rolagem suave travar
    };
    const atual = () => Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
    const thumbs = paths.length > 1 ? h("div", { class: "ap-gal-thumbs" }, ...paths.map((p, i) => h("button", { type: "button", class: "ap-gal-th", "aria-label": `Lâmina ${i + 1}`, onclick: () => ir(i) },
      isVideo(p) ? h("span", null, "▶") : h("img", { src: urls.get(p) || "", alt: "", loading: "lazy" })))) : null;
    const marca = () => { const k = atual(); cont.textContent = `${k + 1}/${paths.length}`; thumbs?.querySelectorAll(".ap-gal-th").forEach((b, i) => b.classList.toggle("on", i === k)); };
    strip.addEventListener("scroll", () => requestAnimationFrame(marca), { passive: true });
    const box = h("div", { class: `ap-gal ${cls}` }, strip,
      paths.length > 1 && cont,
      paths.length > 1 && h("button", { type: "button", class: "ap-gal-nav prev", "aria-label": "Anterior", onclick: () => ir(atual() - 1) }, "‹"),
      paths.length > 1 && h("button", { type: "button", class: "ap-gal-nav next", "aria-label": "Próxima", onclick: () => ir(atual() + 1) }, "›"));
    requestAnimationFrame(marca);
    return { box, thumbs, ir };
  };
  const telaCheia = (paths, i) => {
    const fechar = () => { dlg.close(); };
    const g = trilho(paths, () => {}, "ap-lb-gal");
    const dlg = h("dialog", { class: "ap-lb" }, h("button", { type: "button", class: "ap-lb-x", "aria-label": "Fechar", onclick: fechar }, "×"), g.box, g.thumbs);
    dlg.addEventListener("close", () => dlg.remove());
    dlg.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") g.ir(Math.round(g.box.firstChild.scrollLeft / g.box.firstChild.clientWidth) + 1); if (e.key === "ArrowLeft") g.ir(Math.round(g.box.firstChild.scrollLeft / g.box.firstChild.clientWidth) - 1); });
    document.body.append(dlg); dlg.showModal();
    requestAnimationFrame(() => { g.box.firstChild.scrollLeft = i * g.box.firstChild.clientWidth; g.ir(i); });
  };
  const galeria = (paths) => { const g = trilho(paths, (i) => telaCheia(paths, i)); return h("div", { class: "ap-gal-wrap" }, g.box, g.thumbs); };

  // E-book: capa grande com selo, e botões para abrir/baixar o PDF (URL assinada)
  const ebook = (a) => h("div", { class: "ap-ebook" },
    h("div", { class: "ap-ebook-capa" },
      a.capa && urls.get(a.capa) ? h("img", { src: urls.get(a.capa), alt: "Capa do e-book", loading: "lazy", class: "ap-big ap-zoom", onclick: () => window.open(urls.get(a.arquivo), "_blank", "noopener") }) : h("div", { class: "ap-empty" }, "PDF sem capa"),
      h("span", { class: "ap-ebook-selo" }, "E-BOOK · PDF")),
    h("div", { class: "flex wrap", style: { justifyContent: "center", gap: "8px" } },
      h("a", { class: "btn btn-sm", href: urls.get(a.arquivo) || "#", target: "_blank", rel: "noopener" }, "Abrir PDF"),
      h("a", { class: "btn btn-ghost btn-sm", href: urls.get(a.arquivo) || "#", download: a.arquivo.split("/").pop() }, "Baixar PDF")));

  // Legenda pro iPhone: manda só o texto pelo compartilhar (AirDrop do Mac chega no iPhone como texto/nota,
  // pronto para copiar). Resolve quando a área de transferência do Mac não passa para o iPhone.
  const legendaIphone = (a) => copiavel(a) ? h("button", { class: "btn btn-ghost btn-sm", type: "button", title: "Mostra um QR: aponte a câmera do iPhone e copie a legenda lá", onclick: () => qrLegenda(a) }, "Legenda pro iPhone") : null;
  const qrLegenda = async (a) => {
    const link = `${location.origin}${location.pathname}#/aprovacoes?copiar=${a.id}`;
    const dlg = h("dialog", { class: "copy-dlg" }, h("b", null, "Aponte a câmera do iPhone"), h("p", { class: "muted small" }, "Abre este card no painel do iPhone com a legenda pronta: é só tocar em Copiar."));
    const fechar = () => { dlg.close(); dlg.remove(); };
    try {
      if (!window.qrcode) await new Promise((ok, err) => document.head.append(h("script", { src: "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js", onload: ok, onerror: err })));
      const q = window.qrcode(0, "M"); q.addData(link); q.make();
      const box = h("div", { style: { background: "#fff", padding: "12px", borderRadius: "8px", alignSelf: "center" } }); box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2 });
      dlg.append(box);
    } catch { dlg.append(h("p", { class: "small" }, link)); }
    dlg.append(h("div", { class: "flex", style: { justifyContent: "flex-end" } }, h("button", { class: "btn btn-sm", type: "button", onclick: fechar }, "Fechar")));
    dlg.addEventListener("close", () => dlg.remove()); document.body.append(dlg); dlg.showModal();
  };

  // Baixar no Mac: todos os arquivos do card (vídeo/imagem principal, extras e capa). O "download" na URL assinada
  // faz o Supabase responder como anexo (o atributo download do <a> não vale para outro domínio).
  const baixar = (a) => {
    const paths = [...new Set([a.arquivo, ...(a.extras || []), a.capa].filter(Boolean))];
    const salvarArq = (blob, nome) => { const u = URL.createObjectURL(blob), l = h("a", { href: u, download: nome }); document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); };
    const btn = h("button", { class: "btn btn-ghost btn-sm", type: "button", title: "Baixar os arquivos deste card", onclick: async () => {
      await assinar(paths);
      const ok = paths.filter((p) => urls.get(p));
      if (!ok.length) return toast("Não achei os arquivos (recarregue a página).", { kind: "err" });
      const rot = btn.textContent; btn.disabled = true; btn.textContent = "Baixando…";
      try {
        const files = await Promise.all(ok.map(async (p) => { const r = await fetch(urls.get(p)); if (!r.ok) throw new Error(p.split("/").pop()); return { name: p.split("/").pop(), data: new Uint8Array(await r.arrayBuffer()) }; }));
        const usados = new Set(); files.forEach((f, i) => { let n = f.name; while (usados.has(n)) n = `${i}-${n}`; usados.add(n); f.name = n; });
        if (files.length === 1) salvarArq(new Blob([files[0].data]), files[0].name);
        else salvarArq(zip(files), `${(a.perfil || "peca")}-${(a.titulo || "aprovacao").replace(/[^\w\-]+/g, "-").slice(0, 50)}.zip`);
        toast(files.length > 1 ? `${files.length} arquivos num .zip.` : "Baixado.");
      } catch (e) { toast("Falhou ao baixar: " + e.message, { kind: "err" }); }
      btn.disabled = false; btn.textContent = rot;
    } }, paths.length > 1 ? `Baixar (${paths.length})` : "Baixar");
    return btn;
  };

  const card = (a) => {
    const [sl, sc] = ST[a.status] || ST.pendente;
    const decisao = a.status === "pendente" || a.status === "ajustar"
      ? [h("button", { class: "btn btn-sm ap-ok", type: "button", onclick: () => salvar(a, { status: "aprovado", decidido_em: agora(), comentario: null }, "Aprovado. Está na aba Aprovados (publicar).") }, "Aprovar"),
         h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { const c = prompt("O que ajustar? (o agente lê isso)", a.comentario || ""); if (c?.trim()) salvar(a, { status: "ajustar", comentario: c.trim(), decidido_em: agora() }, "Ajuste pedido."); } }, "Pedir ajuste"),
         h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { const c = prompt("Motivo (opcional):", ""); if (c !== null) salvar(a, { status: "reprovado", comentario: c.trim() || null, decidido_em: agora() }, "Reprovado."); } }, "Reprovar")]
      : a.status === "aprovado"
        ? [h("button", { class: "btn btn-sm ap-ok", type: "button", onclick: () => { const u = prompt("Link do post publicado (opcional):", ""); if (u !== null) salvar(a, { status: "publicado", publicado_em: agora(), url_publicado: u.trim() || null }, "Marcado como publicado."); } }, "Marcar publicado"),
           h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => salvar(a, { status: "pendente" }, "Voltou para aprovação.") }, "Desfazer")]
        : [a.url_publicado && h("a", { class: "btn btn-ghost btn-sm", href: a.url_publicado, target: "_blank", rel: "noopener" }, "Ver post ↗"),
           h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => salvar(a, { status: "pendente" }, "Voltou para aprovação.") }, "Voltar para aprovação")];
    return h("article", { class: "panel ap-row" },
      h("div", { class: "ap-bar" },
        h("div", { class: "ap-head" },
          h("div", { class: "flex wrap", style: { gap: "6px" } }, h("span", { class: `chip ${sc}` }, sl), h("span", { class: "chip accent" }, nome(a.perfil)), h("span", { class: "chip" }, isPdf(a.arquivo) ? "e-book" : a.tipo), a.creditos ? h("span", { class: "chip warn" }, `${a.creditos} créditos`) : null, h("span", { class: "mono muted" }, fmtDateTime(a.updated_at || a.created_at))),
          h("b", { class: "st-title" }, a.titulo),
          a.sugestao_em ? h("div", { class: "ap-when" }, h("b", null, "Postar: ", fmtDateTime(a.sugestao_em)), a.sugestao_nota && h("span", { class: "muted small" }, a.sugestao_nota))
            : h("div", { class: "ap-when muted small" }, "sem sugestão de horário")),
        h("div", { class: "ap-actions" },
          h("div", { class: "flex wrap" }, iphone(a), baixar(a), copiavel(a) && h("button", { class: "btn btn-sm ap-copy", type: "button", onclick: () => copiar(copiavel(a)) }, "Copiar legenda"), legendaIphone(a)),
          h("div", { class: "flex wrap" }, ...decisao))),
      a.comentario && h("p", { class: "small ap-coment", style: { margin: "0 16px 12px" } }, "Seu comentário: ", a.comentario),
      h("div", { class: "ap-body" },
        h("div", { class: "ap-stage" }, isPdf(a.arquivo) ? ebook(a) : a.extras?.length ? galeria([a.arquivo, ...a.extras]) : media(a.arquivo, true)),
        h("div", { class: "ap-text" },
          h("div", { class: "mono", style: { marginBottom: "6px" } }, a.tipo === "story" ? "Orientação do story (uso interno, não postar)" : "Legenda"),
          a.tipo === "story" ? h("p", { class: "muted small pre" }, a.legenda || "Story não leva legenda. A orientação fica na nota do horário.")
            : a.legenda ? h("p", { class: "ap-legtxt pre" }, a.legenda) : h("p", { class: "muted small" }, "Sem legenda."),
          a.ferramentas && h("p", { class: "mono muted", style: { marginTop: "10px" } }, a.ferramentas))));
  };

  const tabs = h("div", { class: "flex wrap ap-tabs" });
  const perfis = h("div", { class: "flex wrap ap-tabs" });
  const grid = h("div", { class: "ap-list" });
  const draw = async () => {
    const conta = (k) => all.filter((a) => a.status === k && (!perfil || a.perfil === perfil)).length;
    tabs.replaceChildren(...ABAS.map(([k, l]) => h("button", { type: "button", class: `chip${aba === k ? " accent" : ""}`, onclick: () => { aba = k; draw(); } }, `${l} (${conta(k)})`)));
    const slugs = [...new Set(all.filter((a) => a.status === aba).map((a) => a.perfil))];
    perfis.replaceChildren(h("button", { type: "button", class: `chip${!perfil ? " accent" : ""}`, onclick: () => { perfil = ""; draw(); } }, "todos os perfis"), ...slugs.map((s) => h("button", { type: "button", class: `chip${perfil === s ? " accent" : ""}`, onclick: () => { perfil = s; draw(); } }, `${nome(s)} (${all.filter((a) => a.status === aba && a.perfil === s).length})`)));
    const quando = (a) => (a.sugestao_em ? Date.parse(a.sugestao_em) : Infinity);
    const vis = all.filter((a) => a.status === aba && (!perfil || a.perfil === perfil))
      .sort((x, y) => (aba === "publicado" || aba === "reprovado") ? 0 : quando(x) - quando(y));
    await assinar(vis.flatMap((a) => [a.arquivo, ...(a.extras || []), a.capa]));
    grid.replaceChildren(...(vis.length ? vis.map(card) : [h("p", { class: "empty" }, aba === "pendente" ? "Nada esperando aprovação. Quando um agente terminar uma peça, ela aparece aqui e o ponto do menu acende." : "Nada aqui.")]));
  };
  await draw();
  // Aberto pelo QR do "Legenda pro iPhone": mostra a legenda com um botão Copiar (toque do usuário = cópia liberada no iOS)
  const alvo = query.copiar && all.find((x) => x.id === query.copiar);
  if (alvo && copiavel(alvo)) setTimeout(() => {
    const area = h("textarea", { class: "textarea copy-dlg-txt", readonly: true, rows: 10 }); area.value = copiavel(alvo);
    const dlg = h("dialog", { class: "copy-dlg" }, h("b", null, alvo.titulo || "Legenda"), area,
      h("div", { class: "flex", style: { justifyContent: "flex-end" } },
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => dlg.close() }, "Fechar"),
        h("button", { class: "btn", type: "button", onclick: () => copiar(copiavel(alvo)).then((ok) => ok && dlg.close()) }, "Copiar legenda")));
    dlg.addEventListener("close", () => dlg.remove()); document.body.append(dlg); dlg.showModal();
  }, 300);
  return h("div", { class: "page wide" },
    pageHead("AprovaçõeS_", "conteúdo dos agentes esperando o seu OK"),
    h("p", { class: "muted small hide-sm", style: { marginBottom: "12px" } }, "Aprovar libera para publicar. Pedir ajuste manda o seu comentário para o agente, que refaz e reenvia (volta para \"Para aprovar\"). Nada é publicado sem você."),
    tabs, perfis, grid);
}
