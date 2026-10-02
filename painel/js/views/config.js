import { h, fmtDateTime, L } from "../util.js";
import { pageHead, panel, alertBox, list, toast } from "../ui.js";
import { MODULES } from "../modules.js";

export default async function config({ sb, member, refresh }) {
  if (member.role !== "owner") return h("div", { class: "page" }, alertBox("Apenas o dono acessa as configurações."));
  const { data: integrations } = await sb.from("integrations").select("id, name, kind, key_prefix, scopes, created_at, last_used_at, revoked_at").order("created_at", { ascending: false });
  const { data: google } = await sb.from("google_connections").select("google_email, scopes, connected_at").maybeSingle();
  const revoke = async (i) => {
    if (!confirm(`Revogar a integração "${i.name}"? Ela perde o acesso imediatamente.`)) return;
    const { error } = await sb.from("integrations").update({ revoked_at: new Date().toISOString() }).eq("id", i.id).is("revoked_at", null);
    if (error) return toast("Não foi possível revogar.", { kind: "err" });
    toast("Integração revogada."); refresh();
  };
  return h("div", { class: "page" },
    pageHead("Configurações", "conta e integrações"),
    panel("Conta", { color: "#3da7ff" }, h("p", null, `${member.email} · ${member.role === "owner" ? "dono" : "membro"}`)),
    panel("Integrações (ChatGPT, Claude, Codex)", { color: "#22c55e" },
      h("p", { class: "note" }, "A API e o MCP para agentes rodam como Edge Functions do Supabase (ver docs). Enquanto não estiverem publicadas, não é possível criar chaves por aqui. Integrações já existentes aparecem abaixo e podem ser revogadas."),
      (integrations || []).length ? list(integrations.map((i) => h("li", { class: "row" }, h("div", { class: "grow" }, h("div", { class: "title" }, `${i.name} `, h("span", { class: "mono" }, `(${i.kind}) · aos_${i.key_prefix}…`)), h("div", { class: "small muted" }, `${i.scopes.join(", ")} · ${i.revoked_at ? "revogada " + fmtDateTime(i.revoked_at) : i.last_used_at ? "último uso " + fmtDateTime(i.last_used_at) : "nunca usada"}`)), !i.revoked_at && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => revoke(i) }, "Revogar")))) : h("p", { class: "muted small" }, "Nenhuma integração criada.")),
    panel("Conta Google (Calendar e Gmail)", { color: "#7b61ff" },
      google ? h("div", { class: "stack" }, h("p", null, `Conectada: ${google.google_email} · desde ${fmtDateTime(google.connected_at)}`), h("p", { class: "small muted" }, "Sincronização de agenda e leitura de e-mails: não implementadas."))
        : h("p", { class: "muted" }, "Não conectada. A conexão exige uma Edge Function (guarda o token criptografado no servidor) e ainda não está publicada.")),
    panel("Módulos", { color: "#8888a0" }, h("ul", { class: "stack small", style: { listStyle: "none" } }, ...MODULES.map((m) => h("li", null, `${m.label}: `, h("span", { class: "muted" }, m.enabled ? "ativo" : "planejado, ainda não disponível"))))));
}
void L;
