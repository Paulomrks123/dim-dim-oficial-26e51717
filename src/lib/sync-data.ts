import type { State } from "./store";

export type CloudData = Omit<State, "pin">;
export const cloudData = ({ pin: _pin, ...data }: State): CloudData => data;

/** Apply only local edits to the latest cloud snapshot, including deletions. */
export function mergeData(base: CloudData, local: CloudData, remote: CloudData): CloudData {
  const result = { ...remote };
  for (const key of ["name", "email", "layout", "pinHash"] as const) {
    if (JSON.stringify(local[key]) !== JSON.stringify(base[key])) Object.assign(result, { [key]: local[key] });
  }
  for (const key of ["categories", "transactions", "goals"] as const) {
    const before = new Map(base[key].map((row) => [row.id, row]));
    const current = new Map(local[key].map((row) => [row.id, row]));
    const merged = new Map(remote[key].map((row) => [row.id, row]));
    for (const id of before.keys()) if (!current.has(id)) merged.delete(id);
    for (const [id, row] of current) {
      if (JSON.stringify(row) !== JSON.stringify(before.get(id))) merged.set(id, row);
    }
    Object.assign(result, { [key]: [...merged.values()] });
  }
  result.syncedRecurring = [...new Set([...(remote.syncedRecurring ?? []), ...(local.syncedRecurring ?? [])])];
  return result;
}