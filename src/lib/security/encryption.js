import crypto from "crypto";

function encryptionKey() {
  const value = String(process.env.WALLET_ENCRYPTION_KEY || "").trim();
  if (!value) throw new Error("WALLET_ENCRYPTION_KEY is not configured.");
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("WALLET_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function encryptWalletSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(secret)), cipher.final()]);
  return JSON.stringify({ v: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") });
}

export function decryptWalletSecret(payload) {
  const value = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (value?.algorithm !== "aes-256-gcm") throw new Error("Unsupported wallet secret format.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]);
}