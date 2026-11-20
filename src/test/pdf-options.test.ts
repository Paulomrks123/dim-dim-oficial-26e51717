import { describe, expect, it } from "vitest";
import { defaultPdfOptions } from "@/lib/pdf-options";

describe("Opções principais do PDF escolhidas na imagem", () => {
  it("inicia com tamanho Normal", () => { expect(defaultPdfOptions.textSize).toBe("normal"); });
  it("inicia com contraste Alto", () => { expect(defaultPdfOptions.contrast).toBe("high"); });
  it("inicia na orientação Retrato", () => { expect(defaultPdfOptions.orientation).toBe("portrait"); });
});