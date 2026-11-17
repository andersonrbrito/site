// Catálogo do GeradoR_: provedores (contas e caminhos), modelos com as opções que cada um realmente oferece, e vozes.
// Levantado em 2026-11-11 em documentação pública (docs do fornecedor, docs.magnific.com, fal.ai, kie.ai, suporte do Flow).
// conf: "ok" = lido em doc oficial; "parcial" = terceiros ou só parte confirmada; "ver" = conferir na interface logada.
// Para incluir um modelo: um item em MODELOS. Para restringir valores numa conexão: via[].so = { res:[...], dur:[...] }.
// custo da conexão: unlimited | gratis | cota | creditos | pago (os dois últimos pedem confirmação na tela).

export const PROVEDORES = [
  { id: "magnific", nome: "Magnific", conta: "contato", chrome: "contato", caminhos: ["chrome", "mcp"], obs: "Pelo Chrome usa o plano Unlimited; pelo MCP gasta créditos." },
  { id: "flow-contato", nome: "Google Flow", conta: "contato", chrome: "contato", caminhos: ["chrome"], obs: "50 créditos por dia. Sem API." },
  { id: "flow-theilmar", nome: "Google Flow", conta: "theilmar", chrome: "theilmar", caminhos: ["chrome"], obs: "Só créditos mensais: usar só com OK." },
  { id: "aistudio", nome: "Google AI Studio", conta: "theilmar", chrome: "theilmar", caminhos: ["chrome", "api"], obs: "TTS grátis no AI Studio; Lyria e imagem são pagos." },
  { id: "chatgpt", nome: "ChatGPT", conta: "contato", chrome: "contato", caminhos: ["chrome"], obs: "Imagem pelo ChatGPT no Chrome. Cota não publicada." },
  { id: "grok", nome: "Grok Imagine", conta: "theilmar", chrome: "theilmar", caminhos: ["chrome", "api"], obs: "Pelo Chrome usa a cota da conta; pela API da xAI cobra por segundo." },
  { id: "kie", nome: "Kie.ai", conta: "", caminhos: ["api"], estado: "depois", obs: "Sem conta nem plano por enquanto (decidir depois)." },
  { id: "fal", nome: "fal.ai", conta: "", caminhos: ["api", "mcp"], estado: "depois", obs: "Sem conta nem plano por enquanto (decidir depois)." },
  { id: "kinovi", nome: "Kinovi", conta: "", caminhos: ["api"], obs: "API paga por uso, em dólar (1 crédito = US$ 0,005). A chave fica no Keychain do Mac." },
  { id: "realoficial", nome: "Real Oficial", conta: "", caminhos: ["mcp", "chrome"], obs: "Estúdio IA (Vídeo com IA, Imagem com IA, Voz e áudio, Real Fantasia, XABLAU). Gasta créditos: 1 crédito = R$ 0,033. O plano inclui 50 vídeos e 50 imagens por mês nos modelos marcados como inclusos." },
];

export const FERRAMENTAS_AUDIO = [["tts", "Texto para fala"], ["clone", "Clonar voz"], ["troca", "Trocar voz"], ["sfx", "Efeito sonoro"], ["musica", "Música"], ["isolar", "Isolar voz"]];

// ---- atalhos de montagem
const res = (valores, padrao) => ({ id: "res", nome: "Resolução", valores, padrao });
const prop = (valores, padrao) => ({ id: "prop", nome: "Proporção", valores, padrao: padrao || valores[0] });
const dur = (valores, padrao) => ({ id: "dur", nome: "Duração", valores, padrao: padrao || valores[0] });
const qtd = (max) => ({ id: "qtd", nome: "Quantidade", valores: Array.from({ length: max }, (_, i) => String(i + 1)), padrao: "1" });
const som = (padrao = false) => ({ id: "som", nome: "Áudio nativo", tipo: "bool", rotulo: "Gerar com áudio nativo", padrao });
const seg = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${a + i} s`);
const T2V = { id: "t2v", nome: "Texto", anexos: { min: 0, max: 0 } };
const I2V = { id: "i2v", nome: "Imagem inicial", anexos: { min: 1, max: 1, tipos: ["imagem"] }, papeis: ["inicio"] };
const FLF = { id: "flf", nome: "Início e fim", anexos: { min: 2, max: 2, tipos: ["imagem"] }, papeis: ["inicio", "fim"] };
const REFV = (n, tipos = ["imagem"]) => ({ id: "ref", nome: "Referências", anexos: { min: 1, max: n, tipos }, papeis: ["ref"] });
const T2I = { id: "t2i", nome: "Texto", anexos: { min: 0, max: 0 } };
const EDIT = (n) => ({ id: "edit", nome: "Com referências", anexos: { min: 1, max: n, tipos: ["imagem"] }, papeis: ["ref"] });
const P7 = ["1:1", "16:9", "9:16", "2:3", "3:4", "3:2", "4:3"], P8 = [...P7, "21:9"];
const VID = ["16:9", "9:16", "1:1"];

// conexões recorrentes
const magU = (obs) => ({ prov: "magnific", caminho: "chrome", custo: "unlimited", obs });
const magC = (obs = "Conferir se este modelo entra no Unlimited antes de usar.") => ({ prov: "magnific", caminho: "chrome", custo: "creditos", obs });
const magM = { prov: "magnific", caminho: "mcp", custo: "creditos" };
const kie = (obs) => ({ prov: "kie", caminho: "api", custo: "pago", obs });
const fal = (obs) => ({ prov: "fal", caminho: "api", custo: "pago", obs });
const flow = (custo, obs, so) => [{ prov: "flow-contato", caminho: "chrome", custo, obs, ...(so ? { so } : {}) }, { prov: "flow-theilmar", caminho: "chrome", custo: "creditos", obs: "Conta theilmar: só créditos mensais.", ...(so ? { so } : {}) }];

const v = (id, familia, nome, modos, opcoes, via, extra = {}) => ({ id, tipo: "video", familia, nome, modos, opcoes, via, ...extra });
const img = (id, familia, nome, modos, opcoes, via, extra = {}) => ({ id, tipo: "imagem", familia, nome, modos, opcoes, via, ...extra });
const aud = (id, familia, ferramenta, nome, modos, opcoes, via, extra = {}) => ({ id, tipo: "audio", familia, ferramenta, nome, modos, opcoes, via, ...extra });

// ================= VÍDEO =================
const S7 = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21"], S6 = S7.slice(0, 6), W5 = S7.slice(0, 5), GV = ["16:9", "9:16"];
const G9 = ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3", "21:9", "5:2"];
const MIX = ["imagem", "video", "audio"];
const V2V = { id: "v2v", nome: "Editar vídeo", anexos: { min: 1, max: 1, tipos: ["video"] }, papeis: ["video"] };
const R720 = ["720p", "1080p"], R480 = ["480p", "720p", "1080p"];
const propT = (valores) => ({ ...prop(valores), dica: "Com imagem inicial, a proporção segue a imagem." });
const com = (via, so) => ({ ...via, so });
const VIDEO = [
  // ---- Kling (Kuaishou)
  v("kling-4-0", "Kling", "Kling 4.0", [T2V, I2V, FLF, REFV(15, ["imagem", "video"])], [res(["720p", "1080p", "4K"], "720p"), propT(["16:9", "9:16", "1:1", "21:9"]), dur(seg(3, 30), "5 s"), som(true)],
    [magC("No app aparece como Kling 4.0 1080p: 840 créditos por 3 s. Não é Unlimited.")], { conf: "ok", obs: "Até 10 quadros-chave e 15 itens de referência. Sem página de API no Magnific." }),
  v("kling-4-0-flash", "Kling", "Kling 4.0 Flash", [T2V, I2V, REFV(15)], [res(["720p"], "720p"), propT(VID), dur(seg(3, 20), "5 s")],
    [magC("Só confirmado no site da Kling. Conferir se aparece no Magnific.")], { conf: "parcial" }),
  v("kling-3-0", "Kling", "Kling 3.0 (Standard e Pro)", [T2V, I2V, FLF], [res(R720, "720p"), propT(VID), dur(seg(3, 15), "5 s"), som(true)],
    [magC("Kling 3.0 Pro 1080p: 450 créditos por 5 s. Não é Unlimited."), magM, fal()], { conf: "ok", obs: "720p = Standard, 1080p = Pro. Multi-cena até 6 cenas." }),
  v("kling-3-0-omni", "Kling", "Kling 3.0 Omni", [T2V, I2V, FLF, REFV(7), V2V], [res(["720p", "1080p", "4K"], "720p"), propT(VID), dur(seg(3, 15), "5 s"), som(true)],
    [magM, magC(), fal()], { conf: "ok", obs: "Referências citadas no prompt como @Image1. Editar vídeo mantém o áudio original." }),
  v("kling-3-0-turbo", "Kling", "Kling 3.0 Turbo", [T2V, I2V], [res(R720, "720p"), propT(VID), dur(seg(3, 15), "5 s")], [magM, magC()], { conf: "ok" }),
  v("kling-3-0-motion", "Kling", "Kling 3.0 Motion Control", [{ id: "motion", nome: "Personagem + movimento", anexos: { min: 2, max: 2, tipos: ["imagem", "video"] }, papeis: ["ref", "video"] }], [{ id: "nivel", nome: "Nível", valores: ["Standard", "Pro"], padrao: "Standard" }],
    [magM, magC()], { conf: "ok", obs: "Imagem do personagem mais vídeo de movimento. Saída de até 30 s." }),
  v("kling-o1", "Kling", "Kling O1", [FLF, REFV(7)], [propT(VID), dur(["5 s", "10 s"]), { id: "nivel", nome: "Nível", valores: ["Standard", "Pro"], padrao: "Standard" }], [magM, fal()], { conf: "ok" }),
  v("kling-2-6-pro", "Kling", "Kling 2.6 Pro", [T2V, I2V], [propT(VID), dur(["5 s", "10 s"]), som(false)], [magM, magC(), fal()], { conf: "ok", obs: "Resolução não é parâmetro (saída 1080p, a conferir)." }),
  v("kling-2-5-turbo-pro", "Kling", "Kling 2.5 Turbo Pro", [T2V, I2V, FLF], [res(R720, "720p"), propT(VID), dur(["5 s", "10 s"])],
    [com(magU("Kling 2.5 720p de 5 s é Unlimited nos planos Plus e Pro."), { res: ["720p"], dur: ["5 s"] }), magM, kie("US$ 0,315 por 5 s."), fal("US$ 0,35 por 5 s.")], { conf: "ok", obs: "Sem áudio." }),
  v("kling-2-1-master", "Kling", "Kling 2.1 Master", [T2V, I2V], [propT(VID), dur(["5 s", "10 s"])], [fal(), kie()], { conf: "ok" }),
  v("kling-2-1", "Kling", "Kling 2.1 (Standard e Pro)", [I2V, FLF], [res(R720, "720p"), dur(["5 s", "10 s"])], [fal(), kie()], { conf: "ver", obs: "Não li o schema: opções a conferir." }),
  v("kling-2-0-master", "Kling", "Kling 2.0 Master", [T2V, I2V], [propT(VID), dur(["5 s", "10 s"])], [fal()], { conf: "ver", obs: "Não li o schema: opções a conferir." }),
  v("kling-1-6", "Kling", "Kling 1.6 / Elements", [T2V, I2V, REFV(4)], [propT(VID), dur(["5 s", "10 s"]), { id: "nivel", nome: "Nível", valores: ["Standard", "Pro"], padrao: "Standard" }], [magM, fal()], { conf: "parcial", obs: "No Magnific a geração 1.6 aparece como Kling Elements (referências)." }),

  // ---- Seedance (ByteDance)
  v("seedance-2-5-pro", "Seedance", "Seedance 2.5 Pro", [T2V, I2V, FLF, REFV(30, MIX)], [res(R480, "720p"), propT(S7), dur(seg(4, 30), "5 s"), som(true)],
    [magC("720p: 1.760 créditos por 4 s. Draft 480p: 800. 1080p: 4.400."), magM], { conf: "ok", obs: "Até 30 imagens, 10 vídeos e 10 áudios de referência. Multi-cena até 6." }),
  v("seedance-2-0-pro", "Seedance", "Seedance 2.0 Pro", [T2V, I2V, FLF, REFV(15, MIX)], [res([...R480, "4K"], "720p"), propT(S7), dur(seg(4, 15), "5 s"), som(true)],
    [magC("Seedance 2 Pro 720p no app. Não é Unlimited."), magM, kie("US$ 0,205 por segundo em 720p."), fal("US$ 0,3034 por segundo em 720p.")],
    { conf: "ok", obs: "Até 9 imagens, 3 vídeos e 3 áudios de referência." }),
  v("seedance-2-0-fast", "Seedance", "Seedance 2.0 Fast", [T2V, I2V, FLF, REFV(15, MIX)], [res(["480p", "720p"], "720p"), propT(S7), dur(seg(4, 15), "5 s"), som(true)],
    [magC("720p: 940 créditos por 4 s."), magM, kie(), fal()], { conf: "ok" }),
  v("seedance-2-0-mini", "Seedance", "Seedance 2.0 Mini", [T2V, I2V, FLF, REFV(15, MIX)], [res(["480p", "720p"], "720p"), propT(S7), dur(seg(4, 15), "5 s"), som(true)], [magM, magC()], { conf: "ok" }),
  v("seedance-1-5-pro", "Seedance", "Seedance 1.5 Pro", [T2V, I2V, FLF], [res(R480, "720p"), propT(S6), dur(seg(4, 12), "5 s"), som(false)],
    [magC("Unlimited em 480p e 720p só aparece em página antiga: conferir."), fal(), kie()], { conf: "ok" }),

  // ---- Wan (Alibaba)
  v("wan-3-0", "Wan", "Wan 3.0", [T2V, I2V, FLF, REFV(20, MIX)], [res(R480, "720p"), propT(W5), dur(seg(2, 30), "5 s"), som(true)], [magM, magC()], { conf: "ok", obs: "Até 10 imagens, 5 vídeos e 5 áudios de referência." }),
  v("wan-3-0-prime", "Wan", "Wan 3.0 Prime", [T2V, I2V, FLF, REFV(20, MIX)], [res(R480, "720p"), propT(W5), dur(seg(2, 30), "5 s"), som(true)], [magM, magC()], { conf: "ok" }),
  v("wan-2-7", "Wan", "Wan 2.7", [T2V, I2V, FLF, { ...REFV(5, ["imagem", "video"]), so: { dur: seg(2, 10) } }, V2V], [res(R720, "720p"), propT(W5), dur(seg(2, 15), "5 s")], [magM, magC()], { conf: "ok", obs: "Aceita áudio de guia e continuação de vídeo." }),
  v("wan-2-6", "Wan", "Wan 2.6", [T2V, I2V], [res(R720, "720p"), propT(W5), dur(["5 s", "10 s", "15 s"])], [magM, magC(), kie()], { conf: "ok", obs: "Multi-cena por tipo de plano." }),
  v("wan-2-5", "Wan", "Wan 2.5", [T2V, I2V], [res(R480, "720p"), propT(W5), dur(["5 s", "10 s"])], [magM, kie("US$ 0,06 por segundo em 720p."), fal("US$ 0,10 por segundo em 720p.")], { conf: "ok", obs: "Proporções a conferir." }),
  v("wan-2-2", "Wan", "Wan 2.2", [I2V], [res(["480p", "580p", "720p"], "720p"), dur(["5 s", "10 s"])], [com(magC("Wan 2.2 480p seria Unlimited (não confirmado): conferir."), { res: ["480p"] }), magM], { conf: "parcial", obs: "Sem áudio." }),
  v("wan-2-1", "Wan", "Wan 2.1", [T2V, I2V, FLF], [res(["480p", "720p"], "720p"), dur(["5 s"])], [fal()], { conf: "parcial", obs: "Sem áudio." }),

  // ---- MiniMax / Hailuo
  v("minimax-h3", "MiniMax", "MiniMax H3 (Hailuo 3)", [T2V, I2V, FLF, REFV(15, MIX)], [res(["768p", "2K"], "768p"), propT(S7), dur(seg(4, 15), "5 s")], [magM, magC()], { conf: "ok", obs: "Existem também H3 Highspeed e H3 Lite no site da MiniMax (opções não lidas)." }),
  v("minimax-h3-max", "MiniMax", "MiniMax H3 Max", [T2V, I2V, FLF, REFV(12, MIX)], [res(["480p", "768p"], "768p"), propT(S6), dur(seg(5, 15), "5 s")], [magC("H3 Max Turbo 768p: 200 créditos por 5 s."), magM], { conf: "ok" }),
  v("hailuo-2-3", "MiniMax", "Hailuo 2.3", [T2V, I2V, FLF], [res(["768p", "1080p"], "768p"), dur(["6 s", "10 s"])], [com(magC("768p seria Unlimited (não confirmado): conferir."), { res: ["768p"] }), magM, fal()], { conf: "ok", obs: "Em 1080p só 6 s. Sem áudio." }),
  v("hailuo-2-3-fast", "MiniMax", "Hailuo 2.3 Fast", [I2V], [res(["768p", "1080p"], "768p"), dur(["6 s", "10 s"])], [com(magC("768p de 6 s seria Unlimited (não confirmado): conferir."), { res: ["768p"], dur: ["6 s"] }), magM, fal()], { conf: "ok" }),
  v("hailuo-02", "MiniMax", "Hailuo 02", [T2V, I2V, FLF], [res(["768p", "1080p"], "768p"), dur(["6 s", "10 s"])], [magM, fal(), kie()], { conf: "ok", obs: "Em 1080p só 6 s." }),
  v("minimax-video-01-live", "MiniMax", "Video-01 Live", [I2V], [], [magM], { conf: "ver", obs: "Só a existência confirmada." }),

  // ---- Veo (Google)
  v("veo-3-1", "Veo", "Veo 3.1 (Quality)", [T2V, I2V, FLF, { ...REFV(3), so: { dur: ["8 s"] } }], [res(["720p", "1080p", "4K"], "720p"), prop(GV), dur(["4 s", "6 s", "8 s"], "8 s"), som(true)],
    [...flow("cota", "100 créditos por vídeo (a cota grátis é 50 por dia). Sai do Flow em 05/12/2026.", { res: ["720p"] }), magC("Veo 3.1 4K com áudio: 2.080 créditos por 4 s."), magM, fal("Sai da fal em 17/11/2026.")], { conf: "ok" }),
  v("veo-3-1-fast", "Veo", "Veo 3.1 Fast", [T2V, I2V, FLF], [res(["720p", "1080p", "4K"], "720p"), prop(GV), dur(["4 s", "6 s", "8 s"], "8 s"), som(true)],
    [...flow("cota", "20 créditos por vídeo (2 por dia na cota grátis). Sai do Flow em 05/12/2026.", { res: ["720p"] }), magM, kie("US$ 0,30 por vídeo."), fal("US$ 0,80 a 1,20 por vídeo. Sai da fal em 17/11/2026.")], { conf: "ok" }),
  v("veo-3-1-lite", "Veo", "Veo 3.1 Lite", [T2V, I2V, FLF, { ...REFV(3), so: { dur: ["8 s"] } }], [res(["720p"], "720p"), prop(GV), dur(["4 s", "6 s", "8 s"], "8 s"), som(true)],
    [...flow("cota", "10 créditos por vídeo (5 por dia na cota grátis). Continua no Flow."), magM], { conf: "ok" }),
  v("veo-3", "Veo", "Veo 3", [T2V, I2V], [res(R720, "720p"), prop(GV), dur(["4 s", "6 s", "8 s"], "8 s"), som(true)], [{ prov: "aistudio", caminho: "api", custo: "pago", obs: "Pela API do Google (Vertex). Conferir se ainda está ativo." }], { conf: "parcial" }),
  v("veo-3-fast", "Veo", "Veo 3 Fast", [T2V, I2V], [res(R720, "720p"), prop(GV), dur(["4 s", "6 s", "8 s"], "8 s"), som(true)], [{ prov: "aistudio", caminho: "api", custo: "pago", obs: "Pela API do Google (Vertex). Conferir se ainda está ativo." }], { conf: "parcial" }),
  v("veo-2", "Veo", "Veo 2", [T2V, I2V], [res(["720p"], "720p"), prop(GV), dur(seg(5, 8), "5 s")], [{ prov: "aistudio", caminho: "api", custo: "pago", obs: "Pela API do Google (Vertex)." }], { conf: "parcial", obs: "Sem áudio." }),

  // ---- Omni Flash (Google, o "Omniflash")
  v("omni-flash-1-2", "Omni Flash", "Omni Flash 1.2", [T2V, I2V, FLF, REFV(6), V2V], [res(["360p", "720p", "1080p", "4K"], "720p"), prop(GV), dur(seg(3, 15), "5 s"), som(true)],
    [...flow("cota", "720p: 3 créditos por segundo; 360p: 1 por segundo. Sem assinatura, até 10 s.", { res: ["360p", "720p"] }), com(magC("Gemini Omni 1.2 Flash 720p: 420 créditos por 3 s."), { res: ["720p"] }), { prov: "aistudio", caminho: "api", custo: "pago" }],
    { conf: "ok", obs: "Nome oficial: Gemini Omni 1.2 Flash. Edita vídeo por conversa e estende em blocos de 3 a 10 s." }),
  v("omni-flash-1-1", "Omni Flash", "Omni Flash 1.1", [T2V, I2V, FLF, REFV(6), V2V], [res(["360p", "720p"], "720p"), prop(GV), dur(["4 s", "6 s", "8 s", "10 s"], "4 s")],
    [...flow("cota", "720p: 7, 10, 12 ou 15 créditos (4, 6, 8 ou 10 s). Sai do Flow em 05/12/2026."), magC("Gemini Omni 1.1: 720 créditos por 3 s.")], { conf: "ok", obs: "Vira a 1.2 em 03/12/2026." }),

  // ---- Grok Imagine (xAI)
  v("grok-imagine-video-1-5", "Grok Imagine", "Grok Imagine Video 1.5", [T2V, I2V, FLF, { ...REFV(7, ["imagem", "audio"]), so: { res: ["480p", "720p"] } }], [res(R480, "720p"), propT(G9), dur(seg(1, 15), "8 s"), som(true)],
    [{ prov: "grok", caminho: "chrome", custo: "cota", obs: "Pelo site usa a cota da conta. Opções do site a conferir." }, { prov: "grok", caminho: "api", custo: "pago", obs: "US$ 0,08 por segundo." }, fal()], { conf: "ok", obs: "Áudio com sincronia labial. Até 4 quadros-chave." }),
  v("grok-imagine-video-1-5-lite", "Grok Imagine", "Grok Imagine Video 1.5 Lite", [T2V, I2V], [res(R480, "720p"), propT(G9), dur(seg(1, 15), "8 s"), som(true)],
    [{ prov: "grok", caminho: "api", custo: "pago", obs: "US$ 0,02 por segundo." }], { conf: "ok" }),
  v("grok-imagine-video", "Grok Imagine", "Grok Imagine Video", [T2V, I2V, { ...REFV(14), so: { dur: seg(1, 10) } }, V2V], [res(["480p", "720p"], "720p"), propT(G9), dur(seg(1, 15), "8 s")],
    [{ prov: "grok", caminho: "chrome", custo: "cota", obs: "Pelo site usa a cota da conta. Opções do site a conferir." }, { prov: "grok", caminho: "api", custo: "pago", obs: "US$ 0,05 por segundo." }], { conf: "ok", obs: "Editar vídeo: entrada de até 8,7 s." }),
];

// ================= IMAGEM =================
const NB14 = ["1:1", "9:16", "16:9", "4:5", "5:4", "3:4", "4:3", "2:3", "3:2", "21:9", "1:4", "4:1", "1:8", "8:1"];
const NB10 = NB14.slice(0, 10);
const IMAGEM = [
  img("seedream-3", "Seedream", "Seedream 3.0", [T2I], [prop(P7), qtd(4)], [fal("US$ por imagem; sem referência.")], { conf: "ok" }),
  img("seedream-4", "Seedream", "Seedream 4.0", [T2I, EDIT(10)], [res(["2K", "4K"], "2K"), prop(P7), qtd(4)], [magC(), magM, kie("US$ 0,025 por imagem."), fal("US$ 0,03 por imagem.")], { conf: "ok" }),
  img("seedream-4-5", "Seedream", "Seedream 4.5", [T2I, EDIT(10)], [res(["2K", "4K"], "2K"), prop(P8), qtd(4)], [magC(), magM, kie("US$ 0,0325 por imagem."), fal("US$ 0,04 por imagem.")], { conf: "ok", obs: "Na API do Magnific a saída é fixa em cerca de 4 MP." }),
  img("seedream-5-lite", "Seedream", "Seedream 5.0 Lite", [T2I, EDIT(10)], [res(["2K", "4K"], "2K"), prop(P8), qtd(4)], [magC(), kie(), fal()], { conf: "parcial" }),
  img("seedream-5-flash", "Seedream", "Seedream 5.0 Flash", [EDIT(10)], [res(["1K", "2K"], "2K"), prop(P8), qtd(4)], [fal(), kie()], { conf: "ok", obs: "Só edição com referência." }),
  img("seedream-5-pro", "Seedream", "Seedream 5.0 Pro", [T2I, EDIT(10)], [res(["1.5K", "2K"], "2K"), prop(P8), { id: "pensar", nome: "Raciocínio", valores: ["rápido", "alto"], padrao: "rápido" }, qtd(4)], [magC("Seedream 5 Pro 2K: conferir se entra no Unlimited."), magM, kie(), fal()], { conf: "ok", obs: "Sem 4K na API do Magnific." }),
  img("nano-banana-2", "Nano Banana", "Nano Banana 2", [T2I, EDIT(14)], [res(["1K", "2K", "4K"], "1K"), prop(NB14), qtd(4)],
    [magU("Unlimited em 1K (regra da casa: gerar em 1K)."), magM, ...flow("gratis", "Zero créditos no Flow. Resoluções do Flow a conferir."), { prov: "aistudio", caminho: "api", custo: "pago", obs: "Cerca de US$ 0,067 (1K) a 0,151 (4K) por imagem." }, kie("A partir de US$ 0,04 por imagem."), fal("US$ 0,08 por imagem.")],
    { conf: "ok", obs: "Até 10 objetos e 4 personagens de referência." }),
  img("nano-banana-2-1", "Nano Banana", "Nano Banana 2.1", [T2I, EDIT(14)], [res(["1K", "2K", "4K"], "1K"), prop(NB14), qtd(4)], [{ prov: "aistudio", caminho: "api", custo: "pago" }, { prov: "aistudio", caminho: "chrome", custo: "pago", obs: "Imagem não tem camada grátis no AI Studio." }], { conf: "ok", obs: "Versão mais nova; não pedida, listada para comparação." }),
  img("nano-banana-pro", "Nano Banana", "Nano Banana Pro", [T2I, EDIT(14)], [res(["1K", "2K", "4K"], "1K"), prop(NB10), qtd(4)],
    [magC("Aparece como Unlimited em alguns planos: conferir."), magM, { prov: "aistudio", caminho: "api", custo: "pago" }, kie("A partir de US$ 0,09 por imagem."), fal("US$ 0,15 por imagem.")],
    { conf: "ok", obs: "Até 14 referências (5 com alta fidelidade)." }),
  img("chatgpt-imagem", "ChatGPT", "ChatGPT Imagem", [T2I, EDIT(4)], [prop(["1:1", "3:2", "2:3", "16:9", "9:16", "3:1", "1:3"], "1:1"), { id: "fundo", nome: "Fundo", valores: ["automático", "transparente", "opaco"], padrao: "automático" }],
    [{ prov: "chatgpt", caminho: "chrome", custo: "cota", obs: "Proporção vai no prompt ou no seletor do ChatGPT. Cota e nº de referências a conferir." }],
    { conf: "parcial", obs: "Modelo atual do app: ChatGPT Images 2.5 (GPT-Image-2.5)." }),
];

// ================= ÁUDIO =================
const el = (padrao) => ({ id: "motor", nome: "Modelo ElevenLabs", valores: ["v3", "Multilingual v2", "Turbo v2.5"], padrao });
const vozEl = { id: "voz", nome: "Voz", tipo: "voz", fonte: "elevenlabs" };
const faixa = (id, nome, min, max, passo, padrao, dica) => ({ id, nome, tipo: "faixa", min, max, passo, padrao, dica });
const AUDIO_IN = (id, nome, tipos, papeis, n = 1) => ({ id, nome, anexos: { min: 1, max: n, tipos }, papeis });
const TXT = (id, nome, rotuloPrompt) => ({ id, nome, rotuloPrompt, anexos: { min: 0, max: 0 } });
const magA = (obs = "Conferir o custo em créditos na tela do Magnific.") => [{ prov: "magnific", caminho: "chrome", custo: "creditos", obs }, magM];
const AUDIO = [
  aud("eleven-tts", "ElevenLabs", "tts", "ElevenLabs (Magnific)", [TXT("tts", "Fala", "Texto a ser falado")],
    [el("v3"), vozEl, faixa("estab", "Estabilidade", 0, 1, 0.05, 0.5), faixa("simil", "Similaridade", 0, 1, 0.05, 0.75), faixa("veloc", "Velocidade", 0.7, 1.2, 0.05, 1), { id: "boost", nome: "Speaker boost", tipo: "bool", rotulo: "Realce de locutor", padrao: true }],
    magA("Até 40.000 caracteres na API. Modelos da interface (v2, v3) a conferir."), { conf: "parcial" }),
  aud("eleven-clone", "ElevenLabs", "clone", "Clonar voz (Magnific)", [{ id: "clone", nome: "Amostras", rotuloPrompt: "Nome da nova voz", anexos: { min: 1, max: 5, tipos: ["audio"] }, papeis: ["voz"] }],
    [{ id: "ruido", nome: "Ruído", tipo: "bool", rotulo: "Remover ruído das amostras", padrao: true }], magA("Duração e tamanho das amostras a conferir. Só clonar voz do Anderson ou com autorização."), { conf: "ver" }),
  aud("eleven-troca", "ElevenLabs", "troca", "Trocar voz (Magnific)", [{ ...AUDIO_IN("troca", "Áudio base", ["audio", "video"], ["audio"]), prompt: false }],
    [vozEl, faixa("estab", "Estabilidade", 0, 1, 0.05, 0.5), faixa("simil", "Similaridade", 0, 1, 0.05, 0.75)], magA("Limites do Voice Changer a conferir."), { conf: "ver" }),
  aud("eleven-sfx", "ElevenLabs", "sfx", "Efeito sonoro (Magnific)", [TXT("sfx", "Efeito", "Descreva o som")],
    [faixa("dur", "Duração (s)", 0.5, 22, 0.5, 5), faixa("influ", "Fidelidade ao prompt", 0, 1, 0.05, 0.3), { id: "loop", nome: "Loop", tipo: "bool", rotulo: "Som em loop", padrao: false }],
    magA("Cerca de 19 créditos por efeito. Texto até 2.500 caracteres."), { conf: "ok" }),
  aud("eleven-musica", "ElevenLabs", "musica", "ElevenLabs Music (Magnific)", [TXT("musica", "Música", "Descreva a música")],
    [dur(["30 s", "1 min", "2 min", "3 min"], "30 s"), { id: "instr", nome: "Instrumental", tipo: "bool", rotulo: "Só instrumental", padrao: true }],
    magA("Cerca de 550 créditos por música. Durações a conferir na interface."), { conf: "ver" }),
  aud("lyria-magnific", "ElevenLabs", "musica", "Google Lyria (Magnific)", [TXT("musica", "Música", "Descreva a música")], [dur(["30 s"], "30 s")], magA("Listado junto do ElevenLabs Music no Magnific. Opções a conferir."), { conf: "ver", familiaReal: "Google" }),
  aud("mag-isolar", "ElevenLabs", "isolar", "Isolar voz (Magnific)", [{ ...AUDIO_IN("isolar", "Arquivo", ["audio", "video"], ["audio"]), rotuloPrompt: "O que isolar (ex.: voz do locutor)" }],
    [faixa("cand", "Candidatos", 1, 8, 1, 1, "Mais candidatos melhora a separação e demora mais.")], magA("No Magnific a ferramenta usa SAM Audio, não ElevenLabs. Saída em WAV."), { conf: "ok" }),

  aud("gemini-tts-38-flash", "Google AI", "tts", "Gemini 3.8 Flash TTS", [TXT("tts", "Fala", "Texto a ser falado")],
    [{ id: "voz", nome: "Voz", tipo: "voz", fonte: "google" }, { id: "voz2", nome: "Segundo locutor", tipo: "voz", fonte: "google-opc" }, { id: "estilo", nome: "Estilo", tipo: "texto", dica: "Ex.: animado, ritmo rápido, tom de locutor de rádio" }],
    [{ prov: "aistudio", caminho: "chrome", custo: "gratis", obs: "Grátis no AI Studio (os dados podem ser usados pelo Google)." }, { prov: "aistudio", caminho: "api", custo: "gratis", obs: "Camada grátis da API; chave fica no Keychain." }], { conf: "ok", obs: "Até 2 locutores por pedido. Mais de 130 idiomas." }),
  aud("gemini-tts-38-flash-lite", "Google AI", "tts", "Gemini 3.8 Flash Lite TTS", [TXT("tts", "Fala", "Texto a ser falado")],
    [{ id: "voz", nome: "Voz", tipo: "voz", fonte: "google" }, { id: "estilo", nome: "Estilo", tipo: "texto", dica: "Ex.: calmo, pausado" }],
    [{ prov: "aistudio", caminho: "chrome", custo: "gratis" }, { prov: "aistudio", caminho: "api", custo: "gratis" }], { conf: "ok" }),
  aud("gemini-tts-25-pro", "Google AI", "tts", "Gemini 2.5 Pro TTS", [TXT("tts", "Fala", "Texto a ser falado")],
    [{ id: "voz", nome: "Voz", tipo: "voz", fonte: "google" }, { id: "estilo", nome: "Estilo", tipo: "texto", dica: "Ex.: narrador de documentário" }],
    [{ prov: "aistudio", caminho: "api", custo: "pago", obs: "Só no nível pago." }, { prov: "magnific", caminho: "chrome", custo: "creditos", obs: "Aparece no Voice Generator do Magnific: conferir." }], { conf: "parcial" }),
  aud("lyria-3-clip", "Google AI", "musica", "Lyria 3 Clip", [TXT("musica", "Música", "Descreva a música")], [dur(["30 s"], "30 s")],
    [{ prov: "aistudio", caminho: "api", custo: "pago", obs: "US$ 0,04 por clipe de 30 s." }, { prov: "aistudio", caminho: "chrome", custo: "pago" }], { conf: "ok" }),
  aud("lyria-3-5", "Google AI", "musica", "Lyria 3.5", [TXT("musica", "Música", "Descreva a música (letra com [Verse] e [Chorus] se quiser)"), { id: "ref", nome: "Com imagens", rotuloPrompt: "Descreva a música", anexos: { min: 1, max: 10, tipos: ["imagem"] }, papeis: ["ref"] }],
    [{ id: "formato", nome: "Formato", valores: ["MP3", "WAV"], padrao: "MP3" }, { id: "instr", nome: "Instrumental", tipo: "bool", rotulo: "Só instrumental", padrao: true }],
    [{ prov: "aistudio", caminho: "api", custo: "pago", obs: "US$ 0,08 por música. Duração é controlada pelo prompt (cerca de 2 min)." }, { prov: "aistudio", caminho: "chrome", custo: "pago" }], { conf: "ok" }),

  aud("seed-audio-1", "Seed Audio", "tts", "Seed Audio 1.0", [TXT("tts", "Fala e ambiente", "Texto e descrição do som"), { id: "ref", nome: "Com voz de referência", rotuloPrompt: "Texto a ser falado", anexos: { min: 1, max: 3, tipos: ["audio"] }, papeis: ["voz"] }],
    [{ id: "formato", nome: "Formato", valores: ["mp3", "wav"], padrao: "mp3" }, faixa("veloc", "Velocidade", 0.5, 2, 0.1, 1), faixa("tom", "Tom (semitons)", -12, 12, 1, 0), { id: "multi", nome: "Multilíngue", tipo: "bool", rotulo: "Modo multilíngue (ligar para português)", padrao: true }],
    [fal("US$ 0,1875 por minuto. Até 2 min por geração; referências de até 30 s."), { prov: "kie", caminho: "api", custo: "pago", obs: "Disponibilidade na Kie a conferir." }], { conf: "ok", obs: "ByteDance Seed. Fala, efeitos e ambiente numa passada. Não achei no Magnific." }),
  aud("seed-audio-1-sfx", "Seed Audio", "sfx", "Seed Audio 1.0", [TXT("sfx", "Efeito", "Descreva o som ou o ambiente")],
    [{ id: "formato", nome: "Formato", valores: ["mp3", "wav"], padrao: "mp3" }], [fal("US$ 0,1875 por minuto.")], { conf: "ok" }),
];

// ---- Real Oficial (lista lida do conector em 2026-11-11; vídeo só em 16:9 e 9:16)
const ro = (obs, so) => ({ prov: "realoficial", caminho: "mcp", custo: "creditos", obs, ...(so ? { so } : {}) });
const roChrome = (obs) => ({ prov: "realoficial", caminho: "chrome", custo: "creditos", obs });
const RO9 = ["1:1", "16:9", "9:16", "4:5", "5:4", "4:3", "3:4", "3:2", "2:3"];
const RO_VIAS = {
  "seedance-2-0-mini": ["6 a 13 créditos por segundo.", ["480p", "720p"]], "seedance-2-0-fast": ["12 a 25 créditos por segundo.", ["480p", "720p"]],
  "seedance-2-0-pro": ["29 a 61 créditos por segundo.", ["480p", "720p"]], "seedance-2-5-pro": ["43 a 94 créditos por segundo.", ["480p", "720p"]],
  "kling-3-0": ["43 créditos por segundo (63 com áudio).", ["720p"]],
  "kling-3-0-omni": ["43 a 57 créditos por segundo. Sem imagem inicial, até 7 referências.", ["720p"]], "kling-4-0": ["63 créditos por segundo em 720p.", ["720p"]],
  "wan-3-0": ["26 a 51 créditos por segundo.", ["480p", "720p"]], "wan-2-2": ["20 créditos por segundo. Só 5 s em 16:9.", ["720p"], ["5 s"]],
  "minimax-h3": ["22 créditos por segundo.", ["768p"], ["5 s", "10 s"]], "veo-3-1-fast": ["63 créditos por segundo. Áudio sempre ligado, sem imagem inicial.", ["720p"], ["4 s", "8 s"]],
  "grok-imagine-video": ["44 créditos por segundo. Sem imagem inicial.", ["720p"]],
};
for (const m of VIDEO) { const r = RO_VIAS[m.id]; if (r) m.via.push(ro(r[0], { res: r[1], prop: GV, ...(r[2] ? { dur: r[2] } : {}) })); }
IMAGEM.find((m) => m.id === "nano-banana-2").via.push(ro("32 créditos por imagem.", { res: ["1K"], prop: RO9 }));
VIDEO.push(
  v("ro-minimax-h3-ultra", "MiniMax", "MiniMax Real H3 Ultra", [T2V, I2V, REFV(9, ["imagem", "video"])], [res(["768p"], "768p"), prop(["9:16", "16:9"]), dur(["5 s", "10 s"])],
    [ro("Incluso no plano (50 vídeos por mês). Fora da cota: 3 créditos por segundo.")], { conf: "ok", obs: "Modelo padrão do Vídeo com IA da Real Oficial. Até 9 imagens e 3 vídeos de referência." }),
  v("ro-xablau", "Real Oficial", "XABLAU (trocar personagem, cenário ou objeto)", [{ id: "troca", nome: "Trocar no vídeo", anexos: { min: 1, max: 4, tipos: ["imagem", "video"] }, papeis: ["video", "ref"] }],
    [{ id: "alvo", nome: "Trocar", valores: ["personagem", "cenário", "objeto"] }], [roChrome("Não aparece no conector: só pelo site. Custo a conferir na tela.")], { conf: "ver", obs: "Opções e limites a levantar na tela do XABLAU." }),
  v("ro-fantasia", "Real Oficial", "Real Fantasia", [T2V], [], [ro("Custo a conferir antes de gerar.")], { conf: "ver", obs: "História em quadros com narração (ferramentas ro_fantasia). Estilos e vozes a levantar." }),
);
IMAGEM.push(
  img("ro-gpt-image-2", "ChatGPT", "GPT Image 2 (Real Oficial)", [T2I, EDIT(4)], [prop(RO9), { id: "nivel", nome: "Qualidade", valores: ["padrão", "econômica"] }, qtd(4)],
    [ro("Incluso no plano (50 imagens por mês). Fora da cota: 5 créditos (econômica 3).")], { conf: "ok" }),
  img("ro-gpt-image-2-5", "ChatGPT", "GPT Image 2.5 (Real Oficial)", [T2I, EDIT(4)], [{ id: "variante", nome: "Variante", valores: ["Flare", "Sunburst"] }, prop(RO9), qtd(4)],
    [ro("Incluso no plano (50 imagens por mês). Fora da cota: 5 créditos.")], { conf: "ok", obs: "A 2.6 (Flare e Sunburst) custa 14 créditos e não está no plano." }),
  img("ro-minimax-h3-image", "MiniMax", "MiniMax H3 Image", [T2I, EDIT(8)], [res(["2K", "4K"], "2K"), prop(RO9), qtd(4)], [ro("8 créditos por imagem.")], { conf: "ok" }),
);
AUDIO.push(aud("ro-voz", "Real Oficial", "tts", "Voz e áudio (Real Oficial)", [TXT("tts", "Fala", "Texto a ser falado")], [], [roChrome("Só pelo site. Vozes e custo a levantar na tela.")], { conf: "ver" }));

// ---- Kinovi (API paga; preços do site em 2026-11-17). Pelo painel: vídeo só em 480p e 720p.
const kin = (obs, so) => ({ prov: "kinovi", caminho: "api", custo: "pago", obs, so });
const K5 = ["1:1", "4:3", "3:4", "16:9", "9:16"];
const KIN_VIDEO = { "seedance-2-0-mini": "US$ 0,021 por segundo em 480p, US$ 0,057 em 720p.", "seedance-2-0-fast": "US$ 0,050 por segundo em 480p, US$ 0,099 em 720p.", "seedance-2-0-pro": "US$ 0,071 por segundo em 480p, US$ 0,188 em 720p.",
  "seedance-2-5-pro": "26 créditos por segundo em 480p (US$ 0,12), 59 em 720p (US$ 0,27). Com vídeo de referência: 16 e 35 por segundo, contando entrada e saída." };
for (const m of VIDEO) if (KIN_VIDEO[m.id]) m.via.push(kin(KIN_VIDEO[m.id] + (m.id === "seedance-2-5-pro" ? "" : " Com vídeo de referência custa cerca de 20% a mais."), { res: ["480p", "720p"], prop: S6 }));
IMAGEM.find((m) => m.id === "nano-banana-2").via.push(kin("US$ 0,071 por imagem em 2K, US$ 0,118 em 4K.", { res: ["2K", "4K"], prop: K5, qtd: ["1"] }));
IMAGEM.push(img("gpt-image-2-kinovi", "ChatGPT", "GPT Image 2 (Kinovi)", [T2I, EDIT(10)],
  [res(["1K", "2K", "4K"], "1K"), prop(K5), { id: "nivel", nome: "Qualidade", valores: ["low", "medium", "high"], padrao: "low" }],
  [kin("Low 1K: US$ 0,01 por imagem. Medium 1K: US$ 0,06. High 1K: US$ 0,22.")], { conf: "ok" }));

export const MODELOS = [...VIDEO, ...IMAGEM, ...AUDIO];
// conexões que já executam de verdade (o ajudante do Mac confirma a lista em /ping)
export const LIGADAS = ["magnific:chrome", "kinovi:api"];

// Vozes. As do ElevenLabs/Magnific (incluindo as clonadas do Anderson) entram aqui depois da leitura
// de audio_voices_list (só leitura, com permissão dele); por enquanto só marcadores.
const GOOGLE = "Zephyr:brilhante,Puck:animada,Charon:informativa,Kore:firme,Fenrir:empolgada,Leda:jovem,Orus:firme,Aoede:leve,Callirrhoe:tranquila,Autonoe:brilhante,Enceladus:soprosa,Iapetus:clara,Umbriel:tranquila,Algieba:suave,Despina:suave,Erinome:clara,Algenib:rouca,Rasalgethi:informativa,Laomedeia:animada,Achernar:macia,Alnilam:firme,Schedar:uniforme,Gacrux:madura,Pulcherrima:direta,Achird:amigável,Zubenelgenubi:casual,Vindemiatrix:gentil,Sadachbia:viva,Sadaltager:sábia,Sulafat:calorosa"
  .split(",").map((x) => { const [nome, desc] = x.split(":"); return { id: nome, nome, desc }; });
export const VOZES = [
  { fonte: "elevenlabs", grupo: "Minhas vozes (Magnific)", vozes: [{ id: "183468", nome: "Anderson Brito", desc: "clonada, PT-BR" }] },
  { fonte: "google", grupo: "Vozes do Gemini", vozes: GOOGLE },
  { fonte: "google-opc", grupo: "Sem segundo locutor", vozes: [{ id: "", nome: "Nenhum" }] },
  { fonte: "google-opc", grupo: "Vozes do Gemini", vozes: GOOGLE },
];
