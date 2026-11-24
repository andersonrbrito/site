// The OfficE_ em 3D (Three.js): escritório inspirado na série, filial Matrix.
// Planta: recepção na frente, baias por departamento no meio, sala de reunião e sala de vidro do Michael no fundo,
// copa à direita. Cada agente é um funcionário: senta e digita quando trabalha, anda pelo corredor quando espera,
// dorme na mesa quando está de folga, monitor vermelho e fumaça quando dá erro, levanta a mão quando espera aprovação.
// Orbitar com o mouse, roda = zoom, clique num funcionário abre a ficha.

const THREE_URL = "https://esm.sh/three@0.160.0";
const ORBIT_URL = "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const PELE = ["#f1c7a0", "#e0ac84", "#b97a52", "#8a5634", "#f6d9bd", "#c98e63"];
const CABELO = ["#2b1a10", "#5a3a1f", "#c9a04a", "#151515", "#8b2c1c", "#8a8a8a", "#e8d28a"];
const CAMISA = ["#dfe6ee", "#a9c4e8", "#f0e2c4", "#c9d8c0", "#e7c6c6", "#ffffff", "#b9b2d8", "#d8d0b0"];
const GRAVATA = ["#7a1f2b", "#1f3d7a", "#2c5a2c", "#4a4a4a", "#7a5a1f", "#5a1f7a"];
const CARPETE = ["#2f6b4f", "#35527a", "#6b3f5e", "#6b5a2f", "#2f6b6b", "#4e3f7a", "#6b452f", "#466b2f"];

export async function montarCena(host, { deptos, onClick, chefe }) {
  const THREE = await import(THREE_URL);
  const { OrbitControls } = await import(ORBIT_URL);
  for (let i = 0; i < 100 && !host.isConnected; i++) await new Promise((r) => setTimeout(r, 50));
  if (!host.isConnected) return;

  // ---------- renderer / cena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "of-canvas";
  const overlay = document.createElement("div"); overlay.className = "of-overlay";
  host.append(renderer.domElement, overlay);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#06100b");
  scene.fog = new THREE.Fog("#06100b", 60, 120);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = 1.35; controls.minDistance = 5; controls.maxDistance = 70; controls.screenSpacePanning = false;

  // ---------- materiais e texturas ----------
  const M = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, ...o });
  const canvasTex = (w, hh, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } t.anisotropy = 4; return t; };
  const ruido = (base, var_) => (g, w, hh) => { g.fillStyle = base; g.fillRect(0, 0, w, hh); for (let i = 0; i < w * hh / 6; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * var_})`; g.fillRect(Math.random() * w, Math.random() * hh, 1, 1); } };
  const mat = {
    carpete: M("#ffffff", { map: canvasTex(128, 128, (g, w, hh) => { ruido("#5d6670", 0.18)(g, w, hh); g.strokeStyle = "rgba(0,0,0,.08)"; for (let i = 0; i < w; i += 32) { g.strokeRect(i, 0, 32, hh); } }, [20, 20]) }),
    piso: M("#ffffff", { map: canvasTex(64, 64, (g) => { g.fillStyle = "#cfc6b4"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#bdb39f"; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }, [16, 16]), roughness: 0.5 }),
    parede: M("#d9cfb7"), rodape: M("#5b4a3a"), madeira: M("#8a6440", { roughness: 0.6 }), mesaTampo: M("#b99c74", { roughness: 0.55 }), metal: M("#6f757d", { metalness: 0.4, roughness: 0.5 }),
    divisoria: M("#7c8794"), cadeira: M("#22252b"), preto: M("#141414"), vidro: new THREE.MeshStandardMaterial({ color: "#a8d8ff", transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    planta: M("#2f8a46"), vaso: M("#6b4a2e"), sofa: M("#7a3b34"), branco: M("#eeeeee"), teclado: M("#2a2a2a"), luz: new THREE.MeshBasicMaterial({ color: "#f4f8ff" }),
  };
  // telas: código Matrix animado (compartilhado), idle, erro
  const telaCv = document.createElement("canvas"); telaCv.width = 128; telaCv.height = 80; const tg = telaCv.getContext("2d");
  const colunas = Array.from({ length: 16 }, () => Math.random() * 10);
  const telaRun = new THREE.CanvasTexture(telaCv); telaRun.colorSpace = THREE.SRGBColorSpace;
  const pintaTela = () => { tg.fillStyle = "rgba(0,12,4,.35)"; tg.fillRect(0, 0, 128, 80); tg.font = "9px monospace"; colunas.forEach((y, i) => { tg.fillStyle = "#00ff66"; tg.fillText(String.fromCharCode(0x30a0 + Math.random() * 90), i * 8, y * 9); colunas[i] = y > 10 && Math.random() > 0.9 ? 0 : y + 1; }); telaRun.needsUpdate = true; };
  const matTela = {
    run: new THREE.MeshBasicMaterial({ map: telaRun }),
    idle: new THREE.MeshBasicMaterial({ map: canvasTex(64, 40, (g) => { g.fillStyle = "#06351a"; g.fillRect(0, 0, 64, 40); g.fillStyle = "#00ff66"; g.font = "8px monospace"; g.fillText("> _", 6, 22); }) }),
    bad: new THREE.MeshBasicMaterial({ map: canvasTex(64, 40, (g) => { g.fillStyle = "#3a0606"; g.fillRect(0, 0, 64, 40); g.fillStyle = "#ff4d4d"; g.font = "bold 10px monospace"; g.fillText("ERRO", 18, 24); }) }),
    off: new THREE.MeshBasicMaterial({ color: "#050505" }),
  };
  matTela.ok = matTela.idle; matTela.warn = matTela.idle;

  const box = (w, h, d, m, x, y, z, parent = scene, sombra = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = sombra; o.receiveShadow = true; parent.add(o); return o; };
  const placa = (txt, { fg = "#00ff66", bg = "rgba(0,0,0,.85)", borda = fg, alt = 0.5, fonte = "bold 46px monospace" } = {}) => {
    const c = document.createElement("canvas"), g = c.getContext("2d"); g.font = fonte; const w = Math.ceil(g.measureText(txt).width) + 40; c.width = w; c.height = 72;
    g.fillStyle = bg; g.fillRect(0, 0, w, 72); g.strokeStyle = borda; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, 68); g.font = fonte; g.fillStyle = fg; g.textBaseline = "middle"; g.fillText(txt, 20, 38);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true })); s.scale.set(alt * w / 72, alt, 1); return s;
  };

  // ---------- layout: baias por departamento ----------
  const DESK = 1.6, LARG_MAX = 26;
  const clusters = []; let cx = 0, cz = 0, linhaD = 0, larg = 0;
  deptos.forEach((d, i) => {
    const cols = Math.max(1, Math.ceil(d.js.length / 2)), w = cols * DESK + 1.2, dd = 4.6;
    if (cx > 0 && cx + w > LARG_MAX) { cx = 0; cz += linhaD + 1.4; linhaD = 0; }
    clusters.push({ ...d, x: cx, z: cz, w, d: dd, cols, cor: CARPETE[i % CARPETE.length] });
    cx += w + 1.4; linhaD = Math.max(linhaD, dd); larg = Math.max(larg, cx - 1.4);
  });
  const bpW = Math.max(larg, 18), bpD = cz + linhaD;
  const COPA = 8, FUNDO = 7, FRENTE = 6;
  const W = bpW + 4 + COPA, x0 = -W / 2, x1 = W / 2, zF = -FUNDO - 1, zB = bpD + FRENTE + 1; // limites do prédio
  const bx = x0 + 2, bz = 1; // origem das baias
  clusters.forEach((c) => { c.x += bx + (bpW - larg) / 2; c.z += bz; });
  const D = zB - zF, cxC = (x0 + x1) / 2, czC = (zF + zB) / 2;

  // piso
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat.carpete); chao.rotation.x = -Math.PI / 2; chao.position.set(cxC, 0, czC); chao.receiveShadow = true; scene.add(chao);
  const copaX0 = x1 - COPA;
  const piso2 = new THREE.Mesh(new THREE.PlaneGeometry(COPA, zB - 0 - 0.01), mat.piso); piso2.rotation.x = -Math.PI / 2; piso2.position.set(copaX0 + COPA / 2, 0.01, zB / 2); piso2.receiveShadow = true; scene.add(piso2);
  clusters.forEach((c) => { const t = new THREE.Mesh(new THREE.PlaneGeometry(c.w + 0.4, c.d + 0.2), M(c.cor, { roughness: 1 })); t.rotation.x = -Math.PI / 2; t.position.set(c.x + c.w / 2, 0.012, c.z + c.d / 2); t.receiveShadow = true; scene.add(t); });

  // paredes: fundo e esquerda inteiras (com janelas); direita e frente baixas (corte de maquete)
  const H = 3;
  box(W, H, 0.2, mat.parede, cxC, H / 2, zF, scene, false);
  box(0.2, H, D, mat.parede, x0, H / 2, czC, scene, false);
  box(0.2, 0.5, D, mat.parede, x1, 0.25, czC); box(W, 0.5, 0.2, mat.parede, cxC, 0.25, zB);
  box(W, 0.12, 0.24, mat.rodape, cxC, 0.06, zF + 0.05, scene, false); box(0.24, 0.12, D, mat.rodape, x0 + 0.05, 0.06, czC, scene, false);
  const ceu = canvasTex(64, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "#9cc8ef"); gr.addColorStop(1, "#e9f2f8"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.fillStyle = "#6f8a6a"; g.fillRect(0, 50, 64, 14); });
  const matJanela = new THREE.MeshBasicMaterial({ map: ceu });
  for (let x = x0 + 3; x < x1 - 2; x += 4.2) { const j = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), matJanela); j.position.set(x, 1.8, zF + 0.11); scene.add(j); box(2.7, 0.06, 0.08, mat.branco, x, 1.1, zF + 0.14, scene, false); box(0.06, 1.4, 0.06, mat.branco, x, 1.8, zF + 0.14, scene, false); }
  for (let z = zF + 3; z < zB - 2; z += 4.5) { const j = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), matJanela); j.rotation.y = Math.PI / 2; j.position.set(x0 + 0.11, 1.8, z); scene.add(j); }
  // letreiro da filial na parede do fundo
  { const s = placa("ANDERSON_OS · filial Matrix", { fg: "#0a3a1d", bg: "#e9e2cc", borda: "#0a3a1d", alt: 0.7, fonte: "bold 50px Georgia" }); s.position.set(cxC, 2.6, zF + 0.3); scene.add(s); }
  // luzes fluorescentes no teto (painéis)

  // vidro + porta
  const vidroParede = (xa, za, xb, zb, porta) => {
    const len = Math.hypot(xb - xa, zb - za), ang = Math.atan2(zb - za, xb - xa);
    const seg = porta ? [[0, len / 2 - 0.6], [len / 2 + 0.6, len]] : [[0, len]];
    seg.forEach(([a, b]) => {
      const l = b - a, m = (a + b) / 2, px = xa + Math.cos(ang) * m, pz = za + Math.sin(ang) * m;
      const v = new THREE.Mesh(new THREE.BoxGeometry(l, 2.6, 0.05), mat.vidro); v.position.set(px, 1.3, pz); v.rotation.y = -ang; scene.add(v);
      const f = new THREE.Mesh(new THREE.BoxGeometry(l, 0.08, 0.08), mat.metal); f.position.set(px, 2.62, pz); f.rotation.y = -ang; scene.add(f);
      const f2 = f.clone(); f2.position.y = 0.04; scene.add(f2);
      // persiana (listras) na metade de cima
      for (let y = 1.7; y < 2.55; y += 0.12) { const p = new THREE.Mesh(new THREE.BoxGeometry(l, 0.03, 0.02), M("#e6e1d4")); p.position.set(px, y, pz); p.rotation.y = -ang; scene.add(p); }
    });
  };

  // ---------- sala de reunião (fundo esquerda) ----------
  const reu = { x0: x0, x1: x0 + 11, z0: zF, z1: zF + FUNDO };
  vidroParede(reu.x1, reu.z0, reu.x1, reu.z1); vidroParede(reu.x0, reu.z1, reu.x1, reu.z1, true);
  box(6, 0.08, 2, mat.madeira, (reu.x0 + reu.x1) / 2, 0.76, (reu.z0 + reu.z1) / 2 - 0.3); box(0.3, 0.72, 0.3, mat.metal, (reu.x0 + reu.x1) / 2 - 2, 0.36, (reu.z0 + reu.z1) / 2 - 0.3); box(0.3, 0.72, 0.3, mat.metal, (reu.x0 + reu.x1) / 2 + 2, 0.36, (reu.z0 + reu.z1) / 2 - 0.3);
  for (let i = -2; i <= 2; i++) { cadeira((reu.x0 + reu.x1) / 2 + i * 1.2, (reu.z0 + reu.z1) / 2 - 1.6, 0); cadeira((reu.x0 + reu.x1) / 2 + i * 1.2, (reu.z0 + reu.z1) / 2 + 1, Math.PI); }
  { const tv = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.7), matTela.run); tv.position.set((reu.x0 + reu.x1) / 2, 1.7, zF + 0.13); scene.add(tv); box(3.1, 1.8, 0.06, mat.preto, (reu.x0 + reu.x1) / 2, 1.7, zF + 0.1, scene, false); }
  { const s = placa("SALA DE REUNIÃO", { alt: 0.35 }); s.position.set((reu.x0 + reu.x1) / 2, 2.85, reu.z1); scene.add(s); }

  // ---------- sala do Michael (fundo direita) ----------
  const mic = { x0: x1 - 10, x1: x1, z0: zF, z1: zF + FUNDO };
  vidroParede(mic.x0, mic.z0, mic.x0, mic.z1); vidroParede(mic.x0, mic.z1, mic.x1, mic.z1, true);
  const micMesa = { x: (mic.x0 + mic.x1) / 2, z: zF + 2.6 };
  box(2.6, 0.08, 1.2, mat.madeira, micMesa.x, 0.76, micMesa.z); box(2.5, 0.7, 0.08, mat.madeira, micMesa.x, 0.38, micMesa.z - 0.55); box(0.08, 0.7, 1.1, mat.madeira, micMesa.x - 1.25, 0.38, micMesa.z); box(0.08, 0.7, 1.1, mat.madeira, micMesa.x + 1.25, 0.38, micMesa.z);
  monitor(micMesa.x - 0.5, micMesa.z - 0.25, 0, matTela.run);
  { const caneca = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 12), mat.branco); caneca.position.set(micMesa.x + 0.7, 0.87, micMesa.z + 0.2); caneca.castShadow = true; scene.add(caneca); const s = placa("MELHOR CHEFE DO MUNDO", { fg: "#111", bg: "#fff", borda: "#111", alt: 0.12, fonte: "bold 40px sans-serif" }); s.position.set(micMesa.x + 0.7, 1.05, micMesa.z + 0.2); scene.add(s); }
  cadeira(micMesa.x, micMesa.z - 1.1, 0, true); cadeira(micMesa.x - 0.6, micMesa.z + 1.2, Math.PI); cadeira(micMesa.x + 0.6, micMesa.z + 1.2, Math.PI);
  box(1.4, 1.8, 0.4, mat.madeira, mic.x1 - 1, 0.9, zF + 0.4); // estante
  for (let i = 0; i < 5; i++) box(0.12, 0.3, 0.12, M(i % 2 ? "#d4a017" : "#c0c0c0", { metalness: 0.8, roughness: 0.3 }), mic.x1 - 1.5 + i * 0.25, 1.95, zF + 0.4); // troféus
  planta(mic.x1 - 0.6, mic.z1 - 0.6);
  { const s = placa("GERENTE REGIONAL", { fg: "#e6b04a", borda: "#e6b04a", alt: 0.35 }); s.position.set((mic.x0 + mic.x1) / 2, 2.85, mic.z1); scene.add(s); }

  // corredor do fundo: copiadora, arquivos, bebedouro
  const meioF = (reu.x1 + mic.x0) / 2;
  box(1.1, 1.0, 0.7, M("#d8d8d2"), meioF - 2.5, 0.5, zF + 0.6); box(1.1, 0.1, 0.5, mat.preto, meioF - 2.5, 1.05, zF + 0.6); // copiadora
  for (let i = 0; i < 3; i++) box(0.55, 1.3, 0.6, M("#8d939a", { metalness: 0.3 }), meioF + 0.6 + i * 0.6, 0.65, zF + 0.4);
  const bebedouro = { x: meioF - 0.6, z: zF + 0.6 }; box(0.4, 1.0, 0.4, mat.branco, bebedouro.x, 0.5, bebedouro.z); { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.45, 14), new THREE.MeshStandardMaterial({ color: "#7fc4ff", transparent: true, opacity: 0.6 })); g.position.set(bebedouro.x, 1.25, bebedouro.z); scene.add(g); }

  // ---------- copa (direita) ----------
  const copa = { x0: copaX0, x1, z0: 0, z1: zB };
  box(0.15, 1.1, copa.z1 - 2.5, mat.parede, copa.x0, 0.55, (copa.z1 + 2.5) / 2); // meia parede com passagem no topo
  box(0.6, 0.9, 3.5, M("#e9e4d8"), x1 - 0.4, 0.45, 2.5); box(0.62, 0.05, 3.5, M("#3a3a3a"), x1 - 0.4, 0.92, 2.5); // bancada
  box(0.8, 1.9, 0.7, M("#d9d9d9", { metalness: 0.5, roughness: 0.3 }), x1 - 0.5, 0.95, 5); // geladeira
  box(0.9, 1.9, 0.7, M("#b02020"), x1 - 0.5, 0.95, 6.2); { const v = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1), new THREE.MeshBasicMaterial({ color: "#ffe9a8" })); v.rotation.y = -Math.PI / 2; v.position.set(x1 - 0.86, 1.2, 6.2); scene.add(v); } // máquina de lanche
  const cafeteira = { x: x1 - 0.9, z: 1.6 }; box(0.3, 0.4, 0.3, mat.preto, x1 - 0.4, 1.15, 1.6);
  const mesaCopa = { x: copa.x0 + COPA / 2 - 0.5, z: copa.z1 / 2 + 1 };
  { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 24), mat.branco); t.position.set(mesaCopa.x, 0.75, mesaCopa.z); t.castShadow = true; scene.add(t); box(0.1, 0.72, 0.1, mat.metal, mesaCopa.x, 0.36, mesaCopa.z); for (let a = 0; a < 4; a++) cadeira(mesaCopa.x + Math.cos(a * 1.57) * 1.1, mesaCopa.z + Math.sin(a * 1.57) * 1.1, -a * 1.57 - Math.PI / 2); }
  const sofaP = { x: copa.x0 + COPA / 2, z: copa.z1 - 1.3 };
  box(2.6, 0.45, 0.9, mat.sofa, sofaP.x, 0.23, sofaP.z); box(2.6, 0.5, 0.25, mat.sofa, sofaP.x, 0.7, sofaP.z + 0.35); box(0.25, 0.35, 0.9, mat.sofa, sofaP.x - 1.3, 0.55, sofaP.z); box(0.25, 0.35, 0.9, mat.sofa, sofaP.x + 1.3, 0.55, sofaP.z);
  { const s = placa("COPA", { alt: 0.35 }); s.position.set(copa.x0 + COPA / 2, 2.6, 0.6); scene.add(s); }

  // ---------- recepção (frente) ----------
  const rec = { x: x0 + 5, z: zB - 3 };
  box(3.2, 1.1, 0.5, mat.madeira, rec.x, 0.55, rec.z); box(3.4, 0.06, 0.7, mat.mesaTampo, rec.x, 1.13, rec.z); box(0.5, 1.1, 1.6, mat.madeira, rec.x - 1.6, 0.55, rec.z - 0.8);
  monitor(rec.x + 0.6, rec.z - 0.6, 0, matTela.idle);
  { const s = placa("RECEPÇÃO", { alt: 0.3 }); s.position.set(rec.x, 1.9, rec.z + 0.3); scene.add(s); }
  for (let i = 0; i < 3; i++) cadeira(rec.x + 3 + i * 0.8, zB - 0.8, Math.PI);
  planta(x0 + 0.8, zB - 0.8); planta(x0 + 0.8, 0.8); planta(copa.x0 - 0.8, zB - 0.8);

  // ---------- mobília reutilizável ----------
  function cadeira(x, z, rot, chefeCad) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    box(0.5, 0.08, 0.5, mat.cadeira, 0, 0.47, 0, g); box(0.5, chefeCad ? 0.8 : 0.55, 0.07, mat.cadeira, 0, chefeCad ? 0.9 : 0.78, -0.24, g); box(0.06, 0.42, 0.06, mat.metal, 0, 0.22, 0, g); box(0.5, 0.04, 0.06, mat.metal, 0, 0.03, 0, g, false); box(0.06, 0.04, 0.5, mat.metal, 0, 0.03, 0, g, false);
    return g;
  }
  function monitor(x, z, rot, telaMat) {
    const g = new THREE.Group(); g.position.set(x, 0.8, z); g.rotation.y = rot; scene.add(g);
    box(0.5, 0.34, 0.04, mat.preto, 0, 0.3, 0, g); box(0.06, 0.15, 0.06, mat.preto, 0, 0.07, 0, g); box(0.22, 0.02, 0.16, mat.preto, 0, 0.01, 0, g, false);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.28), telaMat); t.position.set(0, 0.3, 0.025); g.add(t);
    box(0.42, 0.02, 0.14, mat.teclado, 0, 0.01, 0.3, g, false);
    return t;
  }
  function planta(x, z) { box(0.4, 0.45, 0.4, mat.vaso, x, 0.22, z); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 - i * 0.06, 0), mat.planta); f.position.set(x + (i - 1) * 0.08, 0.7 + i * 0.25, z); f.castShadow = true; scene.add(f); } }

  // ---------- baias + funcionários ----------
  const pessoas = [];
  clusters.forEach((c) => {
    const s = placa(`${c.ic} ${c.nome}`, { alt: 0.42, fonte: "bold 44px monospace" }); s.position.set(c.x + c.w / 2, 2.7, c.z + c.d / 2); scene.add(s);
    const corda = box(0.01, 0.3, 0.01, mat.preto, c.x + c.w / 2, 2.95, c.z + c.d / 2, scene, false); corda.castShadow = false;
    const zA = c.z + 1.25, zB2 = c.z + 2.05; // tampos das duas fileiras (encostados)
    box(c.cols * DESK, 1.25, 0.05, mat.divisoria, c.x + 0.6 + c.cols * DESK / 2, 0.62, c.z + 1.65);
    c.js.forEach((j, k) => {
      const col = Math.floor(k / 2), fila = k % 2, dx = c.x + 0.6 + col * DESK + DESK / 2;
      const dz = fila ? zB2 + 0.0 : zA, viradoZ = fila ? -1 : 1; // fila 0: pessoa olha +z ; fila 1: olha -z
      box(DESK - 0.08, 0.06, 0.8, mat.mesaTampo, dx, 0.76, dz - 0.0 * viradoZ);
      box(0.05, 0.73, 0.75, mat.divisoria, dx - DESK / 2 + 0.05, 0.37, dz); 
      const tela = monitor(dx, dz + 0.12 * viradoZ, viradoZ > 0 ? Math.PI : 0, matTela[j._estado] || matTela.idle);
      const cadZ = dz - 0.85 * viradoZ;
      cadeira(dx, cadZ, viradoZ > 0 ? 0 : Math.PI);
      pessoas.push(funcionario(j, { x: dx, z: cadZ, rot: viradoZ > 0 ? 0 : Math.PI, corredorZ: fila ? c.z + c.d + 0.3 : c.z - 0.5, tela, c }));
    });
  });
  const michael = funcionario(null, { x: micMesa.x, z: micMesa.z - 1.1, rot: 0, corredorZ: mic.z1 + 0.8, chefe: true });
  pessoas.push(michael);

  function funcionario(j, desk) {
    const h0 = j ? hash(j.task_id) : 1;
    const pele = desk.chefe ? "#f1c7a0" : PELE[h0 % PELE.length], cab = desk.chefe ? "#2b1a10" : CABELO[(h0 >> 3) % CABELO.length];
    const camisa = desk.chefe ? "#f4f4f4" : CAMISA[(h0 >> 5) % CAMISA.length], gravata = desk.chefe ? "#8a1010" : GRAVATA[(h0 >> 7) % GRAVATA.length];
    const calca = desk.chefe ? "#1d1f26" : ["#2b2f38", "#3b3226", "#24303b", "#333"][(h0 >> 9) % 4];
    const root = new THREE.Group(); scene.add(root);
    const corpo = new THREE.Group(); root.add(corpo);
    const parte = (w, h, d, cor, x, y, z, pai = corpo) => box(w, h, d, M(cor), x, y, z, pai);
    const quadril = new THREE.Group(); quadril.position.y = 0.85; corpo.add(quadril);
    const pernaE = new THREE.Group(), pernaD = new THREE.Group(); pernaE.position.set(-0.12, 0.85, 0); pernaD.position.set(0.12, 0.85, 0); corpo.add(pernaE, pernaD);
    parte(0.2, 0.82, 0.22, calca, 0, -0.41, 0, pernaE); parte(0.2, 0.82, 0.22, calca, 0, -0.41, 0, pernaD);
    parte(0.22, 0.1, 0.3, "#151515", 0, -0.8, 0.04, pernaE); parte(0.22, 0.1, 0.3, "#151515", 0, -0.8, 0.04, pernaD);
    const tronco = new THREE.Group(); tronco.position.y = 0.85; corpo.add(tronco);
    parte(0.52, 0.66, 0.3, camisa, 0, 0.33, 0, tronco);
    if (desk.chefe) { parte(0.54, 0.62, 0.31, "#1d1f26", 0, 0.34, -0.005, tronco).scale.set(1, 1, 0.98); parte(0.18, 0.55, 0.02, camisa, 0, 0.36, 0.16, tronco); }
    parte(0.07, 0.42, 0.02, gravata, 0, 0.36, desk.chefe ? 0.175 : 0.16, tronco);
    const braco = (lado) => { const g = new THREE.Group(); g.position.set(lado * 0.33, 0.6, 0); tronco.add(g); parte(0.14, 0.58, 0.16, desk.chefe ? "#1d1f26" : camisa, 0, -0.27, 0, g); parte(0.12, 0.12, 0.13, pele, 0, -0.6, 0, g); return g; };
    const bracoE = braco(-1), bracoD = braco(1);
    const cabeca = new THREE.Group(); cabeca.position.y = 0.66; tronco.add(cabeca);
    parte(0.12, 0.08, 0.12, pele, 0, 0.03, 0, cabeca);
    parte(0.38, 0.4, 0.36, pele, 0, 0.27, 0, cabeca);
    const estilo = (h0 >> 11) % 3;
    parte(0.4, 0.12, 0.38, cab, 0, 0.5, -0.01, cabeca); parte(0.4, 0.25, 0.08, cab, 0, 0.36, -0.17, cabeca);
    if (estilo === 1) parte(0.42, 0.42, 0.1, cab, 0, 0.2, -0.2, cabeca); // cabelo comprido
    if (estilo === 2) parte(0.1, 0.18, 0.36, cab, -0.2, 0.4, 0, cabeca);
    parte(0.06, 0.06, 0.02, "#111", -0.08, 0.3, 0.185, cabeca); parte(0.06, 0.06, 0.02, "#111", 0.08, 0.3, 0.185, cabeca);
    parte(0.12, 0.025, 0.02, "#7a3a2a", 0, 0.17, 0.185, cabeca);
    if (j && (h0 >> 13) % 3 === 0) { parte(0.11, 0.08, 0.01, "#222", -0.08, 0.3, 0.2, cabeca); parte(0.11, 0.08, 0.01, "#222", 0.08, 0.3, 0.2, cabeca); } // óculos
    root.traverse((o) => { if (o.isMesh) o.userData.p = true; });
    const est = desk.chefe ? "boss" : j._estado;
    const p = { j, chefe: !!desk.chefe, root, corpo, tronco, cabeca, pernaE, pernaD, bracoE, bracoD, desk, est, fase: Math.random() * 6, caminho: [], espera: Math.random() * 4, sentado: false, fala: null, falaAte: 0, nome: desk.chefe ? "Michael (você)" : j.titulo };
    root.userData.p = p; root.traverse((o) => { o.userData.p = p; });
    // começa sentado na mesa
    root.position.set(desk.x, 0, desk.z); root.rotation.y = desk.rot; p.sentado = true;
    if (est === "warn") { root.position.set(desk.x + 0.6, 0, desk.z); p.sentado = false; }
    if (est === "idle" && Math.random() < 0.5) { p.sentado = false; root.position.set(desk.x, 0, desk.corredorZ); }
    // ícone de estado
    const ic = { run: ["⌨", "#00ff66"], bad: ["!", "#ff4d4d"], warn: ["✋", "#ffc94d"], off: ["z", "#9fe"] }[est];
    if (ic) { const s = placa(ic[0], { fg: ic[1], borda: ic[1], alt: 0.3, fonte: "bold 46px sans-serif" }); s.position.y = 2.25; root.add(s); p.icone = s; }
    if (est === "bad") { p.fumaca = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: "#777", transparent: true, opacity: 0.5 })); scene.add(m); m.userData.k = i / 5; return m; }); }
    return p;
  }

  // ---------- caminhos (corredores) ----------
  const corredorPrincipal = bz - 0.5; // corredor entre o fundo e as baias
  const lugares = () => [
    { x: cafeteira.x, z: cafeteira.z, olha: Math.PI / 2, nome: "café" },
    { x: bebedouro.x, z: bebedouro.z + 0.7, olha: Math.PI, nome: "bebedouro" },
    { x: meioF - 2.5, z: zF + 1.4, olha: Math.PI, nome: "copiadora" },
    { x: mesaCopa.x + 1.1, z: mesaCopa.z, olha: -Math.PI / 2, nome: "copa" },
    { x: rec.x, z: rec.z + 0.9, olha: Math.PI, nome: "recepção" },
  ];
  const rota = (p, alvo) => { // Manhattan pelos corredores pra não atravessar mesas
    const a = p.root.position, cz = p.desk.corredorZ;
    const pts = [];
    if (p.sentado || Math.abs(a.z - cz) > 0.2) pts.push({ x: a.x, z: cz });
    if (alvo.z < bz || alvo.x > copaX0) { pts.push({ x: alvo.x > copaX0 ? copaX0 - 0.6 : a.x, z: cz }); pts.push({ x: alvo.x > copaX0 ? copaX0 - 0.6 : pts.at(-1).x, z: alvo.x > copaX0 ? Math.min(alvo.z, 1.2) : corredorPrincipal }); pts.push({ x: alvo.x, z: alvo.x > copaX0 ? Math.min(alvo.z, 1.2) : corredorPrincipal }); }
    else pts.push({ x: alvo.x, z: cz });
    pts.push({ x: alvo.x, z: alvo.z, olha: alvo.olha, senta: alvo.senta });
    p.caminho = pts; p.sentado = false;
  };
  const voltaMesa = (p) => {
    const a = p.root.position, cz = p.desk.corredorZ, pts = [];
    if (a.z < bz - 0.1 || a.x > copaX0 - 0.7) { if (a.x > copaX0) pts.push({ x: a.x, z: Math.min(a.z, 1.2) }, { x: copaX0 - 0.6, z: Math.min(a.z, 1.2) }); pts.push({ x: pts.at(-1)?.x ?? a.x, z: corredorPrincipal }); pts.push({ x: p.desk.x, z: corredorPrincipal }); }
    pts.push({ x: p.desk.x, z: cz }, { x: p.desk.x, z: p.desk.z, olha: p.desk.rot, senta: true });
    p.caminho = pts; p.sentado = false;
  };

  const decide = (p) => {
    if (p.chefe) {
      if (Math.random() < 0.3) { const alvo = { x: cxC, z: bz + bpD / 2, olha: 0 }; p.caminho = [{ x: micMesa.x, z: mic.z1 + 0.8 }, { x: cxC, z: mic.z1 + 0.8 }, alvo]; p.anuncia = true; }
      else if (Math.random() < 0.5 || p.root.position.z > mic.z1) { p.caminho = p.root.position.z > mic.z1 ? [{ x: p.root.position.x, z: mic.z1 + 0.8 }, { x: micMesa.x, z: mic.z1 + 0.8 }, { x: p.desk.x, z: p.desk.z, olha: 0, senta: true }] : [{ x: p.desk.x, z: p.desk.z, olha: 0, senta: true }]; }
      else p.caminho = [{ x: mic.x0 + 1 + Math.random() * 7, z: zF + 3.8 + Math.random() * 2.5 }];
      p.sentado = false; p.espera = 6 + Math.random() * 8; return;
    }
    const naMesa = Math.hypot(p.root.position.x - p.desk.x, p.root.position.z - p.desk.z) < 0.1;
    if (p.est === "idle") {
      if (naMesa && Math.random() < 0.6) rota(p, lugares()[Math.floor(Math.random() * 5)]);
      else if (!naMesa && Math.random() < 0.5) voltaMesa(p);
      else rota(p, { x: p.desk.c.x + 0.5 + Math.random() * (p.desk.c.w - 1), z: p.desk.corredorZ });
      p.espera = 3 + Math.random() * 6;
    } else if (p.est === "ok") {
      if (naMesa && Math.random() < 0.25) rota(p, lugares()[0]); else if (!naMesa) voltaMesa(p);
      p.espera = 8 + Math.random() * 10;
    } else if (["run", "bad", "off"].includes(p.est)) { if (!naMesa) voltaMesa(p); p.espera = 10; }
    else if (p.est === "warn") { p.espera = 10; }
  };

  // ---------- animação ----------
  const relogio = new THREE.Clock();
  let proxFala = 2, ultTela = 0;
  const balaoDiv = new Map();
  const balao = (p) => { let d = balaoDiv.get(p); if (!d) { d = document.createElement("div"); d.className = "of-balao"; overlay.append(d); balaoDiv.set(p, d); } return d; };
  const rotulo = document.createElement("div"); rotulo.className = "of-rot mono"; overlay.append(rotulo);
  let hover = null;
  const v3 = new THREE.Vector3();
  const projeta = (obj, y) => { obj.getWorldPosition(v3); v3.y += y; v3.project(camera); return [(v3.x + 1) / 2 * host.clientWidth, (1 - v3.y) / 2 * host.clientHeight, v3.z < 1]; };

  const anima = (p, dt, t) => {
    const r = p.root, alvo = p.caminho[0];
    let andando = false;
    if (alvo) {
      const dx = alvo.x - r.position.x, dz = alvo.z - r.position.z, d = Math.hypot(dx, dz), v = (p.chefe ? 1.6 : 1.3) * dt;
      if (d > v) { r.position.x += dx / d * v; r.position.z += dz / d * v; const ang = Math.atan2(dx, dz); r.rotation.y += Math.atan2(Math.sin(ang - r.rotation.y), Math.cos(ang - r.rotation.y)) * Math.min(1, dt * 10); andando = true; }
      else { r.position.x = alvo.x; r.position.z = alvo.z; if (alvo.olha !== undefined) r.rotation.y = alvo.olha; if (alvo.senta) p.sentado = true; p.caminho.shift(); if (!p.caminho.length && p.anuncia) { p.anuncia = false; p.fala = chefe.fala(); p.falaAte = t + 5; } }
    } else { p.espera -= dt; if (p.espera <= 0) decide(p); }
    // pose
    const sw = andando ? Math.sin(t * 9 + p.fase) * 0.6 : 0;
    p.corpo.position.y = p.sentado ? -0.36 : (andando ? Math.abs(Math.sin(t * 9 + p.fase)) * 0.04 : 0);
    p.corpo.position.z = p.sentado ? -0.05 : 0;
    p.pernaE.rotation.x = p.sentado ? -1.5 : sw; p.pernaD.rotation.x = p.sentado ? -1.5 : -sw;
    const digita = p.sentado && (p.est === "run" || p.est === "boss");
    p.bracoE.rotation.x = digita ? -1.1 + Math.sin(t * 22 + p.fase) * 0.12 : p.sentado ? -0.9 : -sw * 0.8;
    p.bracoD.rotation.x = digita ? -1.1 + Math.cos(t * 22 + p.fase) * 0.12 : p.sentado ? -0.9 : sw * 0.8;
    p.bracoD.rotation.z = 0;
    if (p.est === "warn" && !andando) { p.bracoD.rotation.x = -2.9; p.bracoD.rotation.z = Math.sin(t * 6) * 0.25; }
    p.tronco.rotation.x = p.est === "off" && p.sentado ? 0.9 : 0;
    p.cabeca.rotation.x = p.est === "off" && p.sentado ? 0.4 : 0;
    p.cabeca.rotation.y = !andando && !p.sentado ? Math.sin(t * 0.7 + p.fase) * 0.4 : 0;
    if (p.est === "bad" && p.sentado) { p.tronco.rotation.z = Math.sin(t * 2 + p.fase) * 0.05; p.cabeca.rotation.y = Math.sin(t * 7) * 0.3; }
    if (p.icone) { p.icone.position.y = (p.sentado ? 1.85 : 2.25) + Math.sin(t * 3 + p.fase) * 0.05; if (p.est === "off") p.icone.material.opacity = 0.5 + 0.5 * Math.sin(t * 2); }
    if (p.fumaca) p.fumaca.forEach((m) => { const k = (t * 0.4 + m.userData.k) % 1; m.position.set(p.desk.x + Math.sin(k * 9) * 0.15, 1.2 + k * 1.4, p.desk.z + (p.desk.rot ? -0.85 : 0.85)); m.scale.setScalar(0.6 + k * 2.2); m.material.opacity = 0.55 * (1 - k); });
  };

  const loop = () => {
    if (!host.isConnected) { renderer.dispose(); return; }
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, relogio.getDelta()), t = relogio.elapsedTime;
    if (t - ultTela > 0.08) { pintaTela(); ultTela = t; }
    pessoas.forEach((p) => anima(p, dt, t));
    if (t > proxFala) { const cand = pessoas.filter((p) => p.j && p.est !== "off"); const p = Math.random() < 0.15 ? michael : cand[Math.floor(Math.random() * cand.length)]; if (p) { p.fala = p.chefe ? chefe.fala() : p.j._fala; p.falaAte = t + 4.5; } proxFala = t + 3 + Math.random() * 3; }
    controls.update();
    renderer.render(scene, camera);
    // balões e rótulo em HTML por cima
    pessoas.forEach((p) => { const ativo = p.fala && t < p.falaAte; const d = balaoDiv.get(p); if (!ativo) { if (d) d.style.display = "none"; return; } const [x, y, vis] = projeta(p.cabeca, 0.75); const b = balao(p); b.textContent = p.fala; b.style.display = vis ? "block" : "none"; b.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`; });
    if (hover) { const [x, y] = projeta(hover.root, -0.1); rotulo.style.display = "block"; rotulo.textContent = hover.nome; rotulo.style.transform = `translate(${x}px, ${y}px) translate(-50%, 6px)`; } else rotulo.style.display = "none";
  };

  // ---------- câmera, resize, clique ----------
  const centro = new THREE.Vector3(cxC, 0, czC);
  const vistas = {
    geral: [new THREE.Vector3(cxC + W * 0.25, Math.max(W, D) * 0.6, zB + D * 0.4), centro.clone()],
    michael: [new THREE.Vector3(micMesa.x - 2, 6, mic.z1 + 6), new THREE.Vector3(micMesa.x, 0.8, micMesa.z + 1)],
    copa: [new THREE.Vector3(copa.x0 - 5, 7, zB + 3), new THREE.Vector3(copa.x0 + COPA / 2, 0.5, zB / 2)],
    reuniao: [new THREE.Vector3(reu.x1 + 3, 7, reu.z1 + 6), new THREE.Vector3((reu.x0 + reu.x1) / 2, 0.8, (reu.z0 + reu.z1) / 2)],
  };
  let voo = null;
  const voar = (k) => { voo = { de: [camera.position.clone(), controls.target.clone()], para: vistas[k], t: 0 }; };
  camera.position.copy(vistas.geral[0]); controls.target.copy(vistas.geral[1]);
  controls.addEventListener("start", () => { voo = null; });
  const loopVoo = () => { if (!host.isConnected) return; requestAnimationFrame(loopVoo); if (!voo) return; voo.t = Math.min(1, voo.t + 0.02); const e = 1 - Math.pow(1 - voo.t, 3); camera.position.lerpVectors(voo.de[0], voo.para[0], e); controls.target.lerpVectors(voo.de[1], voo.para[1], e); if (voo.t >= 1) voo = null; };
  loopVoo();
  const barra = document.createElement("div"); barra.className = "of-cams";
  [["geral", "🏢 Andar todo"], ["michael", "☕ Sala do Michael"], ["reuniao", "📊 Reunião"], ["copa", "🍩 Copa"]].forEach(([k, txt]) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn btn-ghost btn-sm"; b.textContent = txt; b.onclick = () => voar(k); barra.append(b); });
  host.append(barra);

  const resize = () => { const w = host.clientWidth, hh = host.clientHeight; renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(host); resize();

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const alvos = [];
  pessoas.forEach((p) => p.root.traverse((o) => { if (o.isMesh) alvos.push(o); }));
  const achar = (e) => { const r = renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(alvos, false)[0]; return hit ? hit.object.userData.p : null; };
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointermove", (e) => { hover = achar(e); renderer.domElement.style.cursor = hover ? "pointer" : "grab"; });
  renderer.domElement.addEventListener("pointerup", (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const p = achar(e); if (p) { p.fala = p.chefe ? chefe.fala() : p.j._fala; p.falaAte = relogio.elapsedTime + 4; p.chefe ? chefe.onClick() : onClick(p.j); } } down = null; });

  // ---------- luzes ----------
  scene.add(new THREE.HemisphereLight("#fff6e8", "#3a4048", 0.9));
  const sol = new THREE.DirectionalLight("#fff4e0", 1.6); sol.position.set(cxC - 15, 30, czC - 20); sol.target.position.copy(centro); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); const sc = sol.shadow.camera; sc.left = -W * 0.8; sc.right = W * 0.8; sc.top = D * 0.9; sc.bottom = -D * 0.9; sc.far = 100; sol.shadow.bias = -0.0005;
  scene.add(sol, sol.target);
  const verde = new THREE.PointLight("#00ff66", 6, 10); verde.position.set((reu.x0 + reu.x1) / 2, 2, zF + 1.5); scene.add(verde);

  loop();
}
