import { describe, it, expect } from "vitest";
import {
  tipoDoArquivo, proximoApelido, mencaoNoCursor, aplicarMencao, mencoes, mencoesSoltas, conexoes, opcoesDe, valoresIniciais,
  avisosDeGasto, alturaDe, validar, nomePadrao, fmtTamanho, filtrar, ordenar,
} from "../../js/gerador-core.js";
import { PROVEDORES, MODELOS, FERRAMENTAS_AUDIO, VOZES } from "../../js/gerador-data.js";

describe("GeradoR_: anexos e menção @", () => {
  it("reconhece o tipo do arquivo por MIME ou extensão", () => {
    expect(tipoDoArquivo("a.PNG", "")).toBe("imagem");
    expect(tipoDoArquivo("x", "video/mp4")).toBe("video");
    expect(tipoDoArquivo("voz.m4a", "")).toBe("audio");
    expect(tipoDoArquivo("doc.pdf", "application/pdf")).toBe("arquivo");
  });
  it("numera apelidos por tipo sem repetir depois de remover", () => {
    const an = [{ tipo: "imagem", apelido: "imagem1" }, { tipo: "imagem", apelido: "imagem3" }, { tipo: "video", apelido: "video1" }];
    expect(proximoApelido(an, "imagem")).toBe("imagem4");
    expect(proximoApelido(an, "audio")).toBe("audio1");
  });
  it("detecta a menção em digitação só quando o @ começa palavra", () => {
    expect(mencaoNoCursor("usar @ima", 9)).toEqual({ inicio: 5, termo: "ima" });
    expect(mencaoNoCursor("@", 1)).toEqual({ inicio: 0, termo: "" });
    expect(mencaoNoCursor("email@dominio", 13)).toBeNull();
    expect(mencaoNoCursor("usar @imagem1 aqui", 18)).toBeNull();
  });
  it("completa a menção no lugar do cursor", () => {
    expect(aplicarMencao("usar @im no fundo", 8, "imagem1")).toEqual({ texto: "usar @imagem1 no fundo", cursor: 13 });
    expect(aplicarMencao("fundo ", 6, "video1")).toEqual({ texto: "fundo @video1 ", cursor: 14 });
  });
  it("lista menções e aponta as que não têm anexo", () => {
    const t = "@imagem1 andando, estilo de @imagem2. Contato: a@b.com (@imagem1)";
    expect(mencoes(t)).toEqual(["imagem1", "imagem2"]);
    expect(mencoesSoltas(t, [{ apelido: "imagem1" }])).toEqual(["imagem2"]);
  });
});

describe("GeradoR_: opções, gasto e validação", () => {
  const modelo = {
    id: "m", nome: "Modelo", modos: [{ id: "t2v", nome: "Texto", anexos: { min: 0, max: 0 } }, { id: "i2v", nome: "Imagem", anexos: { min: 1, max: 2, tipos: ["imagem"] }, so: { dur: ["5 s"] } }],
    opcoes: [{ id: "res", nome: "Resolução", valores: ["480p", "720p", "1080p"], padrao: "720p" }, { id: "dur", nome: "Duração", valores: ["5 s", "10 s"] }, { id: "som", nome: "Áudio", tipo: "bool", modos: ["t2v"] }],
    via: [{ prov: "a", caminho: "chrome", custo: "unlimited", so: { res: ["480p", "720p"] } }, { prov: "b", caminho: "api", custo: "pago" }],
  };
  const provs = [{ id: "a", nome: "A", conta: "contato" }, { id: "b", nome: "B" }];
  it("monta as conexões com rótulo", () => {
    const c = conexoes(modelo, provs);
    expect(c.map((x) => x.rotulo)).toEqual(["A (contato) · Claude no Chrome", "B · API"]);
  });
  it("a conexão e o modo restringem os valores; opção de outro modo some", () => {
    const [a, b] = conexoes(modelo, provs);
    expect(opcoesDe(modelo, "t2v", a).find((o) => o.id === "res").valores).toEqual(["480p", "720p"]);
    expect(opcoesDe(modelo, "t2v", b).find((o) => o.id === "res").valores).toEqual(["480p", "720p", "1080p"]);
    const i2v = opcoesDe(modelo, "i2v", b);
    expect(i2v.find((o) => o.id === "dur").valores).toEqual(["5 s"]);
    expect(i2v.some((o) => o.id === "som")).toBe(false);
  });
  it("valores iniciais usam o padrão e mantêm a escolha ainda válida", () => {
    const ops = opcoesDe(modelo, "t2v", conexoes(modelo, provs)[0]);
    expect(valoresIniciais(ops)).toEqual({ res: "720p", dur: "5 s", som: false });
    expect(valoresIniciais(ops, { res: "1080p", dur: "10 s", som: true })).toEqual({ res: "720p", dur: "10 s", som: true });
  });
  it("pede confirmação para crédito, cobrança e vídeo acima de 720p", () => {
    expect(alturaDe("1080p")).toBe(1080); expect(alturaDe("4K")).toBe(2160); expect(alturaDe("1K")).toBe(0);
    expect(avisosDeGasto("video", { custo: "unlimited" }, { res: "720p" })).toEqual([]);
    expect(avisosDeGasto("video", { custo: "unlimited" }, { res: "1080p" })).toEqual(["acima de 720p"]);
    expect(avisosDeGasto("video", { custo: "pago" }, { res: "1080p" })).toEqual(["cobra por uso", "acima de 720p"]);
    expect(avisosDeGasto("imagem", { custo: "creditos" }, { res: "4K" })).toEqual(["gasta créditos"]);
  });
  it("valida prompt, anexos do modo e menções", () => {
    const via = { prov: "a" }, img = { tipo: "imagem", apelido: "imagem1" };
    expect(validar({ modelo: null })).toEqual(["Escolha um modelo."]);
    expect(validar({ modelo, modo: "t2v", via, prompt: " ", anexos: [] })).toEqual(["Escreva o prompt."]);
    expect(validar({ modelo, modo: "t2v", via, prompt: "ok", anexos: [img] })).toEqual(["Este modo não aceita anexos."]);
    expect(validar({ modelo, modo: "i2v", via, prompt: "ok", anexos: [] })[0]).toMatch(/precisa de 1 anexo/);
    expect(validar({ modelo, modo: "i2v", via, prompt: "anima @imagem1 e @imagem2", anexos: [img] })).toEqual(["Menção sem anexo: @imagem2."]);
    expect(validar({ modelo, modo: "i2v", via, prompt: "anima @imagem1", anexos: [img] })).toEqual([]);
  });
  it("nome padrão tira as menções e corta", () => {
    expect(nomePadrao("@imagem1 andando na praia ao pôr do sol com chuva forte", {})).toBe("andando na praia ao pôr do sol");
    expect(nomePadrao("", { nome: "Kling" })).toBe("Kling");
  });
});

describe("GeradoR_: galeria", () => {
  const rows = [
    { nome: "Beta", prompt: "praia", tipo: "video", provedor: "magnific", modelo: "k", modelo_nome: "Kling", status: "pronto", tamanho_bytes: 9e6, created_at: "2026-11-10T15:00:00Z" },
    { nome: "alfa", prompt: "retrato", tipo: "imagem", provedor: "chatgpt", modelo: "g", modelo_nome: "ChatGPT", status: "pronto", tamanho_bytes: 5e5, created_at: "2026-11-11T02:30:00Z" },
    { nome: "Gama", prompt: "voz", tipo: "audio", provedor: "magnific", modelo: "e", modelo_nome: "ElevenLabs", status: "erro", tamanho_bytes: null, created_at: "2026-11-08T12:00:00Z" },
  ];
  it("filtra por tipo, ferramenta, status, texto, tamanho e data (fuso de SP)", () => {
    expect(filtrar(rows, { tipo: "video" }).map((r) => r.nome)).toEqual(["Beta"]);
    expect(filtrar(rows, { provedor: "magnific", status: "erro" }).map((r) => r.nome)).toEqual(["Gama"]);
    expect(filtrar(rows, { q: "RETRATO" }).map((r) => r.nome)).toEqual(["alfa"]);
    expect(filtrar(rows, { tamMin: 1 }).map((r) => r.nome)).toEqual(["Beta"]);
    // 02:30 UTC do dia 11 ainda é dia 10 em São Paulo
    expect(filtrar(rows, { de: "2026-11-10", ate: "2026-11-10" }).map((r) => r.nome)).toEqual(["Beta", "alfa"]);
  });
  it("ordena por data, nome e tamanho", () => {
    expect(ordenar(rows, "recente").map((r) => r.nome)).toEqual(["alfa", "Beta", "Gama"]);
    expect(ordenar(rows, "nome").map((r) => r.nome)).toEqual(["alfa", "Beta", "Gama"]);
    expect(ordenar(rows, "maior").map((r) => r.nome)[0]).toBe("Beta");
    expect(fmtTamanho(9e6)).toBe("8,6 MB");
  });
});

describe("GeradoR_: catálogo de modelos", () => {
  const ids = PROVEDORES.map((p) => p.id);
  it("ids únicos e todo modelo com modo, conexão válida e opções coerentes", () => {
    expect(new Set(MODELOS.map((m) => m.id)).size).toBe(MODELOS.length);
    for (const m of MODELOS) {
      expect(["video", "imagem", "audio"], m.id).toContain(m.tipo);
      expect(m.modos.length, m.id).toBeGreaterThan(0);
      expect(m.via.length, m.id).toBeGreaterThan(0);
      for (const v of m.via) { expect(ids, `${m.id} via ${v.prov}`).toContain(v.prov); expect(["api", "mcp", "chrome"], m.id).toContain(v.caminho); expect(PROVEDORES.find((p) => p.id === v.prov).caminhos, `${m.id} ${v.prov}`).toContain(v.caminho); }
      for (const o of m.opcoes || []) {
        if (o.valores) { expect(o.valores.length, `${m.id}.${o.id}`).toBeGreaterThan(0); if (o.padrao != null) expect(o.valores, `${m.id}.${o.id}`).toContain(o.padrao); }
        if (o.tipo === "voz") expect(VOZES.some((g) => g.fonte === o.fonte), `${m.id} voz`).toBe(true);
      }
      if (m.tipo === "audio") expect(FERRAMENTAS_AUDIO.map(([k]) => k), m.id).toContain(m.ferramenta);
      // toda combinação modo x conexão resolve em valores iniciais válidos
      for (const md of m.modos) for (const v of conexoes(m, PROVEDORES)) { const ops = opcoesDe(m, md.id, v), val = valoresIniciais(ops); for (const o of ops) if (o.valores) expect(o.valores).toContain(val[o.id]); }
    }
  });
  it("vídeo nunca abre acima de 720p por padrão", () => {
    for (const m of MODELOS.filter((x) => x.tipo === "video")) for (const md of m.modos) for (const v of conexoes(m, PROVEDORES)) {
      const val = valoresIniciais(opcoesDe(m, md.id, v));
      expect(alturaDe(val.res), `${m.id} ${md.id} ${v.prov}`).toBeLessThanOrEqual(768);
    }
  });
  it("cobre as famílias e ferramentas pedidas", () => {
    const fam = (t) => new Set(MODELOS.filter((m) => m.tipo === t).map((m) => m.familia));
    for (const f of ["Kling", "Seedance", "Wan", "MiniMax", "Veo", "Omni Flash", "Grok Imagine"]) expect([...fam("video")], f).toContain(f);
    for (const f of ["Seedream", "Nano Banana", "ChatGPT"]) expect([...fam("imagem")], f).toContain(f);
    for (const f of ["ElevenLabs", "Google AI", "Seed Audio"]) expect([...fam("audio")], f).toContain(f);
    const fer = new Set(MODELOS.filter((m) => m.tipo === "audio" && m.familia === "ElevenLabs").map((m) => m.ferramenta));
    for (const k of ["tts", "clone", "troca", "sfx", "musica", "isolar"]) expect([...fer], k).toContain(k);
  });
});

describe("Execução: conexões ligadas e retorno do ajudante", () => {
  it("só Magnific pelo Chrome e Kinovi pela API executam; provedores sem plano ficam marcados", async () => {
    const { LIGADAS } = await import("../../js/gerador-data.js");
    expect(LIGADAS).toEqual(["magnific:chrome", "kinovi:api"]);
    for (const id of ["kie", "fal"]) expect(PROVEDORES.find((p) => p.id === id).estado).toBe("depois");
    expect(PROVEDORES.find((p) => p.id === "realoficial").estado).toBeUndefined();
    expect(JSON.stringify(VOZES)).not.toMatch(/WooB/i);
  });
  it("transforma o estado do job em atualização da linha", async () => {
    const { patchDoJob, chaveDe } = await import("../../js/gerador-exec.js");
    const row = { id: "abc12345", status: "fila" }, agora = "2026-11-11T12:00:00.000Z";
    expect(chaveDe({ provedor: "magnific", caminho: "chrome" })).toBe("magnific:chrome");
    expect(patchDoJob(row, { status: "fila" }, agora)).toBeNull();
    expect(patchDoJob(row, { status: "gerando" }, agora).status).toBe("gerando");
    expect(patchDoJob({ ...row, status: "gerando" }, { status: "gerando" }, agora)).toBeNull();
    const ok = patchDoJob({ ...row, status: "gerando" }, { status: "pronto", nome: "a.mp4", mime: "video/mp4", tamanho: 10, caminho: "/x/a.mp4", creditos: 0 }, agora);
    expect(ok.status).toBe("pronto"); expect(ok.tamanho_bytes).toBe(10); expect(ok.resultado.arquivos[0].nome).toBe("a.mp4"); expect(ok.done_at).toBe(agora);
    const er = patchDoJob(row, { status: "erro", error: "falhou" }, agora);
    expect(er.status).toBe("erro"); expect(er.erro).toBe("falhou");
  });
});
