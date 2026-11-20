import type { State } from "./store";

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
async function derive(pin: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
  return hex(new Uint8Array(bits));
}
export async function hashPin(pin: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `${salt}:${await derive(pin, salt)}`;
}
export async function verifyPin(pin: string, state: Pick<State, "pin" | "pinHash">) {
  if (!state.pinHash) return state.pin === pin;
  const [salt, expected] = state.pinHash.split(":");
  if (!salt || !expected) return false;
  return await derive(pin, salt) === expected;
}