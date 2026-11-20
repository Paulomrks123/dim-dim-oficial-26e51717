import { describe, expect, it } from "vitest";
import { buildReport, reportItemDate, type ReportState } from "@/lib/report-data";

const state: ReportState = {
  name: "", goals: [], categories: [{ id: "c", name: "Compras", color: "#22c55e" }],
  transactions: [
    { id: "i", type: "income", date: "2026-11-01", description: "Salário", amount: 4350 },
    { id: "a", type: "expense", date: "2026-11-03", description: "Mercado", amount: 250, categoryId: "c" },
    { id: "b", type: "expense", date: "2026-11-17", description: "Mercado", amount: 40, categoryId: "c" },
  ],
};

describe("Datas cadastradas nas transações do PDF", () => {
  it("usa o dia e mês cadastrados no app, sem ano ou conversão de fuso", () => {
    expect(reportItemDate("2026-11-17")).toBe("17/11");
    expect(reportItemDate("2026-01-01")).toBe("01/01");
  });
  it("preserva a data da receita", () => {
    expect(buildReport(state, { individualTransactions: true }).blocks[0]?.rows[0]?.date).toBe("2026-11-01");
  });
  it("mantém cada despesa separada com sua data mesmo quando a descrição é igual", () => {
    const category = buildReport(state, { individualTransactions: true }).blocks[1];
    expect(category?.rows.map((r) => ({ date: r.date, amount: r.values[0] }))).toEqual([
      { date: "2026-11-03", amount: 250 }, { date: "2026-11-17", amount: 40 },
    ]);
    expect(category?.total).toEqual([290]);
  });
  it("preserva o agrupamento existente do CSV", () => {
    expect(buildReport(state).blocks[1]?.rows).toHaveLength(1);
    expect(buildReport(state).blocks[1]?.total).toEqual([290]);
  });
});