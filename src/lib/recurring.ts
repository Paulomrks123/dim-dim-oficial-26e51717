import { useCloudSync } from "@/components/CloudSync";
import { supabase } from "@/integrations/supabase/client";
import { setState } from "@/lib/store";

const pad = (n: number) => String(n).padStart(2, "0");
/** Data de cobrança num mês: dia 31 vira o último dia em meses curtos. */
export function dueDate(year: number, month: number, day: number): string {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${pad(month)}-${pad(Math.min(day, last))}`;
}
/** Primeiro mês de cobrança: este mês se o dia ainda não passou (ou é hoje), senão o próximo. */
export function firstMonth(today: string, day: number): string {
  const [y, m] = today.split("-").map(Number) as [number, number];
  if (dueDate(y, m, day) >= today) return `${y}-${pad(m)}-01`;
  const n = new Date(y, m, 1);
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-01`;
}

/** A transação atual já existe; a repetição começa no mês seguinte. */
export function followingMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  if (year === undefined || month === undefined || !Number.isFinite(year) || !Number.isFinite(month)) throw new Error("Data inválida");
  const next = new Date(year, month, 1);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`;
}

export function useSession() {
  const { session, ready } = useCloudSync();
  return { session, ready };
}

/** Gera cobranças vencidas e traz as despesas automáticas para a lista local (sem duplicar). */
export async function syncRecurring() {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return 0;
  await supabase.rpc("generate_recurring_expenses", {});
  const { data, error } = await supabase.from("recurring_transactions").select("id, description, amount, category_id, date").order("date");
  if (error || !data) return 0;
  let added = 0;
  setState((st) => {
    const seen = new Set(st.syncedRecurring ?? []);
    const fresh = data.filter((r) => !seen.has(r.id));
    added = fresh.length;
    if (!fresh.length) return st;
    return {
      ...st,
      syncedRecurring: [...seen, ...fresh.map((r) => r.id)],
      transactions: [...fresh.map((r) => ({ id: `rec-${r.id}`, type: "expense" as const, amount: Number(r.amount), description: r.description, categoryId: r.category_id ?? undefined, date: r.date })), ...st.transactions],
    };
  });
  return added;
}