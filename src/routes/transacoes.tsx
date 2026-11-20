import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { TransactionDialog } from "@/components/TransactionDialog";
import { TransactionList } from "@/components/TransactionList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfExport } from "@/components/PdfExport";
import { getState, useStore } from "@/lib/store";
import { createFinancialCsv } from "@/lib/financial-csv";
import { deliverFile } from "@/lib/download";

export const Route = createFileRoute("/transacoes")({
  head: () => ({ meta: [
    { title: "Transações — Meu Dim Dim" },
    { name: "description", content: "Todas as suas receitas e despesas em um só lugar." },
    { property: "og:title", content: "Transações — Meu Dim Dim" },
    { property: "og:description", content: "Liste, filtre e exporte suas transações." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  const { transactions } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const list = useMemo(() => {
    const filtered = transactions.filter((t) =>
      (type === "all" || t.type === type) && t.description.toLowerCase().includes(q.toLowerCase())
    );
    // Mais recentes primeiro; as datas antigas ficam no final da lista.
    return filtered.sort((a, b) =>
      new Date(b.date + "T12:00:00").getTime() - new Date(a.date + "T12:00:00").getTime()
    );
  }, [transactions, q, type]);

  const exportCsv = () => {
    const { name, transactions: tx, categories: cats, goals } = getState();
    void deliverFile(createFinancialCsv({ name, transactions: tx, categories: cats, goals }), `meu-dim-dim-${new Date().toISOString().slice(0, 10)}.csv`)
      .then(() => toast.success("Planilha exportada")).catch(() => toast.error("Não foi possível exportar."));
  };

  return (
    <AppShell title="Transações" subtitle={`${list.length} transações encontradas`}>
      <div className="ledger-section">
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Exportar</Button>
          <PdfExport />
          <Button onClick={() => setOpen(true)} className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4" />Nova transação</Button>
        </div>
        <div className="ledger-toolbar mb-5 flex flex-wrap gap-2">
          <Input aria-label="Buscar transações" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1 basis-full sm:basis-auto" />
          {(["all", "income", "expense"] as const).map((t) => (
            <Button key={t} size="sm" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>
              {t === "all" ? "Todas" : t === "income" ? "Receitas" : "Despesas"}
            </Button>
          ))}
        </div>
        <TransactionList items={list} />
      </div>
      <TransactionDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
