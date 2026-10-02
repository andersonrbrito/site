import { h, todayISO, addDaysISO, spStartUTC, spLocalToISO, dayOf, fmtDate, fmtDateTime } from "../util.js";
import { pageHead, panel, empty, alertBox, form, field, input } from "../ui.js";

export default async function agenda({ sb, refresh }) {
  const today = todayISO(), to = addDaysISO(today, 30);
  const [timed, allDay, deadlines] = await Promise.all([
    sb.from("events").select("id, title, location, starts_at").is("archived_at", null).eq("all_day", false).gte("starts_at", spStartUTC(today)).lt("starts_at", spStartUTC(addDaysISO(to, 1))),
    sb.from("events").select("id, title, location, start_date").is("archived_at", null).eq("all_day", true).gte("start_date", today).lte("start_date", to),
    sb.from("tasks").select("id, seq, title, due_date").is("archived_at", null).not("status", "in", "(concluido,cancelado)").gte("due_date", today).lte("due_date", to),
  ]);
  const items = [
    ...(timed.data || []).map((e) => ({ day: dayOf(e.starts_at), sort: e.starts_at, title: e.title, meta: fmtDateTime(e.starts_at) + (e.location ? ` · ${e.location}` : ""), kind: "ev" })),
    ...(allDay.data || []).map((e) => ({ day: e.start_date, sort: `${e.start_date}T00`, title: e.title, meta: "Dia inteiro", kind: "ev" })),
    ...(deadlines.data || []).map((t) => ({ day: t.due_date, sort: `${t.due_date}T23`, title: t.title, meta: `Prazo de entrega · T-${t.seq}`, href: `#/tarefas/${t.id}`, kind: "due" })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));
  const days = [...new Set(items.map((i) => i.day))];

  const create = form(async (fd) => {
    const title = (fd.get("title") || "").trim(), allD = fd.get("all_day") === "on";
    if (!title) return { ok: false, error: "Informe o título." };
    const row = { title, all_day: allD, location: (fd.get("location") || "").trim() || null };
    if (allD) { if (!fd.get("start_date")) return { ok: false, error: "Informe a data do dia inteiro." }; row.start_date = fd.get("start_date"); }
    else {
      if (!fd.get("starts_local")) return { ok: false, error: "Informe o início (data e hora)." };
      row.starts_at = spLocalToISO(fd.get("starts_local")); if (fd.get("ends_local")) row.ends_at = spLocalToISO(fd.get("ends_local"));
      if (row.ends_at && row.ends_at < row.starts_at) return { ok: false, error: "O fim precisa ser depois do início." };
    }
    const { error } = await sb.from("events").insert(row);
    if (error) return { ok: false, error: "Não foi possível salvar o compromisso." };
    refresh(); return { ok: true, message: "Compromisso criado." };
  }, {},
    field("Título", input("title", { required: true })),
    h("label", { class: "flex small" }, h("input", { type: "checkbox", name: "all_day" }), "Dia inteiro"),
    h("div", { class: "grid2" },
      field("Início (com horário)", input("starts_local", { type: "datetime-local" })), field("Fim (opcional)", input("ends_local", { type: "datetime-local" })),
      field("Data (se dia inteiro)", input("start_date", { type: "date" })), field("Local", input("location"))),
    h("button", { class: "btn", type: "submit" }, "Criar compromisso"));

  return h("div", { class: "page" },
    pageHead("Agenda", "próximos 30 dias"),
    h("p", { class: "note" }, "Agenda interna do painel. Integração com Google Calendar ainda não configurada. Horários em São Paulo."),
    (timed.error || allDay.error || deadlines.error) && alertBox("Não foi possível carregar a agenda."),
    ...(days.length ? days.map((d) => panel(fmtDate(d), { color: d === today ? "#3da7ff" : "#8888a0" }, h("ul", { class: "stack", style: { listStyle: "none" } }, ...items.filter((i) => i.day === d).map((i) =>
      h("li", { class: "row", style: i.kind === "due" ? { borderColor: "rgba(245,165,36,.4)" } : null }, i.href ? h("a", { href: i.href, class: "title grow" }, i.title) : h("span", { class: "title grow" }, i.title), h("span", { class: `chip ${i.kind === "due" ? "warn" : "accent"}` }, i.meta)))))) : [empty("Nada nos próximos 30 dias.")]),
    panel("Novo compromisso", { color: "#22c55e" }, create));
}
