import { h, L, STATUS_COLOR, PRIO_COLOR, STATUSES } from "./util.js";
import { setTaskStatus } from "./data.js";
import { statusSelect, toast } from "./ui.js";

/** Kanban com arrastar e soltar, atualização otimista e "Desfazer". Em telas pequenas usa o seletor de status. */
export function kanban({ tasks, today, columns, refresh }) {
  const state = tasks.map((t) => ({ ...t }));
  const root = h("div", { class: "kanban" });
  const find = (id) => state.find((x) => x.id === id);

  async function move(id, to) {
    const t = find(id); if (!t || t.status === to) return;
    const from = t.status, v = t.version; t.status = to; draw();
    const r = await setTaskStatus(id, v, to);
    if (!r.ok) { t.status = from; draw(); toast(r.error, { kind: "err" }); return; }
    t.version = r.version; draw();
    toast(`T-${t.seq} movida.`, { actionLabel: "Desfazer", onAction: async () => {
      const u = await setTaskStatus(id, t.version, from);
      if (u.ok) { t.status = from; t.version = u.version; draw(); } else toast(u.error, { kind: "err" });
    } });
  }

  function card(t) {
    const late = t.due_date && t.due_date < today && !["concluido", "cancelado"].includes(t.status);
    const sel = statusSelect(t, async (...a) => { const r = await setTaskStatus(...a); if (r.ok) { t.status = a[2]; t.version = r.version; setTimeout(draw, 0); } return r; });
    return h("li", { class: "row kcard", draggable: "true", style: { "--bar-c": PRIO_COLOR[t.priority] }, ondragstart: (e) => e.dataTransfer.setData("text/plain", t.id) },
      h("a", { href: `#/tarefas/${t.id}` }, t.title),
      h("div", { class: "meta", style: { marginTop: 0 } },
        h("span", { class: "mono" }, `T-${t.seq}`),
        t.projects?.name && h("span", { class: "chip" }, t.projects.name),
        t.due_date && h("span", { class: `chip${late ? " danger" : ""}` }, t.due_date.split("-").reverse().slice(0, 2).join("/"))),
      h("div", { class: "hide-md" }, sel));
  }

  function draw() {
    root.replaceChildren(...columns.map((c) => {
      const items = state.filter((t) => t.status === c);
      const col = h("div", { class: "kcol" },
        h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: STATUS_COLOR[c] } }), h("span", { class: "mono grow" }, L.status[c]), h("span", { class: "mono" }, items.length)),
        h("ul", null, ...items.map(card), !items.length && h("li", { class: "muted small", style: { textAlign: "center", padding: "16px 0" } }, "Solte tarefas aqui")));
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", () => col.classList.remove("over"));
      col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("over"); const id = e.dataTransfer.getData("text/plain"); if (id) move(id, c); });
      return col;
    }));
  }
  draw(); void STATUSES; void refresh;
  return root;
}
