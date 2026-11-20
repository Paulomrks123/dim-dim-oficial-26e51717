import { burst } from "@/lib/confetti";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { followingMonth, useSession } from "@/lib/recurring";
import { setState, today, uid, useStore, type Transaction, type TxType } from "@/lib/store";

export function TransactionDialog({ open, onOpenChange, editing, initialCategoryId, initialType }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Transaction | null | undefined; initialCategoryId?: string | undefined; initialType?: TxType | undefined }) {
  const { categories } = useStore();
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today());
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const { session, ready } = useSession();
  const linkedRecurring = Boolean(editing?.recurringId || editing?.id.startsWith("rec-"));

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? initialType ?? "expense");
    setAmount(editing ? String(editing.amount) : "");
    setDescription(editing?.description ?? "");
    setCategoryId(editing?.categoryId ?? initialCategoryId ?? "");
    setDate(editing?.date ?? today());
    setRecurring(false);
    setSaving(false);
  }, [open, editing, initialCategoryId, initialType]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return void toast.error("Informe um valor válido");
    if (!date) return void toast.error("Informe a data");
    if (saving) return;
    if (recurring && !session) return void toast.error("Entre para ativar a despesa recorrente");
    const tx: Transaction = { id: editing?.id ?? uid(), type, amount: value, description: description.trim() || (type === "income" ? "Receita" : "Despesa"), categoryId: categoryId || undefined, date };
    tx.recurringId = editing?.recurringId;
    setSaving(true);
    try {
      if (recurring && type === "expense" && !linkedRecurring) {
        const start = followingMonth(date);
        const { data, error } = await supabase.from("recurring_expenses").insert({
          description: tx.description, amount: value, category_id: categoryId || null,
          day: Number(date.slice(8, 10)), start_month: start, next_month: start,
        }).select("id").single();
        if (error || !data) throw new Error("recurring");
        tx.recurringId = data.id;
      }
    setState((s) => ({ ...s, transactions: editing ? s.transactions.map((t) => (t.id === tx.id ? tx : t)) : [tx, ...s.transactions] }));
    burst(type === "income" ? "income" : "expense");
    toast.success(recurring ? "Despesa salva e repetição mensal ativada" : editing ? "Transação atualizada" : "Transação adicionada");
    onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally { setSaving(false); }
  };

  const signIn = async (provider: "google" | "lovable") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error("Não foi possível entrar. Tente novamente.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border" aria-describedby={undefined} onInteractOutside={(e) => { if (saving) e.preventDefault(); }}>
        <DialogHeader className="pr-7 text-left"><DialogTitle className="leading-snug">{editing ? "Editar transação" : "Nova transação"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="transaction-form space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-edit-field p-1">
            {(["expense", "income"] as const).map((t) => (
              <Button variant="ghost" type="button" key={t} disabled={saving} aria-pressed={type === t} onClick={() => { setType(t); if (t === "income") setRecurring(false); }}
                className={`h-11 rounded-lg text-sm font-medium ${type === t ? (t === "income" ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-destructive text-destructive-foreground hover:bg-destructive") : "text-muted-foreground"}`}>
                {t === "income" ? "Receita" : "Despesa"}
              </Button>
            ))}
          </div>
          <div className="space-y-2"><Label htmlFor="tx-amount">Valor (R$)</Label><Input id="tx-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required /></div>
          <div className="space-y-2"><Label htmlFor="tx-description">Descrição</Label><Input id="tx-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mercado" maxLength={160} /></div>
          <div className="space-y-2">
            <Label htmlFor="tx-category">Categoria</Label>
            <select id="tx-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-11 w-full rounded-md border border-input px-3 text-sm">
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>)}
            </select>
            {categories.length === 0 && <p className="text-xs text-muted-foreground">Crie categorias na aba Categorias.</p>}
          </div>
          <div className="space-y-2"><Label htmlFor="tx-date">Data</Label><div className="flex items-center gap-2"><Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="flex-1" />{type === "expense" && (linkedRecurring
                ? <Link to="/recorrentes" onClick={() => onOpenChange(false)} aria-label="Despesa recorrente" title="Repete todo mês" className="grid h-10 w-10 shrink-0 place-items-center rounded-md"><Star className="h-4 w-4 fill-primary text-primary" /></Link>
                : <button type="button" aria-pressed={recurring} aria-label="Despesa recorrente" title="Repete todo mês" disabled={saving} onClick={() => setRecurring((r) => !r)} className="grid h-10 w-10 shrink-0 place-items-center rounded-md"><Star className={`h-4 w-4 transition ${recurring ? "fill-primary text-primary scale-110" : "text-muted-foreground"}`} /></button>)}</div>
            {type === "expense" && recurring && !linkedRecurring && <p className="text-xs text-primary">Repete todo mês</p>}
          </div>
          {type === "expense" && recurring && !linkedRecurring && ready && !session && <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Entre para ativar a repetição mensal.</p>
            <Button type="button" variant="outline" className="h-auto min-h-11 w-full whitespace-normal" onClick={() => signIn("google")}>Continuar com Google</Button>
            <Button type="button" variant="outline" className="h-auto min-h-11 w-full whitespace-normal" onClick={() => signIn("lovable")}>Continuar com Lovable</Button>
          </div>}
          <Button type="submit" disabled={saving || (recurring && !session)} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow">{saving ? "Salvando…" : "Salvar"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
