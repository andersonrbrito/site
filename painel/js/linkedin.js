// Botão "LinkedIn" dos módulos de mídia (CarrosseL_, StúdiO_, AprovaçõeS_).
// Abre um diálogo com legenda + horário e cria um post aprovado no PostadoR_; o robô (postador_tick) publica no horário.
// media: [{ path, mime, bucket?, title?, name? }]. Vídeo ou PDF vai sozinho; imagens podem ser várias.
import { h } from "./util.js";
import { toast } from "./ui.js";

const pad = (n) => String(n).padStart(2, "0");
const spLocal = (d) => { const s = new Date(d.getTime() - 3 * 3600e3); return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}T${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`; };

/** prepare(): devolve { media } na hora de confirmar (ex.: gerar o PDF). Pode ser async e lento. */
export function linkedinDialog(sb, { titulo = "", legenda = "", prepare, origem = "" }) {
  const ta = h("textarea", { class: "textarea", rows: 8 }); ta.value = legenda;
  const quando = h("input", { class: "input", type: "datetime-local", value: spLocal(new Date(Date.now() + 3600e3)) });
  const msg = h("p", { class: "muted small" }, "Horário de Brasília. O robô publica no horário marcado.");
  const go = async (agora, btn) => {
    if (!ta.value.trim()) return toast("Escreva a legenda.", { kind: "err" });
    const at = agora ? new Date() : new Date(`${quando.value}:00-03:00`);
    if (!agora && (isNaN(at) || at < new Date(Date.now() - 60e3))) return toast("Escolha um horário no futuro.", { kind: "err" });
    dlg.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      const { media } = await prepare((t) => { msg.textContent = t; });
      msg.textContent = "Criando o post…";
      const { error } = await sb.from("posts").insert({ network: "linkedin", title: titulo || null, body: ta.value.trim(), media, status: "approved", scheduled_at: at.toISOString(), notes: origem ? `Origem: ${origem}` : null });
      if (error) throw error;
      toast(agora ? "Enviado. Sai no LinkedIn em até 1 minuto." : "Agendado no LinkedIn. Acompanhe no PostadoR_.");
      dlg.close();
    } catch (e) {
      msg.textContent = "Não deu: " + (e?.message || e);
      dlg.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  };
  const dlg = h("dialog", { class: "dialog li-dialog" },
    h("div", { style: { padding: "16px", display: "grid", gap: "10px" } },
      h("b", null, "Postar no LinkedIn"),
      h("label", { class: "field" }, "Legenda", ta),
      h("label", { class: "field" }, "Agendar para", quando),
      msg,
      h("div", { class: "flex", style: { gap: "8px", justifyContent: "flex-end" } },
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => dlg.close() }, "Cancelar"),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: (e) => go(true, e.currentTarget) }, "Postar agora"),
        h("button", { class: "btn btn-sm", type: "button", onclick: (e) => go(false, e.currentTarget) }, "Agendar"))));
  dlg.addEventListener("close", () => dlg.remove());
  document.body.append(dlg); dlg.showModal();
}

/** PDF mínimo com uma página por JPEG (blobs). LinkedIn mostra PDF como carrossel. */
export async function jpegsToPdf(jpegs, w = 1080, hgt = 1350) {
  const enc = new TextEncoder(), parts = [], offs = [];
  let len = 0; const push = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const n = jpegs.length, obj = (i) => { offs[i] = len; };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1); push("1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n");
  obj(2); push(`2 0 obj<</Type/Pages/Count ${n}/Kids[${jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}]>>endobj\n`);
  for (let i = 0; i < n; i++) {
    const p = 3 + i * 3, im = p + 1, ct = p + 2, data = new Uint8Array(await jpegs[i].arrayBuffer());
    const draw = `q ${w} 0 0 ${hgt} 0 0 cm /I Do Q`;
    obj(p); push(`${p} 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${w} ${hgt}]/Resources<</XObject<</I ${im} 0 R>>>>/Contents ${ct} 0 R>>endobj\n`);
    obj(im); push(`${im} 0 obj<</Type/XObject/Subtype/Image/Width ${w}/Height ${hgt}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${data.length}>>stream\n`); push(data); push("\nendstream endobj\n");
    obj(ct); push(`${ct} 0 obj<</Length ${draw.length}>>stream\n${draw}\nendstream endobj\n`);
  }
  const total = 3 + n * 3, xref = len;
  push(`xref\n0 ${total}\n0000000000 65535 f \n` + Array.from({ length: total - 1 }, (_, i) => String(offs[i + 1]).padStart(10, "0") + " 00000 n \n").join(""));
  push(`trailer<</Size ${total}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: "application/pdf" });
}

/** prepare() para vídeo que está numa URL (site ou link assinado): baixa e sobe no bucket do PostadoR_. */
export const videoDaUrl = (sb, url, nome = "video", titulo = "") => async (info) => {
  info("Baixando o vídeo…");
  const r = await fetch(url); if (!r.ok) throw new Error(`vídeo ${r.status}`);
  const b = await r.blob();
  info(`Subindo o vídeo (${(b.size / 1048576).toFixed(1)} MB)…`);
  const path = `linkedin/${nome.replace(/[^\w.-]+/g, "-")}-${Date.now()}.mp4`;
  const { error } = await sb.storage.from("postador-media").upload(path, b, { contentType: "video/mp4" });
  if (error) throw error;
  return { media: [{ path, mime: "video/mp4", size: b.size, name: nome, ...(titulo ? { title: titulo } : {}) }] };
};
