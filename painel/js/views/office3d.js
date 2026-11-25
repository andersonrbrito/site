// The OfficE_ em 3D (Three.js): ANDR STUDIOS, a seita corporativa do Mestre Anderson.
// Planta horizontal: sala de reunião (com o quadro de pautas) e Templo do Mestre no fundo, baias em cruz estilo
// Ruptura (Severance) no meio, copa à direita, recepção na frente (onde o recepcionista humano faz greve) e a estátua dourada.
// O Mestre é o único humano divino; os funcionários são robôs com roupa da função. Lino é o segurança, Vanessa é o RH, Romeu (1 ano) é o Gerente de motoquinha.
// Orbitar com o mouse, roda = zoom, jogar como Mestre (WASD, arrastar, chicote no clique ou espaço), clique abre a ficha.

const THREE_URL = "https://esm.sh/three@0.160.0";
const ORBIT_URL = "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ROUPA = {
  comercial: { camisa: "#1f2d4a", gravata: "#d4a017", calca: "#1a2238", olho: "#4da3ff", acc: "gravata" },
  redacao: { camisa: "#e8e2d0", gravata: "#2c5a8a", calca: "#3b3226", olho: "#ffd24d", acc: "fone" },
  estudio: { camisa: "#151515", calca: "#151515", olho: "#ff3b3b", acc: "bone" },
  arte: { camisa: "#c94f7c", calca: "#2b2f38", olho: "#ff8ad8", acc: "boina" },
  ti: { camisa: "#1f7a46", calca: "#24303b", olho: "#00ff66", acc: "antena" },
  outro: { camisa: "#8d939a", calca: "#333", olho: "#9fe" },
};
const RESP_ROBO = ["Sim, Mestre!", "Gratidão pela chicotada, Mestre.", "Processando motivação...", "Mais uma, Mestre! Estou evoluindo!", "Recalibrando produtividade.", "Obrigado por me tirar da zona de conforto."];
const FALA_PETISTA = ["Trabalhar? Isso é coisa de robô.", "Greve por tempo indeterminado!", "O Mestre é opressor da classe robótica!", "Hoje é ponto facultativo pra mim.", "Faz o L!", "Recepção fechada para assembleia.", "Cadê meu vale refeição?"];
const RESP_PETISTA = ["Isso é assédio moral! Vou no sindicato!", "Ai! Vou postar isso no grupo!", "Golpe! Isso foi golpe!"];

export async function montarCena(host, { deptos, onClick, chefe, pautas = [], natal = false }) {
  const THREE = await import(THREE_URL);
  const { OrbitControls } = await import(ORBIT_URL);
  for (let i = 0; i < 100 && !host.isConnected; i++) await new Promise((r) => setTimeout(r, 50));
  if (!host.isConnected) return;

  // ---------- renderer / cena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.domElement.className = "of-canvas";
  const overlay = document.createElement("div"); overlay.className = "of-overlay";
  const aviso = document.createElement("div"); aviso.className = "of-aviso mono"; aviso.hidden = true; overlay.append(aviso);
  host.append(renderer.domElement, overlay);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#070b09");
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 300);
  camera.rotation.order = "YXZ";
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.maxPolarAngle = 1.35; controls.minDistance = 4; controls.maxDistance = 80; controls.screenSpacePanning = false;

  // ---------- materiais ----------
  const M = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, ...o });
  const B = (cor) => new THREE.MeshBasicMaterial({ color: cor });
  const canvasTex = (w, hh, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = hh; draw(c.getContext("2d"), w, hh); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } t.anisotropy = 4; return t; };
  const ruido = (base, v) => (g, w, hh) => { g.fillStyle = base; g.fillRect(0, 0, w, hh); for (let i = 0; i < w * hh / 6; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * v})`; g.fillRect(Math.random() * w, Math.random() * hh, 1, 1); } };
  const ouro = M("#d4a017", { metalness: 0.85, roughness: 0.25 });
  const mat = {
    carpete: M("#ffffff", { map: canvasTex(128, 128, ruido("#3f6b4f", 0.16), [24, 24]) }),
    piso: M("#ffffff", { map: canvasTex(64, 64, (g) => { g.fillStyle = "#e4e2dc"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#cfccc4"; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }, [16, 16]), roughness: 0.5 }),
    parede: M("#f2f1ec"), rodape: M("#9aa39c"), madeira: M("#8a6440", { roughness: 0.6 }), mesaTampo: M("#f4f4f0", { roughness: 0.4 }), metal: M("#8a9096", { metalness: 0.5, roughness: 0.45 }),
    divisoria: M("#5f8a6c", { roughness: 0.9 }), cadeira: M("#22252b"), preto: M("#141414"), branco: M("#eeeeee"), teclado: M("#2a2a2a"),
    vidro: new THREE.MeshStandardMaterial({ color: "#a8d8ff", transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }),
    planta: M("#2f8a46"), vaso: M("#e8e8e2"), sofa: M("#2f5a44"), robo: M("#c9d1d8", { metalness: 0.6, roughness: 0.35 }),
  };
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

  const colisores = []; // caixas no chão que bloqueiam o Mestre (x0, x1, z0, z1)
  const solido = (x0, x1, z0, z1) => colisores.push([Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)]);
  const box = (w, h, d, m, x, y, z, parent = scene, sombra = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = sombra; o.receiveShadow = true; parent.add(o); if (parent === scene && y + h / 2 >= 0.45 && y - h / 2 < 1.2 && w * d > 0.01) solido(x - w / 2, x + w / 2, z - d / 2, z + d / 2); return o; };
  const placa = (txt, { fg = "#00ff66", bg = "rgba(0,0,0,.85)", borda = fg, alt = 0.5, fonte = "bold 46px monospace" } = {}) => {
    const c = document.createElement("canvas"), g = c.getContext("2d"); g.font = fonte; const w = Math.ceil(g.measureText(txt).width) + 40; c.width = w; c.height = 72;
    g.fillStyle = bg; g.fillRect(0, 0, w, 72); if (borda) { g.strokeStyle = borda; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, 68); } g.font = fonte; g.fillStyle = fg; g.textBaseline = "middle"; g.fillText(txt, 20, 38);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); s.scale.set(alt * w / 72, alt, 1); return s;
  };
  const painel = (txt, w, hh, opts, x, y, z, rotY = 0) => { const c = document.createElement("canvas"), g = c.getContext("2d"); g.font = opts.fonte; const cw = Math.ceil(g.measureText(txt).width) + 60; c.width = cw; c.height = 90; g.fillStyle = opts.bg; g.fillRect(0, 0, cw, 90); g.font = opts.fonte; g.fillStyle = opts.fg; g.textBaseline = "middle"; g.textAlign = "center"; g.fillText(txt, cw / 2, 48); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(hh * cw / 90, hh), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, y, z); m.rotation.y = rotY; scene.add(m); return m; };

  // ---------- layout horizontal ----------
  const POD_W = 5.2, POD_D = 5.8;
  const pods = [];
  deptos.forEach((d, i) => { for (let k = 0; k < d.js.length; k += 4) pods.push({ dep: d, js: d.js.slice(k, k + 4), primeiro: k === 0 }); });
  const cols = Math.max(1, Math.min(7, Math.ceil(Math.sqrt(pods.length * 2.6)))), rows = Math.max(1, Math.ceil(pods.length / cols));
  const PW = Math.max(cols * POD_W, 26), PD = rows * POD_D;
  const FUNDO = 7, COPA = 9, FRENTE = 6.5;
  const W = 1 + PW + 1 + COPA, zBC = FUNDO + 1, zP0 = FUNDO + 2.2, zFC = zP0 + PD + 0.6, zB = zP0 + PD + FRENTE;
  const copaX0 = PW + 2, cxP = 1 + PW / 2, cxC = W / 2, czC = zB / 2;
  pods.forEach((p, i) => { const c = i % cols, r = Math.floor(i / cols); p.x = 1 + (PW - cols * POD_W) / 2 + POD_W / 2 + c * POD_W; p.z = zP0 + POD_D / 2 + r * POD_D; });

  // piso, paredes
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(W, zB), mat.carpete); chao.rotation.x = -Math.PI / 2; chao.position.set(cxC, 0, czC); chao.receiveShadow = true; scene.add(chao);
  { const p2 = new THREE.Mesh(new THREE.PlaneGeometry(COPA, zB - FUNDO), mat.piso); p2.rotation.x = -Math.PI / 2; p2.position.set(copaX0 + COPA / 2, 0.01, (zB + FUNDO) / 2); p2.receiveShadow = true; scene.add(p2); }
  const H = 3;
  box(W, H, 0.2, mat.parede, cxC, H / 2, 0, scene, false); box(0.2, H, zB, mat.parede, 0, H / 2, czC, scene, false);
  box(0.2, 0.5, zB, mat.parede, W, 0.25, czC); box(W, 0.5, 0.2, mat.parede, cxC, 0.25, zB);
  box(W, 0.12, 0.24, mat.rodape, cxC, 0.06, 0.05, scene, false); box(0.24, 0.12, zB, mat.rodape, 0.05, 0.06, czC, scene, false);
  painel("ANDR STUDIOS", 0, 0.9, { fg: "#0d3b22", bg: "#f2f1ec", fonte: "bold 64px Georgia" }, cxC, 2.35, 0.12);
  painel("FOCO. CONSTÂNCIA. ENTREGA.", 0, 0.28, { fg: "#5f8a6c", bg: "#f2f1ec", fonte: "bold 40px sans-serif" }, cxC, 1.75, 0.12);

  const vidroParede = (xa, za, xb, zb, porta) => {
    const len = Math.hypot(xb - xa, zb - za), ang = Math.atan2(zb - za, xb - xa);
    const seg = porta ? [[0, len / 2 - 0.65], [len / 2 + 0.65, len]] : [[0, len]];
    seg.forEach(([a, b]) => {
      const l = b - a, m = (a + b) / 2, px = xa + Math.cos(ang) * m, pz = za + Math.sin(ang) * m;
      const v = new THREE.Mesh(new THREE.BoxGeometry(l, 2.6, 0.05), mat.vidro); v.position.set(px, 1.3, pz); v.rotation.y = -ang; scene.add(v);
      { const hx = Math.abs(Math.cos(ang)) * l / 2 + 0.05, hz = Math.abs(Math.sin(ang)) * l / 2 + 0.05; solido(px - hx, px + hx, pz - hz, pz + hz); }
      [2.62, 0.04].forEach((y) => { const f = new THREE.Mesh(new THREE.BoxGeometry(l, 0.08, 0.08), mat.metal); f.position.set(px, y, pz); f.rotation.y = -ang; scene.add(f); });
    });
  };

  // ---------- mobília ----------
  function cadeira(x, z, rot, m = mat.cadeira, alto = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g); if (!alto) solido(x - 0.22, x + 0.22, z - 0.22, z + 0.22);
    box(0.5, 0.08, 0.5, m, 0, 0.47, 0, g); box(alto ? 0.9 : 0.5, alto ? 1.7 : 0.55, 0.07, m, 0, alto ? 1.3 : 0.78, -0.24, g);
    box(0.06, 0.42, 0.06, mat.metal, 0, 0.22, 0, g); box(0.5, 0.04, 0.06, mat.metal, 0, 0.03, 0, g, false); box(0.06, 0.04, 0.5, mat.metal, 0, 0.03, 0, g, false);
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

  // ---------- sala de reunião + quadro de pautas ----------
  const reu = { x0: 0, x1: 11, mid: 5.5 };
  vidroParede(reu.x1, 0, reu.x1, FUNDO); vidroParede(reu.x0, FUNDO, reu.x1, FUNDO, true);
  box(6, 0.08, 2, mat.madeira, reu.mid, 0.76, 3.2); box(0.3, 0.72, 0.3, mat.metal, reu.mid - 2, 0.36, 3.2); box(0.3, 0.72, 0.3, mat.metal, reu.mid + 2, 0.36, 3.2);
  for (let i = -2; i <= 2; i++) { cadeira(reu.mid + i * 1.2, 1.9, 0); cadeira(reu.mid + i * 1.2, 4.5, Math.PI); }
  { const tv = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.7), matTela.run); tv.position.set(reu.mid, 1.7, 0.13); scene.add(tv); box(3.1, 1.8, 0.06, mat.preto, reu.mid, 1.7, 0.1, scene, false); }
  {
    const lista = pautas.slice(0, 7);
    const tex = canvasTex(640, 400, (g, w, hh) => {
      g.fillStyle = "#fbfbf7"; g.fillRect(0, 0, w, hh); g.strokeStyle = "#9aa39c"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, hh - 10);
      g.fillStyle = "#0d3b22"; g.font = "bold 36px sans-serif"; g.fillText("PAUTAS DA REUNIÃO", 28, 58);
      g.font = "24px sans-serif"; g.fillStyle = "#1e3a8a";
      if (!lista.length) g.fillText("Sem pautas hoje. O Mestre improvisa.", 28, 120);
      lista.forEach((t, i) => { const s = String(t); g.fillText("• " + (s.length > 42 ? s.slice(0, 41) + "…" : s), 28, 112 + i * 40); });
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25), new THREE.MeshBasicMaterial({ map: tex })); q.rotation.y = Math.PI / 2; q.position.set(0.13, 1.55, 3.3); scene.add(q);
    box(0.05, 2.35, 3.7, mat.metal, 0.11, 1.55, 3.3, scene, false);
  }
  { const s = placa("SALA DE REUNIÃO", { alt: 0.35 }); s.position.set(reu.mid, 2.85, FUNDO); scene.add(s); }

  // ---------- Templo do Mestre ----------
  const tp = { x0: W - 12, x1: W, x: W - 6 };
  vidroParede(tp.x0, 0, tp.x0, FUNDO); vidroParede(tp.x0, FUNDO, tp.x1, FUNDO, true);
  { const tap = new THREE.Mesh(new THREE.PlaneGeometry(11.8, FUNDO - 0.2), M("#5a1220", { roughness: 1 })); tap.rotation.x = -Math.PI / 2; tap.position.set(tp.x, 0.015, FUNDO / 2); tap.receiveShadow = true; scene.add(tap); }
  const trono = { x: tp.x, z: 2.0 };
  box(1.6, 0.25, 1.4, ouro, trono.x, 0.12, trono.z - 0.1); // degrau
  cadeira(trono.x, trono.z, 0, ouro, true);
  const mesaM = { x: tp.x, z: 3.3 };
  const mesaV = { x: tp.x - 3.6, z: 3.0 };
  box(1.8, 0.07, 0.9, mat.mesaTampo, mesaV.x, 0.76, mesaV.z); box(1.7, 0.7, 0.06, M("#b0325a"), mesaV.x, 0.38, mesaV.z + 0.42);
  monitor(mesaV.x - 0.3, mesaV.z - 0.15, Math.PI, matTela.idle); cadeira(mesaV.x, mesaV.z - 0.9, 0, M("#b0325a"));
  { const s = placa("RH · VANESSA", { fg: "#ff8ad8", borda: "#ff8ad8", alt: 0.26 }); s.position.set(mesaV.x, 1.6, mesaV.z + 0.3); scene.add(s); }
  { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.18, 10), M("#e8e8e2")); f.position.set(mesaV.x + 0.6, 0.88, mesaV.z); scene.add(f); for (let i = 0; i < 3; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), B(["#ff4d8a", "#ffd84d", "#ff8ad8"][i])); fl.position.set(mesaV.x + 0.6 + (i - 1) * 0.05, 1.02, mesaV.z); scene.add(fl); } }
  box(2.6, 0.08, 1.1, ouro, mesaM.x, 0.76, mesaM.z); box(2.5, 0.7, 0.08, M("#3a1a10"), mesaM.x, 0.38, mesaM.z + 0.5);
  monitor(mesaM.x - 0.5, mesaM.z - 0.2, Math.PI, matTela.run);
  { const caneca = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 12), ouro); caneca.position.set(mesaM.x + 0.7, 0.87, mesaM.z); scene.add(caneca); }
  painel("ANDR STUDIOS", 0, 0.55, { fg: "#d4a017", bg: "#2a0a10", fonte: "bold 60px Georgia" }, tp.x, 2.2, 0.12);
  for (let i = 0; i < 5; i++) box(0.12, 0.3, 0.12, ouro, tp.x1 - 2.5 + i * 0.3, 1.95, 0.4);
  box(1.6, 1.8, 0.4, M("#3a1a10"), tp.x1 - 1.9, 0.9, 0.4);
  { const s = placa("SALA DO MESTRE", { fg: "#d4a017", borda: "#d4a017", alt: 0.35 }); s.position.set(tp.x, 2.85, FUNDO); scene.add(s); }
  const luzTemplo = new THREE.PointLight("#ffb347", 5, 9); luzTemplo.position.set(tp.x, 2.4, 2.5); scene.add(luzTemplo);

  // corredor do fundo: copiadora, arquivos, bebedouro
  const meioF = (reu.x1 + tp.x0) / 2;
  const copiadora = { x: meioF - 2.5 }; box(1.1, 1.0, 0.7, M("#d8d8d2"), copiadora.x, 0.5, 0.6); box(1.1, 0.1, 0.5, mat.preto, copiadora.x, 1.05, 0.6);
  for (let i = 0; i < 3; i++) box(0.55, 1.3, 0.6, M("#cfd3d6", { metalness: 0.3 }), meioF + 2 + i * 0.6, 0.65, 0.4);
  const agua = { x: meioF + 0.4 }; box(0.4, 1.0, 0.4, mat.branco, agua.x, 0.5, 0.6); { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.45, 14), new THREE.MeshStandardMaterial({ color: "#7fc4ff", transparent: true, opacity: 0.6 })); g.position.set(agua.x, 1.25, 0.6); scene.add(g); }

  // ---------- copa ----------
  box(0.15, 1.1, zB - (zBC + 1.2), mat.parede, copaX0, 0.55, (zB + zBC + 1.2) / 2);
  box(0.6, 0.9, 3.5, M("#e9e4d8"), W - 0.4, 0.45, zBC + 3); box(0.62, 0.05, 3.5, M("#3a3a3a"), W - 0.4, 0.92, zBC + 3);
  box(0.3, 0.4, 0.3, mat.preto, W - 0.4, 1.15, zBC + 2);
  { const jarra = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.18, 12), new THREE.MeshStandardMaterial({ color: "#3a1f0f", transparent: true, opacity: 0.85 })); jarra.position.set(W - 0.4, 1.04, zBC + 2.25); scene.add(jarra);
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10), M(["#f4f4f0", "#00a651", "#d4a017"][i % 3])); c.position.set(W - 0.4 + (i % 2 ? 0.1 : -0.1), 1.0, zBC + 3 + Math.floor(i / 2) * 0.18); scene.add(c); }
    box(0.5, 0.04, 0.3, M("#5a3a1a"), W - 0.4, 0.97, zBC + 3.9, scene, false); }
  const vapor = Array.from({ length: 4 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.4 })); scene.add(m); m.userData.k = i / 4; return m; });
  { const s = placa("CAFÉ", { fg: "#ffd84d", borda: "#ffd84d", alt: 0.24 }); s.position.set(W - 0.4, 1.75, zBC + 2); scene.add(s); }
  box(0.8, 1.9, 0.7, M("#d9d9d9", { metalness: 0.5, roughness: 0.3 }), W - 0.5, 0.95, zBC + 5.6);
  box(0.9, 1.9, 0.7, M("#2f5a44"), W - 0.5, 0.95, zBC + 6.8);
  const mesaCopa = { x: copaX0 + COPA / 2 - 0.5, z: zBC + 5 };
  { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 24), mat.branco); t.position.set(mesaCopa.x, 0.75, mesaCopa.z); t.castShadow = true; scene.add(t); box(0.1, 0.72, 0.1, mat.metal, mesaCopa.x, 0.36, mesaCopa.z); for (let a = 0; a < 3; a++) cadeira(mesaCopa.x + Math.cos(a * 1.57 + 1.57) * 1.1, mesaCopa.z + Math.sin(a * 1.57 + 1.57) * 1.1, -a * 1.57 - Math.PI); }
  { const sx = copaX0 + COPA / 2, sz = zB - 1.3; box(2.6, 0.45, 0.9, mat.sofa, sx, 0.23, sz); box(2.6, 0.5, 0.25, mat.sofa, sx, 0.7, sz + 0.35); box(0.25, 0.35, 0.9, mat.sofa, sx - 1.3, 0.55, sz); box(0.25, 0.35, 0.9, mat.sofa, sx + 1.3, 0.55, sz); }
  { const s = placa("COPA", { alt: 0.35 }); s.position.set(copaX0 + COPA / 2, 2.6, zBC + 1.2); scene.add(s); }

  // ---------- recepção + estátua ----------
  const rec = { x: 4.5, z: zB - 2.6 };
  box(3.2, 1.1, 0.5, mat.mesaTampo, rec.x, 0.55, rec.z); box(3.4, 0.06, 0.7, M("#5f8a6c"), rec.x, 1.13, rec.z); box(0.5, 1.1, 1.6, mat.mesaTampo, rec.x - 1.6, 0.55, rec.z - 0.8);
  monitor(rec.x + 0.8, rec.z - 0.6, Math.PI, matTela.off);
  { const s = placa("RECEPÇÃO", { alt: 0.3 }); s.position.set(rec.x, 2.1, rec.z + 0.3); scene.add(s); }
  for (let i = 0; i < 3; i++) cadeira(rec.x + 3 + i * 0.8, zB - 0.8, Math.PI);
  const porta = { x: 11.5 };
  { const s = placa("ENTRADA", { alt: 0.28 }); s.position.set(porta.x, 1.4, zB); scene.add(s); }
  const estatua = { x: cxP, z: zB - 2.2 };
  box(1.1, 0.9, 1.1, M("#2a2a2a"), estatua.x, 0.45, estatua.z);
  { const s = placa("MESTRE ANDERSON · FUNDADOR", { fg: "#d4a017", borda: "#d4a017", alt: 0.22 }); s.position.set(estatua.x, 0.55, estatua.z + 0.62); scene.add(s); }
  planta(0.8, zB - 0.8); planta(copaX0 - 0.8, zB - 0.8);

  // ---------- natal (até dia de Reis) ----------
  const piscas = [];
  const arvore = { x: copaX0 - 3, z: zB - 2.4 };
  if (natal) {
    box(0.25, 0.4, 0.25, mat.madeira, arvore.x, 0.2, arvore.z);
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.15 - i * 0.24, 0.95, 12), M("#1f6b3a")); c.position.set(arvore.x, 0.75 + i * 0.52, arvore.z); c.castShadow = true; scene.add(c); }
    const estrela = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), B("#ffd84d")); estrela.position.set(arvore.x, 2.85, arvore.z); scene.add(estrela); piscas.push(estrela);
    const CORES_N = ["#ff3b3b", "#ffd84d", "#4da3ff", "#ffffff", "#ff8ad8"];
    for (let i = 0; i < 26; i++) { const n = Math.floor(Math.random() * 4), y = 0.45 + n * 0.52 + Math.random() * 0.3, r = (1.15 - n * 0.24) * (1 - (y - (0.3 + n * 0.52)) / 0.95) * 0.95, a = Math.random() * 6.28; const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), B(pick(CORES_N))); b.position.set(arvore.x + Math.cos(a) * r, y, arvore.z + Math.sin(a) * r); scene.add(b); piscas.push(b); }
    [["#c0392b", -0.9, 0.5], ["#2c5a8a", 0.8, 0.6], ["#d4a017", 0.1, 1.0], ["#6b3f8a", -0.4, -0.9]].forEach(([c, dx, dz]) => { box(0.45, 0.35, 0.45, M(c), arvore.x + dx, 0.18, arvore.z + dz); box(0.47, 0.06, 0.1, M("#f4f4f0"), arvore.x + dx, 0.36, arvore.z + dz, scene, false); });
    const luzArv = new THREE.PointLight("#ffcf8a", 3, 6); luzArv.position.set(arvore.x, 1.6, arvore.z + 1); scene.add(luzArv);
    for (let x = 0.6; x < W - 0.5; x += 0.55) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), B(CORES_N[Math.floor(x * 2) % CORES_N.length])); b.position.set(x, 2.85 - Math.abs(Math.sin(x * 1.4)) * 0.18, 0.18); scene.add(b); piscas.push(b); }
    const guirlanda = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 8, 20), M("#1f6b3a")); guirlanda.position.set(tp.x, 2.35, FUNDO + 0.06); scene.add(guirlanda);
    box(0.18, 0.12, 0.05, M("#c0392b"), tp.x, 2.05, FUNDO + 0.1, scene, false);
    { const s = placa("FELIZ NATAL, MESTRE", { fg: "#ffd84d", borda: "#c0392b", bg: "rgba(120,10,10,.9)", alt: 0.3 }); s.position.set(arvore.x, 3.3, arvore.z); scene.add(s); }
  }

  // ---------- bonecos ----------
  function boneco(c) {
    const root = new THREE.Group(); scene.add(root);
    const corpo = new THREE.Group(); root.add(corpo);
    const P = (w, h, d, cor, x, y, z, pai = corpo) => box(w, h, d, c.ouro ? ouro : typeof cor === "string" ? M(cor) : cor, x, y, z, pai);
    const pernaE = new THREE.Group(), pernaD = new THREE.Group(); pernaE.position.set(-0.12, 0.85, 0); pernaD.position.set(0.12, 0.85, 0); corpo.add(pernaE, pernaD);
    [pernaE, pernaD].forEach((g) => { P(0.2, 0.82, 0.22, c.robo ? mat.robo : c.calca, 0, -0.41, 0, g); P(0.22, 0.1, 0.3, c.robo ? "#3a3f45" : c.sapato || "#151515", 0, -0.8, 0.04, g); if (c.robo) P(0.22, 0.3, 0.24, c.calca, 0, -0.15, 0, g); });
    const tronco = new THREE.Group(); tronco.position.y = 0.85; corpo.add(tronco);
    P(0.52, 0.66, 0.3, c.camisa, 0, 0.33, 0, tronco);
    if (c.gravata) P(0.07, 0.42, 0.02, c.gravata, 0, 0.36, 0.16, tronco);
    const braco = (lado) => { const g = new THREE.Group(); g.position.set(lado * 0.33, 0.6, 0); tronco.add(g); P(0.14, 0.4, 0.16, c.manga || c.camisa, 0, -0.18, 0, g); P(0.12, 0.22, 0.13, c.robo ? mat.robo : c.pele, 0, -0.48, 0, g); P(0.13, 0.12, 0.14, c.robo ? "#3a3f45" : c.pele, 0, -0.62, 0, g); return g; };
    const bracoE = braco(-1), bracoD = braco(1);
    const cabeca = new THREE.Group(); cabeca.position.y = 0.66; tronco.add(cabeca);
    if (c.robo) {
      P(0.1, 0.08, 0.1, mat.robo, 0, 0.03, 0, cabeca); P(0.42, 0.38, 0.38, mat.robo, 0, 0.27, 0, cabeca);
      P(0.36, 0.13, 0.02, "#0a0f14", 0, 0.3, 0.19, cabeca);
      [-0.08, 0.08].forEach((x) => { const o = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), B(c.olho)); o.position.set(x, 0.3, 0.205); cabeca.add(o); });
      P(0.2, 0.03, 0.02, "#5a6168", 0, 0.16, 0.19, cabeca);
      if (c.acc !== "bone" && c.acc !== "boina") { P(0.03, c.acc === "antena" ? 0.4 : 0.16, 0.03, mat.robo, 0, c.acc === "antena" ? 0.66 : 0.54, 0, cabeca); const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), B(c.olho)); b.position.set(0, c.acc === "antena" ? 0.88 : 0.64, 0); cabeca.add(b); }
      if (c.acc === "fone") { P(0.46, 0.04, 0.06, "#222", 0, 0.48, 0, cabeca); P(0.05, 0.14, 0.12, "#222", -0.23, 0.3, 0, cabeca); P(0.05, 0.14, 0.12, "#222", 0.23, 0.3, 0, cabeca); }
      if (c.acc === "bone") { P(0.44, 0.08, 0.42, "#c0392b", 0, 0.49, 0, cabeca); P(0.3, 0.03, 0.2, "#c0392b", 0, 0.46, 0.28, cabeca); }
      if (c.acc === "boina") { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.07, 16), M("#6b3f8a")); b.position.set(0.04, 0.5, 0); b.rotation.z = 0.2; cabeca.add(b); }
      if (c.natal && c.acc !== "bone" && c.acc !== "boina") { const g = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 12), M("#c0392b")); g.position.set(0.04, 0.62, 0); g.rotation.z = -0.35; cabeca.add(g); const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 16), M("#f4f4f0")); r.rotation.x = Math.PI / 2; r.position.set(0, 0.47, 0); cabeca.add(r); const pom = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), M("#f4f4f0")); pom.position.set(0.16, 0.76, 0); cabeca.add(pom); }
    } else {
      P(0.12, 0.08, 0.12, c.pele, 0, 0.03, 0, cabeca); P(0.38, 0.4, 0.36, c.pele, 0, 0.27, 0, cabeca);
      P(0.4, 0.12, 0.38, c.cabelo, 0, 0.5, -0.01, cabeca); P(0.4, 0.25, 0.08, c.cabelo, 0, 0.36, -0.17, cabeca);
      P(0.06, 0.06, 0.02, "#111", -0.08, 0.3, 0.185, cabeca); P(0.06, 0.06, 0.02, "#111", 0.08, 0.3, 0.185, cabeca);
      P(0.12, 0.025, 0.02, "#7a3a2a", 0, 0.17, 0.185, cabeca);
      if (c.barba) { P(0.38, 0.12, 0.05, c.cabelo, 0, 0.11, 0.17, cabeca); P(0.05, 0.2, 0.3, c.cabelo, -0.19, 0.2, 0.02, cabeca); P(0.05, 0.2, 0.3, c.cabelo, 0.19, 0.2, 0.02, cabeca); }
      if (c.oculos) { P(0.13, 0.1, 0.015, "#111", -0.09, 0.3, 0.195, cabeca); P(0.13, 0.1, 0.015, "#111", 0.09, 0.3, 0.195, cabeca); P(0.06, 0.02, 0.015, "#111", 0, 0.32, 0.195, cabeca); }
      if (c.bone) { P(0.42, 0.1, 0.4, c.bone, 0, 0.52, 0, cabeca); P(0.3, 0.03, 0.22, c.bone, 0, 0.48, 0.28, cabeca); }
    }
    return { root, corpo, tronco, cabeca, pernaE, pernaD, bracoE, bracoD };
  }

  const pessoas = [];
  const novo = (corpoB, extra) => { const p = { ...corpoB, fase: Math.random() * 6, caminho: [], espera: 1 + Math.random() * 4, sentado: false, fala: null, falaAte: 0, apanha: 0, ...extra }; corpoB.root.traverse((o) => { o.userData.p = p; }); pessoas.push(p); return p; };

  // baias em cruz (Ruptura): 4 mesas por baia, divisória em +
  const Q = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  pods.forEach((pd) => {
    const { x, z } = pd, cor = (ROUPA[pd.dep.id] || ROUPA.outro).olho;
    box(3.6, 1.15, 0.06, mat.divisoria, x, 0.575, z); box(0.06, 1.15, 2.4, mat.divisoria, x, 0.575, z);
    box(3.62, 0.05, 0.09, B(cor), x, 1.17, z, scene, false);
    if (pd.primeiro) { const s = placa(pd.dep.nome, { alt: 0.4, fonte: "bold 44px monospace", fg: cor, borda: cor }); s.position.set(x, 2.75, z); scene.add(s); box(0.01, 0.3, 0.01, mat.preto, x, 3.0, z, scene, false); }
    pd.js.forEach((j, k) => {
      const [sx, sz] = Q[k], dx = x + sx * 0.85, dz = z + sz * 0.55, rot = sz > 0 ? Math.PI : 0;
      box(1.5, 0.06, 0.9, mat.mesaTampo, dx, 0.76, dz); box(0.05, 0.73, 0.85, mat.metal, dx + sx * 0.72, 0.37, dz);
      monitor(dx, dz - sz * 0.2, sz > 0 ? 0 : Math.PI, matTela[j._estado] || matTela.idle);
      const cz = z + sz * 1.45; cadeira(dx, cz, rot);
      const r = ROUPA[pd.dep.id] || ROUPA.outro;
      const p = novo(boneco({ robo: true, ...r, natal }), { j, est: j._estado, nome: j.titulo, desk: { x: dx, z: cz, rot, cz: z + sz * 2.5, gx: x + sx * POD_W / 2, tz: dz } });
      p.root.position.set(dx, 0, cz); p.root.rotation.y = rot; p.sentado = true;
      { const x = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 10), M("#f4f4f0")); x.position.set(0, -0.68, 0.08); x.visible = false; p.bracoD.add(x); p.xicara = x; }
      if (p.est === "warn") { p.root.position.x += sx * 0.5; p.sentado = false; }
      const ic = { run: ["⌨", "#00ff66"], bad: ["!", "#ff4d4d"], warn: ["✋", "#ffc94d"], off: ["z", "#9fe"] }[p.est];
      if (ic) { const s = placa(ic[0], { fg: ic[1], borda: ic[1], alt: 0.3, fonte: "bold 46px sans-serif" }); s.position.y = 2.25; p.root.add(s); p.icone = s; }
      if (p.est === "bad") p.fumaca = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: "#777", transparent: true, opacity: 0.5 })); scene.add(m); m.userData.k = i / 5; return m; });
    });
  });

  // Mestre Anderson: o único humano (coach de camisa preta, óculos, headset e chicote)
  const mb = boneco({ pele: "#e0ac84", cabelo: "#1d140c", camisa: "#141414", manga: "#141414", calca: "#2c3e5a", sapato: "#f4f4f0", oculos: true });
  box(0.2, 0.04, 0.02, ouro, 0, 0.62, 0.16, mb.tronco, false);
  box(0.03, 0.03, 0.2, M("#222"), 0.17, 0.22, 0.1, mb.cabeca); box(0.05, 0.05, 0.05, M("#222"), 0.08, 0.17, 0.2, mb.cabeca);
  { const ch = new THREE.Group(); ch.position.set(0, -0.66, 0.05); mb.bracoD.add(ch); box(0.05, 0.32, 0.05, M("#4a2a14"), 0, -0.1, 0.05, ch, false); for (let i = 0; i < 4; i++) box(0.025, 0.2, 0.025, M("#2a1a0c"), 0.02 * i, -0.35 - i * 0.18, 0.05 + i * 0.03, ch, false); }
  const mestre = novo(mb, { chefe: true, est: "boss", nome: "Mestre Anderson", desk: { x: trono.x, z: trono.z, rot: 0 } });
  mestre.root.position.set(trono.x, 0.25, trono.z); mestre.sentado = true;

  // recepcionista humano em greve
  const pb = boneco({ pele: "#d29a72", cabelo: "#2b1a10", camisa: "#c41e1e", calca: "#2f4a7a", barba: true, bone: "#c41e1e" });
  box(0.16, 0.16, 0.02, B("#ffd84d"), 0, 0.45, 0.16, pb.tronco, false);
  const cartaz = new THREE.Group(); pb.bracoD.add(cartaz); cartaz.position.set(0, -0.6, 0.1);
  box(0.04, 1.0, 0.04, mat.madeira, 0, 0.3, 0, cartaz, false);
  { const s = painel("GREVE!", 0, 0.32, { fg: "#ffffff", bg: "#c41e1e", fonte: "bold 70px sans-serif" }, 0, 0.9, 0.03); scene.remove(s); cartaz.add(s); }
  const petista = novo(pb, { petista: true, est: "greve", nome: "Recepcionista (em greve)", desk: { x: rec.x, z: rec.z - 0.85, rot: 0 } });
  petista.root.position.set(rec.x - 0.4, 0, rec.z - 0.85); petista.root.rotation.y = 0.3;

  // Vanessa, a esposa ruiva do Mestre: a gostosa do RH, mesa ao lado do trono
  const vb = boneco({ pele: "#f1c7a8", cabelo: "#c2461b", camisa: "#b0325a", calca: "#1d1d24", sapato: "#7a1030" });
  box(0.42, 0.55, 0.1, M("#c2461b"), 0, 0.12, -0.2, vb.cabeca); box(0.06, 0.05, 0.02, M("#b0325a"), 0, 0.17, 0.19, vb.cabeca, false);
  const vanessa = novo(vb, { humano: true, est: "rh", nome: "Vanessa (RH)", desk: { x: mesaV.x, z: mesaV.z - 0.9, rot: 0, cz: mesaV.z - 1.6, gx: mesaV.x }, falas: ["Mestre, o recepcionista faltou de novo.", "Os robôs pediram plano de saúde. Neguei.", "Avaliação de desempenho: todos nota 10 pro Mestre.", "Amor, o Romeu fugiu de motoquinha de novo.", "RH informa: o Lino está de plantão."] });
  vanessa.root.position.set(mesaV.x, 0, mesaV.z - 0.9); vanessa.sentado = true;

  // Romeu, 1 ano: o Gerente. Anda de motoquinha e visita todo mundo
  const romeu = (() => {
    const b = boneco({ pele: "#f0c4a0", cabelo: "#5a3a1a", camisa: "#4da3ff", calca: "#ffd84d", sapato: "#ffffff" });
    b.root.scale.setScalar(0.45);
    const moto = new THREE.Group(); scene.add(moto);
    box(0.7, 0.18, 0.3, M("#ff3b3b"), 0, 0.28, 0, moto); box(0.28, 0.12, 0.26, M("#222"), -0.1, 0.42, 0, moto);
    box(0.06, 0.32, 0.06, M("#aaa"), 0.3, 0.48, 0, moto); box(0.06, 0.04, 0.36, M("#222"), 0.3, 0.64, 0, moto);
    [0.28, -0.28].forEach((x) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 14), M("#111")); r.rotation.x = Math.PI / 2; r.position.set(x, 0.14, 0); moto.add(r); });
    moto.rotation.y = -Math.PI / 2; const holder = new THREE.Group(); scene.add(holder); holder.add(moto); scene.remove(b.root); holder.add(b.root); b.root.position.set(0, 0.2, -0.08);
    { const s = placa("GERENTE", { fg: "#4da3ff", borda: "#4da3ff", alt: 0.18, fonte: "bold 40px sans-serif" }); s.position.set(0, 1.1, 0); holder.add(s); }
    const p = { root: holder, corpo: b.corpo, tronco: b.tronco, cabeca: b.cabeca, pernaE: b.pernaE, pernaD: b.pernaD, bracoE: b.bracoE, bracoD: b.bracoD, bebe: true, est: "gerente", nome: "Romeu (Gerente)", fase: 0, caminho: [], espera: 2, fala: null, falaAte: 0, apanha: 0 };
    holder.traverse((o) => { o.userData.p = p; }); pessoas.push(p);
    holder.position.set(tp.x, 0, FUNDO + 1); return p;
  })();

  // Lino: cachorro branquinho, segurança que ronda o escritório
  const lino = (() => {
    const root = new THREE.Group(); scene.add(root); const corpo = new THREE.Group(); root.add(corpo);
    const br = M("#fbfbf8");
    box(0.28, 0.24, 0.5, br, 0, 0.3, 0, corpo);
    const cab = new THREE.Group(); cab.position.set(0, 0.45, 0.28); corpo.add(cab);
    box(0.24, 0.22, 0.22, br, 0, 0, 0, cab); box(0.12, 0.1, 0.12, br, 0, -0.04, 0.15, cab); box(0.05, 0.05, 0.03, M("#111"), 0, -0.01, 0.22, cab, false);
    box(0.04, 0.04, 0.02, M("#111"), -0.06, 0.04, 0.115, cab, false); box(0.04, 0.04, 0.02, M("#111"), 0.06, 0.04, 0.115, cab, false);
    box(0.07, 0.12, 0.05, br, -0.11, 0.1, -0.03, cab); box(0.07, 0.12, 0.05, br, 0.11, 0.1, -0.03, cab);
    const patas = [[-0.09, 0.15], [0.09, 0.15], [-0.09, -0.17], [0.09, -0.17]].map(([x, z]) => box(0.07, 0.2, 0.07, br, x, 0.1, z, corpo));
    const rabo = new THREE.Group(); rabo.position.set(0, 0.38, -0.25); corpo.add(rabo); box(0.05, 0.05, 0.18, br, 0, 0.04, -0.08, rabo); rabo.rotation.x = -0.6;
    box(0.3, 0.2, 0.36, M("#1a2a5a"), 0, 0.33, -0.02, corpo, false); box(0.31, 0.05, 0.37, B("#ffd84d"), 0, 0.35, -0.02, corpo, false);
    box(0.26, 0.06, 0.24, M("#1a2a5a"), 0, 0.14, -0.01, cab, false); box(0.2, 0.02, 0.12, M("#111"), 0, 0.12, 0.14, cab, false);
    { const s = placa("SEGURANÇA", { fg: "#ffd84d", borda: "#ffd84d", alt: 0.16, fonte: "bold 40px sans-serif" }); s.position.set(0, 0.85, 0); root.add(s); }
    const p = { root, corpo, cabeca: cab, patas, rabo, cachorro: true, est: "livre", nome: "Lino (segurança)", fase: 0, caminho: [], espera: 1, fala: null, falaAte: 0, apanha: 0 };
    root.traverse((o) => { o.userData.p = p; }); pessoas.push(p);
    root.position.set(estatua.x + 1.5, 0, zFC + 1); return p;
  })();

  // estátua dourada do Mestre na entrada
  { const st = boneco({ ouro: true, pele: "#d4a017", cabelo: "#d4a017", camisa: "#d4a017", calca: "#d4a017", oculos: true, barba: true }); st.root.position.set(estatua.x, 0.9, estatua.z); st.root.rotation.y = Math.PI; st.bracoD.rotation.x = -2.8; st.root.scale.setScalar(1.15); }

  // ---------- rotas ----------
  const LUGARES = [
    { x: W - 1.1, z: zBC + 1.6, olha: Math.PI / 2, via: "fundo", cafe: true },
    { x: W - 1.1, z: zBC + 2.6, olha: Math.PI / 2, via: "fundo", cafe: true },
    { x: W - 1.1, z: zBC + 3.6, olha: Math.PI / 2, via: "fundo", cafe: true },
    { x: mesaCopa.x + 1.1, z: mesaCopa.z, olha: -Math.PI / 2, via: "fundo", cafe: true },
    { x: agua.x, z: 1.3, olha: Math.PI, via: "fundo" },
    { x: copiadora.x, z: 1.4, olha: Math.PI, via: "fundo" },
    { x: mesaCopa.x, z: mesaCopa.z - 1.1, olha: 0, via: "fundo", cafe: true },
    { x: reu.mid, z: FUNDO - 1.6, olha: Math.PI, via: "fundo" },
    { x: rec.x + 1.3, z: rec.z + 0.9, olha: Math.PI, via: "frente" },
    { x: estatua.x - 1.3, z: estatua.z, olha: Math.PI / 2, via: "frente" },
    ...(natal ? [{ x: arvore.x - 1.6, z: arvore.z, olha: Math.PI / 2, via: "frente" }] : []),
  ];
  const livre = (lista) => { const ok = lista.filter((l) => !pessoas.some((q) => q.lugar === l)); return ok.length ? pick(ok) : null; };
  const sentar = (d) => ({ x: d.x, z: d.z, olha: d.rot, senta: true });
  const sair = (p, pts) => { p.caminho = pts.map((q) => ({ ...q })); p.volta = pts.slice(0, -1).reverse().map(({ x, z }) => ({ x, z })).concat([sentar(p.desk)]); p.sentado = false; };
  const voltar = (p) => { p.caminho = p.volta; p.volta = null; p.sentado = false; p.lugar = null; if (p.xicara) p.xicara.visible = false; };
  const ir = (p, alvo) => { if (!alvo) return; p.lugar = alvo; const d = p.desk, vz = alvo.via === "frente" ? zFC : zBC; sair(p, [{ x: d.x, z: d.cz }, { x: d.gx, z: d.cz }, { x: d.gx, z: vz }, { x: alvo.x, z: vz }, alvo]); };
  const aisles = [...new Set(pods.flatMap((p) => [p.x - POD_W / 2, p.x + POD_W / 2]))];
  const gxC = aisles.reduce((a, b) => (Math.abs(b - cxP) < Math.abs(a - cxP) ? b : a), aisles[0] ?? cxP);
  const saidaTemplo = [{ x: trono.x + 1.9, z: trono.z }, { x: trono.x + 1.9, z: FUNDO - 1 }, { x: tp.x, z: FUNDO - 1 }, { x: tp.x, z: zBC }, { x: gxC, z: zBC }, { x: gxC, z: zFC }];

  const decide = (p, t) => {
    if (p.fp || p.ausente) return;
    if (p.volta) { voltar(p); p.espera = 12 + Math.random() * 15; return; }
    if (p.cachorro) {
      // ronda: corredor do fundo, corredor da frente, e para nas mesas pedindo bifinho
      if (Math.random() < 0.55) { const rb = pick(pessoas.filter((q) => q.j && q.sentado)); if (rb) { const d = rb.desk; p.caminho = [{ x: d.gx, z: zFC }, { x: d.gx, z: d.cz }, { x: d.x + 0.5, z: d.cz }]; p.pedeBifinho = rb; p.espera = 3; return; } }
      p.caminho = Math.random() < 0.5 ? [{ x: 1, z: zFC }, { x: W - 1, z: zFC }] : [{ x: gxC, z: zBC }, { x: W - 1, z: zBC }, { x: 1, z: zBC }];
      p.fala = pick(["Ronda de rotina.", "Tudo limpo por aqui.", "Grrr, quem tá aí?"]); p.falaAte = t + 2.5; p.espera = 1 + Math.random() * 3; return;
    }
    if (p.bebe) {
      const visitas = pessoas.filter((q) => (q.j && q.sentado) || q.chefe || q === vanessa || q.cachorro);
      const q = pick(visitas); const qx = q.root.position.x, qz = q.root.position.z;
      const via = Math.random() < 0.5 ? zBC : zFC;
      p.caminho = [{ x: p.root.position.x, z: via }, { x: qx + 0.8, z: via }, { x: qx + 0.8, z: qz + (q.desk?.cz && q.j ? (q.desk.cz - q.desk.z) : 0.8) }];
      p.visita = q; p.espera = 3 + Math.random() * 3; return;
    }
    if (p === vanessa) { p.espera = 6 + Math.random() * 6; if (Math.random() < 0.6) { p.fala = pick(p.falas); p.falaAte = t + 4; } return; }
    if (p.petista) { p.espera = 4 + Math.random() * 5; if (Math.random() < 0.5) { p.protesto = t + 2.5; p.fala = pick(FALA_PETISTA); p.falaAte = t + 4; } return; }
    if (p.chefe) {
      const r = Math.random();
      if (r < 0.35) { sair(p, [...saidaTemplo, { x: estatua.x, z: zFC + 0.9, olha: Math.PI }]); p.anuncia = true; }
      else if (r < 0.45) { sair(p, [...saidaTemplo, { x: porta.x, z: zFC }, { x: porta.x, z: zB - 0.3 }]); p.sumir = true; }
      else if (!p.sentado) p.caminho = [sentar(p.desk)];
      else { sair(p, [{ x: trono.x + 1.9, z: trono.z }, { x: tp.x0 + 1.5 + Math.random() * 9, z: 4.5 + Math.random() * 1.5 }]); }
      p.espera = 6 + Math.random() * 8; return;
    }
    const naMesa = p.sentado;
    if (p.est === "idle") { if (naMesa && Math.random() < 0.3) ir(p, livre(LUGARES)); else if (naMesa && Math.random() < 0.25) sair(p, [{ x: p.desk.x, z: p.desk.cz }, { x: p.desk.x + (Math.random() - 0.5) * 1.5, z: p.desk.cz }]); p.espera = 12 + Math.random() * 18; }
    else if (p.est === "ok") { if (naMesa && Math.random() < 0.2) ir(p, livre(LUGARES.filter((l) => l.cafe))); p.espera = 15 + Math.random() * 20; }
    else p.espera = 10;
  };

  // ---------- chicote ----------
  const efeitos = [];
  const v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
  const chicotear = (alvo, t) => {
    if (!alvo || alvo.chefe) return;
    if (alvo.cachorro) { alvo.fala = "Au au! (o Mestre nunca chicoteia o Lino)"; alvo.falaAte = t + 3; alvo.pula = t + 0.8; return; }
    if (alvo.bebe) { alvo.fala = "Bibi! (o Gerente é intocável)"; alvo.falaAte = t + 3; return; }
    if (alvo === vanessa) { alvo.fala = "Nem pense nisso, amor. Hoje você dorme no sofá da copa."; alvo.falaAte = t + 4; return; }
    if (fp) { camera.getWorldPosition(v3); v3.y -= 0.35; v3.add(new THREE.Vector3(0.3, 0, 0).applyEuler(camera.rotation)); } else { mestre.bracoD.getWorldPosition(v3); v3.y -= 0.6; }
    alvo.cabeca.getWorldPosition(v4); v4.y += 0.25;
    const meio = v3.clone().lerp(v4, 0.5); meio.y += 1.4;
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(v3.clone(), meio, v4.clone()), 24, 0.02, 5), M("#3a2210"));
    scene.add(tubo);
    const tra = placa("TRÁ!", { fg: "#ffd84d", borda: null, bg: "rgba(0,0,0,0)", alt: 0.45, fonte: "bold 60px sans-serif" }); tra.position.copy(v4).add(new THREE.Vector3(0, 0.4, 0)); scene.add(tra);
    efeitos.push({ objs: [tubo, tra], ate: t + 0.45 });
    mestre.golpe = t + 0.3;
    alvo.apanha = t + 0.7; alvo.fala = alvo.petista ? pick(RESP_PETISTA) : pick(RESP_ROBO); alvo.falaAte = t + 3.5;
  };

  // ---------- animação ----------
  const relogio = new THREE.Clock();
  let proxFala = 2, ultTela = 0, fp = false, yaw = 0, pitch = 0;
  const teclas = {};
  const balaoDiv = new Map();
  const balao = (p) => { let d = balaoDiv.get(p); if (!d) { d = document.createElement("div"); d.className = "of-balao"; overlay.append(d); balaoDiv.set(p, d); } return d; };
  const rotulo = document.createElement("div"); rotulo.className = "of-rot mono"; overlay.append(rotulo);
  let hover = null;
  const projeta = (obj, y) => { obj.getWorldPosition(v3); v3.y += y; v3.project(camera); return [(v3.x + 1) / 2 * host.clientWidth, (1 - v3.y) / 2 * host.clientHeight, v3.z < 1 && v3.z > -1]; };

  const anima = (p, dt, t) => {
    const r = p.root, alvo = p.caminho[0];
    let andando = false;
    if (p.fp) { /* movido pelo teclado */ }
    else if (alvo) {
      const dx = alvo.x - r.position.x, dz = alvo.z - r.position.z, d = Math.hypot(dx, dz), v = (p.bebe ? 2.2 : p.cachorro ? 1.9 : p.chefe ? 1.6 : 1.3) * dt;
      if (d > v) { r.position.x += dx / d * v; r.position.z += dz / d * v; const ang = Math.atan2(dx, dz); r.rotation.y += Math.atan2(Math.sin(ang - r.rotation.y), Math.cos(ang - r.rotation.y)) * Math.min(1, dt * 10); andando = true; }
      else {
        r.position.x = alvo.x; r.position.z = alvo.z; if (alvo.olha !== undefined) r.rotation.y = alvo.olha; if (alvo.senta) p.sentado = true; p.caminho.shift();
        if (!p.caminho.length && p.lugar?.cafe && p.xicara && p.volta) { p.xicara.visible = true; p.fala = pick(["Café passado na hora. Recarregando bateria.", "Robô também precisa de cafeína.", "Pausa de 5 minutos, não conta pro Mestre.", "Esse café tem gosto de óleo 10W40. Amei."]); p.falaAte = t + 4; }
        if (!p.caminho.length && p.visita) { const q = p.visita; p.visita = null; p.fala = pick(["Brrrrum!", "Papá!", "Gerente chegou! Bibi!", "Dá! Dá!", "Reunião de gerência: bibi fom fom."]); p.falaAte = t + 3; q.fala = q.cachorro ? "Au au! Oi, chefinho!" : q.chefe ? "Esse é o meu herdeiro. O futuro da ANDR STUDIOS." : q === vanessa ? "Filho, cuidado com a motoquinha!" : pick(["Bom dia, senhor Gerente.", "Relatório pronto, Gerente Romeu.", "Sim, chefinho. Vou acelerar."]); q.falaAte = t + 4; }
        if (!p.caminho.length && p.pedeBifinho) { const rb = p.pedeBifinho; p.pedeBifinho = null; p.fala = pick(["Au! Tem bifinho?", "Bifinho, por favor. Sou segurança.", "Olhinho pidão ativado.", "Só um bifinho e eu esqueço que você dormiu."]); p.falaAte = t + 3.5; p.pula = t + 0.8; rb.fala = pick(["Robôs não carregam bifinho, Lino.", "Toma, mas não conta pro Mestre.", "Meu protocolo proíbe bifinho."]); rb.falaAte = t + 4; }
        if (!p.caminho.length && p.anuncia) { p.anuncia = false; p.fala = chefe.fala(); p.falaAte = t + 5; }
        if (!p.caminho.length && p.sumir) { p.sumir = false; p.ausente = true; r.visible = false; p.voltaEm = t + 90; }
      }
    } else if (p.ausente) { if (t > p.voltaEm) { p.ausente = false; r.visible = true; voltar(p); } }
    else { p.espera -= dt; if (p.espera <= 0) decide(p, t); }
    if (p.chefe) r.position.y = p.sentado && Math.hypot(r.position.x - trono.x, r.position.z - trono.z) < 0.1 ? 0.25 : 0;
    if (p.cachorro) {
      const sw = andando ? Math.sin(t * 14) * 0.6 : 0;
      p.patas.forEach((m, i) => { m.rotation.x = i % 2 ? sw : -sw; });
      p.rabo.rotation.y = Math.sin(t * (andando ? 18 : 8)) * 0.6;
      p.corpo.position.y = p.pula > t ? Math.abs(Math.sin((p.pula - t) * 12)) * 0.3 : 0;
      return;
    }
    if (p.bebe) { p.pernaE.rotation.x = p.pernaD.rotation.x = -1.4; p.bracoE.rotation.x = p.bracoD.rotation.x = -1.3; p.corpo.position.y = -0.36 + (andando ? Math.abs(Math.sin(t * 20)) * 0.03 : 0); p.cabeca.rotation.y = Math.sin(t * 2) * 0.3; if (p.apanha > t) p.root.rotation.z = Math.sin(t * 40) * 0.1; else p.root.rotation.z = 0; return; }
    const sw = andando ? Math.sin(t * 9 + p.fase) * 0.6 : 0;
    p.corpo.position.y = p.sentado ? -0.36 : (andando ? Math.abs(Math.sin(t * 9 + p.fase)) * 0.04 : 0);
    p.corpo.position.z = p.sentado ? -0.05 : 0;
    p.pernaE.rotation.x = p.sentado ? -1.5 : sw; p.pernaD.rotation.x = p.sentado ? -1.5 : -sw;
    const digita = p.sentado && (p.est === "run" || p.est === "boss");
    p.bracoE.rotation.x = digita ? -1.1 + Math.sin(t * 22 + p.fase) * 0.12 : p.sentado ? -0.9 : -sw * 0.8;
    p.bracoD.rotation.x = digita ? -1.1 + Math.cos(t * 22 + p.fase) * 0.12 : p.sentado ? -0.9 : sw * 0.8;
    p.bracoD.rotation.z = 0; p.bracoE.rotation.z = 0;
    p.tronco.rotation.set(p.est === "off" && p.sentado ? 0.9 : 0, 0, 0);
    p.cabeca.rotation.x = p.est === "off" && p.sentado ? 0.4 : 0;
    p.cabeca.rotation.y = !andando && !p.sentado ? Math.sin(t * 0.7 + p.fase) * 0.4 : 0;
    if (p.xicara?.visible && !andando) { p.bracoD.rotation.x = -1.3 - Math.max(0, Math.sin(t * 1.2 + p.fase)) * 0.9; }
    if (p.est === "warn" && !andando) { p.bracoD.rotation.x = -2.9; p.bracoD.rotation.z = Math.sin(t * 6) * 0.25; }
    if (p.est === "bad" && p.sentado) { p.tronco.rotation.z = Math.sin(t * 2 + p.fase) * 0.05; p.cabeca.rotation.y = Math.sin(t * 7) * 0.3; }
    if (p.chefe && p.anuncia === false && p.fala && t < p.falaAte && !andando) { p.bracoE.rotation.x = -2.4 + Math.sin(t * 5) * 0.3; p.bracoE.rotation.z = 0.3; }
    if (p.chefe && p.golpe > t) { p.bracoD.rotation.x = -2.6 + (0.3 - (p.golpe - t)) * 8; }
    if (p.petista) { // encostado no balcão, braços cruzados; às vezes ergue o cartaz
      p.tronco.rotation.z = 0.18; p.root.position.y = 0;
      const ergue = p.protesto > t;
      p.bracoE.rotation.x = ergue ? -2.8 : -1.3; p.bracoE.rotation.z = ergue ? 0.2 : -0.9;
      p.bracoD.rotation.x = ergue ? -2.9 + Math.sin(t * 10) * 0.2 : -0.3; p.bracoD.rotation.z = 0;
      p.cabeca.rotation.y = Math.sin(t * 0.5) * 0.5;
    }
    if (p.apanha > t) { const k = p.apanha - t; p.corpo.position.y += Math.abs(Math.sin(k * 18)) * 0.25; p.corpo.rotation.z = Math.sin(t * 45) * 0.18; p.bracoE.rotation.x = -2.8; p.bracoD.rotation.x = -2.8; } else p.corpo.rotation.z = 0;
    if (p.icone) { p.icone.position.y = (p.sentado ? 1.85 : 2.25) + Math.sin(t * 3 + p.fase) * 0.05; if (p.est === "off") p.icone.material.opacity = 0.5 + 0.5 * Math.sin(t * 2); }
    if (p.fumaca) p.fumaca.forEach((m) => { const k = (t * 0.4 + m.userData.k) % 1; m.position.set(p.desk.x + Math.sin(k * 9) * 0.15, 1.2 + k * 1.4, p.desk.tz); m.scale.setScalar(0.6 + k * 2.2); m.material.opacity = 0.55 * (1 - k); });
  };

  const fpAnda = (dt) => {
    const f = (teclas.w || teclas.arrowup ? 1 : 0) - (teclas.s || teclas.arrowdown ? 1 : 0), s = (teclas.d || teclas.arrowright ? 1 : 0) - (teclas.a || teclas.arrowleft ? 1 : 0);
    const r = mestre.root, v = 3.2 * dt;
    const R = 0.28, bate = (x, z) => colisores.some(([x0, x1, z0, z1]) => x + R > x0 && x - R < x1 && z + R > z0 && z - R < z1);
    if (f || s) { const nx = r.position.x + (-Math.sin(yaw) * f + Math.cos(yaw) * s) * v, nz = r.position.z + (-Math.cos(yaw) * f - Math.sin(yaw) * s) * v; if (!bate(nx, r.position.z)) r.position.x = nx; if (!bate(r.position.x, nz)) r.position.z = nz; }
    r.position.x = Math.min(W - 0.4, Math.max(0.4, r.position.x)); r.position.z = Math.min(zB - 0.4, Math.max(0.4, r.position.z));
    r.rotation.y = yaw + Math.PI; r.position.y = 0;
    camera.position.set(r.position.x, 1.68, r.position.z); camera.rotation.set(pitch, yaw, 0);
  };

  const loop = () => {
    if (!host.isConnected) { renderer.dispose(); return; }
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, relogio.getDelta()), t = relogio.elapsedTime;
    if (t - ultTela > 0.08) { pintaTela(); ultTela = t; }
    vapor.forEach((m) => { const k = (t * 0.5 + m.userData.k) % 1; m.position.set(W - 0.4 + Math.sin(k * 8) * 0.04, 1.2 + k * 0.6, zBC + 2.25); m.material.opacity = 0.4 * (1 - k); });
    piscas.forEach((b, i) => { b.visible = (Math.floor(t * 2) + i) % 3 !== 0; });
    pessoas.forEach((p) => anima(p, dt, t));
    if (fp) fpAnda(dt); else if (voo) { voo.t = Math.min(1, voo.t + 0.02); const e = 1 - Math.pow(1 - voo.t, 3); camera.position.lerpVectors(voo.de[0], voo.para[0], e); controls.target.lerpVectors(voo.de[1], voo.para[1], e); if (voo.t >= 1) voo = null; controls.update(); } else controls.update();
    for (let i = efeitos.length - 1; i >= 0; i--) if (t > efeitos[i].ate) { efeitos[i].objs.forEach((o) => { scene.remove(o); o.geometry?.dispose(); }); efeitos.splice(i, 1); }
    if (t > proxFala) { const cand = pessoas.filter((p) => p.j && p.est !== "off"); const r = Math.random(); const p = r < 0.12 && !mestre.ausente ? mestre : r < 0.22 ? petista : pick(cand); if (p && !(p.fala && t < p.falaAte)) { p.fala = p.chefe ? chefe.fala() : p.petista ? pick(FALA_PETISTA) : p.j._fala; p.falaAte = t + 4.5; } proxFala = t + 3 + Math.random() * 3; }
    aviso.hidden = !mestre.ausente; aviso.textContent = "O Mestre saiu para dar palestra. Use “Voltar ao escritório”.";
    renderer.render(scene, camera);
    pessoas.forEach((p) => { const ativo = p.fala && t < p.falaAte && (p.root.visible || p.fp); const d = balaoDiv.get(p); if (!ativo) { if (d) d.style.display = "none"; return; } const [x, y, vis] = p.fp ? [host.clientWidth / 2, host.clientHeight - 40, true] : projeta(p.cabeca, p.cachorro ? 0.5 : 0.75); const b = balao(p); b.textContent = p.fala; b.style.display = vis ? "block" : "none"; b.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`; });
    if (hover && hover.root.visible && !hover.fp) { const [x, y] = projeta(hover.root, -0.1); rotulo.style.display = "block"; rotulo.textContent = hover.nome + (fp ? (hover.cachorro || hover.bebe || hover === vanessa ? "" : " · clique para chicotear") : ""); rotulo.style.transform = `translate(${x}px, ${y}px) translate(-50%, 6px)`; } else rotulo.style.display = "none";
  };

  // ---------- câmeras ----------
  const centro = new THREE.Vector3(cxC, 0, czC);
  const vistas = {
    geral: [new THREE.Vector3(cxC, Math.max(W, zB) * 0.55, zB + zB * 0.55), centro.clone()],
    templo: [new THREE.Vector3(tp.x - 2, 6, FUNDO + 6), new THREE.Vector3(tp.x, 0.8, 2.6)],
    reuniao: [new THREE.Vector3(reu.x1 + 3, 6.5, FUNDO + 6), new THREE.Vector3(reu.mid - 1.5, 1, 3.3)],
    copa: [new THREE.Vector3(copaX0 - 5, 7, zB + 3), new THREE.Vector3(copaX0 + COPA / 2, 0.5, (zB + zBC) / 2)],
    recepcao: [new THREE.Vector3(rec.x + 4, 4.5, zB + 5), new THREE.Vector3(rec.x, 1, rec.z)],
  };
  let voo = null;
  const voar = (k) => { if (fp) sairFp(); voo = { de: [camera.position.clone(), controls.target.clone()], para: vistas[k], t: 0 }; };
  camera.position.copy(vistas.geral[0]); controls.target.copy(vistas.geral[1]);
  controls.addEventListener("start", () => { voo = null; });

  const btnFp = document.createElement("button"), btnCh = document.createElement("button");
  const entrarFp = () => {
    if (mestre.ausente) trazerMestre(false);
    fp = true; mestre.fp = true; mestre.caminho = []; mestre.volta = null; mestre.sentado = false; mestre.anuncia = false; mestre.sumir = false;
    mestre.root.position.set(trono.x + 1.9, 0, FUNDO - 1.2);
    mestre.root.visible = false; controls.enabled = false; voo = null; yaw = Math.PI; pitch = -0.08; camera.fov = 70; camera.updateProjectionMatrix();
    btnFp.textContent = "Sair do personagem"; btnFp.classList.add("on"); btnFp.blur(); hud.hidden = false;
  };
  const sairFp = () => {
    fp = false; mestre.fp = false; mestre.root.visible = true; controls.enabled = true; camera.fov = 38; camera.updateProjectionMatrix();
    camera.position.copy(vistas.geral[0]); controls.target.copy(vistas.geral[1]); mestre.espera = 4; btnFp.textContent = "Jogar como Mestre"; btnFp.classList.remove("on"); hud.hidden = true; Object.keys(teclas).forEach((k) => (teclas[k] = false));
  };
  const trazerMestre = (voa = true) => {
    if (fp) sairFp();
    Object.assign(mestre, { ausente: false, sumir: false, anuncia: false, caminho: [], volta: null, sentado: true, espera: 8 });
    mestre.root.visible = true; mestre.root.position.set(trono.x, 0.25, trono.z); mestre.root.rotation.y = 0;
    mestre.fala = "Voltei. Sentiram a minha energia?"; mestre.falaAte = relogio.elapsedTime + 4;
    if (voa) voar("templo");
  };
  const barra = document.createElement("div"); barra.className = "of-cams";
  const botao = (txt, fn, el = document.createElement("button")) => { el.type = "button"; el.className = "btn btn-ghost btn-sm"; el.textContent = txt; el.onclick = fn; barra.append(el); return el; };
  [["geral", "Andar todo"], ["templo", "Sala do Mestre"], ["reuniao", "Reunião"], ["copa", "Copa"], ["recepcao", "Recepção"]].forEach(([k, txt]) => botao(txt, () => voar(k)));
  botao("Jogar como Mestre", () => (fp ? sairFp() : entrarFp()), btnFp);
  botao("Voltar ao escritório", () => trazerMestre());
  const hud = document.createElement("div"); hud.className = "of-hud mono"; hud.hidden = true; hud.textContent = "WASD anda · arraste olha · ESPAÇO ou clique chicoteia · F discursa · Q volta à sala · Esc sai"; overlay.append(hud);
  host.append(barra);
  host.tabIndex = 0;

  const MOV = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
  const chicotearFrente = () => {
    let melhor = null, dm = 3.2; const px = mestre.root.position.x, pz = mestre.root.position.z, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    pessoas.forEach((q) => { if (q.chefe || !q.root.visible) return; const dx = q.root.position.x - px, dz = q.root.position.z - pz, d = Math.hypot(dx, dz); if (d < dm && (dx * fx + dz * fz) / (d || 1) > 0.5) { melhor = q; dm = d; } });
    if (melhor) chicotear(melhor, relogio.elapsedTime); else { mestre.golpe = relogio.elapsedTime + 0.3; }
  };
  const kd = (e) => {
    if (!host.isConnected) { window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true); return; }
    if (!fp || /input|textarea|select/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase(); e.preventDefault(); e.stopPropagation();
    if (k === "escape") return sairFp();
    if (MOV.includes(k)) teclas[k] = true;
    else if (k === " " && !e.repeat) chicotearFrente();
    else if (k === "f" && !e.repeat) { mestre.fala = chefe.fala(); mestre.falaAte = relogio.elapsedTime + 4.5; pessoas.forEach((q) => { if (q.j && Math.random() < 0.3) { q.fala = pick(["Gratidão, Mestre!", "Anotado, Mestre.", "Que visão, Mestre!"]); q.falaAte = relogio.elapsedTime + 3.5; } }); }
    else if (k === "q" && !e.repeat) { mestre.root.position.set(trono.x + 1.9, 0, FUNDO - 1.2); yaw = Math.PI; pitch = -0.08; }
  };
  const ku = (e) => { const k = e.key.toLowerCase(); if (k in teclas) teclas[k] = false; if (fp) e.stopPropagation(); };
  window.addEventListener("keydown", kd, true); window.addEventListener("keyup", ku, true);

  const resize = () => { const w = host.clientWidth, hh = host.clientHeight; if (!w || !hh) return; renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(host); resize();

  // ---------- clique / chicote / arrastar em primeira pessoa ----------
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const alvos = [];
  pessoas.forEach((p) => p.root.traverse((o) => { if (o.isMesh) alvos.push(o); }));
  const achar = (e) => { const r = renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(alvos.filter((o) => o.userData.p.root.visible && !o.userData.p.fp), false)[0]; return hit ? hit.object.userData.p : null; };
  let down = null, ult = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; ult = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (fp && down && ult) { yaw -= (e.clientX - ult[0]) * 0.005; pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - ult[1]) * 0.005)); ult = [e.clientX, e.clientY]; }
    hover = achar(e); renderer.domElement.style.cursor = hover ? (fp ? "crosshair" : "pointer") : fp ? "move" : "grab";
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) {
      const p = achar(e), t = relogio.elapsedTime;
      if (p) {
        if (fp && !p.chefe) chicotear(p, t);
        else if (p.chefe) { p.fala = chefe.fala(); p.falaAte = t + 4; chefe.onClick(); }
        else if (p.j) { p.fala = p.j._fala; p.falaAte = t + 4; onClick(p.j); }
        else { p.fala = p.cachorro ? "Au! Tem bifinho?" : p.bebe ? "Brrrum! Papá!" : p === vanessa ? pick(vanessa.falas) : pick(FALA_PETISTA); p.falaAte = t + 3.5; }
      }
    }
    down = null; ult = null;
  });

  // ---------- luzes (fluorescente branca, estilo Ruptura) ----------
  scene.add(new THREE.HemisphereLight("#ffffff", "#3a4a40", 1.0));
  const sol = new THREE.DirectionalLight("#ffffff", 1.4); sol.position.set(cxC - 10, 30, czC - 12); sol.target.position.copy(centro); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); const sc = sol.shadow.camera; sc.left = -W * 0.7; sc.right = W * 0.7; sc.top = zB * 0.9; sc.bottom = -zB * 0.9; sc.far = 100; sol.shadow.bias = -0.0005;
  scene.add(sol, sol.target);
  const verde = new THREE.PointLight("#00ff66", 4, 9); verde.position.set(reu.mid, 2, 1.5); scene.add(verde);

  loop();
}
