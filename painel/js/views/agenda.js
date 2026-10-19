import { h } from "../util.js";
import { pageHead } from "../ui.js";

// Agenda: as 3 contas Google numa visualização só (embed oficial do Google Agenda).
// Funciona no navegador logado na contato@andersonbrito.com, que tem acesso às outras duas agendas.
// Só os IDs públicos das agendas aparecem aqui; os eventos só carregam para quem tem permissão no Google.
export const CALENDARS = [
  { id: "contato@andersonbrito.com", label: "Pessoal / contato", color: "#FF4F32" },
  { id: "2d1bce9ba588e76443a59bca6401e68786350ff713cacf315858c3f704a3b629@group.calendar.google.com", label: "Compromissos", color: "#F5A524" },
  { id: "anderson@doti.gg", label: "DOTI", color: "#3DDC84" },
  { id: "theilmar@gmail.com", label: "theilmar", color: "#9B87FF" },
  { id: "pt-br.brazilian#holiday@group.v.calendar.google.com", label: "Feriados", color: "#7E847D" },
];

export function calendarEmbed(mode = "WEEK", height = 640) {
  const q = new URLSearchParams({ ctz: "America/Sao_Paulo", mode, showTitle: "0", showPrint: "0", showTabs: "0", showCalendars: "0", showTz: "0", wkst: "2", hl: "pt_BR" });
  for (const c of CALENDARS) { q.append("src", c.id); q.append("color", c.color); }
  return h("div", { class: "gcal", style: { height: `${height}px` } },
    h("iframe", { src: `https://calendar.google.com/calendar/embed?${q}`, title: "Google Agenda", loading: "lazy", referrerpolicy: "no-referrer-when-downgrade" }));
}

export default async function agenda({ query, go }) {
  const mode = ["WEEK", "MONTH", "AGENDA"].includes(query.modo) ? query.modo : "WEEK";
  const tab = (m, label) => h("button", { type: "button", class: "chip" + (mode === m ? " on" : ""), onclick: () => go(`/agenda?modo=${m}`) }, label);
  return h("div", { class: "page" },
    pageHead("Agenda", "3 contas google em uma", h("a", { class: "btn btn-ghost btn-sm", href: "https://calendar.google.com/calendar/r/eventedit", target: "_blank", rel: "noopener" }, "+ Evento no Google")),
    h("div", { class: "mfilters" }, tab("WEEK", "Semana"), tab("MONTH", "Mês"), tab("AGENDA", "Lista"),
      h("div", { class: "grow" }),
      ...CALENDARS.map((c) => h("span", { class: "mono legend" }, h("i", { style: { background: c.color } }), c.label))),
    calendarEmbed(mode, 720),
    h("p", { class: "muted small", style: { marginTop: "10px" } }, "Mostra os eventos se este navegador estiver logado no Google da contato@andersonbrito.com. Aniversários da theilmar: importe os contatos dela na contato@ e ative a agenda Aniversários."));
}
