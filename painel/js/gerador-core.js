// Lógica pura do GeradoR_ (sem DOM): anexos e menções @, opções por modelo/conexão, validação do pedido,
// filtros e ordenação da galeria. Testada em painel/dev/tests/gerador.test.js.

export const TIPOS = [["video", "Vídeo"], ["imagem", "Imagem"], ["audio", "Áudio"]];
export const ATIVOS = ["fila", "gerando"];
export const STATUS = { fila: ["na fila", "warn"], gerando: ["gerando", "accent"], pronto: ["pronto", "ok"], erro: ["erro", "danger"], cancelado: ["cancelado", ""] };

/** Tipo do anexo pelo MIME ou pela extensão. */
export function tipoDoArquivo(nome = "", mime = "") {
  if (/^image\//.test(mime) || /\.(png|jpe?g|webp|gif|heic|avif)$/i.test(nome)) return "imagem";
  if (/^video\//.test(mime) || /\.(mp4|mov|webm|m4v|mkv)$/i.test(nome)) return "video";
  if (/^audio\//.test(mime) || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(nome)) return "audio";
  return "arquivo";
}

/** Próximo apelido livre para o tipo: imagem1, imagem2, video1... (não reaproveita número enquanto houver maior). */
export function proximoApelido(anexos, tipo) {
  const n = anexos.filter((a) => a.tipo === tipo).reduce((m, a) => Math.max(m, Number(a.apelido.replace(/\D+/g, "")) || 0), 0);
  return `${tipo}${n + 1}`;
}

/** Menção em digitação logo antes do cursor: devolve { inicio, termo } ou null. */
export function mencaoNoCursor(texto, cursor) {
  const m = texto.slice(0, cursor).match(/(^|[\s(,.;:!?])@([\p{L}\d_]*)$/u);
  return m ? { inicio: cursor - m[2].length - 1, termo: m[2].toLowerCase() } : null;
}

/** Troca a menção em digitação pelo apelido escolhido. Devolve { texto, cursor }. */
export function aplicarMencao(texto, cursor, apelido) {
  const m = mencaoNoCursor(texto, cursor);
  const ini = m ? m.inicio : cursor, depois = texto.slice(cursor);
  const ins = `@${apelido}${/^\s/.test(depois) ? "" : " "}`;
  return { texto: texto.slice(0, ini) + ins + depois, cursor: ini + ins.length };
}

/** Todas as menções do prompt, na ordem, sem repetir. */
export const mencoes = (texto) => [...new Set([...String(texto || "").matchAll(/(?:^|[\s(,.;:!?])@([\p{L}\d_]+)/gu)].map((m) => m[1].toLowerCase()))];

/** Menções que não têm anexo correspondente. */
export const mencoesSoltas = (texto, anexos) => mencoes(texto).filter((m) => !anexos.some((a) => a.apelido === m));

/** Conexões (provedor + caminho) disponíveis para um modelo, já com os dados do provedor. */
export function conexoes(modelo, provedores) {
  return (modelo?.via || []).map((v, i) => {
    const p = provedores.find((x) => x.id === v.prov) || { id: v.prov, nome: v.prov };
    return { ...v, i, prov: p, rotulo: `${p.nome}${p.conta ? " (" + p.conta + ")" : ""} · ${ROTULO_CAMINHO[v.caminho] || v.caminho}` };
  });
}
export const ROTULO_CAMINHO = { api: "API", mcp: "MCP", chrome: "Claude no Chrome" };
export const ROTULO_CUSTO = { unlimited: "Unlimited", gratis: "grátis", cota: "cota diária", creditos: "gasta créditos", pago: "pago por uso" };

/** Opções do modelo valendo para o modo e a conexão escolhidos (a conexão pode restringir valores). */
export function opcoesDe(modelo, modoId, via) {
  if (!modelo) return [];
  const modo = (modelo.modos || []).find((m) => m.id === modoId);
  return (modelo.opcoes || [])
    .filter((o) => !o.modos || o.modos.includes(modoId))
    .map((o) => {
      if (!o.valores) return o;
      const so = via?.so?.[o.id] || modo?.so?.[o.id];
      const valores = so ? o.valores.filter((v) => so.includes(v)) : o.valores;
      return { ...o, valores: valores.length ? valores : o.valores };
    });
}

/** Valor inicial de cada opção: mantém o que já estava escolhido se ainda for válido. */
export function valoresIniciais(opcoes, atuais = {}) {
  const out = {};
  for (const o of opcoes) {
    const cur = atuais[o.id];
    if (o.valores) out[o.id] = o.valores.includes(cur) ? cur : o.valores.includes(o.padrao) ? o.padrao : o.valores[0];
    else if (o.tipo === "faixa") out[o.id] = typeof cur === "number" && cur >= o.min && cur <= o.max ? cur : o.padrao ?? o.min;
    else if (o.tipo === "bool") out[o.id] = typeof cur === "boolean" ? cur : !!o.padrao;
    else out[o.id] = cur ?? o.padrao ?? "";
  }
  return out;
}

/** Altura em pixels de um rótulo de resolução ("720p", "1080p", "2K", "4K"); 0 quando não é vídeo/desconhecido. */
export function alturaDe(res) {
  const s = String(res || "").toLowerCase();
  if (/^\d+p$/.test(s)) return Number(s.slice(0, -1));
  return { "2k": 1440, "4k": 2160 }[s] || 0;
}

/** Motivos que exigem confirmação explícita antes de enviar (regras do Anderson). */
export function avisosDeGasto(tipo, via, valores) {
  const out = [];
  if (via && ["creditos", "pago"].includes(via.custo)) out.push(via.custo === "pago" ? "cobra por uso" : "gasta créditos");
  if (tipo === "video" && alturaDe(valores?.res) > 720) out.push("acima de 720p");
  return out;
}

/** Valida o pedido antes de gravar. Devolve lista de erros (vazia = ok). */
export function validar({ modelo, modo, via, prompt, anexos }) {
  const erros = [];
  if (!modelo) return ["Escolha um modelo."];
  if (!via) erros.push("Este modelo não tem conexão disponível.");
  const m = (modelo.modos || []).find((x) => x.id === modo) || {};
  if (m.prompt !== false && !String(prompt || "").trim()) erros.push(m.rotuloPrompt ? `Preencha: ${m.rotuloPrompt}.` : "Escreva o prompt.");
  const aceitos = m.anexos || { min: 0, max: 0 };
  const validos = anexos.filter((a) => !aceitos.tipos || aceitos.tipos.includes(a.tipo));
  if (validos.length < (aceitos.min || 0)) erros.push(`Este modo precisa de ${aceitos.min} anexo(s) de ${(aceitos.tipos || ["arquivo"]).join(" ou ")}.`);
  if (anexos.length > (aceitos.max ?? 0)) erros.push((aceitos.max ?? 0) === 0 ? "Este modo não aceita anexos." : `Este modo aceita no máximo ${aceitos.max} anexo(s).`);
  const fora = anexos.filter((a) => aceitos.tipos && !aceitos.tipos.includes(a.tipo));
  if (fora.length && (aceitos.max ?? 0) > 0) erros.push(`Anexo de tipo não aceito neste modo: ${fora.map((a) => "@" + a.apelido).join(", ")}.`);
  const soltas = mencoesSoltas(prompt, anexos);
  if (soltas.length) erros.push(`Menção sem anexo: ${soltas.map((s) => "@" + s).join(", ")}.`);
  return erros;
}

/** Nome padrão da geração: primeiras palavras do prompt, sem as menções. */
export function nomePadrao(prompt, modelo) {
  const t = String(prompt || "").replace(/@[\p{L}\d_]+/gu, "").replace(/\s+/g, " ").trim();
  return (t ? t.split(" ").slice(0, 7).join(" ") : modelo?.nome || "Sem nome").slice(0, 80);
}

export function fmtTamanho(b) {
  if (!b && b !== 0) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1).replace(".", ",")} MB`;
  return `${(b / 1073741824).toFixed(2).replace(".", ",")} GB`;
}

const dia = (ts) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));

/** Filtra a galeria. f: { q, tipo, provedor, modelo, status, de, ate, tamMin (MB) }. */
export function filtrar(rows, f = {}) {
  const q = (f.q || "").trim().toLowerCase();
  return rows.filter((r) => {
    if (f.tipo && f.tipo !== "todos" && r.tipo !== f.tipo) return false;
    if (f.provedor && r.provedor !== f.provedor) return false;
    if (f.modelo && r.modelo !== f.modelo) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.de && dia(r.created_at) < f.de) return false;
    if (f.ate && dia(r.created_at) > f.ate) return false;
    if (f.tamMin && (r.tamanho_bytes || 0) < f.tamMin * 1048576) return false;
    if (q && !`${r.nome || ""} ${r.prompt || ""} ${r.modelo_nome || ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export const ORDENS = [["recente", "Mais recentes"], ["antigo", "Mais antigos"], ["nome", "Nome (A a Z)"], ["maior", "Maior arquivo"], ["menor", "Menor arquivo"], ["ferramenta", "Ferramenta"]];
export function ordenar(rows, ordem = "recente") {
  const by = {
    recente: (a, b) => (a.created_at < b.created_at ? 1 : -1),
    antigo: (a, b) => (a.created_at > b.created_at ? 1 : -1),
    nome: (a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"),
    maior: (a, b) => (b.tamanho_bytes || 0) - (a.tamanho_bytes || 0),
    menor: (a, b) => (a.tamanho_bytes || 0) - (b.tamanho_bytes || 0),
    ferramenta: (a, b) => `${a.provedor} ${a.modelo_nome}`.localeCompare(`${b.provedor} ${b.modelo_nome}`, "pt-BR"),
  }[ordem];
  return [...rows].sort(by);
}
