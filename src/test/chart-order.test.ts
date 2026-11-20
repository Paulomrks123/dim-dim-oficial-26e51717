import { describe, expect, it } from "vitest";
import { byDescendingValue } from "@/lib/chart-order";

describe("Ordem do gráfico por gasto", () => {
  it("coloca os maiores valores antes dos menores sem modificar os dados originais", () => {
    const items = [{ value: 209 }, { value: 75 }, { value: 350 }, { value: 1435 }, { value: 1499 }, { value: 55 }, { value: 110 }];
    expect(byDescendingValue(items).map((item) => item.value)).toEqual([1499, 1435, 350, 209, 110, 75, 55]);
    expect(items[0]?.value).toBe(209);
  });
});