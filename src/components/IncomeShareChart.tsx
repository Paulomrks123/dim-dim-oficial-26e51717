import { brl, type Category, type Transaction } from "@/lib/store";
import { incomeShare } from "@/lib/income-share";
import { Button } from "@/components/ui/button";
import type { CSSProperties } from "react";

export function IncomeShareChart({ transactions, categories, month, onPick }: { transactions: Transaction[]; categories: Category[]; month: string; onPick: (id: string) => void }) {
  const d = incomeShare(transactions, categories, month);
  return (
    <div className="income-share min-w-0 animate-fade-up">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-1">
        <div className="flex min-w-0 flex-col items-start">
          <h2 className="font-semibold">Receita x Categorias</h2>
        </div>
        <p className="text-sm">Receita <span className="font-display font-bold text-primary">{brl(d.income)}</span></p>
      </div>
      {d.rows.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">Sem despesas neste mês.</p>}
      <ul className="space-y-2">
        {d.rows.map((r) => {
          const category = categories.find((c) => c.id === r.id);
          return (
            <li key={r.id}>
              <Button variant="ghost" type="button" onClick={() => onPick(r.id)} className="category-share-row block h-auto w-full min-w-0 whitespace-normal rounded-lg border bg-surface px-3 py-2.5 text-left" style={{ "--category-color": r.color } as CSSProperties}>
                <div className="share-row-copy flex min-w-0 items-start justify-between gap-2 text-sm">
                  <div className="flex min-w-0 flex-col items-start">
                    <span className="min-w-0 break-words font-semibold">{r.icon ? `${r.icon} ` : ""}{r.name}</span>
                    <span className={`mt-1 text-sm font-semibold tabular-nums ${category?.limit ? r.value > category.limit ? "text-destructive" : "text-emerald-500" : "text-muted-foreground"}`}>
                      {category?.limit ? `Limite: ${brl(category.limit)}` : "Sem limite"}
                    </span>
                  </div>
                  <span className="share-row-value shrink-0 tabular-nums">{brl(r.value)} · <b className={r.pct > 100 ? "text-destructive" : "category-percent"}>{r.pct}%</b></span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-background/70">
                  <div className="share-fill animate-grow h-full origin-left rounded-full" style={{ width: `${Math.min(100, r.pct)}%` }} />
                </div>
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap justify-between gap-1 border-t border-border pt-2 text-sm">
        <span>Total gasto · <b className={d.spentPct > 100 ? "text-destructive" : ""}>{d.spentPct}% da receita</b></span>
        <span>Sobra · <b className={d.left < 0 ? "text-destructive" : "text-primary"}>{brl(d.left)}</b></span>
      </div>
    </div>
  );
}
