export type LimitTone = "category" | "warning" | "destructive";

export type LimitBar = {
  limit: number;
  pct: number;
  over: boolean;
  warn: boolean;
  width: number;
  tone: LimitTone;
};

/** Geometria e tom da barra de limite de uma categoria. */
export function limitBar(value: number, limit: number | undefined, maximum: number): LimitBar {
  const lim = limit && limit > 0 ? limit : 0;
  const pct = lim ? (value / lim) * 100 : 0;
  const over = lim > 0 && value > lim;
  const warn = !over && pct >= 80;
  const width = lim ? Math.min(100, pct) : (value / Math.max(1, maximum)) * 100;
  const tone: LimitTone = over ? "destructive" : warn ? "warning" : "category";
  return { limit: lim, pct, over, warn, width, tone };
}
