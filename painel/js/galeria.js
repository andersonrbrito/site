// Salvar na galeria do celular.
// No iPhone, download por link não vai pra Fotos: cai em Arquivos e, com vários seguidos, o Safari bloqueia.
// Por isso, no celular os botões de baixar abrem a folha de compartilhar do sistema, que tem
// "Salvar imagem / Salvar N imagens / Salvar vídeo" (vai direto pra galeria).
// O compartilhar exige um toque recente: se preparar os arquivos demorar, o botão vira
// "Toque para salvar na galeria" e o segundo toque abre a folha na hora, com tudo pronto.
import { toast } from "./ui.js?v=20261112f";

export const CELULAR = typeof navigator !== "undefined" && typeof navigator.canShare === "function"
  && typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

export const ROTULO_GALERIA = "Salvar na galeria";

// btn: o botão tocado. preparar(info) devolve um array de File; info(texto) mostra o progresso no botão.
export async function salvarNaGaleria(btn, preparar) {
  const rot = btn.dataset.rot || (btn.dataset.rot = btn.textContent);
  const volta = () => { btn._files = null; btn.textContent = rot; btn.disabled = false; };
  if (!btn._files) {
    btn.disabled = true;
    try {
      const files = await preparar((t) => { btn.textContent = t; });
      if (!files.length) throw new Error("nenhum arquivo");
      if (!navigator.canShare({ files })) throw new Error("o celular recusou estes arquivos");
      btn._files = files;
    } catch (e) { volta(); toast("Não preparou: " + e.message, { kind: "err" }); return; }
    btn.disabled = false;
    btn.textContent = "Toque para salvar na galeria";
  }
  try {
    await navigator.share({ files: btn._files });
    volta();
  } catch (e) {
    if (e.name === "AbortError") return volta();
    if (e.name === "NotAllowedError") return toast("Pronto. Toque de novo e escolha “Salvar imagem” (ou “Salvar vídeo”).", { ms: 6000 });
    volta(); toast("Não deu para salvar: " + e.message, { kind: "err" });
  }
}

// Baixa uma URL e devolve como File (para mandar ao compartilhar).
export async function urlParaFile(url, nome) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(nome || "arquivo não encontrado");
  const blob = await r.blob();
  return new File([blob], nome, { type: blob.type || (nome.endsWith(".mp4") ? "video/mp4" : "application/octet-stream") });
}
