import { describe, expect, it } from "vitest";
import { limitBar } from "@/lib/limit-bar";

describe("Barra de limite dentro do cartão de categoria", () => {
  it("mostra a barra cheia e tom vermelho quando o gasto passa do limite", () => {
    const bar = limitBar(1499, 500, 1499);
    expect(bar.over).toBe(true);
    expect(bar.pct).toBeCloseTo(299.8, 1);
    expect(bar.width).toBe(100);
    expect(bar.tone).toBe("destructive");
  });

  it("avisa em amarelo a partir de 80% do limite", () => {
    const bar = limitBar(350, 400, 1499);
    expect(bar.over).toBe(false);
    expect(bar.warn).toBe(true);
    expect(bar.width).toBeCloseTo(87.5, 1);
    expect(bar.tone).toBe("warning");
  });

  it("mantém o tom da categoria abaixo de 80% do limite", () => {
    const bar = limitBar(75, 500, 1499);
    expect(bar.warn).toBe(false);
    expect(bar.width).toBeCloseTo(15, 1);
    expect(bar.tone).toBe("category");
  });

  it("usa a proporção do maior gasto quando a categoria não tem limite", () => {
    const bar = limitBar(119, undefined, 1499);
    expect(bar.limit).toBe(0);
    expect(bar.over).toBe(false);
    expect(bar.width).toBeCloseTo(7.94, 1);
    expect(bar.tone).toBe("category");
  });
});
