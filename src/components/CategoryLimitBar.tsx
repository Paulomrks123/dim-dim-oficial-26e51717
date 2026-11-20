import { brl } from "@/lib/store";
import { limitBar } from "@/lib/limit-bar";

/** Barra de limite de uma categoria: trilho cinza-escuro, gasto e a linha "Limite R$ X · Y%". */
export function CategoryLimitBar({ value, limit, maximum, color }: { value: number; limit: number | undefined; maximum: number; color: string }) {
  const { limit: lim, pct, over, warn, width, tone } = limitBar(value, limit, maximum);
  return (
    <div className="mt-1.5">
      <div className="block h-3 w-full overflow-hidden rounded-sm" style={{ background: "var(--limit-track)" }} aria-hidden="true">
        <div className="animate-grow block h-full origin-left rounded-sm" style={{ width: `${width}%`, background: over ? `linear-gradient(90deg, ${color} 80%, var(--destructive))` : color }} />
      </div>
      <p className="mt-1 text-[11px] font-medium tabular-nums" style={{ color: over ? "var(--destructive)" : warn ? "var(--warning)" : "var(--muted-foreground)" }}>
        {!lim ? "Sem limite" : `Limite ${brl(lim)} · ${Math.round(pct)}%`}
      </p>
    </div>
  );
}
