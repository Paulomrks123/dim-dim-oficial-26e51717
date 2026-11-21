import { describe, expect, it } from "vitest";
import { buildFinancialMetrics, metricChange, metricStats } from "@/lib/financial-metrics";
import type { Transaction } from "@/lib/store";

const tx = (id: string, date: string, type: "income" | "expense", amount: number): Transaction => ({
  id, date, type, amount, description: id,
});

describe("métricas financeiras por período", () => {
  it("inclui exatamente os últimos 7 dias e preenche dias sem transação com zero", () => {
    const result = buildFinancialMetrics([
      tx("in", "2026-11-21", "income", 100),
      tx("out", "2026-11-15", "expense", 25),
      tx("old", "2026-11-14", "income", 900),
    ], 7, new Date(2026, 10, 21, 15));
    expect(result.days).toHaveLength(7);
    expect(result.days[0]?.date).toBe("2026-11-15");
    expect(result.days[6]?.date).toBe("2026-11-21");
    expect(result.days[1]?.income).toBe(0);
    expect(result.totals).toEqual({ income: 100, expense: 25, result: 75 });
    expect(result.previousTotals.income).toBe(900);
  });

  it.each([7, 14, 30] as const)("gera %i dias corridos sem deslocamento UTC", (range) => {
    const result = buildFinancialMetrics([], range, new Date(2026, 2, 8, 23, 30));
    expect(result.days).toHaveLength(range);
    expect(result.days.at(-1)?.date).toBe("2026-03-08");
  });

  it("retorna comparação indisponível quando o período anterior não tem valor-base", () => {
    expect(metricChange(50, 0)).toBeNull();
    expect(metricChange(0, 0)).toBe(0);
  });

  it("calcula máximo, mínimo e média sobre os dias, inclusive os dias zerados", () => {
    expect(metricStats([0, 10, 20])).toEqual({ last: 20, previous: 10, max: 20, min: 0, average: 10 });
  });

  it("retorna zeros para intervalos sem registros", () => {
    const result = buildFinancialMetrics([], 14, new Date(2026, 10, 21, 12));
    expect(result.totals).toEqual({ income: 0, expense: 0, result: 0 });
    expect(result.previousTotals).toEqual({ income: 0, expense: 0, result: 0 });
  });
});
