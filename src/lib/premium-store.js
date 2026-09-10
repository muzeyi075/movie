import { getDatabase } from "@/lib/mongodb";
import { defaultPremiumConfig, hashToken } from "@/lib/premium";

async function collection() {
  return (await getDatabase()).collection("premiumSettings");
}

async function tokenCollection() {
  return (await getDatabase()).collection("premiumTokens");
}

export async function getPremiumConfig() {
  const record = await (await collection()).findOne({ key: "main" });
  return { ...defaultPremiumConfig, ...(record?.config || {}) };
}

export async function savePremiumConfig(input = {}) {
  const defaultPrices = defaultPremiumConfig.planPrices;
  const inputPrices = input.planPrices || {};
  const config = {
    phoneNumber: String(input.phoneNumber || defaultPremiumConfig.phoneNumber).trim() || defaultPremiumConfig.phoneNumber,
    amount: Number(input.amount || defaultPremiumConfig.amount),
    planPrices: Object.fromEntries(Object.keys(defaultPrices).map((plan) => [plan, Number(inputPrices[plan] || defaultPrices[plan])])),
    tokenExpiryMinutes: Number(input.tokenExpiryMinutes || defaultPremiumConfig.tokenExpiryMinutes),
    requiresWatchedMovies: Number(input.requiresWatchedMovies || defaultPremiumConfig.requiresWatchedMovies),
  };
  await (await collection()).updateOne({ key: "main" }, { $set: { key: "main", config, updatedAt: new Date() } }, { upsert: true });
  return config;
}

export async function saveIssuedToken({ userId, plan, phoneNumber, amount, transactionId, tokenHash, expiresAt, used = false }) {
  await (await tokenCollection()).updateOne({ transactionId }, { $set: {
    userId: userId ? String(userId).trim() : null,
    plan: String(plan || "1-month").trim(),
    phoneNumber: String(phoneNumber || "").trim(),
    amount: Number(amount || 0),
    transactionId: String(transactionId || "").trim(),
    tokenHash: String(tokenHash || "").trim(),
    expiresAt: new Date(expiresAt),
    used: Boolean(used),
    createdAt: new Date(),
  } }, { upsert: true });
}

export async function getIssuedTokenByTransactionId(transactionId) {
  return (await (await tokenCollection()).findOne({ transactionId: String(transactionId || "").trim() }));
}

export async function findIssuedTokenByHash(tokenHash) {
  return (await (await tokenCollection()).findOne({ tokenHash: String(tokenHash || "").trim() }));
}

export async function markTokenUsed(tokenHash) {
  await (await tokenCollection()).updateOne({ tokenHash: String(tokenHash || "").trim() }, { $set: { used: true, usedAt: new Date() } });
}

export function normalizeTokenHash(token) {
  return hashToken(token);
}
