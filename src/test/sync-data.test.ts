import { describe, expect, it } from "vitest";
import { cloudData, mergeData, type CloudData } from "@/lib/sync-data";

const data = (transactions: CloudData["transactions"]): CloudData => ({ name: "", email: "", categories: [], goals: [], transactions });
const tx = (id: string, amount: number) => ({ id, type: "expense" as const, amount, description: id, date: "2026-11-17" });

describe("Sincronização entre aparelhos", () => {
  it("mantém lançamentos criados em dois aparelhos", () => {
    const merged = mergeData(data([]), data([tx("celular", 10)]), data([tx("tablet", 20)]));
    expect(merged.transactions.map((t) => t.id).sort()).toEqual(["celular", "tablet"]);
  });
  it("aplica uma exclusão feita offline", () => {
    const merged = mergeData(data([tx("a", 10)]), data([]), data([tx("a", 10), tx("b", 20)]));
    expect(merged.transactions.map((t) => t.id)).toEqual(["b"]);
  });
  it("exclui o PIN em texto do conteúdo enviado ao Cloud", () => {
    const payload = cloudData({ ...data([]), pin: "1234", pinHash: "salt:hash" });
    expect(payload).not.toHaveProperty("pin");
    expect(payload.pinHash).toBe("salt:hash");
  });
  it("preserva receitas e despesas entre aparelhos", () => {
    const income = { ...tx("salario", 4350), type: "income" as const };
    expect(mergeData(data([]), data([income]), data([tx("compra", 37.45)])).transactions).toEqual([tx("compra", 37.45), income]);
  });
  it("sincroniza categoria e seu limite", () => {
    const category = { id: "mercado", name: "Mercado", color: "green", limit: 400 };
    const local = { ...data([]), categories: [category] };
    expect(mergeData(data([]), local, data([])).categories).toEqual([category]);
  });
  it("sincroniza metas", () => {
    const goal = { id: "reserva", name: "Reserva", target: 1000, current: 250 };
    expect(mergeData(data([]), { ...data([]), goals: [goal] }, data([])).goals).toEqual([goal]);
  });
  it("sincroniza perfil sem apagar alteração de outro aparelho", () => {
    const merged = mergeData(data([]), { ...data([]), name: "Maria" }, { ...data([]), email: "maria@example.com" });
    expect([merged.name, merged.email]).toEqual(["Maria", "maria@example.com"]);
  });
});