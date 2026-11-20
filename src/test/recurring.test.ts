import { describe, expect, it } from "vitest";
import { dueDate, firstMonth, followingMonth } from "@/lib/recurring";

describe("Gastos recorrentes", () => {
  it("repetição de uma transação salva começa no mês seguinte sem cobrar o mês atual de novo", () => {
    expect(followingMonth("2026-11-10")).toBe("2026-12-01");
    expect(followingMonth("2026-12-31")).toBe("2027-01-01");
  });
  it("dia 31 cai no último dia de meses curtos", () => {
    expect(dueDate(2026, 2, 31)).toBe("2026-02-28");
    expect(dueDate(2026, 4, 31)).toBe("2026-04-30");
  });
  it("primeira cobrança é neste mês se o dia ainda não passou", () => {
    expect(firstMonth("2026-11-10", 10)).toBe("2026-11-01");
    expect(firstMonth("2026-11-10", 15)).toBe("2026-11-01");
  });
  it("primeira cobrança vai para o mês seguinte se o dia já passou", () => {
    expect(firstMonth("2026-11-10", 5)).toBe("2026-12-01");
    expect(firstMonth("2026-12-20", 1)).toBe("2027-01-01");
  });
});