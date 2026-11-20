import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Wallet } from "lucide-react";
import { AppShell, StatCard } from "@/components/AppShell";
import { TransactionList } from "@/components/TransactionList";
import { brl, monthKey, monthLabel, totals, useStore } from "@/lib/store";

export const Route = createFileRoute("/mes/$monthKey")({
  head: ({ params }) => ({ meta: [
    { title: `${monthLabel(params.monthKey)} — Meu Dim Dim` },
    { name: "description", content: "Todas as transações do mês selecionado." },
    { property: "og:title", content: `${monthLabel(params.monthKey)} — Meu Dim Dim` },
    { property: "og:description", content: "Detalhes financeiros do mês." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  const { monthKey: mk } = Route.useParams();
  const { transactions } = useStore();
  const list = transactions.filter((t) => monthKey(t.date) === mk).sort((a, b) => b.date.localeCompare(a.date));
  const t = totals(list);
  return (
    <AppShell title={monthLabel(mk)} subtitle="Ver todas as transações do mês"
      actions={<Link to="/dashboard" className="flex items-center gap-1 text-sm text-primary"><ArrowLeft className="h-4 w-4" />Ir para o Dashboard</Link>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Saldo" value={brl(t.balance)} tone="accent" icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Receitas" value={brl(t.income)} tone="primary" icon={<ArrowUpRight className="h-5 w-5" />} />
        <StatCard label="Despesas" value={brl(t.expense)} tone="destructive" icon={<ArrowDownLeft className="h-5 w-5" />} />
      </div>
      <div className="glass-card mt-6 p-5"><TransactionList items={list} /></div>
    </AppShell>
  );
}
