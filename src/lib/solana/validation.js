import { PublicKey } from "@solana/web3.js";

export function isValidSolanaAddress(address) {
  try { new PublicKey(String(address || "")); return true; } catch { return false; }
}

export function parsePositiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero.");
  return amount;
}