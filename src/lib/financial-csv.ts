import { monthLabel } from "./store";
import { buildReport, money, type ReportState } from "./report-data";

/** CSV with the same spreadsheet layout as the PDF (Excel pt-BR: ';' separator, BOM). */
export function createFinancialCsv(state: ReportState): Blob {
  const { months, blocks, goals } = buildReport(state);
  const head = months.map((m) => `${monthLabel(m).slice(0, 3).toUpperCase()}/${m.slice(0, 4)}`);
  const rows: string[][] = [["PLANILHA FINANCEIRA — MEU DIM DIM"], [`Emitido em ${new Date().toLocaleDateString("pt-BR")}`], [], ["Categoria", "Item", ...head]];
  for (const b of blocks) {
    rows.push([b.title, b.note]);
    for (const r of b.rows) rows.push(["", r.label, ...r.values.map(money)]);
    if (b.total) rows.push(["", "TOTAL", ...b.total.map(money)]);
    for (const e of b.extra) rows.push(["", e.label, ...e.values]);
    rows.push([]);
  }
  if (goals.length) { rows.push(["METAS"], ["Meta", "Objetivo", "Guardado", "Progresso"], ...goals); }
  const esc = (c: string) => `"${c.replace(/"/g, '""')}"`;
  return new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
}
