import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl, type Transaction } from "@/lib/store";
import { TransactionList } from "./TransactionList";
import { ChartNoAxesCombined, ReceiptText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Details {
  title: string;
  subtitle?: string;
  rows?: { label: string; value: string; tone?: "primary" | "destructive" | "warning" | undefined; onClick?: () => void }[];
  transactions?: Transaction[];
  extra?: ReactNode;
  action?: { label: string; onClick: () => void };
}

const Ctx = createContext<(d: Details) => void>(() => {});
export const useDetails = () => useContext(Ctx);

export function DetailsProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Details | null>(null);
  const tone = { primary: "text-primary", destructive: "text-destructive", warning: "text-warning" };
  return (
    <Ctx.Provider value={setD}>
      {children}
      <Dialog open={!!d} onOpenChange={(o) => !o && setD(null)}>
        <DialogContent className="premium-details fx-dialog border-border">
          <DialogHeader className="min-w-0 border-b border-border pb-4 pr-7 text-left">
            <div className="flex min-w-0 items-center gap-2">
              <DialogTitle className="min-w-0 flex-1 break-words text-xl leading-snug tracking-normal">{d?.title}</DialogTitle>
              {d?.action && (
                <Button type="button" variant="outline" size="icon" aria-label={d.action.label} title={d.action.label}
                  onClick={() => { const action = d.action; setD(null); action?.onClick(); }}
                  className="h-8 w-8 shrink-0 rounded-full border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <DialogDescription className="break-words text-base leading-relaxed">{d?.subtitle ?? "Detalhes"}</DialogDescription>
          </DialogHeader>
          {d?.transactions && (
            <section className="min-w-0 space-y-3" aria-label="Transações da seleção">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <h3 className="flex min-w-0 items-center gap-2 text-lg font-semibold"><ReceiptText className="h-5 w-5 shrink-0 text-primary" />Transações</h3>
                <span className="font-display text-lg font-semibold tabular-nums text-primary">{d.transactions.length}</span>
              </div>
              <div><TransactionList items={d.transactions} appearance="cards" /></div>
            </section>
          )}
          {d?.rows && (
            <section className="min-w-0 space-y-3 border-t border-border pt-4" aria-label="Resumo dos detalhes">
              <h3 className="flex items-center gap-2 text-lg font-semibold"><ChartNoAxesCombined className="h-5 w-5 shrink-0 text-chart-5" />Detalhes</h3>
            <dl className="premium-summary min-w-0">
              {d.rows.map((r) => (
                <div key={r.label} data-tone={r.tone ?? "neutral"} className={`premium-metric min-w-0 space-y-1 pl-3 py-2 text-sm ${r.onClick ? "cursor-pointer rounded-lg transition-colors hover:bg-muted/60 active:scale-[0.99]" : ""}`} role={r.onClick ? "button" : undefined} tabIndex={r.onClick ? 0 : undefined} onClick={r.onClick} onKeyDown={r.onClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); r.onClick?.(); } } : undefined} aria-label={r.onClick ? `${r.label}: editar` : undefined}>
                  <dt className="flex min-w-0 items-center justify-between gap-2 break-words text-sm leading-relaxed text-muted-foreground">{r.label}{r.onClick && <span className="shrink-0 text-xs text-primary">Editar ✎</span>}</dt>
                  <dd className={`min-w-0 break-words font-display text-lg font-semibold tabular-nums ${r.tone ? tone[r.tone] : "text-chart-5"}`}>{r.value}</dd>
                </div>
              ))}
            </dl>
            </section>
          )}
          {d?.extra}
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export const sumRow = (txs: Transaction[]) => brl(txs.reduce((a, t) => a + (t.type === "income" ? t.amount : -t.amount), 0));
