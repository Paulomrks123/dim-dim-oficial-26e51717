import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { AlertTriangle, ChevronDown, Pencil, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { TransactionDialog } from "@/components/TransactionDialog";
import { TransactionList } from "@/components/TransactionList";
import { useDetails } from "@/components/DetailsDialog";
import { brl, monthKey, MONTHS, setState, totals, useStore, type Category } from "@/lib/store";
import { useCountUp } from "@/hooks/use-count-up";
import { byDescendingValue } from "@/lib/chart-order";
import { IncomeShareChart } from "@/components/IncomeShareChart";
import { Button } from "@/components/ui/button";
import { FitAmount } from "@/components/FitAmount";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — Meu Dim Dim" },
    { name: "description", content: "Resumo do mês: saldo, receitas, despesas e limites por categoria." },
    { property: "og:title", content: "Dashboard — Meu Dim Dim" },
    { property: "og:description", content: "Resumo financeiro do mês atual." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Dashboard,
});

const keyOffset = (base: Date, n: number) => monthKey(new Date(base.getFullYear(), base.getMonth() + n, 1));
const short = (k: string) => MONTHS[Number(k.split("-")[1]) - 1]!.slice(0, 3).toUpperCase();
const lastDay = (k: string) => { const [y, m] = k.split("-").map(Number); return new Date(y!, m!, 0).getDate(); };
const range = (k: string) => { const [y, m] = k.split("-"); return `1 A ${lastDay(k)} De ${MONTHS[Number(m) - 1]} De ${y}`; };
const fullMonth = (k: string) => { const [y, m] = k.split("-"); return `${MONTHS[Number(m) - 1]} ${y}`; };

function CatName({ name, upper }: { name: string; upper?: boolean }) {
  const parts = name.split(" • ");
  return (
    <span className={upper ? "uppercase" : ""}>
      {parts.map((p, i) => <Fragment key={i}>{i > 0 && <span className="mx-1.5 text-warning">•</span>}{p}</Fragment>)}
    </span>
  );
}

const compactBrl = (n: number) => n >= 1000 ? `R$${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}mil` : `R$${Math.round(n)}`;

type Slice = { id: string; name: string; color: string; value: number; icon?: string | undefined };
function ArrowLabels({ data, w, h }: { data: Slice[]; w: number; h: number }) {
  if (!w || !h || data.length === 0) return null;

  // O gráfico ocupa 40% do painel; o SVG usa a largura total para
  // manter as linhas na mesma escala dos pontos e dos nomes.
  const panelWidth = w / 0.4;
  const cx = w / 2;
  const cy = h / 2;
  const outerRadius = Math.max(34, Math.min(w, h) * 0.30);
  const categoryTotal = data.reduce((sum, item) => sum + item.value, 0);
  const paddingAngle = 3;
  const rowHeight = 48;
  const listTop = (h - data.length * rowHeight) / 2;
  const targetX = panelWidth * 0.42 + 11;
  let cumulativeAngle = 0;

  const points = data.map((item, index) => {
    // Recharts distribui os valores pelos 360° e desconta o padding
    // nas extremidades de cada fatia.
    const valueAngle = categoryTotal > 0 ? (item.value / categoryTotal) * 360 : 0;
    const sliceAngle = Math.max(0, valueAngle - paddingAngle);
    const middleAngle = 90 + cumulativeAngle + sliceAngle / 2;
    cumulativeAngle += valueAngle;
    const radians = (-middleAngle * Math.PI) / 180;

    return {
      ...item,
      sx: cx + outerRadius * Math.cos(radians),
      sy: cy + outerRadius * Math.sin(radians),
      targetY: listTop + index * rowHeight + rowHeight / 2,
    };
  });

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${panelWidth} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {points.map((point) => (
        <g key={point.id}>
          <path
            d={`M${point.sx},${point.sy} C${point.sx + 18},${point.sy} ${targetX - 24},${point.targetY} ${targetX},${point.targetY}`}
            stroke={point.color}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M${targetX - 6},${point.targetY - 4} L${targetX},${point.targetY} L${targetX - 6},${point.targetY + 4}`}
            stroke={point.color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      ))}
    </svg>
  );
}

function Dashboard() {
  const [open, setOpen] = useState(false);
  const [initialType, setInitialType] = useState<"income" | "expense">("expense");
  const [initialCategoryId, setInitialCategoryId] = useState<string | undefined>();
  const addTransaction = (type: "income" | "expense", categoryId?: string) => { setInitialType(type); setInitialCategoryId(categoryId); setOpen(true); };
  return (
    <AppShell title="Dashboard"
      actions={<Button size="icon" aria-label="Nova transação" title="Nova transação" onClick={() => addTransaction("expense")}><Plus className="h-6 w-6" /></Button>}>
      <Body onAddTransaction={addTransaction} />
      <TransactionDialog open={open} onOpenChange={setOpen} initialType={initialType} initialCategoryId={initialCategoryId} />
    </AppShell>
  );
}

function Body({ onAddTransaction }: { onAddTransaction: (type: "income" | "expense", categoryId?: string) => void }) {
  const { transactions, categories } = useStore();
  const show = useDetails();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const now = new Date();
  const [mk, setMk] = useState(monthKey(now));
  const [expanded, setExpanded] = useState<string | null>(null);
  const monthTx = transactions.filter((t) => monthKey(t.date) === mk);
  const recentMonthTx = [...monthTx].sort((a, b) => b.date.localeCompare(a.date));
  const m = totals(monthTx);
  const spent = (c: Category) => monthTx.filter((t) => t.type === "expense" && t.categoryId === c.id).reduce((a, t) => a + t.amount, 0);
  const byCat = byDescendingValue(categories.map((c) => ({ ...c, value: spent(c) })).filter((c) => c.value > 0));
  const limited = categories.filter((c) => c.limit !== undefined);
  const totalLimit = limited.reduce((a, c) => a + (c.limit ?? 0), 0);
  const pills = [-2, -1, 0].map((n) => keyOffset(now, n));
  const past = [1, 2, 3, 4, 5].map((n) => keyOffset(now, -n));

  const incomeTx = monthTx.filter((t) => t.type === "income");
  const recentIncomeTx = [...incomeTx].sort((a, b) => b.date.localeCompare(a.date));
  const expenseTx = monthTx.filter((t) => t.type === "expense");
  const recentExpenseTx = [...expenseTx].sort((a, b) => b.date.localeCompare(a.date));
  const editLimit = (c: Category) => {
    const v = prompt(`Limite mensal (R$) para ${c.name}`, String(c.limit ?? 0));
    if (v === null) return;
    const n = parseFloat(v.replace(",", "."));
    if (isNaN(n) || n < 0) return void toast.error("Valor inválido");
    setState((s) => ({ ...s, categories: s.categories.map((x) => (x.id === c.id ? { ...x, limit: n } : x)) }));
    toast.success("Limite atualizado");
  };

  const catDetails = (c: Category) => {
    const s = spent(c); const lim = c.limit ?? 0; const txs = monthTx.filter((t) => t.categoryId === c.id).sort((a, b) => b.date.localeCompare(a.date));
    show({
      title: `${c.icon ?? ""} ${c.name}`.trim(), subtitle: `Detalhes da categoria · ${range(mk)}`,
      rows: [
        { label: "Gasto no mês", value: brl(s), tone: "destructive" },
        { label: "Limite mensal", value: lim ? brl(lim) : "Sem limite", onClick: () => editLimit(c) },
        ...(lim ? [{ label: s > lim ? "Excedido em" : "Disponível", value: brl(Math.abs(lim - s)), tone: (s > lim ? "destructive" : "primary") as "destructive" | "primary" },
          { label: "Uso do limite", value: `${Math.round((s / lim) * 100)}%`, tone: (s > lim ? "destructive" : s / lim >= 0.8 ? "warning" : undefined) as "destructive" | "warning" | undefined }] : []),
        { label: "% das despesas", value: m.expense ? `${((s / m.expense) * 100).toFixed(1)}%` : "0%" },
      ],
      transactions: txs,
      action: { label: `Adicionar transação em ${c.name}`, onClick: () => onAddTransaction("expense", c.id) },
    });
  };

  return (
    <div className="dashboard-composition mx-auto space-y-4">
        {/* Month pills */}
        <div className="month-selector grid grid-cols-3 gap-2">
          {pills.map((k) => {
            const b = totals(transactions.filter((t) => monthKey(t.date) === k)).balance;
            const active = k === mk;
            return (
              <Button variant="ghost" key={k} aria-pressed={active} onClick={() => setMk(k)}
                className={`month-tab block h-auto rounded-lg border bg-surface py-2 text-center ${active ? "month-active border-primary text-primary" : "border-border text-muted-foreground"}`}>
                <p className="text-xs">{short(k)}</p>
                <p className="text-xs">{b ? Math.round(b).toLocaleString("pt-BR") : "—"}</p>
                <span className={`mx-auto mt-0.5 block h-1 w-1 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/40"}`} />
              </Button>
            );
          })}
        </div>

        {/* Saldo */}
        <Button variant="ghost" onClick={() => show({ title: "Saldo Atual", subtitle: range(mk), rows: [{ label: "Receitas", value: brl(m.income), tone: "primary" }, { label: "Despesas", value: brl(m.expense), tone: "destructive" }, { label: "Saldo", value: brl(m.balance), tone: m.balance >= 0 ? "primary" : "destructive" }, { label: "Economia", value: m.income ? `${((m.balance / m.income) * 100).toFixed(1)}% da receita` : "—" }], transactions: recentMonthTx, action: { label: "Adicionar transação", onClick: () => onAddTransaction("expense") } })} className="balance-panel flex h-auto w-full whitespace-normal items-center gap-3 rounded-lg border border-primary px-4 py-4 text-left fx-shine">
          <div className="balance-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-foreground/40"><Wallet className="h-5 w-5" /></div>
          <div className="balance-copy min-w-0"><p className="font-display font-semibold">Saldo Atual</p><p className="text-xs text-foreground/80">{range(mk)}</p></div>
          <p className="balance-value font-display text-3xl font-bold tabular-nums"><CountUp value={m.balance} /></p>
        </Button>

        <div className="metric-pair grid grid-cols-2 gap-3">
          <Button variant="ghost" aria-label="Ver receitas do mês" onClick={() => show({ title: "Receitas", subtitle: range(mk), rows: [{ label: "Total", value: brl(m.income), tone: "primary" }, { label: "Lançamentos", value: String(incomeTx.length) }], transactions: recentIncomeTx, action: { label: "Adicionar receita", onClick: () => onAddTransaction("income") } })} className="metric-income block h-auto whitespace-normal rounded-lg border border-primary/40 bg-surface px-3 py-3 text-left">
            <div className="flex items-center justify-between gap-2"><p className="text-base font-semibold tracking-tight text-primary">Receitas</p>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><TrendingUp className="h-4 w-4" /></span></div>
            <p className="mt-2 font-display text-2xl font-bold text-primary tabular-nums"><CountUp value={m.income} /></p>
          </Button>
          <Button variant="ghost" aria-label="Ver despesas do mês" onClick={() => show({ title: "Despesas", subtitle: range(mk), rows: [{ label: "Total", value: brl(m.expense), tone: "destructive" }, { label: "Lançamentos", value: String(expenseTx.length) }, { label: "Maior gasto", value: expenseTx.length ? brl(Math.max(...expenseTx.map((t) => t.amount))) : "—" }], transactions: recentExpenseTx, action: { label: "Adicionar despesa", onClick: () => onAddTransaction("expense") } })} className="metric-expense block h-auto whitespace-normal rounded-lg border border-destructive/40 bg-surface px-3 py-3 text-left">
            <div className="flex items-center justify-between gap-2"><p className="text-base font-semibold tracking-tight text-destructive">Despesas</p>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive"><TrendingDown className="h-4 w-4" /></span></div>
            <p className="mt-2 font-display text-2xl font-bold text-destructive tabular-nums"><CountUp value={m.expense} /></p>
          </Button>
        </div>

        {/* Receita x Categorias: mantém o limite mensal abaixo de cada categoria */}
        <IncomeShareChart transactions={transactions} categories={categories} month={mk} onPick={(id) => { const c = categories.find((x) => x.id === id); if (c) catDetails(c); }} />

        {/* Despesas x Categorias — gráfico compacto à esquerda e categorias à direita */}
        <section className="dashboard-charts w-full">
          <div className="donut-panel relative w-full animate-fade-up fx-pie" style={{ height: Math.max(240, byCat.length * 48 + 24), minWidth: 0 }}>
            {byCat.length > 0 && (
              <>
                <div className="absolute inset-y-0 left-0 z-10 w-[40%]">
                  <ResponsiveContainer onResize={(w, h) => setSize({ w, h })}>
                    <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <Pie data={byCat} cx="50%" cy="50%" dataKey="value" className="cursor-pointer" onClick={(_, i) => byCat[i] && catDetails(byCat[i]!)}
                        innerRadius={Math.max(24, Math.min(size.w, size.h) * 0.22)} outerRadius={Math.max(34, Math.min(size.w, size.h) * 0.30)} paddingAngle={3} cornerRadius={5} stroke="var(--background)" strokeWidth={2} startAngle={90} endAngle={450}
                        animationBegin={150} animationDuration={1200} animationEasing="ease-out">
                        {byCat.map((c) => <Cell key={c.id} fill={c.color} style={{ filter: `drop-shadow(0 0 4px ${c.color})` }} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ArrowLabels data={byCat} w={size.w} h={size.h} />
                <div className="absolute inset-y-0 right-0 z-20 flex w-[58%] flex-col justify-center py-3">
                  {byCat.map((c) => (
                    <button key={c.id} type="button" onClick={() => catDetails(c)} className="flex min-h-[48px] w-full min-w-0 items-center justify-between gap-2 border-b border-border/60 px-1.5 text-left last:border-0">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="truncate text-xs font-semibold">{c.icon ? `${c.icon} ` : ""}{c.name}</span>
                      </span>
                      <span className="shrink-0 text-right text-[11px] tabular-nums">
                        <span className="block font-semibold">{brl(c.value)}</span>
                        <span className="text-muted-foreground">{m.expense ? ((c.value / m.expense) * 100).toFixed(1) : "0.0"}%</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="pointer-events-none absolute left-0 top-1/2 z-20 flex w-[40%] -translate-y-1/2 flex-col items-center justify-center">
                  <span className="text-[9px] text-muted-foreground">Total</span>
                  <span className="font-display text-center text-[10px] font-bold leading-tight">{brl(m.expense)}</span>
                </div>
              </>
            )}
            {byCat.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Sem despesas neste mês.</p>}
          </div>
        </section>

        {/* Limites */}
        <section hidden className="rounded-xl border border-border bg-card p-3">
          <div className="mb-3 flex justify-between">
            <div><h2 className="font-semibold">Limites por Categoria</h2><p className="text-[10px] text-muted-foreground">{range(mk)}</p></div>
            <p className="text-sm text-primary">{brl(totalLimit)}</p>
          </div>
          <div className="space-y-2.5">
            {limited.map((c) => {
              const s = spent(c); const lim = c.limit ?? 0;
              const over = lim > 0 && s > lim; const pct = lim ? (s / lim) * 100 : 0;
              const warn = !over && pct >= 80;
              const tone = over ? "text-destructive" : warn ? "text-warning" : "text-foreground";
              const bar = over ? "var(--destructive)" : warn ? "var(--warning)" : c.color;
              return (
                <div key={c.id} role="button" tabIndex={0} onClick={() => catDetails(c)} className={`cursor-pointer rounded-2xl border bg-surface px-3 py-2.5 transition-transform active:scale-[0.98] ${over ? "fx-alert" : ""}`} style={{ borderColor: c.color, boxShadow: `0 0 10px ${c.color}55` }}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-base">{c.icon || "🏷️"}</span><CatName name={c.name} />
                    {over && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    <button aria-label="Editar" onClick={(e) => { e.stopPropagation(); editLimit(c); }} className="ml-auto"><Pencil className="h-4 w-4" /></button>
                  </div>
                  <p className={`mt-1 font-display text-lg ${tone}`}>{brl(s)} / {brl(lim)}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
                    <div className="animate-grow fx-bar h-full origin-left rounded-full" style={{ width: `${Math.min(100, over ? 100 : pct)}%`, background: bar }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Meses anteriores */}
        <section className="history-section border-t border-border py-4">
          <div className="mb-3 flex justify-between"><h2 className="text-sm text-muted-foreground">Meses Anteriores</h2><span className="text-xs tracking-[0.2em] text-muted-foreground">HISTÓRICO</span></div>
          <div className="space-y-2">
            {past.map((k) => {
              const list = transactions.filter((t) => monthKey(t.date) === k);
              const b = totals(list).balance;
              return (
                <div key={k} className="rounded-2xl border border-border bg-muted/60">
                  <button onClick={() => setExpanded(expanded === k ? null : k)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1"><p className="text-sm font-medium">{fullMonth(k)}</p><p className="text-[10px] text-muted-foreground">{list.length} transações</p></div>
                    <div className="text-right"><p className={`text-sm ${b >= 0 ? "text-primary" : "text-destructive"}`}>{b >= 0 ? "+" : "-"}{brl(Math.abs(b))}</p><p className="text-[10px] text-muted-foreground">saldo</p></div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded === k ? "rotate-180" : ""}`} />
                  </button>
                  {expanded === k && <div className="px-3 pb-2"><TransactionList items={list} /></div>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
  );
}

function CountUp({ value }: { value: number }) { return <FitAmount text={brl(useCountUp(value))} />; }
