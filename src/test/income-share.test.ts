import { describe, expect, it } from "vitest";
import { incomeShare } from "@/lib/income-share";

const categories = [{ id: "o", name: "Outros", color: "#f00" }, { id: "c", name: "Compras", color: "#0f0" }, { id: "x", name: "Casa", color: "#00f" }];
const tx = (id: string, type: "income" | "expense", amount: number, categoryId?: string) => ({ id, type, amount, categoryId, description: id, date: "2026-11-05" });

describe("Receita x categorias", () => {
  const d = incomeShare([tx("r", "income", 4350), tx("a", "expense", 1499, "o"), tx("b", "expense", 2234, "c")], categories, "2026-11");
  it("calcula % da receita por categoria, maior primeiro, sem categorias zeradas", () => {
    expect(d.rows.map((r) => [r.name, r.pct])).toEqual([["Compras", 51], ["Outros", 34]]);
  });
  it("calcula total gasto e sobra", () => {
    expect([d.income, d.spent, d.spentPct, d.left]).toEqual([4350, 3733, 86, 617]);
  });
  it("sem receita a porcentagem é 0", () => {
    expect(incomeShare([tx("a", "expense", 50, "o")], categories, "2026-11").rows[0]?.pct).toBe(0);
  });
});
