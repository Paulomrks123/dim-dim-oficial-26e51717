import type { Transaction } from "@/lib/store";

export type MetricsRange = 7 | 14 | 30;
export type DailyMetric = { date: string; income: number; expense: number; result: number };
export type FinancialMetrics = {
  days: DailyMetric[];
  previous: DailyMetric[];
  totals: { income: number; expense: number; result: number };
  previousTotals: { income: number; expense: number; result: number };
};

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function localDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year!, month! - 1, day!, 12, 0, 0, 0);
}
function shiftDay(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
function aggregate(transactions: readonly Transaction[], start: Date, count: number): DailyMetric[] {
  const days = Array.from({ length: count }, (_, index) => {
    const date = dateKey(shiftDay(start, index));
    return { date, income: 0, expense: 0, result: 0 };
  });
  const indexByDate = new Map(days.map((day, index) => [day.date, index]));
  for (const transaction of transactions) {
    const index = indexByDate.get(transaction.date);
    if (index === undefined || !Number.isFinite(transaction.amount)) continue;
    const day = days[index]!;
    if (transaction.type === "income") day.income += transaction.amount;
    else if (transaction.type === "expense") day.expense += transaction.amount;
  }
  return days.map((day) => ({ ...day, result: day.income - day.expense }));
}

export function buildFinancialMetrics(
  transactions: readonly Transaction[],
  range: MetricsRange,
  today = new Date(),
): FinancialMetrics {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const currentStart = shiftDay(end, -(range - 1));
  const previousStart = shiftDay(currentStart, -range);
  const days = aggregate(transactions, currentStart, range);
  const previous = aggregate(transactions, previousStart, range);
  const sum = (rows: DailyMetric[]) => rows.reduce(
    (totals, row) => ({
      income: totals.income + row.income,
      expense: totals.expense + row.expense,
      result: totals.result + row.result,
    }),
    { income: 0, expense: 0, result: 0 },
  );
  return { days, previous, totals: sum(days), previousTotals: sum(previous) };
}

export function metricChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function metricStats(values: number[]) {
  if (values.length === 0) return { last: 0, previous: 0, max: 0, min: 0, average: 0 };
  const last = values[values.length - 1] ?? 0;
  const previous = values.length > 1 ? values[values.length - 2] ?? 0 : 0;
  return {
    last,
    previous,
    max: Math.max(...values),
    min: Math.min(...values),
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

export function formatMetricDate(date: string): string {
  return localDate(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
