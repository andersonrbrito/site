// GeradoR_ (nome provisório): página de controle para gerar vídeo, imagem e áudio com IA.
// Coluna esquerda: tipo, modelo, conexão, prompt (com anexos e menção @) e opções do modelo.
// Resto da tela: o que está em andamento e a galeria com filtros.
// O pedido vira uma linha em `geracoes` (status "fila"); quem executa (API, MCP ou Claude no Chrome) é o
// ajudante local do Mac, que devolve o arquivo para o banco de mídia e atualiza a linha. Ver docs/GERADOR.md.
// Nada aqui dispara geração paga: a página só grava o pedido.
import { h, fmtDateTime } from "../util.js";
import { pageHead, toast, copiarTexto } from "../ui.js?v=20261117a";
import { ajudante, despachar, estado, cancelar, chaveDe, patchDoJob } from "../gerador-exec.js?v=20261111a";
import { PROVEDORES, MODELOS, FERRAMENTAS_AUDIO, VOZES, LIGADAS } from "../gerador-data.js?v=20261117c";
import {
  TIPOS, ATIVOS, STATUS, ORDENS, ROTULO_CUSTO, tipoDoArquivo, proximoApelido, mencaoNoCursor, aplicarMencao, conexoes, opcoesDe,
  valoresIniciais, avisosDeGasto, alturaDe, validar, nomePadrao, fmtTamanho, filtrar, ordenar,
} from "../gerador-core.js?v=20261111a";

const NOME = "ForjadoR_";
const PAPEIS = { ref: "referência", inicio: "quadro inicial", fim: "quadro final", video: "vídeo base", audio: "áudio base", voz: "amostra de voz" };
const LS = "aos_gerador_ultimo";
const GLYPHS = "アイウエオカキクケコサシスセソタチツテト01ABRITO<>/{}=+*";

if (!document.getElementById("gr-css")) document.head.append(h("link", { id: "gr-css", rel: "stylesheet", href: new URL("../../css/gerador.css?v=20261111a", import.meta.url).href }));

// Chuva de código só enquanto houver geração em andamento nesta página (mesmo visual do matrix.js do painel).
function chuva() {
  let cv = null, raf = 0;
  const parar = () => { cancelAnimationFrame(raf); cv?.remove(); cv = null; };
  const ligar = () => {
    if (cv || matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector(".aos-rain")) return;
    cv = h("canvas", { class: "aos-rain gr-rain", "aria-hidden": "true" });
    document.body.prepend(cv);
    const ctx = cv.getContext("2d"), fs = 15;
    let w = 0, alt = 0, cols = [], last = 0;
    const size = () => {
      const d = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth; alt = innerHeight; cv.width = w * d; cv.height = alt * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      cols = Array.from({ length: Math.ceil(w / fs) }, () => (Math.random() < 0.45 ? (Math.random() * -alt) / fs : null));
    };
    const tick = (t) => {
      if (!cv) return;
      raf = requestAnimationFrame(tick);
      if (cv.width !== Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2))) size();
      if (t - last < 80) return; last = t;
      ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,.05)"; ctx.fillRect(0, 0, w, alt);
      ctx.globalCompositeOperation = "source-over"; ctx.font = `500 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
      cols.forEach((y, i) => {
        if (y === null || Math.random() > 0.6) return;
        ctx.fillStyle = Math.random() > 0.96 ? "#d6ffe6" : "rgba(65,255,138,.8)";
        ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * fs, y * fs);
        cols[i] = y * fs > alt && Math.random() > 0.975 ? 0 : y + 1;
      });
    };
    size(); raf = requestAnimationFrame(tick);
  };
  return { set: (on) => (on ? ligar() : parar()), parar };
}

export default async function gerador({ sb }) {
  const sel = "id, tipo, modo, modelo, modelo_nome, provedor, caminho, nome, prompt, opcoes, anexos, status, progresso, resultado, tamanho_bytes, erro, created_at, done_at, version";
  const ler = () => sb.from("geracoes").select(sel).is("archived_at", null).order("created_at", { ascending: false }).limit(400);
  // no harness quem anda com a fila é o mock; fora dele, o ajudante local do Mac (null = não está neste aparelho)
  const teste = /\/dev\/harness/.test(location.pathname);
  const [ini, aj] = await Promise.all([ler(), teste ? null : ajudante()]);
  const ligada = (x) => teste || (aj?.gerar || LIGADAS).includes(chaveDe(x));
  let rows = ini.data || [];
  const semTabela = !!ini.error;

  // ---- estado da coluna esquerda
  let salvo = {}; try { salvo = JSON.parse(localStorage.getItem(LS) || "{}"); } catch {}
  const st = { tipo: salvo.tipo || "video", ferramenta: salvo.ferramenta || "tts", modelo: salvo.modelo || null, modo: salvo.modo || null, via: salvo.via || 0, valores: salvo.valores || {}, anexos: [], erros: [], confirmar: false };
  const filtro = { q: "", tipo: "todos", provedor: "", modelo: "", status: "", de: "", ate: "", tamMin: "", ordem: "recente" };

  const modelosDoTipo = () => MODELOS.filter((m) => m.tipo === st.tipo && (st.tipo !== "audio" || m.ferramenta === st.ferramenta));
  const modelo = () => MODELOS.find((m) => m.id === st.modelo);
  const vias = () => conexoes(modelo(), PROVEDORES);
  const via = () => vias()[st.via] || vias()[0];
  const modo = () => (modelo()?.modos || []).find((m) => m.id === st.modo);
  const opcoes = () => opcoesDe(modelo(), st.modo, via());
  const acertar = () => {
    const lista = modelosDoTipo();
    // abre no primeiro modelo que não gasta nada (Unlimited ou grátis); se não houver, no primeiro da lista
    if (!lista.some((m) => m.id === st.modelo)) st.modelo = (lista.find((m) => ["unlimited", "gratis"].includes(m.via[0]?.custo)) || lista[0])?.id || null;
    const m = modelo();
    if (!m?.modos?.some((x) => x.id === st.modo)) st.modo = m?.modos?.[0]?.id || null;
    if (!vias()[st.via]) st.via = 0;
    st.valores = valoresIniciais(opcoes(), st.valores);
    try { localStorage.setItem(LS, JSON.stringify({ tipo: st.tipo, ferramenta: st.ferramenta, modelo: st.modelo, modo: st.modo, via: st.via, valores: st.valores })); } catch {}
  };

  // ---- prompt com menção @
  const ta = h("textarea", { class: "textarea", rows: 6, placeholder: "Descreva o que quer gerar. Use @ para citar um anexo.", "aria-label": "Prompt" });
  const nomeIn = h("input", { class: "input", placeholder: "Nome (opcional)", maxlength: 80, "aria-label": "Nome da geração" });
  const ac = h("ul", { class: "gr-ac", role: "listbox", hidden: true });
  let acIdx = 0, acItens = [];
  const thumb = (a, cls) => (a.tipo === "imagem" && a.url ? h("img", { src: a.url, alt: "", class: cls }) : h("span", { class: "gr-ico" + (cls ? " " + cls : "") }, a.tipo.slice(0, 3)));
  const fecharAc = () => { ac.hidden = true; acItens = []; };
  const escolher = (a) => {
    const r = aplicarMencao(ta.value, ta.selectionStart, a.apelido);
    ta.value = r.texto; ta.focus(); ta.setSelectionRange(r.cursor, r.cursor); fecharAc(); limparErros();
  };
  const desenharAc = () => {
    const m = mencaoNoCursor(ta.value, ta.selectionStart);
    acItens = m ? st.anexos.filter((a) => a.apelido.startsWith(m.termo) || a.nome.toLowerCase().includes(m.termo)) : [];
    if (!m) return fecharAc();
    acIdx = Math.min(acIdx, Math.max(0, acItens.length - 1));
    ac.hidden = false;
    ac.replaceChildren(...(acItens.length
      ? acItens.map((a, i) => h("li", { role: "option", "aria-selected": String(i === acIdx), onmousedown: (e) => { e.preventDefault(); escolher(a); } }, thumb(a), h("b", null, "@" + a.apelido), h("span", { class: "muted truncate" }, a.nome)))
      : [h("li", { class: "muted" }, st.anexos.length ? "Nenhum anexo com esse nome." : "Nenhum anexo ainda. Arraste um arquivo para cá.")]));
  };
  ta.addEventListener("input", () => { acIdx = 0; desenharAc(); limparErros(); });
  ta.addEventListener("click", desenharAc);
  ta.addEventListener("blur", () => setTimeout(fecharAc, 120));
  ta.addEventListener("keydown", (e) => {
    if (ac.hidden || !acItens.length) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar(); } return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); acIdx = (acIdx + (e.key === "ArrowDown" ? 1 : -1) + acItens.length) % acItens.length; desenharAc(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); escolher(acItens[acIdx]); }
    else if (e.key === "Escape") { e.preventDefault(); fecharAc(); }
  });

  // ---- anexos (arrastar e soltar, colar, escolher arquivo)
  const anexosBox = h("div", { class: "gr-anexos" });
  const fileIn = h("input", { type: "file", multiple: true, hidden: true, accept: "image/*,video/*,audio/*", onchange: (e) => { addArquivos(e.target.files); e.target.value = ""; } });
  const addArquivos = (files) => {
    let n = 0;
    for (const f of files || []) {
      const tipo = tipoDoArquivo(f.name, f.type);
      if (tipo === "arquivo") { toast(`"${f.name}" não é imagem, vídeo nem áudio.`, { kind: "err" }); continue; }
      st.anexos.push({ id: crypto.randomUUID(), apelido: proximoApelido(st.anexos, tipo), tipo, nome: f.name, tamanho: f.size, url: URL.createObjectURL(f), file: f, papel: (modo()?.papeis || ["ref"])[0] });
      n++;
    }
    if (n) { desenharAnexos(); limparErros(); }
  };
  const tirar = (a) => { URL.revokeObjectURL(a.url); st.anexos = st.anexos.filter((x) => x !== a); desenharAnexos(); limparErros(); };
  const desenharAnexos = () => {
    const papeis = modo()?.papeis || [];
    anexosBox.replaceChildren(...st.anexos.map((a) => h("div", { class: "gr-anexo" },
      a.tipo === "video" ? h("video", { src: a.url, muted: true, preload: "metadata" }) : thumb(a),
      h("div", { class: "grow", style: { minWidth: 0 } },
        h("button", { type: "button", class: "gr-tag", title: "Citar no prompt", onclick: () => { const r = aplicarMencao(ta.value, ta.selectionStart ?? ta.value.length, a.apelido); ta.value = r.texto; ta.focus(); ta.setSelectionRange(r.cursor, r.cursor); } }, "@" + a.apelido),
        h("div", { class: "muted small truncate" }, `${a.nome} · ${fmtTamanho(a.tamanho)}`)),
      papeis.length > 1 ? h("select", { class: "select select-sm", "aria-label": "Papel do anexo", onchange: (e) => { a.papel = e.target.value; } }, ...papeis.map((p) => h("option", { value: p, selected: (papeis.includes(a.papel) ? a.papel : papeis[0]) === p }, PAPEIS[p] || p))) : null,
      h("button", { type: "button", class: "gr-x", "aria-label": `Remover ${a.apelido}`, onclick: () => tirar(a) }, "×"))));
  };

  // ---- controles dinâmicos
  const corpo = h("div", { class: "panel-body" });
  const erroBox = h("ul", { class: "gr-erros", role: "alert", hidden: true });
  const goBtn = h("button", { class: "btn gr-go", type: "button", onclick: () => enviar() }, "Gerar");
  const limparErros = () => { if (st.erros.length || st.confirmar) { st.erros = []; st.confirmar = false; pintarBotao(); } };
  const pintarBotao = () => {
    erroBox.hidden = !st.erros.length;
    erroBox.replaceChildren(...st.erros.map((e) => h("li", null, e)));
    const av = avisosDeGasto(st.tipo, via(), st.valores);
    goBtn.className = "btn gr-go" + (st.confirmar ? " gr-confirma" : "");
    goBtn.textContent = st.confirmar ? `Confirmar: ${av.join(" e ")}` : av.length ? `Gerar (${av.join(", ")})` : "Gerar";
  };
  const chips = (o) => h("div", { class: "gr-chips", role: "group", "aria-label": o.nome }, ...o.valores.map((v) => h("button", {
    type: "button", "aria-pressed": String(st.valores[o.id] === v), class: o.id === "res" && st.tipo === "video" && alturaDe(v) > 720 ? "gr-alto" : "",
    onclick: () => { st.valores[o.id] = v; desenhar(); } }, String(v))));
  const controle = (o) => {
    if (o.tipo === "voz") {
      const grupos = VOZES.filter((g) => g.fonte === o.fonte);
      const s = h("select", { class: "select", "aria-label": o.nome, onchange: (e) => { st.valores[o.id] = e.target.value; acertar(); } },
        ...grupos.map((g) => h("optgroup", { label: g.grupo }, ...g.vozes.map((v) => h("option", { value: v.id, selected: st.valores[o.id] === v.id }, v.nome + (v.desc ? " · " + v.desc : ""))))));
      if (!st.valores[o.id]) st.valores[o.id] = s.value;
      return s;
    }
    if (o.tipo === "faixa") {
      const out = h("output", null, String(st.valores[o.id]));
      return h("div", { class: "gr-faixa" }, h("input", { type: "range", min: o.min, max: o.max, step: o.passo || 1, value: st.valores[o.id], "aria-label": o.nome, oninput: (e) => { st.valores[o.id] = Number(e.target.value); out.textContent = e.target.value; }, onchange: acertar }), out);
    }
    if (o.tipo === "bool") return h("label", { class: "gr-tog" }, h("input", { type: "checkbox", checked: !!st.valores[o.id], onchange: (e) => { st.valores[o.id] = e.target.checked; acertar(); } }), o.rotulo || o.nome);
    if (o.tipo === "texto") { const i = h("input", { class: "input", placeholder: o.dica || "", value: st.valores[o.id] || "", oninput: (e) => { st.valores[o.id] = e.target.value; } }); return i; }
    return o.valores.length > 8
      ? h("select", { class: "select", "aria-label": o.nome, onchange: (e) => { st.valores[o.id] = e.target.value; acertar(); pintarBotao(); } }, ...o.valores.map((v) => h("option", { value: v, selected: st.valores[o.id] === v }, String(v))))
      : chips(o);
  };
  const bloco = (rotulo, ...kids) => h("div", null, rotulo ? h("span", { class: "gr-lbl" }, rotulo) : null, ...kids);

  const desenhar = () => {
    acertar();
    st.erros = []; st.confirmar = false;
    const m = modelo(), vs = vias(), v = via(), md = modo();
    const familias = [...new Set(modelosDoTipo().map((x) => x.familia))];
    ta.placeholder = md?.rotuloPrompt ? md.rotuloPrompt + ". Use @ para citar um anexo." : "Descreva o que quer gerar. Use @ para citar um anexo.";
    const aceita = md?.anexos?.max ?? 0;
    corpo.replaceChildren(...[
      h("div", { class: "gr-seg", role: "group", "aria-label": "Tipo" }, ...TIPOS.map(([k, l]) => h("button", { type: "button", "aria-pressed": String(st.tipo === k), onclick: () => { st.tipo = k; st.modelo = null; desenhar(); } }, l))),
      st.tipo === "audio" ? bloco("Ferramenta", h("div", { class: "gr-chips" }, ...FERRAMENTAS_AUDIO.filter(([k]) => MODELOS.some((x) => x.tipo === "audio" && x.ferramenta === k)).map(([k, l]) => h("button", { type: "button", "aria-pressed": String(st.ferramenta === k), onclick: () => { st.ferramenta = k; st.modelo = null; desenhar(); } }, l)))) : null,
      bloco("Modelo", h("select", { class: "select", "aria-label": "Modelo", onchange: (e) => { st.modelo = e.target.value; st.modo = null; st.via = 0; desenhar(); } },
        ...familias.map((f) => h("optgroup", { label: f }, ...modelosDoTipo().filter((x) => x.familia === f).map((x) => h("option", { value: x.id, selected: x.id === st.modelo }, x.nome))))),
        m?.obs ? h("p", { class: "gr-via" }, m.obs) : null),
      m && m.modos.length > 1 ? bloco("Modo", h("div", { class: "gr-chips" }, ...m.modos.map((x) => h("button", { type: "button", "aria-pressed": String(x.id === st.modo), onclick: () => { st.modo = x.id; desenhar(); } }, x.nome)))) : null,
      bloco("Conexão", vs.length
        ? h("select", { class: "select", "aria-label": "Conexão", onchange: (e) => { st.via = Number(e.target.value); desenhar(); } }, ...vs.map((x) => h("option", { value: x.i, selected: x.i === (v?.i ?? 0) }, `${x.rotulo} · ${ROTULO_CUSTO[x.custo] || x.custo}`)))
        : h("p", { class: "note" }, "Sem conexão cadastrada para este modelo."),
        v ? h("p", { class: "gr-via" }, [v.prov.estado === "depois" ? "Sem plano por enquanto. " : "", v.obs || v.prov.obs || ""].join("")) : null),
      bloco(md?.rotuloPrompt || "Prompt", h("div", { class: "gr-prompt" }, ta, ac)),
      aceita > 0 || st.anexos.length ? bloco(`Anexos${aceita ? ` (até ${aceita})` : ""}`,
        h("button", { type: "button", class: "gr-drop", onclick: () => fileIn.click() }, "Arraste arquivos para cá, cole ou clique para escolher"), fileIn, anexosBox) : null,
      ...opcoes().map((o) => (o.tipo === "bool" ? controle(o) : bloco(o.nome, controle(o), o.dica && o.tipo !== "texto" ? h("p", { class: "gr-via" }, o.dica) : null))),
      nomeIn, erroBox, goBtn,
      h("p", { class: "gr-via" }, "Cmd+Enter envia. Quem gera é o ajudante do Mac" + (teste ? " (aqui, simulado)." : aj ? ", ligado neste aparelho." : ": o pedido espera o painel abrir no Mac.")),
    ].filter(Boolean));
    desenharAnexos(); pintarBotao();
  };

  const esquerda = h("section", { class: "panel gr-left" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Novo pedido")), corpo);
  let arrasto = 0;
  const pagina = h("div", { class: "page gr" });
  pagina.addEventListener("dragenter", (e) => { if (e.dataTransfer?.types?.includes("Files")) { arrasto++; esquerda.classList.add("is-drop"); } });
  pagina.addEventListener("dragleave", () => { arrasto = Math.max(0, arrasto - 1); if (!arrasto) esquerda.classList.remove("is-drop"); });
  pagina.addEventListener("dragover", (e) => { if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); });
  pagina.addEventListener("drop", (e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); arrasto = 0; esquerda.classList.remove("is-drop"); addArquivos(e.dataTransfer.files); });
  ta.addEventListener("paste", (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); addArquivos(fs); } });

  // ---- enviar pedido
  async function enviar() {
    const m = modelo(), v = via();
    st.erros = validar({ modelo: m, modo: st.modo, via: v, prompt: ta.value, anexos: st.anexos });
    if (semTabela) st.erros.push("A tabela de gerações ainda não existe (rodar a migration 0040).");
    if (v && v.prov.estado === "depois") st.erros.push(`${v.prov.nome}: sem conta nem plano por enquanto.`);
    else if (v && !ligada(v)) st.erros.push("A execução desta conexão ainda não foi ligada. Por enquanto funcionam: Magnific pelo Chrome e Kinovi pela API.");
    else if (v && !teste && !aj && st.anexos.length) st.erros.push("Pedido com anexo só pelo Mac, com o ajudante ligado (os arquivos saem deste aparelho).");
    if (st.erros.length) { st.confirmar = false; return pintarBotao(); }
    if (avisosDeGasto(st.tipo, v, st.valores).length && !st.confirmar) { st.confirmar = true; return pintarBotao(); }
    goBtn.disabled = true;
    const row = {
      tipo: st.tipo, modo: st.modo, modelo: m.id, modelo_nome: m.nome, provedor: v.prov.id, caminho: v.caminho,
      nome: nomeIn.value.trim() || nomePadrao(ta.value, m), prompt: ta.value.trim(), opcoes: { ...st.valores },
      anexos: st.anexos.map((a) => ({ apelido: a.apelido, tipo: a.tipo, nome: a.nome, tamanho: a.tamanho, papel: a.papel })), status: "fila",
    };
    const { data, error } = await sb.from("geracoes").insert(row).select(sel);
    goBtn.disabled = false; st.confirmar = false;
    if (error || !data?.[0]) { st.erros = ["Não gravou o pedido: " + (error?.message || "sem resposta")]; return pintarBotao(); }
    rows = [data[0], ...rows];
    nomeIn.value = ""; pintarBotao(); desenharDireita(); vigiar();
    toast(aj || teste ? "Pedido na fila." : "Pedido na fila. Começa quando o painel abrir no Mac.");
    if (aj) { const r = await despachar(data[0], st.anexos); if (r.erro) await mudar(rows.find((x) => x.id === data[0].id) || data[0], { status: "erro", erro: r.erro, done_at: new Date().toISOString() }); }
  }

  // ---- lado direito: andamento + galeria
  const filaBox = h("div", { class: "gr-fila" }), galBox = h("div", { class: "gr-gal" }), contagem = h("span", { class: "mono" });
  const filaSec = h("div"), rain = chuva();
  const mudar = async (r, patch, okMsg) => {
    const { data, error } = await sb.from("geracoes").update(patch).eq("id", r.id).eq("version", r.version).select(sel).maybeSingle();
    if (error || !data) { toast("Não salvou: a linha mudou. Recarregando.", { kind: "err" }); await recarregar(); return false; }
    Object.assign(r, data, patch); if (okMsg) toast(okMsg); desenharDireita(); return true;
  };
  const reusar = (r) => {
    st.tipo = r.tipo; const m = MODELOS.find((x) => x.id === r.modelo);
    if (m?.ferramenta) st.ferramenta = m.ferramenta;
    st.modelo = r.modelo; st.modo = r.modo; st.valores = { ...(r.opcoes || {}) };
    st.via = Math.max(0, conexoes(m, PROVEDORES).findIndex((x) => x.prov.id === r.provedor && x.caminho === r.caminho));
    ta.value = r.prompt || ""; desenhar(); ta.focus(); window.scrollTo({ top: 0, behavior: "smooth" });
    if ((r.anexos || []).length) toast("Prompt e opções carregados. Os anexos precisam ser enviados de novo.");
  };
  const meta = (r) => [r.modelo_nome, r.opcoes?.res, r.opcoes?.prop, r.opcoes?.dur, r.tamanho_bytes ? fmtTamanho(r.tamanho_bytes) : null].filter(Boolean);
  const job = (r) => {
    const [sl, sc] = STATUS[r.status] || [r.status, ""], p = Number(r.progresso || 0);
    return h("article", { class: "gr-job" },
      h("div", { class: "flex" }, h("span", { class: `chip ${sc}` }, sl), h("span", { class: "chip" }, PROVEDORES.find((x) => x.id === r.provedor)?.nome || r.provedor), h("span", { class: "mono muted", style: { marginLeft: "auto" } }, fmtDateTime(r.created_at))),
      h("b", { class: "truncate" }, r.nome), h("div", { class: "muted small truncate" }, meta(r).join(" · ")),
      h("div", { class: "gr-barra" + (r.status === "gerando" && !p ? " gr-ind" : "") }, h("span", { style: { width: r.status === "gerando" && !p ? null : `${p}%` } })),
      h("div", { class: "flex" }, h("span", { class: "muted small grow" }, r.status === "fila" ? "Aguardando o ajudante do Mac" : p ? `${p}%` : "Gerando"),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { if (aj) cancelar(r.id); mudar(r, { status: "cancelado" }, "Pedido cancelado."); } }, "Cancelar")));
  };
  const midia = (r) => {
    const a = r.resultado?.arquivos?.[0], n = r.resultado?.arquivos?.length || 0;
    const tipoChip = h("span", { class: "chip gr-tipo" }, TIPOS.find(([k]) => k === r.tipo)?.[1] || r.tipo, n > 1 ? ` · ${n}` : "");
    if (!a?.url) return h("div", { class: "gr-midia" }, tipoChip, h("span", { class: `chip ${STATUS[r.status]?.[1] || ""}` }, STATUS[r.status]?.[0] || r.status));
    return h("div", { class: "gr-midia" },
      r.tipo === "imagem" ? h("img", { src: a.url, alt: r.nome, loading: "lazy" })
        : r.tipo === "video" ? h("video", { src: a.url, controls: true, playsinline: true, preload: "metadata" })
        : [h("span", { class: "gr-onda" }, r.opcoes?.dur || "áudio"), h("audio", { src: a.url, controls: true, preload: "none" })], tipoChip);
  };
  const card = (r) => {
    const nome = h("button", { type: "button", class: "gr-nome", title: "Renomear", onclick: () => {
      const i = h("input", { class: "input", value: r.nome, maxlength: 80, style: { height: "30px" } });
      const salvar = async () => { const v = i.value.trim(); if (v && v !== r.nome) await mudar(r, { nome: v }, "Renomeado."); else desenharDireita(); };
      i.addEventListener("keydown", (e) => { if (e.key === "Enter") i.blur(); if (e.key === "Escape") { i.value = r.nome; i.blur(); } });
      i.addEventListener("blur", salvar); nome.replaceWith(i); i.focus(); i.select();
    } }, r.nome);
    const a = r.resultado?.arquivos?.[0];
    return h("article", { class: "gr-card" }, midia(r),
      h("div", { class: "gr-info" }, nome,
        h("div", { class: "gr-meta" }, ...meta(r).map((t) => h("span", { class: "chip" }, t))),
        h("div", { class: "mono muted" }, `${PROVEDORES.find((x) => x.id === r.provedor)?.nome || r.provedor} · ${fmtDateTime(r.done_at || r.created_at)}`),
        r.status === "erro" ? h("p", { class: "gr-erro-txt" }, r.erro || "Falhou sem detalhe.") : null,
        h("div", { class: "gr-acts" },
          h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => reusar(r) }, "Reusar"),
          h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => copiarTexto(r.prompt || "", "Prompt copiado.") }, "Copiar prompt"),
          a?.url ? h("a", { class: "btn btn-ghost btn-sm", href: a.url, download: a.nome || "" }, "Baixar") : null,
          h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: async () => { if (await mudar(r, { archived_at: new Date().toISOString() })) { rows = rows.filter((x) => x !== r); desenharDireita(); toast("Saiu da galeria (fica guardado no banco)."); } } }, "Arquivar"))));
  };
  const sel2 = (k, opts, rot) => h("select", { class: "select", "aria-label": rot, onchange: (e) => { filtro[k] = e.target.value; desenharGaleria(); } }, h("option", { value: "" }, rot), ...opts.map(([v, t]) => h("option", { value: v, selected: filtro[k] === v }, t)));
  const filtrosBox = h("div", { class: "gr-filtros" });
  const desenharFiltros = () => {
    const feitos = rows.filter((r) => !ATIVOS.includes(r.status));
    const provs = [...new Set(feitos.map((r) => r.provedor))].map((p) => [p, PROVEDORES.find((x) => x.id === p)?.nome || p]);
    const mods = [...new Map(feitos.map((r) => [r.modelo, r.modelo_nome || r.modelo])).entries()];
    const data = (k, rot) => h("input", { class: "input", type: "date", value: filtro[k], "aria-label": rot, title: rot, onchange: (e) => { filtro[k] = e.target.value; desenharGaleria(); } });
    filtrosBox.replaceChildren(
      h("input", { class: "input gr-q", type: "search", placeholder: "Buscar por nome ou prompt", value: filtro.q, oninput: (e) => { filtro.q = e.target.value; desenharGaleria(); } }),
      h("div", { class: "gr-chips" }, ...[["todos", "Tudo"], ...TIPOS].map(([k, l]) => h("button", { type: "button", "aria-pressed": String(filtro.tipo === k), onclick: () => { filtro.tipo = k; desenharFiltros(); desenharGaleria(); } }, l))),
      sel2("provedor", provs, "Ferramenta"), sel2("modelo", mods, "Modelo"),
      sel2("status", [["pronto", "Prontos"], ["erro", "Com erro"], ["cancelado", "Cancelados"]], "Status"),
      data("de", "De"), data("ate", "Até"),
      sel2("tamMin", [["1", "1 MB ou mais"], ["10", "10 MB ou mais"], ["50", "50 MB ou mais"]], "Tamanho"),
      h("select", { class: "select", "aria-label": "Ordenar", onchange: (e) => { filtro.ordem = e.target.value; desenharGaleria(); } }, ...ORDENS.map(([v, t]) => h("option", { value: v, selected: filtro.ordem === v }, t))));
  };
  const desenharGaleria = () => {
    const feitos = rows.filter((r) => !ATIVOS.includes(r.status));
    const vis = ordenar(filtrar(feitos, { ...filtro, tamMin: Number(filtro.tamMin) || 0 }), filtro.ordem);
    contagem.textContent = `${vis.length} de ${feitos.length}`;
    galBox.replaceChildren(...(vis.length ? vis.map(card) : [h("p", { class: "empty" }, feitos.length ? "Nada com esses filtros." : "Nenhuma geração ainda.")]));
  };
  const desenharDireita = () => {
    const ativos = rows.filter((r) => ATIVOS.includes(r.status));
    filaSec.replaceChildren(...(ativos.length ? [h("div", { class: "gr-sec" }, h("h2", null, "Em andamento"), h("span", { class: "chip accent" }, String(ativos.length))), filaBox] : []));
    filaBox.replaceChildren(...ativos.map(job));
    rain.set(pagina.isConnected !== false && ativos.some((r) => r.status === "gerando"));
    desenharFiltros(); desenharGaleria();
  };

  // ---- acompanha a fila enquanto houver algo ativo; para ao sair da página
  let timer = 0;
  async function recarregar() { const { data } = await ler(); if (data) { rows = data; desenharDireita(); } }
  // traz para a linha o que o ajudante já sabe; pedido sem anexo que ficou na fila (feito no celular) é entregue agora
  async function sincronizar() {
    for (const r of rows.filter((x) => ATIVOS.includes(x.status) && ligada(x))) {
      const job = await estado(r.id);
      if (job === undefined) return;
      if (job === null) {
        if (r.status === "fila" && !(r.anexos || []).length) { const d = await despachar(r); if (d.erro) await mudar(r, { status: "erro", erro: d.erro, done_at: new Date().toISOString() }); }
        else await mudar(r, { status: "erro", erro: r.status === "fila" ? "Os anexos não chegaram ao ajudante. Envie de novo pelo Mac." : "O ajudante do Mac perdeu este pedido (reiniciou?).", done_at: new Date().toISOString() });
        continue;
      }
      const patch = patchDoJob(r, job);
      if (patch) await mudar(r, patch, patch.status === "pronto" ? `Pronto: ${r.nome}` : undefined);
    }
  }
  function vigiar() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!pagina.isConnected) return rain.parar();
      if (!document.hidden) await recarregar();
      if (aj) await sincronizar();
      if (rows.some((r) => ATIVOS.includes(r.status))) vigiar();
    }, 4000);
  }
  const sair = () => { if (!pagina.isConnected) { rain.parar(); clearTimeout(timer); removeEventListener("hashchange", sair); } };
  addEventListener("hashchange", () => setTimeout(sair, 50));

  desenhar();
  pagina.append(
    pageHead(NOME, "vídeo, imagem e áudio com IA"),
    ...(semTabela ? [h("p", { class: "note" }, "Rodar a migration 0040 (geracoes) no SQL Editor para a página gravar pedidos.")] : []),
    h("div", { class: "gr-grid" }, esquerda, h("div", null, filaSec, h("div", { class: "gr-sec" }, h("h2", null, "Galeria"), contagem), filtrosBox, galBox)));
  desenharDireita();
  if (rows.some((r) => ATIVOS.includes(r.status))) vigiar();
  // a chuva depende de a página já estar no documento: confere de novo logo depois de montar
  setTimeout(() => { if (pagina.isConnected) desenharDireita(); }, 60);
  return pagina;
}
