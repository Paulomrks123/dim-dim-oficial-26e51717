import { brl, monthKey, type State } from "./store";

export type ReportState = Pick<State, "name" | "transactions" | "categories" | "goals">;
export type ReportRow = { label: string; values: number[]; date?: string };
export type ReportBlock = { title: string; note: string; tone: string; rows: ReportRow[]; total: number[] | null; extra: { label: string; values: string[] }[] };

const color = (value?: string) => value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#0ea5b7";
export const pct = (v: number, base: number) => base > 0 ? `${Math.round(v / base * 100)}%` : "0%";
export const money = (v: number) => v ? brl(v).replace(/\u00a0/g, " ") : "R$ -";
/** Use the app's registered calendar day, without timezone conversion or year. */
export const reportItemDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** Spreadsheet model shared by the PDF and CSV exports: income, one block per category, summary. */
export function buildReport(state: ReportState, options: { individualTransactions?: boolean } = {}) {
  const months = [...new Set(state.transactions.map((t) => monthKey(t.date)))].sort().slice(-3);
  if (!months.length) months.push(monthKey(new Date().toISOString().slice(0, 10)));
  const zero = () => months.map(() => 0);
  const rowsFor = (items: State["transactions"]) => {
    if (options.individualTransactions) {
      const rows = items.filter((t) => months.includes(monthKey(t.date)))
        .sort((a, b) => b.amount - a.amount)
        .map((t) => ({ label: t.description.trim() || "Sem descrição", date: t.date, values: months.map((m) => m === monthKey(t.date) ? t.amount : 0) }));
      return rows.length ? rows : [{ label: "Sem lançamentos", values: zero() }];
    }
    const map = new Map<string, ReportRow>();
    for (const t of items) {
      const i = months.indexOf(monthKey(t.date)); if (i < 0) continue;
      const label = t.description.trim() || "Sem descrição";
      const row = map.get(label.toLowerCase()) ?? { label, values: zero() };
      row.values[i] = (row.values[i] ?? 0) + t.amount; map.set(label.toLowerCase(), row);
    }
    const sum = (r: ReportRow) => r.values.reduce((a, b) => a + b, 0);
    const rows = [...map.values()].sort((a, b) => sum(b) - sum(a));
    return rows.length ? rows : [{ label: "Sem lançamentos", values: zero() }];
  };
  const totalOf = (rows: ReportRow[]) => months.map((_, i) => rows.reduce((a, r) => a + (r.values[i] ?? 0), 0));
  const blocks: ReportBlock[] = [];
  const incomeRows = rowsFor(state.transactions.filter((t) => t.type === "income"));
  const income = totalOf(incomeRows);
  blocks.push({ title: "RECEITAS", note: "Valores recebidos no mês", tone: "#0ea5b7", rows: incomeRows, total: income, extra: [] });
  const expense = zero();
  const groups = state.categories.map((c) => ({ name: c.name, limit: c.limit ?? 0, tone: color(c.color), items: state.transactions.filter((t) => t.type === "expense" && t.categoryId === c.id) }));
  const orphan = state.transactions.filter((t) => t.type === "expense" && !state.categories.some((c) => c.id === t.categoryId));
  if (orphan.length) groups.push({ name: "Sem categoria", limit: 0, tone: "#6b7280", items: orphan });
  groups.sort((a, b) => b.items.reduce((s, t) => s + t.amount, 0) - a.items.reduce((s, t) => s + t.amount, 0));
  for (const g of groups) {
    const rows = rowsFor(g.items), total = totalOf(rows);
    const extra = [{ label: "% Sobre Receita", values: total.map((v, i) => pct(v, income[i] ?? 0)) }];
    if (g.limit) extra.push({ label: `Limite ${brl(g.limit)}`, values: total.map((v) => `${pct(v, g.limit)}${v > g.limit ? " ⚠" : ""}`) });
    blocks.push({ title: g.name.toUpperCase(), note: g.limit ? `Limite mensal ${brl(g.limit)}` : "Sem limite definido", tone: g.tone, rows, total, extra });
    total.forEach((v, i) => { expense[i] = (expense[i] ?? 0) + v; });
  }
  blocks.push({ title: "RESUMO", note: "Receitas, despesas e saldo do mês", tone: "#0b4f6c", total: null,
    rows: [{ label: "Receitas", values: income }, { label: "Despesas", values: expense }],
    extra: [{ label: "SALDO", values: months.map((_, i) => brl((income[i] ?? 0) - (expense[i] ?? 0)).replace(/\u00a0/g, " ")) }, { label: "% Gasto da Receita", values: expense.map((v, i) => pct(v, income[i] ?? 0)) }] });
  const goals = state.goals.map((g) => [g.name, brl(g.target), brl(g.current), `${g.target > 0 ? Math.round(g.current / g.target * 100) : 0}%${g.deadline ? " · " + new Date(g.deadline + "T12:00:00").toLocaleDateString("pt-BR") : ""}`]);
  return { months, blocks, goals };
}
