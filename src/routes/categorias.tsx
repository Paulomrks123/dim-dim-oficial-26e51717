import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDetails } from "@/components/DetailsDialog";
import { TransactionDialog } from "@/components/TransactionDialog";
import { monthKey, brl, COLORS, ICONS, setState, uid, useStore, type Category } from "@/lib/store";

export const Route = createFileRoute("/categorias")({
  head: () => ({ meta: [
    { title: "Categorias — Meu Dim Dim" },
    { name: "description", content: "Organize seus gastos por categorias e limites mensais." },
    { property: "og:title", content: "Categorias — Meu Dim Dim" },
    { property: "og:description", content: "Crie categorias e defina limites mensais." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  const { categories } = useStore();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(COLORS[0]!);
  const [icon, setIcon] = useState<string>(ICONS[0]!);
  const [limit, setLimit] = useState("");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

  const start = (c?: Category) => {
    setEditing(c ?? null); setName(c?.name ?? ""); setColor(c?.color ?? COLORS[0]!);
    setIcon(c?.icon ?? ICONS[Math.floor(Math.random() * ICONS.length)]!); setLimit(c?.limit ? String(c.limit) : ""); setOpen(true);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return void toast.error("Informe o nome");
    const l = parseFloat(limit.replace(",", "."));
    const cat: Category = { id: editing?.id ?? uid(), name: name.trim(), color, icon: icon || undefined, limit: l > 0 ? l : undefined };
    setState((s) => ({ ...s, categories: editing ? s.categories.map((c) => c.id === cat.id ? cat : c) : [...s.categories, cat] }));
    toast.success(editing ? "Categoria atualizada" : "Categoria criada");
    setOpen(false);
  };

  return (
    <AppShell title="Categorias" subtitle="Adicionar nova categoria"
      actions={<Button onClick={() => start()} className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4" />Nova categoria</Button>}>
      {categories.length === 0 && <div className="glass-card p-10 text-center text-muted-foreground">Crie sua primeira categoria</div>}
      <CatGrid onEdit={start} onAddItem={(categoryId) => { setSelectedCategoryId(categoryId); setTransactionOpen(true); }} />
      <TransactionDialog open={transactionOpen} onOpenChange={(value) => { setTransactionOpen(value); if (!value) setSelectedCategoryId(undefined); }} initialCategoryId={selectedCategoryId} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input placeholder="Ex: Alimentação" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid max-h-36 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2 sm:grid-cols-8">
                {ICONS.map((i) => (
                  <button type="button" key={i} aria-label={`Ícone ${i}`} onClick={() => setIcon(i)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-transform hover:scale-110 ${icon === i ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}>{i}</button>
                ))}
              </div>
              <button type="button" onClick={() => setIcon("")} className={`text-xs underline-offset-2 hover:underline ${!icon ? "font-semibold text-primary" : "text-muted-foreground"}`}>Sem ícone</button>
            </div>
            <div className="space-y-2"><Label>Cor</Label>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((c) => <button type="button" key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full border ${color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />)}
                <input aria-label="Escolher cor personalizada" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 rounded-full bg-transparent" />
              </div></div>
            <div className="space-y-2"><Label>Limite mensal (R$)</Label><Input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="Opcional" /></div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function CatGrid({ onEdit, onAddItem }: { onEdit: (c: Category) => void; onAddItem: (categoryId: string) => void }) {
  const { categories, transactions } = useStore();
  const show = useDetails();
  const mk = monthKey(new Date());
  const open = (c: Category) => {
    const txs = transactions.filter((t) => t.categoryId === c.id).sort((a, b) => b.date.localeCompare(a.date));
    const month = txs.filter((t) => monthKey(t.date) === mk && t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const total = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    show({ title: `${c.icon ?? ""} ${c.name}`.trim(), subtitle: "Detalhes da categoria", transactions: txs, rows: [
      { label: "Gasto neste mês", value: brl(month), tone: "destructive" },
      { label: "Gasto total", value: brl(total) },
      { label: "Limite mensal", value: c.limit ? brl(c.limit) : "Sem limite", onClick: () => { const v = prompt(`Limite mensal (R$) para ${c.name}`, String(c.limit ?? 0)); if (v === null) return; const n = parseFloat(v.replace(",", ".")); if (isNaN(n) || n < 0) return void toast.error("Valor inválido"); setState((s) => ({ ...s, categories: s.categories.map((x) => x.id === c.id ? { ...x, limit: n } : x) })); toast.success("Limite atualizado"); } },
      { label: "Lançamentos", value: String(txs.length) },
    ], action: { label: "Adicionar item", onClick: () => onAddItem(c.id) } });
  };
  return (
    <div className="category-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <div key={c.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(c); } }} onClick={() => open(c)} className="category-tile glass-card flex cursor-pointer items-center gap-3 p-4 transition-transform active:scale-[0.98]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: c.color, boxShadow: `0 0 14px ${c.color}` }}>{c.icon || "🏷️"}</span>
          <div className="min-w-0 flex-1"><p className="inline-flex max-w-full break-words rounded-full border px-3 py-1 font-medium" style={{ borderColor: c.color, background: `color-mix(in srgb, ${c.color} 14%, transparent)`, boxShadow: `0 0 0 1px color-mix(in srgb, ${c.color} 22%, transparent)` }}>{c.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.limit ? `Limite mensal: ${brl(c.limit)}` : "Sem limite"}</p></div>
          <button aria-label="Editar" onClick={(e) => { e.stopPropagation(); onEdit(c); }}><Pencil className="h-4 w-4 text-muted-foreground" /></button>
          <button aria-label="Excluir" onClick={(e) => { e.stopPropagation(); setState((s) => ({ ...s, categories: s.categories.filter((x) => x.id !== c.id) })); toast.success("Categoria excluída"); }}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
        </div>
      ))}
    </div>
  );
}
