import { byDescendingValue } from "./chart-order";
import { monthKey, type Category, type Transaction } from "./store";

export type IncomeShareRow = { id: string; name: string; icon?: string | undefined; color: string; value: number; pct: number };

/** Receita do mês e quanto dela cada categoria usou (gasto ÷ receita do mesmo mês). */
export function incomeShare(transactions: readonly Transaction[], categories: readonly Category[], month: string) {
  const txs = transactions.filter((t) => monthKey(t.date) === month);
  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const pct = (v: number) => (income > 0 ? Math.round((v / income) * 100) : 0);
  const rows: IncomeShareRow[] = byDescendingValue(categories.map((c) => {
    const value = txs.filter((t) => t.type === "expense" && t.categoryId === c.id).reduce((a, t) => a + t.amount, 0);
    return { id: c.id, name: c.name, icon: c.icon, color: c.color, value, pct: pct(value) };
  }).filter((r) => r.value > 0));
  const spent = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  return { income, rows, spent, spentPct: pct(spent), left: income - spent };
}
