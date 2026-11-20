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

const chartGeom = (w: number, h: number) => {
  const narrow = w < 340;
  const label = w < 260 ? 62 : narrow ? 72 : 100;
  const r = Math.max(40, Math.min((h / 2) * 0.6, h / 2 - 48, w / 2 - label - (narrow ? 8 : 22)));
  return { narrow, label, r };
};
const compactBrl = (n: number) => n >= 1000 ? `R$${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}mil` : `R$${Math.round(n)}`;
const clip = (t: string, max: number) => (t.length > max ? t.slice(0, max - 1) + "…" : t);

type Slice = { id: string; name: string; color: string; value: number; icon?: string | undefined };
function ArrowLabels({ data, w, h, total, onPick }: { data: Slice[]; w: number; h: number; total: number; onPick: (id: string) => void }) {
  if (!w || !total) return null;
  const cx = w * 0.40, cy = h / 2; const { narrow, label, r } = chartGeom(w, h);
  // Espelha a geometria do Recharts (Pie): em um círculo completo,
  // o padding é removido uma vez por setor e os ângulos restantes são
  // distribuídos proporcionalmente aos valores, na mesma ordem dos Cells.
  const paddingAngle = 3;
  const usableAngle = Math.max(0, 360 - data.length * paddingAngle);
  let cum = 0;
  const items = data.map((d) => {
    const sliceAngle = (d.value / total) * usableAngle;
    const deg = 90 + cum + sliceAngle / 2;
    cum += sliceAngle + paddingAngle;
    // Recharts converte o ângulo polar usando -angle: 90° fica no topo,
    // 180° à esquerda e 270° embaixo. Reproduzimos exatamente essa convenção.
    const rad = (-deg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    return { ...d, cos, sin, right: cos > 0, zone: (sin < -0.8 ? "top" : sin > 0.8 ? "bottom" : "side") as "top" | "bottom" | "side", x: 0, y: cy + (r + 18) * sin };
  });
  const MIN = narrow ? 30 : 34;
  for (const right of [true, false]) {
    const side = items.filter((item) => item.zone === "side" && item.right === right)
      .map((item) => ({ item, want: cy + (r + 30) * item.sin * 1.35 }))
      .sort((x, y) => x.want - y.want);
    let prev = -Infinity;
    for (const s of side) { s.item.y = Math.max(18, s.want, prev + MIN); prev = s.item.y; }
    let over = prev - (h - 18);
    for (let i = side.length - 1; i >= 0 && over > 0; i--) {
      const it = side[i]!.item; it.y -= over;
      over = i > 0 ? side[i - 1]!.item.y - (it.y - MIN) : 0;
    }
  }
  const W = label + 6;
  for (const zone of ["top", "bottom"] as const) {
    const row = items.filter((item) => item.zone === zone)
      .map((item) => ({ item, want: cx - (r + 20) * item.cos * 1.8 }))
      .sort((a, b) => a.want - b.want);
    const lo = W / 2, hi = w - W / 2;
    const available = Math.max(W, hi - lo);
    const perLane = Math.max(1, Math.floor(available / W));
    const laneCount = Math.ceil(row.length / perLane);

    // Cada faixa recebe apenas rótulos que cabem lado a lado, sem colisões.
    for (let lane = 0; lane < laneCount; lane++) {
      const group = row.slice(lane * perLane, (lane + 1) * perLane);
      group.forEach((entry, index) => {
        const x = group.length === 1
          ? (lo + hi) / 2
          : lo + ((hi - lo) * index) / (group.length - 1);
        entry.item.x = x;
        entry.item.y = zone === "top"
          ? 24 + lane * 48
          : h - 24 - lane * 48;
      });
    }
  }
  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" width={w} height={h}>
      <defs>{items.map((d) => <marker key={d.id} id={`ar-${d.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={d.color} /></marker>)}</defs>
      {items.map((d, i) => {
        // O endpoint usa o mesmo raio externo informado ao componente Pie.
        const sx = cx + r * d.cos, sy = cy + r * d.sin;
        const ex = cx + (d.right ? 1 : -1) * (r + (narrow ? 12 : 22));
        const tx = d.right ? w - 2 : 2;
        const fs = narrow ? 9.5 : 11.5;
        const name = clip(d.name.split(" • ")[0]!.toUpperCase(), narrow ? 10 : 16);
        const pct = ((d.value / total) * 100).toFixed(0);
        const anchor = d.right ? "end" : "start";
        if (d.zone !== "side") {
          const top = d.zone === "top";
          const ly = top ? d.y + 16 : d.y - 14;
          return (
            <g key={d.id} role="button" tabIndex={0} aria-label={`Detalhes de ${d.name}`} onClick={() => onPick(d.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(d.id); } }} className="pointer-events-auto cursor-pointer animate-fade-in" style={{ animationDelay: `${900 + i * 90}ms` }}>
              <rect x={d.x - label / 2} y={d.y - 20} width={label} height={44} rx={8} fill="transparent" />
              <path d={`M${d.x},${ly} Q${d.x},${cy + (r + 18) * d.sin} ${cx + (r + 10) * d.cos},${cy + (r + 10) * d.sin} L${sx},${sy}`} stroke={d.color} strokeWidth={1.4} strokeLinecap="round" fill="none" markerEnd={`url(#ar-${d.id})`} />
              <text x={d.x} y={d.y - 2} textAnchor="middle" fill={d.color} fontSize={fs} fontWeight={800}>{d.icon && !narrow ? `${d.icon} ${name}` : name}</text>
              <text x={d.x} y={d.y + 10} textAnchor="middle" fill="var(--foreground)" fontSize={fs - 1} fontWeight={600}>{w < 300 ? compactBrl(d.value) : brl(d.value)} · {pct}%</text>
            </g>
          );
        }
        return (
          <g key={d.id} role="button" aria-label={`Detalhes de ${d.name}`} onClick={() => onPick(d.id)} className="pointer-events-auto cursor-pointer animate-fade-in" style={{ animationDelay: `${900 + i * 90}ms` }}>
            <rect x={d.right ? w - label : 0} y={d.y - 22} width={label + 4} height={44} rx={8} fill="transparent" />
            <path d={`M${d.right ? Math.max(w - label - 4, ex) : Math.min(label + 4, ex)},${d.y} L${ex},${d.y} Q${cx + (r + (narrow ? 14 : 24)) * d.cos},${d.y} ${cx + (r + 10) * d.cos},${cy + (r + 10) * d.sin} L${sx},${sy}`} stroke={d.color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none" markerEnd={`url(#ar-${d.id})`} />
            <text x={tx} y={d.y - 4} textAnchor={anchor} fill={d.color} fontSize={fs} fontWeight={800}>{d.icon && !narrow ? `${d.icon} ${name}` : name}</text>
            <text x={tx} y={d.y + 10} textAnchor={anchor} fill="var(--foreground)" fontSize={fs - 1} fontWeight={600}>{w < 300 ? compactBrl(d.value) : brl(d.value)} · {pct}%</text>
          </g>
        );
      })}
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

        {/* Despesas x Categorias */}
        <section className="dashboard-charts" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)", alignItems: "center", gap: 8 }}>
          <div className="donut-panel relative w-full animate-fade-up fx-pie" style={{ height: 240, minWidth: 0 }}>
            {byCat.length > 0 && <ResponsiveContainer onResize={(w, h) => setSize({ w, h })}><PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
              <Pie data={byCat} cx="50%" cy="50%" dataKey="value" className="cursor-pointer" onClick={(_, i) => byCat[i] && catDetails(byCat[i]!)}
                innerRadius={Math.max(30, Math.min(size.w, size.h) * 0.29)} outerRadius={Math.max(42, Math.min(size.w, size.h) * 0.39)} paddingAngle={3} cornerRadius={6} stroke="var(--background)" strokeWidth={2} startAngle={90} endAngle={450}
                animationBegin={150} animationDuration={1200} animationEasing="ease-out">
                {byCat.map((c) => <Cell key={c.id} fill={c.color} style={{ filter: `drop-shadow(0 0 6px ${c.color})` }} />)}
              </Pie>
            </PieChart></ResponsiveContainer>}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted-foreground">Total</span>
              <span className="font-display text-center text-[10px] font-bold leading-tight">{compactBrl(m.expense)}</span>
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">CATEGORIAS</h3>
            {byCat.map((c, index) => (
              <button key={c.id} type="button" onClick={() => catDetails(c)}
                className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-muted/60 active:scale-[0.98]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="min-w-0 flex-1 truncate text-[11px]">{c.icon ? `${c.icon} ` : ""}{c.name.split(" • ")[0]}</span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums">{compactBrl(c.value)}</span>
              </button>
            ))}
            {byCat.length === 0 && <p className="text-xs text-muted-foreground">Sem despesas neste mês.</p>}
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
