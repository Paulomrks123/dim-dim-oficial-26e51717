export function byDescendingValue<T extends { value: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.value - a.value);
}