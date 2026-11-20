import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "@/lib/pin";

describe("PIN sincronizado", () => {
  it("valida o mesmo PIN protegido em outro aparelho e rejeita PIN incorreto", async () => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
    const pinHash = await hashPin("827461");
    expect(pinHash).not.toContain("827461");
    expect(await verifyPin("827461", { pinHash })).toBe(true);
    expect(await verifyPin("000000", { pinHash })).toBe(false);
  });
});