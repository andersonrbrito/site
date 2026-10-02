import { CONFIG } from "./config.js";

export const configured = !!(CONFIG.supabaseUrl && CONFIG.publishableKey);
export const sb = configured
  ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.publishableKey, { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } })
  : null;

export const TASK_COLS = "id, seq, title, description, project_id, area, priority, status, due_date, waiting_for, assignee, tags, notes, completed_at, version, created_at, source, projects(name)";

/** Troca de status atômica com controle de versão. */
export async function setTaskStatus(id, version, status) {
  const { data, error } = await sb.from("tasks").update({ status }).eq("id", id).eq("version", version).select("id, version").maybeSingle();
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  if (!data) return { ok: false, error: "A tarefa mudou enquanto você olhava. Recarregue a página." };
  return { ok: true, version: data.version };
}
