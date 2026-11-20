import { jsPDF } from "jspdf";
import { monthLabel } from "./store";
import { buildReport, money, reportItemDate, type ReportBlock, type ReportState } from "./report-data";

import { defaultPdfOptions, type PdfOptions } from "./pdf-options";
import { incomeShare } from "./income-share";
export { defaultPdfOptions, type PdfOptions } from "./pdf-options";
const SCALE = { normal: 1.365, large: 1.82, xlarge: 2.275 } as const; // +30% em toda a escala do PDF
const THEMES = {
  high: { ink: "#000000", muted: "#1f2937", grid: "#000000", head: "#000000", band: "#062f42", bandText: "#ffffff", brand: "#6ee7b7", fill: 0.78, line: 1 },
  standard: { ink: "#1f2937", muted: "#6b7280", grid: "#9ca3af", head: "#3f4652", band: "#cfe6f1", bandText: "#0b4f6c", brand: "#0b4f6c", fill: 0.82, line: 0.5 },
} as const;

const hexRgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const toHex = (c: number[]) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const tint = (hex: string, k: number) => toHex(hexRgb(hex).map((v) => Math.round(v + (255 - v) * k)));
const shade = (hex: string, max: number) => {
  let c = hexRgb(hex);
  const lum = () => c.reduce((a, v, i) => a + ([0.2126, 0.7152, 0.0722][i] ?? 0) * ((v / 255) <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4), 0);
  while (lum() > max) c = c.map((v) => Math.round(v * 0.9));
  return toHex(c);
};
async function font(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Font unavailable");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}

export async function createFinancialPdf(state: ReportState, options: PdfOptions = defaultPdfOptions): Promise<Blob> {
  const [regular, bold] = await Promise.all([font("/fonts/report-regular.ttf"), font("/fonts/report-bold.ttf")]);
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: options.orientation, compress: true });
  pdf.addFileToVFS("Report.ttf", regular); pdf.addFont("Report.ttf", "Report", "normal");
  pdf.addFileToVFS("ReportBold.ttf", bold); pdf.addFont("ReportBold.ttf", "Report", "bold");
  pdf.setProperties({ title: "Meu Dim Dim — Planilha financeira", author: "Meu Dim Dim", subject: "Gastos por categoria, receitas, limites e metas" });
  const T = THEMES[options.contrast], k = SCALE[options.textSize];
  const { months, blocks, goals } = buildReport(state, { individualTransactions: true });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
  const M = Math.round(24 * k), rowH = Math.round(32 * k), pad = Math.round(8 * k);
  const labelW = Math.round((W - M * 2) * (months.length === 1 ? 0.62 : 0.46));
  const tableX = M, colX = tableX + labelW, colW = (W - M - colX) / months.length;
  const fs = (n: number) => n * k, base = rowH / 2 + fs(15) * 0.35;
  let y = 0;
  type W8 = "normal" | "bold";
  const txt = (v: string, x: number, top: number, size: number, tone: string = T.ink, w: W8 = "normal", align: "left" | "right" | "center" = "left") => {
    pdf.setFont("Report", w); pdf.setFontSize(size); pdf.setTextColor(tone); pdf.text(v, x, top, { align });
  };
  const sizeFor = (v: string, max: number, size: number, w: W8) => { // shrink until it fits the cell
    pdf.setFont("Report", w); let s = size;
    while (s > 5) { pdf.setFontSize(s); if (pdf.getTextWidth(v) <= max) break; s -= 0.5; }
    return s;
  };
  const fit = (v: string, max: number, size: number, w: W8 = "normal") => {
    pdf.setFont("Report", w); pdf.setFontSize(size);
    let s = v; while (s.length > 1 && pdf.getTextWidth(s) > max) s = s.slice(0, -1);
    return s === v ? v : s.slice(0, -1) + "…";
  };
  const value = (v: string, x: number, top: number, w: W8, align: "right" | "center", tone: string = T.ink, height = rowH) => {
    const size = sizeFor(v, colW - pad * 2, fs(15), w);
    txt(v, align === "right" ? x + colW - pad : x + colW / 2, top + height / 2 + size * 0.35, size, tone, w, align);
  };
  const page = (first = false) => {
    if (!first) { pdf.addPage(); y = M; return; }
    const bandH = Math.round(52 * Math.max(k, 0.85));
    pdf.setFillColor(T.band); pdf.rect(M, 20, W - M * 2, bandH, "F");
    txt("PLANILHA FINANCEIRA", W - M - 12, 20 + bandH / 2 + fs(28) * 0.35, sizeFor("PLANILHA FINANCEIRA", W * 0.55, fs(28), "bold"), T.bandText, "bold", "right");
    txt("MEU DIM DIM", M + 12, 20 + bandH / 2 + fs(16) * 0.35, fs(16), T.brand, "bold");
    y = 20 + bandH + 12 * k;
    pdf.setFillColor(T.head); pdf.rect(colX, y, colW * months.length, rowH, "F");
    months.forEach((m, i) => value(`${monthLabel(m).slice(0, 3).toUpperCase()}/${m.slice(0, 4)}`, colX + colW * i, y, "bold", "center", "#ffffff"));
    y += rowH + 8 * k;
  };
  const cell = (x: number, top: number, w: number, fill?: string, height = rowH) => {
    if (fill) { pdf.setFillColor(fill); pdf.rect(x, top, w, height, "F"); }
    pdf.setDrawColor(T.grid); pdf.setLineWidth(T.line); pdf.rect(x, top, w, height);
  };
  const footerRoom = 40 * k;
  const drawBlock = (b: ReportBlock) => {
    pdf.setFont("Report", "bold"); pdf.setFontSize(fs(18));
    const headingLines: string[] = pdf.splitTextToSize(b.title, W - M * 2 - pad * 2);
    const headingHeight = headingLines.length * fs(18) * 1.2 + fs(14) * 1.4 + pad;
    pdf.setFont("Report", "normal"); pdf.setFontSize(fs(15));
    const rows = b.rows.map((r) => {
      const description = r.date ? `${reportItemDate(r.date)} · ${r.label}` : r.label;
      const lines: string[] = pdf.splitTextToSize(description, labelW - pad * 2);
      return { ...r, lines, height: Math.max(rowH, lines.length * fs(15) * 1.2 + pad * 2) };
    });
    const blockHeight = headingHeight + 10 * k + rows.reduce((sum, r) => sum + r.height, 0) + ((b.total ? 1 : 0) + b.extra.length) * rowH + 12 * k;
    if (y + Math.min(blockHeight, headingHeight + 10 * k + (rows[0]?.height ?? rowH)) > H - footerRoom || (blockHeight <= H - M - footerRoom && y + blockHeight > H - footerRoom)) page();
    const side = shade(b.tone, options.contrast === "high" ? 0.12 : 0.2), fill = tint(b.tone, T.fill);
    // Categoria em texto independente, acima da tabela (fora do bloco).
    headingLines.forEach((line, i) => txt(line, M + pad, y + fs(18) + i * fs(18) * 1.2, fs(18), side, "bold"));
    txt(b.note, W - M - pad, y + headingLines.length * fs(18) * 1.2 + fs(14), sizeFor(b.note, W - M * 2 - pad * 2, fs(14), "normal"), T.muted, "normal", "right");
    y += headingHeight;
    pdf.setFillColor(options.contrast === "high" ? side : tint(b.tone, 0.45));
    pdf.rect(M, y, W - M * 2, 10 * k, "F");
    y += 10 * k;
    for (const r of rows) {
      if (y + r.height > H - footerRoom) page();
      cell(tableX, y, labelW, undefined, r.height);
      const textTop = y + (r.height - r.lines.length * fs(15) * 1.2) / 2 + fs(15);
      r.lines.forEach((line, i) => txt(line, tableX + pad, textTop + i * fs(15) * 1.2, fs(15)));
      r.values.forEach((v, i) => { cell(colX + colW * i, y, colW, undefined, r.height); value(money(v), colX + colW * i, y, "normal", "right", v ? T.ink : T.muted, r.height); });
      y += r.height;
    }
    const strong = (label: string, values: string[], align: "right" | "center") => {
      if (y + rowH > H - footerRoom) page();
      cell(tableX, y, labelW, fill); txt(label, tableX + labelW - pad, y + base, sizeFor(label, labelW - pad * 2, fs(15), "bold"), T.ink, "bold", "right");
      values.forEach((v, i) => { cell(colX + colW * i, y, colW, fill); value(v, colX + colW * i, y, "bold", align); });
      y += rowH;
    };
    if (b.total) strong("TOTAL", b.total.map(money), "right");
    for (const e of b.extra) strong(e.label, e.values, "center");
    y += 12 * k;
  };
  page(true);
  blocks.forEach(drawBlock);
  if (goals.length) {
    if (y + fs(28) + rowH * 2 > H - footerRoom) page();
    txt("METAS", M, y + fs(16), fs(20), T.ink, "bold"); y += fs(28);
    const total = W - M * 2, cols = [M, M + total * 0.38, M + total * 0.58, M + total * 0.78, W - M];
    const span = (i: number) => (cols[i + 1] ?? 0) - (cols[i] ?? 0);
    const header = () => { ["Meta", "Objetivo", "Guardado", "Progresso"].forEach((h, i) => { pdf.setFillColor(T.head); pdf.rect(cols[i] ?? 0, y, span(i), rowH, "F"); txt(h, (cols[i] ?? 0) + pad, y + base, sizeFor(h, span(i) - pad * 2, fs(15), "bold"), "#ffffff", "bold"); }); y += rowH; };
    header();
    for (const g of goals) {
      if (y + rowH > H - footerRoom) { page(); header(); }
      g.forEach((v, i) => { cell(cols[i] ?? 0, y, span(i)); txt(i ? v : fit(v, span(i) - pad * 2, fs(15)), (cols[i] ?? 0) + pad, y + base, i ? sizeFor(v, span(i) - pad * 2, fs(15), "normal") : fs(15)); });
      y += rowH;
    }
  }
  { // Gráfico final: receita do mês mais recente e % usada por categoria
    const mk = months[months.length - 1] ?? "";
    const d = incomeShare(state.transactions, state.categories, mk);
    const barH = 12 * k, gap = 8 * k, lineH = fs(15) * 1.2;
    if (y + fs(28) + rowH * 2 > H - footerRoom) page();
    y += 8 * k;
    txt("RECEITA X CATEGORIAS", M, y + fs(18), fs(20), T.ink, "bold");
    y += fs(28);
    const head = `${monthLabel(mk)} · Receita ${money(d.income)}`;
    txt(head, M, y + fs(15), sizeFor(head, W - M * 2, fs(16), "bold"), T.ink, "bold");
    y += fs(16) * 1.4 + 6 * k;
    const full = W - M * 2;
    for (const r of d.rows) {
      const right = `${money(r.value)} · ${r.pct}%`;
      pdf.setFont("Report", "bold"); pdf.setFontSize(fs(15));
      const rw = pdf.getTextWidth(right) + pad;
      const lines: string[] = pdf.splitTextToSize(r.name, full - rw - pad);
      const h = lines.length * lineH + 4 * k + barH + gap;
      if (y + h > H - footerRoom) page();
      lines.forEach((l, i) => txt(l, M, y + fs(15) + i * lineH, fs(15), shade(r.color, options.contrast === "high" ? 0.12 : 0.2), "bold"));
      txt(right, W - M, y + fs(15), fs(15), r.pct > 100 ? "#b91c1c" : T.ink, "bold", "right");
      y += lines.length * lineH + 4 * k;
      pdf.setFillColor(tint(r.color, 0.85)); pdf.rect(M, y, full, barH, "F");
      pdf.setFillColor(r.color); pdf.rect(M, y, full * Math.min(100, r.pct) / 100, barH, "F");
      pdf.setDrawColor(T.grid); pdf.setLineWidth(T.line); pdf.rect(M, y, full, barH);
      y += barH + gap;
    }
    if (!d.rows.length) { txt("Sem despesas no mês.", M, y + fs(15), fs(15), T.muted); y += lineH + gap; }
    const sum = (label: string, v: string, tone: string = T.ink) => {
      if (y + rowH > H - footerRoom) page();
      cell(M, y, full, tint("#0b4f6c", T.fill));
      txt(label, M + pad, y + base, fs(15), T.ink, "bold");
      txt(v, W - M - pad, y + base, fs(15), tone, "bold", "right");
      y += rowH;
    };
    sum("Total gasto", `${money(d.spent)} · ${d.spentPct}%`, d.spentPct > 100 ? "#b91c1c" : T.ink);
    sum("Sobra", money(d.left), d.left < 0 ? "#b91c1c" : T.ink);
  }
  const n = pdf.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i);
    txt(fit(`Meu Dim Dim · Emitido em ${new Date().toLocaleDateString("pt-BR")}${state.name ? " · " + state.name : ""}`, W - M * 2 - 80, fs(13)), M, H - 18, fs(13), T.muted);
    txt(`${i} / ${n}`, W - M, H - 18, fs(13), T.muted, "normal", "right");
  }
  return pdf.output("blob");
}
