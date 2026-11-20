import { useState } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCloudSync } from "./CloudSync";
import { getState } from "@/lib/store";
import { deliverFile } from "@/lib/download";
import { defaultPdfOptions, type PdfOptions } from "@/lib/pdf-options";

const CHOICES: { key: keyof PdfOptions; label: string; options: { value: string; label: string }[] }[] = [
  { key: "textSize", label: "Tamanho do texto", options: [{ value: "normal", label: "Normal" }, { value: "large", label: "Grande" }, { value: "xlarge", label: "Extra grande" }] },
  { key: "contrast", label: "Contraste", options: [{ value: "standard", label: "Padrão" }, { value: "high", label: "Alto" }] },
  { key: "orientation", label: "Orientação", options: [{ value: "portrait", label: "Retrato" }, { value: "landscape", label: "Paisagem" }] },
];

export function PdfExport() {
  const { status, session } = useCloudSync();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState("");
  const [opts, setOpts] = useState<PdfOptions>(defaultPdfOptions);
  const ready = status === "saved" && !!session;
  const choose = (key: keyof PdfOptions, value: string) => { setOpts((o) => ({ ...o, [key]: value })); setBlob(null); };
  const prepare = async () => {
    if (!ready) return;
    setBusy(true); setBlob(null);
    const { name, transactions, categories, goals } = getState();
    try {
      const { createFinancialPdf } = await import("@/lib/financial-pdf");
      setBlob(await createFinancialPdf({ name, transactions: [...transactions], categories: [...categories], goals: [...goals] }, opts));
      setFilename(`${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(" de ", " ")}.pdf`);
    } catch { toast.error("Não foi possível preparar o PDF. Tente novamente."); }
    finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" onClick={() => { setBlob(null); setOpen(true); }} disabled={!ready} title={status === "saved" ? "Exportar relatório completo" : "Aguarde seus dados serem salvos na nuvem"}>
      <FileText className="h-4 w-4" />Exportar PDF
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-card max-h-[90dvh] overflow-y-auto border-border" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>Relatório financeiro em PDF</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {CHOICES.map((c) => (
            <div key={c.key} role="radiogroup" aria-label={c.label}>
              <p className="mb-1.5 text-sm font-semibold">{c.label}</p>
              <div className="flex flex-wrap gap-2">
                {c.options.map((o) => (
                  <Button key={o.value} type="button" size="sm" role="radio" aria-checked={opts[c.key] === o.value}
                    variant={opts[c.key] === o.value ? "default" : "outline"} onClick={() => choose(c.key, o.value)}>{o.label}</Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {busy ? <div role="status" className="flex items-center gap-2 py-2 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" />Preparando PDF…</div>
          : blob ? <Button className="w-full" onClick={() => { void deliverFile(blob, filename).catch(() => toast.error("Não foi possível baixar o PDF.")); }}><Download className="h-4 w-4" />Baixar PDF</Button>
          : <Button className="w-full" variant="secondary" onClick={prepare}><FileText className="h-4 w-4" />Gerar PDF</Button>}
      </DialogContent>
    </Dialog>
  </>;
}
