import { useSyncExternalStore } from "react";

export type TxType = "income" | "expense";
export interface Category { id: string; name: string; color: string; icon?: string | undefined; limit?: number | undefined }
export interface Transaction { id: string; type: TxType; amount: number; description: string; categoryId?: string | undefined; date: string; recurringId?: string | undefined }
export interface Goal { id: string; name: string; target: number; current: number; deadline?: string | undefined }
export interface State {
  pin?: string | undefined;
  pinHash?: string | undefined;
  name: string;
  email: string;
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  layout?: Layout | undefined;
  syncedRecurring?: string[] | undefined;
}
export type Layout = "mini" | "compact" | "normal" | "large";
export const LAYOUT_SIZE: Record<Layout, string> = { mini: "10px", compact: "11px", normal: "12px", large: "13.5px" };

const KEY = "meu-dim-dim:v2";
let storageKey = KEY;
export const COLORS: string[] = [
  "#22c55e", "#84cc16", "#10b981", "#14b8a6", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#d946ef", "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#64748b", "#94a3b8",
];
export const ICONS: string[] = [
  "🛒", "🍔", "🍽️", "☕", "💊", "🏥", "🏠", "💡", "🚿", "🔥",
  "📶", "📱", "📺", "🎮", "🎬", "🎵", "🚗", "⛽", "🚌", "🚕",
  "🚲", "✈️", "🧳", "👕", "💇", "🎁", "📚", "🎓", "💼", "🏋️",
  "🐶", "🐱", "🧹", "🍷", "💰", "📈", "🧾", "🎯", "🧒", "🎂",
];
const seedCats: Category[] = [
  { id: "inter", name: "inter • TV • celular", color: "#0ea5e9", icon: "📶", limit: 165 },
  { id: "farm", name: "FARMÁCIA", color: "#14b8a6", icon: "💊", limit: 200 },
  { id: "luz", name: "LUZ • ÁGUA", color: "#f59e0b", icon: "💡", limit: 400 },
  { id: "comp", name: "COMPRAS", color: "#22c55e", icon: "🛒", limit: 1500 },
  { id: "out", name: "OUTROS", color: "#8b5cf6", icon: "💼", limit: 500 },
  { id: "casa", name: "CASA • REFORMA", color: "#f97316", icon: "🏠", limit: 200 },
  { id: "uber", name: "uber gasolina", color: "#84cc16", icon: "🚗", limit: 300 },
  { id: "edu", name: "EDUCAÇÃO", color: "#d946ef", icon: "📚", limit: 0 },
];
// Categorias que vieram com cor/ícone repetido: só troca quando o usuário não mexeu nelas.
const CAT_STYLE_FIX: Record<string, { from: { color: string; icon: string }; to: { color: string; icon: string } }> = {
  inter: { from: { color: "#f59e0b", icon: "🎮" }, to: { color: "#0ea5e9", icon: "📶" } },
  luz: { from: { color: "#f97316", icon: "🎮" }, to: { color: "#f59e0b", icon: "💡" } },
  farm: { from: { color: "#0ea5e9", icon: "💊" }, to: { color: "#14b8a6", icon: "💊" } },
  out: { from: { color: "#f43f5e", icon: "💼" }, to: { color: "#8b5cf6", icon: "💼" } },
  casa: { from: { color: "#22c55e", icon: "🏠" }, to: { color: "#f97316", icon: "🏠" } },
  edu: { from: { color: "#9ca3af", icon: "📚" }, to: { color: "#d946ef", icon: "📚" } },
};
const restyle = (cats: Category[]): Category[] =>
  cats.map((c) => {
    const fix = CAT_STYLE_FIX[c.id];
    return fix && c.color === fix.from.color && c.icon === fix.from.icon ? { ...c, ...fix.to } : c;
  });
const tx = (id: string, categoryId: string | undefined, amount: number, date: string, description: string, type: TxType = "expense"): Transaction => ({ id, type, amount, description, categoryId, date });
const seedTx: Transaction[] = [
  tx("t0", undefined, 4350, "2026-11-01", "Salário", "income"),
  tx("t1", "edu", 110, "2026-11-02", "Educação"),
  tx("t2", "inter", 209, "2026-11-03", "Internet, TV e celular"),
  tx("t3", "comp", 1435, "2026-11-04", "Compras"),
  tx("t4", "out", 1499, "2026-11-05", "Outros"),
  tx("t5", "luz", 350, "2026-11-06", "Luz e água"),
  tx("t6", "farm", 75, "2026-11-07", "Farmácia"),
  tx("t7", "uber", 55, "2026-11-08", "Uber / gasolina"),
];
const defaults = (): State => ({ name: "", email: "", categories: seedCats, transactions: seedTx, goals: [] });

let state: State = defaults();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const s = { ...defaults(), ...(JSON.parse(raw) as Partial<State>) };
      state = { ...s, categories: restyle(s.categories ?? []) };
    } else {
      const old = localStorage.getItem("meu-dim-dim:v1");
      if (old) state = { ...defaults(), pin: JSON.parse(old).pin };
    }
  } catch { /* ignore */ }
}

export function setState(fn: (s: State) => State) {
  load();
  state = fn(state);
  localStorage.setItem(storageKey, JSON.stringify(state));
  listeners.forEach((l) => l());
}
export function getState() { load(); return state; }
export function subscribeStore(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function bindAccount(userId: string | null) {
  storageKey = userId ? `${KEY}:${userId}` : KEY;
  loaded = false;
  state = defaults();
  load();
  listeners.forEach((l) => l());
}
export function hasLocalAccount(userId: string) { return Boolean(localStorage.getItem(`${KEY}:${userId}`)); }
export function hasLegacyData() { return Boolean(localStorage.getItem(KEY)); }
export function resetData() {
  setState((s) => ({ ...defaults(), pin: s.pin, pinHash: s.pinHash, name: s.name, email: s.email, layout: s.layout, syncedRecurring: s.syncedRecurring, categories: [], transactions: [], goals: [] }));
}

const server = defaults();
export function useStore(): State {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => getState(),
    () => server,
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const monthKey = (d: string | Date) => {
  const x = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};
export const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const monthLabel = (k: string) => { const [y, m] = k.split("-"); return `${MONTHS[Number(m) - 1] ?? ""} ${y}`; };
export const today = () => new Date().toISOString().slice(0, 10);
export function totals(txs: Transaction[]) {
  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  return { income, expense, balance: income - expense };
}

// Session (PIN unlocked)
const SKEY = "meu-dim-dim:session";
export const isUnlocked = () => typeof window !== "undefined" && sessionStorage.getItem(SKEY) === "1";
export const unlock = () => sessionStorage.setItem(SKEY, "1");
export const lock = () => sessionStorage.removeItem(SKEY);
