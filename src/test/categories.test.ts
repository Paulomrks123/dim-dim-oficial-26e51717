import { describe, expect, it } from "vitest";

import { COLORS, ICONS, getState } from "@/lib/store";

describe("Categorias", () => {
  it("oferece muitas cores e ícones para escolher", () => {
    expect(COLORS.length).toBeGreaterThanOrEqual(12);
    expect(ICONS.length).toBeGreaterThanOrEqual(20);
  });

  it("cada categoria de exemplo tem ícone e cor própria", () => {
    const cats = getState().categories;
    expect(cats.length).toBeGreaterThan(0);
    for (const c of cats) expect(c.icon).toBeTruthy();
    expect(new Set(cats.map((c) => c.color)).size).toBe(cats.length);
  });
});
