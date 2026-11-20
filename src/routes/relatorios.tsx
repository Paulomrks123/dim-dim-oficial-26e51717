import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/AppShell";
import { brl, monthKey, monthLabel, MONTHS, totals, useStore } from "@/lib/store";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [
    { title: "Relatórios — Meu Dim Dim" },
    { name: "description", content: "Evolução mensal e gastos por categoria em gráficos." },
    { property: "og:title", content: "Relatórios — Meu Dim Dim" },
    { property: "og:description", content: "Gráficos de receitas, despesas e categorias." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 };

function Page() {
  const { transactions, categories } = useStore();
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)));
  const data = months.map((k) => { const t = totals(transactions.filter((x) => monthKey(x.date) === k)); return { k, name: MONTHS[Number(k.split("-")[1]) - 1]!.slice(0, 3), Receitas: t.income, Despesas: t.expense, Saldo: t.balance }; });
  const byCat = categories.map((c) => ({ ...c, value: transactions.filter((t) => t.type === "expense" && t.categoryId === c.id).reduce((a, t) => a + t.amount, 0) })).filter((c) => c.value > 0);
  const past = [...new Set(transactions.map((t) => monthKey(t.date)))].sort().reverse();

  return (
    <AppShell title="Relatórios" subtitle="Receitas vs Despesas">
      <section className="analytics-panel glass-card p-5">
        <h2 className="mb-4 font-semibold">Evolução Mensal</h2>
        <div className="h-72"><ResponsiveContainer><BarChart data={data} margin={{ left: -20, right: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--muted-foreground)" fontSize={12} />
          <Tooltip formatter={(v: number) => brl(v)} contentStyle={tip} />
          <Legend />
          <Bar dataKey="Receitas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Despesas" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
        </BarChart></ResponsiveContainer></div>
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="glass-card p-5">
          <h2 className="font-semibold">Gastos por Categoria</h2>
          <p className="text-xs text-muted-foreground">Distribuição das suas despesas no período</p>
          {byCat.length ? <div className="report-pie h-96"><ResponsiveContainer><PieChart>
            <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{byCat.map((c) => <Cell key={c.id} fill={c.color} stroke="none" />)}</Pie>
            <Tooltip formatter={(v: number) => brl(v)} contentStyle={tip} /><Legend formatter={(v: string) => { const c = categories.find((x) => x.name === v); return c?.icon ? `${c.icon} ${v}` : v; }} />
          </PieChart></ResponsiveContainer></div> : <p className="py-16 text-center text-sm text-muted-foreground">Sem dados.</p>}
        </section>
        <section className="glass-card p-5">
          <h2 className="mb-3 font-semibold">Meses Anteriores</h2>
          <ul className="divide-y divide-border">
            {past.length === 0 && <li className="py-4 text-sm text-muted-foreground">Nenhum mês registrado.</li>}
            {past.map((k) => { const t = totals(transactions.filter((x) => monthKey(x.date) === k)); return (
              <li key={k}><Link to="/mes/$monthKey" params={{ monthKey: k }} className="flex justify-between py-3 hover:text-primary">
                <span>{monthLabel(k)}</span><span className={t.balance >= 0 ? "text-primary" : "text-destructive"}>{brl(t.balance)}</span></Link></li>
            ); })}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
