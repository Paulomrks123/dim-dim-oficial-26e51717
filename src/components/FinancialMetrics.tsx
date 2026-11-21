import { useEffect, useId, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis,
} from "recharts";
import { BarChart3, Minus, TrendingDown, TrendingUp, Waves } from "lucide-react";
import { brl, type Transaction } from "@/lib/store";
import {
  buildFinancialMetrics, formatMetricDate, metricChange, metricStats,
  type MetricsRange,
} from "@/lib/financial-metrics";

type Mode = "curve" | "bars";
type Kind = "income" | "expense" | "result" | "cashflow";
const ranges: MetricsRange[] = [7, 14, 30];

function MetricTooltip({ active, payload, label, kind }: {
  active?: boolean; payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string; kind: Kind;
}) {
  if (!active || !payload?.length || !label) return null;
  const names: Record<string, string> = { income: "Entradas", expense: "Saídas", result: "Resultado" };
  return (
    <div className="z-50 min-w-36 rounded-xl border border-border bg-popover p-2.5 text-xs text-popover-foreground shadow-xl">
      <p className="mb-1.5 font-semibold">{formatMetricDate(label)}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-3 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            {names[entry.dataKey ?? "result"] ?? "Valor"}
          </span>
          <strong className="tabular-nums">{brl(entry.value ?? 0)}</strong>
        </div>
      ))}
      {kind !== "cashflow" && <p className="mt-1 border-t border-border pt-1 text-muted-foreground">Valor diário registrado</p>}
    </div>
  );
}

function MetricCard({ kind, title, value, days, previousValue, colorTone, range }: {
  kind: Kind; title: string; value: number; days: ReturnType<typeof buildFinancialMetrics>["days"];
  previousValue: number; colorTone: "positive" | "negative" | "neutral"; range: MetricsRange;
}) {
  const [mode, setMode] = useState<Mode>("curve");
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const gradientId = useId().replace(/:/g, "");
  const valueKey = kind === "income" ? "income" : kind === "expense" ? "expense" : "result";
  const series = days.map((day) => ({ ...day, label: day.date }));
  const values = days.map((day) => kind === "income" ? day.income : kind === "expense" ? day.expense : day.result);
  const stats = metricStats(values);
  const change = metricChange(value, previousValue);
  const delta = stats.last - stats.previous;
  const toneClass = colorTone === "positive" ? "text-emerald-500" : colorTone === "negative" ? "text-destructive" : "text-muted-foreground";
  const chartColor = colorTone === "positive" ? "var(--primary)" : colorTone === "negative" ? "var(--destructive)" : "var(--muted-foreground)";
  const changeIsGood = kind === "expense" ? change !== null && change < 0 : kind === "result" || kind === "cashflow" ? value > previousValue : change !== null && change > 0;
  const changeClass = change === null || change === 0 ? "text-muted-foreground" : changeIsGood ? "text-emerald-500" : "text-destructive";
  const Icon = change === null || change === 0 ? Minus : changeIsGood ? TrendingUp : TrendingDown;
  const statsTitle = kind === "cashflow" ? "Resultado diário" : "Diário";

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-4">
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(currentColor 0.7px, transparent 0.7px)", backgroundSize: "12px 12px", maskImage: "linear-gradient(90deg, transparent, black)" }} />
      <div className="relative flex min-h-[148px] items-center gap-1 sm:min-h-[164px]">
        <div className="flex w-[38%] min-w-0 flex-col justify-center">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground sm:text-sm">{title}</p>
          <p className={`mt-2 break-words font-display text-xl font-bold leading-tight tabular-nums sm:text-2xl ${toneClass}`}>{brl(value)}</p>
          <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold sm:text-xs ${changeClass}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {change === null ? "Sem comparação" : change === 0 ? "Estável" : `${change > 0 ? "+" : ""}${change.toFixed(1)}% no período`}
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground">vs. período anterior</span>
        </div>
        <div className="relative h-[132px] min-w-0 flex-1 sm:h-[148px]" aria-label={`Gráfico de ${title} nos últimos ${range} dias`}>
          <div className="absolute right-0 top-0 z-10 flex rounded-lg border border-border/70 bg-background/80 p-0.5 backdrop-blur">
            <button type="button" aria-label="Exibir gráfico em curva" aria-pressed={mode === "curve"} onClick={() => setMode("curve")} className={`rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "curve" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}><Waves className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Exibir gráfico em barras" aria-pressed={mode === "bars"} onClick={() => setMode("bars")} className={`rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === "bars" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}><BarChart3 className="h-3.5 w-3.5" /></button>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            {mode === "curve" ? (
              <AreaChart data={series} margin={{ top: 28, right: 2, left: 2, bottom: 0 }}>
                <defs>
                  <linearGradient id={`${gradientId}-income`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.34} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.015} /></linearGradient>
                  <linearGradient id={`${gradientId}-expense`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--destructive)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--destructive)" stopOpacity={0.015} /></linearGradient>
                  <linearGradient id={`${gradientId}-result`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity={0.3} /><stop offset="100%" stopColor={chartColor} stopOpacity={0.015} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" opacity={0.5} />
                <XAxis dataKey="date" hide />
                <Tooltip content={<MetricTooltip kind={kind} />} />
                {kind === "cashflow" ? <>
                  <Area type="monotone" dataKey="income" name="Entradas" stroke="var(--primary)" fill={`url(#${gradientId}-income)`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={!reduceMotion} animationDuration={850} />
                  <Area type="monotone" dataKey="expense" name="Saídas" stroke="var(--destructive)" fill={`url(#${gradientId}-expense)`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive animationDuration={850} />
                </> : <Area type="monotone" dataKey={valueKey} stroke={chartColor} fill={`url(#${gradientId}-result)`} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={!reduceMotion} animationDuration={900} />}
              </AreaChart>
            ) : (
              <BarChart data={series} margin={{ top: 28, right: 2, left: 2, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" opacity={0.5} />
                <XAxis dataKey="date" hide />
                <Tooltip content={<MetricTooltip kind={kind} />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                {kind === "cashflow" ? <>
                  <Bar dataKey="income" name="Entradas" fill="var(--primary)" radius={[4, 4, 1, 1]} isAnimationActive={!reduceMotion} animationDuration={700} />
                  <Bar dataKey="expense" name="Saídas" fill="var(--destructive)" radius={[4, 4, 1, 1]} isAnimationActive animationDuration={700} />
                </> : <Bar dataKey={valueKey} fill={chartColor} radius={[5, 5, 1, 1]} isAnimationActive={!reduceMotion} animationDuration={750} />}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
      <div className="relative mt-2 grid grid-cols-4 gap-1 border-t border-border/70 pt-2">
        <div className="min-w-0"><p className="text-[9px] text-muted-foreground sm:text-[10px]">Último dia</p><p className="truncate text-[10px] font-semibold tabular-nums sm:text-xs">{delta > 0 ? "+" : ""}{brl(delta)}</p></div>
        <div className="min-w-0"><p className="text-[9px] text-muted-foreground sm:text-[10px]">Máximo</p><p className="truncate text-[10px] font-semibold tabular-nums sm:text-xs">{brl(stats.max)}</p></div>
        <div className="min-w-0"><p className="text-[9px] text-muted-foreground sm:text-[10px]">Mínimo</p><p className="truncate text-[10px] font-semibold tabular-nums sm:text-xs">{brl(stats.min)}</p></div>
        <div className="min-w-0"><p className="text-[9px] text-muted-foreground sm:text-[10px]">Média {statsTitle}</p><p className="truncate text-[10px] font-semibold tabular-nums sm:text-xs">{brl(stats.average)}</p></div>
      </div>
    </article>
  );
}

export function FinancialMetrics({ transactions }: { transactions: Transaction[] }) {
  const [range, setRange] = useState<MetricsRange>(7);
  const metrics = buildFinancialMetrics(transactions, range);
  const configs: { kind: Kind; title: string; value: number; previous: number; tone: "positive" | "negative" | "neutral" }[] = [
    { kind: "income", title: "Receitas", value: metrics.totals.income, previous: metrics.previousTotals.income, tone: metrics.totals.income > metrics.previousTotals.income ? "positive" : metrics.totals.income < metrics.previousTotals.income ? "negative" : "neutral" },
    { kind: "expense", title: "Despesas", value: metrics.totals.expense, previous: metrics.previousTotals.expense, tone: metrics.totals.expense < metrics.previousTotals.expense ? "positive" : metrics.totals.expense > metrics.previousTotals.expense ? "negative" : "neutral" },
    { kind: "result", title: "Resultado do período", value: metrics.totals.result, previous: metrics.previousTotals.result, tone: metrics.totals.result > 0 ? "positive" : metrics.totals.result < 0 ? "negative" : "neutral" },
    { kind: "cashflow", title: "Fluxo de caixa", value: metrics.totals.result, previous: metrics.previousTotals.result, tone: metrics.totals.result > 0 ? "positive" : metrics.totals.result < 0 ? "negative" : "neutral" },
  ];
  return (
    <section className="space-y-3" aria-labelledby="financial-metrics-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 id="financial-metrics-title" className="font-display text-base font-semibold">Indicadores financeiros</h2><p className="text-xs text-muted-foreground">Evolução baseada nas suas transações</p></div>
        <div className="flex rounded-xl border border-border bg-muted/50 p-1" role="group" aria-label="Período dos indicadores">
          {ranges.map((days) => <button key={days} type="button" aria-pressed={range === days} onClick={() => setRange(days)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${range === days ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}> {days} dias </button>)}
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {configs.map((config) => <MetricCard key={config.kind} {...config} days={metrics.days} previousValue={config.previous} range={range} colorTone={config.tone} />)}
      </div>
      {transactions.length === 0 && <p className="text-center text-xs text-muted-foreground">Adicione uma transação para visualizar sua evolução financeira.</p>}
    </section>
  );
}
