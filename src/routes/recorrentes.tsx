import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Pause, Play, Repeat, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { brl, today, useStore } from "@/lib/store";
import { dueDate, firstMonth, syncRecurring, useSession } from "@/lib/recurring";

export const Route = createFileRoute("/recorrentes")({
  head: () => ({ meta: [
    { title: "Gastos recorrentes — Meu Dim Dim" },
    { name: "description", content: "Cadastre contas e assinaturas mensais lançadas automaticamente." },
    { property: "og:title", content: "Gastos recorrentes — Meu Dim Dim" },
    { property: "og:description", content: "Despesas mensais registradas automaticamente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

type Rec = { id: string; description: string; amount: number; category_id: string | null; day: number; next_month: string; active: boolean };

function Page() {
  const { session, ready } = useSession();
  return (
    <AppShell title="Recorrentes" subtitle="Contas e assinaturas mensais">
      {!ready ? null : session ? <Manager /> : <SignIn />}
    </AppShell>
  );
}

function SignIn() {
  const go = async (p: "google" | "lovable") => {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin });
    if (r.error) toast.error("Não foi possível entrar. Tente novamente.");
  };
  return (
    <div className="glass-card mx-auto max-w-md space-y-3 p-5 text-center">
      <Repeat className="mx-auto h-8 w-8 text-primary" />
      <h2 className="font-semibold">Entre para ativar lançamentos automáticos</h2>
      <p className="text-sm text-muted-foreground">Assim suas contas mensais são registradas todo mês, mesmo com o app fechado.</p>
      <Button onClick={() => go("google")} className="w-full" variant="outline">Continuar com Google</Button>
      <Button onClick={() => go("lovable")} className="w-full" variant="outline">Continuar com Lovable</Button>
    </div>
  );
}

function Manager() {
  const { categories } = useStore();
  const [items, setItems] = useState<Rec[]>([]);
  const [editing, setEditing] = useState<Rec | null>(null);
  const [desc, setDesc] = useState(""); const [amount, setAmount] = useState(""); const [day, setDay] = useState(String(new Date().getDate())); const [cat, setCat] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.from("recurring_expenses").select("id, description, amount, category_id, day, next_month, active").order("day");
    setItems((data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(amount.replace(",", ".")); const d = parseInt(day, 10);
    if (!desc.trim()) return void toast.error("Informe a descrição");
    if (!v || v <= 0) return void toast.error("Informe um valor válido");
    if (!(d >= 1 && d <= 31)) return void toast.error("Dia deve ser de 1 a 31");
    const start = firstMonth(today(), d);
    const values = { description: desc.trim(), amount: v, category_id: cat || null, day: d };
    const { error } = editing
      ? await supabase.from("recurring_expenses").update(values).eq("id", editing.id)
      : await supabase.from("recurring_expenses").insert({ ...values, start_month: start, next_month: start });
    if (error) return void toast.error("Não foi possível salvar");
    const n = await syncRecurring();
    toast.success(editing ? "Gasto recorrente atualizado" : n ? "Gasto recorrente criado e lançado hoje" : "Gasto recorrente criado");
    setEditing(null); setDesc(""); setAmount(""); void load();
  };
  const toggle = async (r: Rec) => {
    let next = r.next_month;
    if (!r.active) { const [y, m] = r.next_month.split("-").map(Number) as [number, number]; const s = firstMonth(today(), r.day); if (s > next || dueDate(y, m, r.day) < today()) next = s > next ? s : next; next = next < s ? s : next; }
    const { error } = await supabase.from("recurring_expenses").update({ active: !r.active, next_month: next }).eq("id", r.id);
    if (error) return void toast.error("Não foi possível atualizar");
    toast.success(r.active ? "Pausado" : "Reativado"); void load();
  };
  const remove = async (r: Rec) => {
    if (!confirm(`Excluir "${r.description}"? Lançamentos já feitos continuam.`)) return;
    const { error } = await supabase.from("recurring_expenses").delete().eq("id", r.id);
    if (error) return void toast.error("Não foi possível excluir");
    toast.success("Gasto recorrente excluído"); void load();
  };
  const total = items.filter((i) => i.active).reduce((a, i) => a + i.amount, 0);

  return (
    <div className="recurring-layout mx-auto max-w-4xl space-y-3">
      <form onSubmit={add} className="glass-card space-y-3 p-4">
        <h2 className="font-semibold">{editing ? "Editar gasto mensal" : "Novo gasto mensal"}</h2>
        <div className="space-y-1"><Label htmlFor="rd">Descrição</Label><Input id="rd" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Netflix, aluguel" maxLength={160} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 space-y-1"><Label htmlFor="ra">Valor (R$)</Label><Input id="ra" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div>
          <div className="min-w-0 space-y-1"><Label htmlFor="rday">Dia do mês</Label><Input id="rday" type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label htmlFor="rc">Categoria</Label>
          <select id="rc" value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm">
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>)}
          </select></div>
        <p className="text-xs text-muted-foreground">Dias 29–31 caem no último dia em meses mais curtos.</p>
        <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow">Salvar recorrente</Button>
        {editing && <Button type="button" variant="outline" className="w-full" onClick={() => { setEditing(null); setDesc(""); setAmount(""); }}>Cancelar</Button>}
      </form>
      <section className="glass-card p-4">
        <div className="mb-2 flex justify-between gap-2"><h2 className="font-semibold">Seus recorrentes</h2><span className="text-sm text-destructive">{brl(total)}/mês</span></div>
        {items.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhum gasto recorrente ainda.</p>}
        <ul className="divide-y divide-border">
          {items.map((r) => {
            const c = categories.find((x) => x.id === r.category_id);
            const [y, m] = r.next_month.split("-").map(Number) as [number, number];
            return (
              <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2.5">
                <div className="min-w-0">
                  <p className={`break-words font-medium ${r.active ? "" : "text-muted-foreground line-through"}`}>{r.description}</p>
                  <p className="break-words text-xs text-muted-foreground">{c ? `${c.icon ?? ""} ${c.name} · ` : ""}todo dia {r.day} · {r.active ? `próximo ${dueDate(y, m, r.day).split("-").reverse().join("/")}` : "pausado"}</p>
                  <p className="font-display font-semibold text-destructive">{brl(r.amount)}</p>
                </div>
                <div className="flex shrink-0 flex-col sm:flex-row">
                  <Button variant="ghost" size="icon" aria-label="Editar recorrente" onClick={() => { setEditing(r); setDesc(r.description); setAmount(String(r.amount)); setDay(String(r.day)); setCat(r.category_id ?? ""); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={r.active ? "Pausar" : "Reativar"} onClick={() => toggle(r)}>{r.active ? <Pause /> : <Play />}</Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir recorrente" onClick={() => remove(r)}><Trash2 /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}