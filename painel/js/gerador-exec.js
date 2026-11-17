// Ponte da página com o ajudante local do Mac (tools/yt-helper, 127.0.0.1:8765), que é quem executa as gerações.
// Sem o ajudante (celular, outro computador) a página só grava o pedido; ele é pego quando o painel abrir no Mac.
const BASE = "http://127.0.0.1:8765";

async function pedir(caminho, body, ms = 4000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(BASE + caminho, { method: body ? "POST" : "GET", signal: c.signal, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
    return { status: r.status, dados: await r.json().catch(() => ({})) };
  } catch { return null; } finally { clearTimeout(t); }
}

/** Ajudante ligado? Devolve { gerar: ["magnific:chrome", ...] } ou null. */
export async function ajudante() { const r = await pedir("/ping", null, 1500); return r?.status === 200 && Array.isArray(r.dados.gerar) ? r.dados : null; }
export const chaveDe = (x) => `${x.provedor || x.prov?.id || x.prov}:${x.caminho}`;
export const urlMidia = (id) => `${BASE}/midia/${id}`;

const emBase64 = (file) => new Promise((ok, erro) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(",")[1] || ""); fr.onerror = () => erro(fr.error); fr.readAsDataURL(file); });

/** Entrega o pedido ao ajudante. `arquivos` = anexos da tela ({ apelido, tipo, papel, nome, file }). Devolve { ok } ou { erro }. */
export async function despachar(row, arquivos = []) {
  let anexos;
  try { anexos = await Promise.all(arquivos.map(async (a) => ({ apelido: a.apelido, tipo: a.tipo, papel: a.papel, nome: a.nome, b64: await emBase64(a.file) }))); }
  catch { return { erro: "Não consegui ler um dos anexos." }; }
  const r = await pedir("/gerar", { id: row.id, tipo: row.tipo, modo: row.modo, modelo: row.modelo, modelo_nome: row.modelo_nome, provedor: row.provedor, caminho: row.caminho, prompt: row.prompt, opcoes: row.opcoes, nome: row.nome, anexos }, 120000);
  if (!r) return { erro: "O ajudante do Mac não respondeu." };
  return r.status === 200 ? { ok: true, job: r.dados } : { erro: r.dados.error || "O ajudante recusou o pedido." };
}
/** Estado do pedido no ajudante: objeto do job, null se ele não conhece o pedido, undefined se não respondeu. */
export async function estado(id) { const r = await pedir("/job/" + id); return !r ? undefined : r.status === 200 ? r.dados : null; }
export const cancelar = (id) => pedir("/gerar/cancelar", { id });

/** O que gravar na linha a partir do estado do ajudante (função pura). null = nada a mudar. */
export function patchDoJob(row, job, agora = new Date().toISOString()) {
  if (!job || !["fila", "gerando"].includes(row.status)) return null;
  if (job.status === "gerando" && row.status === "fila") return { status: "gerando", started_at: agora };
  if (job.status === "pronto") return {
    status: "pronto", progresso: 100, done_at: agora, tamanho_bytes: job.tamanho ?? null,
    resultado: { arquivos: [{ url: urlMidia(row.id), nome: job.nome, mime: job.mime, caminho_local: job.caminho }], obs: job.obs || undefined },
    custo: { creditos: job.creditos ?? null, claude_usd: job.custo_claude_usd ?? null },
  };
  if (job.status === "erro") return { status: "erro", erro: String(job.error || "Falhou sem detalhe.").slice(0, 1000), done_at: agora };
  if (job.status === "cancelado") return { status: "cancelado" };
  return null;
}
