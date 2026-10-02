import { h } from "./util.js";
import { sb, configured } from "./data.js";
import { buildShell } from "./shell.js";
import { visibleModules } from "./modules.js";

const VIEWS = {
  "": () => import("./views/painel.js"), hoje: () => import("./views/hoje.js"), tarefas: () => import("./views/tarefas.js"),
  projetos: () => import("./views/projetos.js"), inbox: () => import("./views/inbox.js"), agenda: () => import("./views/agenda.js"),
  historico: () => import("./views/historico.js"), busca: () => import("./views/busca.js"), config: () => import("./views/config.js"),
};
const TITLES = { "": "Painel", hoje: "Hoje", tarefas: "Tarefas", projetos: "Projetos", inbox: "Inbox", agenda: "Agenda", historico: "Histórico", busca: "Busca", config: "Configurações", menu: "Menu" };
const DETAIL = { tarefas: () => import("./views/tarefa.js"), projetos: () => import("./views/projeto.js") };

const app = document.getElementById("app");
const loginScreen = (msg, busy) => {
  const btn = h("button", { class: "btn", style: { width: "100%", height: "44px" }, type: "button", disabled: !configured || busy }, "Entrar com Google");
  btn.addEventListener("click", async () => {
    btn.disabled = true; btn.textContent = "Redirecionando…";
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}${location.pathname}` } });
    if (error) { btn.disabled = false; btn.textContent = "Entrar com Google"; msgEl.textContent = "Falha ao iniciar o login com Google."; msgEl.hidden = false; }
  });
  const msgEl = h("p", { class: "alert", role: "alert", hidden: !msg }, msg || "");
  app.replaceChildren(h("main", { class: "login", style: { padding: "24px" } }, h("div", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#3da7ff" } }), h("span", { class: "mono" }, "Acesso privado")),
    h("div", { class: "panel-body stack-lg", style: { padding: "24px" } },
      h("div", null, h("div", { class: "mono", style: { marginBottom: "8px" } }, "// andersonbrito.com / painel"), h("h1", null, "Anderson OS"), h("p", { class: "muted", style: { marginTop: "8px" } }, "Tarefas, projetos e agenda em um só lugar.")),
      !configured && h("p", { class: "note" }, "Painel ainda não configurado: faltam a URL e a chave pública do Supabase em painel/js/config.js (veja painel/docs/STATUS.md)."),
      msgEl, btn))));
};

async function start() {
  if (!configured) return loginScreen();
  const { data: { session } } = await sb.auth.getSession();
  if (location.search.includes("code=")) history.replaceState(null, "", location.pathname + (location.hash || "#/"));
  if (!session) return loginScreen();

  // Autorização: precisa estar em app_members (o RLS do banco é a barreira real; isto só evita uma tela vazia).
  const { data: m } = await sb.from("app_members").select("email, role, modules").eq("user_id", session.user.id).maybeSingle();
  if (!m) { await sb.auth.signOut(); return loginScreen("Esta conta Google não tem acesso ao painel."); }
  const member = { userId: session.user.id, email: m.email, role: m.role, modules: m.modules };

  const go = (path) => { const t = "#" + (path.startsWith("/") ? path : "/" + path); if (location.hash === t) render(); else location.hash = t; };
  const signOut = async () => { await sb.auth.signOut(); location.hash = "#/"; location.reload(); };
  const shell = buildShell({ sb, member, go, signOut });
  document.body.className = ""; app.replaceChildren(shell.root);

  let seq = 0;
  async function render() {
    const my = ++seq;
    const raw = location.hash.replace(/^#\/?/, ""), [pathPart, qs = ""] = raw.split("?");
    const parts = pathPart.split("/").filter(Boolean), route = parts[0] || "", query = Object.fromEntries(new URLSearchParams(qs));
    shell.setActive(route, TITLES[route] ?? "");
    shell.main.replaceChildren(h("div", { "aria-busy": "true", class: "stack-lg" }, h("div", { class: "skeleton", style: { height: "32px", width: "180px" } }), h("div", { class: "skeleton", style: { height: "220px" } })));
    const ctx = { sb, member, query, params: parts.slice(1), go, refresh: () => render() };
    try {
      if (route === "menu") { shell.main.replaceChildren(menuView(shell.mods, signOut, member)); return; }
      const allowed = visibleModules(member).some((x) => x.route === route) || route === "busca" || route === "menu";
      if (!allowed) { shell.main.replaceChildren(h("p", { class: "alert" }, "Você não tem acesso a esta área.")); return; }
      const loader = parts.length > 1 && DETAIL[route] ? DETAIL[route] : VIEWS[route];
      if (!loader) { shell.main.replaceChildren(h("p", { class: "alert" }, "Página não encontrada.")); return; }
      const mod = await loader(), node = await mod.default(ctx);
      if (my === seq) { shell.main.replaceChildren(node); window.scrollTo(0, 0); }
    } catch (e) {
      console.error("render_error", e?.message);
      if (my === seq) shell.main.replaceChildren(h("p", { class: "alert", role: "alert" }, "Não foi possível carregar esta tela. Atualize a página."));
    }
  }
  window.addEventListener("hashchange", render);
  window.addEventListener("aos:refresh", () => { const r = location.hash.replace(/^#\/?/, "").split("/")[0].split("?")[0]; if (["", "hoje", "tarefas", "inbox"].includes(r)) render(); });
  sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") location.reload(); });
  render();
}

function menuView(mods, signOut, member) {
  return h("div", { class: "page" }, h("div", { class: "page-head" }, h("div", null, h("div", { class: "mono eyebrow" }, "// navegação"), h("h1", null, "Menu"))),
    h("ul", { class: "stack", style: { listStyle: "none" } }, ...mods.map((m) => h("li", null, h("a", { class: "row", href: "#/" + m.route }, m.label)))),
    h("p", { style: { marginTop: "24px" } }, h("button", { class: "btn btn-ghost", type: "button", onclick: signOut }, `Sair · ${member.email}`)));
}

start();
