import { describe, it, expect } from "vitest";
import { todayISO, addDaysISO, fmtDate, isOverdue, spLocalToISO, taskFromForm } from "../../js/util.js";

const fd = (o) => ({ get: (k) => (k in o ? o[k] : null) });

describe("datas (America/Sao_Paulo)", () => {
  it("hoje usa o fuso de São Paulo, não UTC", () => {
    expect(todayISO(new Date("2026-10-03T01:30:00Z"))).toBe("2026-10-02");
    expect(todayISO(new Date("2026-10-03T03:00:00Z"))).toBe("2026-10-03");
  });
  it("data sem horário não volta um dia", () => { expect(fmtDate("2026-10-05")).toMatch(/05/); expect(fmtDate("2026-10-05")).toMatch(/out/i); });
  it("soma de dias e atraso", () => {
    expect(addDaysISO("2026-10-30", 3)).toBe("2026-11-02");
    expect(isOverdue("2026-10-01", "a_fazer", "2026-10-02")).toBe(true);
    expect(isOverdue("2026-10-01", "concluido", "2026-10-02")).toBe(false);
    expect(isOverdue("2026-10-02", "a_fazer", "2026-10-02")).toBe(false);
  });
  it("horário local de SP vira UTC-3", () => { expect(spLocalToISO("2026-10-09T15:00")).toBe("2026-10-09T18:00:00.000Z"); });
});

describe("validação do formulário de tarefa", () => {
  it("exige título e limita tamanho", () => {
    expect(taskFromForm(fd({ title: "  " })).error).toBeTruthy();
    expect(taskFromForm(fd({ title: "x".repeat(301) })).error).toBeTruthy();
    expect(taskFromForm(fd({ title: "ok" })).value.title).toBe("ok");
  });
  it("rejeita enum e data inválidos", () => {
    expect(taskFromForm(fd({ title: "x", priority: "critica" })).error).toBeTruthy();
    expect(taskFromForm(fd({ title: "x", due_date: "09/10/2026" })).error).toBeTruthy();
    expect(taskFromForm(fd({ title: "x", due_date: "2026-10-09", priority: "alta", tags: "a, b" })).value).toMatchObject({ due_date: "2026-10-09", priority: "alta", tags: ["a", "b"] });
  });
});
