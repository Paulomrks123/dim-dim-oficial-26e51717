import { useState, type CSSProperties } from "react";
import { ArrowDownLeft, ArrowUpRight, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { brl, setState, useStore, type Transaction } from "@/lib/store";
import { TransactionDialog } from "./TransactionDialog";
import { Button } from "@/components/ui/button";

export function TransactionList({ items, appearance = "list" }: { items: Transaction[]; appearance?: "list" | "cards" }) {
  const { categories } = useStore();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  if (items.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma transação encontrada.</p>;
  const remove = (id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
    toast.success("Transação excluída");
  };
  return (
    <>
      <ul className={`transaction-list min-w-0 ${appearance === "cards" ? "space-y-2" : "divide-y divide-border"}`}>
        {items.map((t) => {
          const cat = categories.find((c) => c.id === t.categoryId);
          const inc = t.type === "income";
          return (
            <li key={t.id} data-type={t.type} style={appearance === "cards" ? { "--transaction-category": cat?.color ?? (inc ? "var(--primary)" : "var(--destructive)") } as CSSProperties : undefined} className={appearance === "cards" ? "premium-transaction rounded-lg border p-2" : "py-3"}>
              <div role="button" tabIndex={0} aria-label="Detalhes da transação" aria-expanded={openId === t.id} onClick={() => setOpenId(openId === t.id ? null : t.id)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setOpenId(openId === t.id ? null : t.id); } }} className="transaction-row grid min-w-0 cursor-pointer items-center gap-2 rounded-xl transition-colors hover:bg-muted/40">
              <div className={`transaction-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${inc ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                {inc ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
              </div>
              <div className="transaction-copy min-w-0">
                <p className="break-words font-medium leading-snug">{t.description}{(t.recurringId || t.id.startsWith("rec-")) && <Star aria-label="Recorrente" className="ml-1 inline h-3 w-3 fill-primary text-primary align-baseline" />}</p>
                <p className="break-words text-xs leading-relaxed text-muted-foreground">
                  {cat && (cat.icon
                    ? <span className="mr-1 text-base">{cat.icon}</span>
                    : <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: cat.color }} />)}
                  {cat?.name ?? "Sem categoria"}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
              </div>
              <span className={`transaction-amount min-w-0 break-words font-display font-semibold tabular-nums ${inc ? "text-primary" : "text-destructive"}`}>{inc ? "+" : "-"}{brl(t.amount)}</span>
              <div className="transaction-actions flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="Editar" title="Editar transação" onClick={(e) => { e.stopPropagation(); setEditing(t); }} className="text-muted-foreground hover:text-foreground"><Pencil /></Button>
                <Button variant="ghost" size="icon" aria-label="Excluir" title="Excluir transação" onClick={(e) => { e.stopPropagation(); remove(t.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 /></Button>
              </div>
              </div>
              {openId === t.id && (
                <dl className="transaction-details mt-2 grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-x-3 gap-y-2 rounded-xl border border-border bg-muted/40 p-3 text-xs [&>dd]:min-w-0 [&>dd]:break-words [&>dt]:min-w-0">
                  <dt className="text-muted-foreground">Tipo</dt><dd className={inc ? "text-primary" : "text-destructive"}>{inc ? "Receita" : "Despesa"}</dd>
                  <dt className="text-muted-foreground">Valor</dt><dd>{brl(t.amount)}</dd>
                  <dt className="text-muted-foreground">Categoria</dt><dd>{cat?.name ?? "Sem categoria"}</dd>
                  <dt className="text-muted-foreground">Data</dt><dd>{new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</dd>
                  <dt className="text-muted-foreground">Descrição</dt><dd>{t.description}</dd>
                </dl>
              )}
            </li>
          );
        })}
      </ul>
      <TransactionDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} editing={editing} />
    </>
  );
}
