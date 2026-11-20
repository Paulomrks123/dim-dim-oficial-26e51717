import { useState } from "react";
import { Download, FileSpreadsheet, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCloudSync } from "./CloudSync";
import { getState } from "@/lib/store";
import { createFinancialCsv } from "@/lib/financial-csv";
import { deliverFile } from "@/lib/download";

export function CsvExport() {
  const { status, session } = useCloudSync();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = status === "saved" && !!session;

  const prepare = () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const { name, transactions, categories, goals } = getState();
      const file = createFinancialCsv({ name, transactions: [...transactions], categories: [...categories], goals: [...goals] });
      setBlob(file);
      toast.success("CSV preparado. Toque em Baixar CSV para salvar.");
    } catch {
      toast.error("Não foi possível preparar o CSV. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!blob) return;
    const filename = `meu-dim-dim-${new Date().toISOString().slice(0, 10)}.csv`;
    void deliverFile(blob, filename)
      .then(() => setBlob(null))
      .catch(() => toast.error("Não foi possível baixar o CSV."));
  };

  return (
    <Button type="button" variant="outline" className="w-full justify-start gap-3" disabled={!ready || busy} onClick={blob ? download : prepare}
      title={ready ? "Exportar relatório financeiro em CSV" : "Aguarde seus dados serem salvos na nuvem"}>
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : blob ? <Download className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
      {busy ? "Preparando CSV…" : blob ? "Baixar CSV" : "Exportar CSV"}
    </Button>
  );
}
