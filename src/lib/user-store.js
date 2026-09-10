import { getDatabase } from "./mongodb.js";

export const PREMIUM_PLANS = {
  "1-day": { label: "1 Day", durationMs: 24 * 60 * 60 * 1000 },
  "1-week": { label: "1 Week", durationMs: 7 * 24 * 60 * 60 * 1000 },
  "1-month": { label: "1 Month", durationMs: 30 * 24 * 60 * 60 * 1000 },
  "3-months": { label: "3 Months", durationMs: 90 * 24 * 60 * 60 * 1000 },
  lifetime: { label: "Lifetime", durationMs: 0 },
};

function userProjection() {
  return { _id: 0, passwordHash: 0, privateKey: 0, encryptedSecret: 0 };
}

export async function getUsersCollection() {
  return (await getDatabase()).collection("users");
}

export async function getPaymentsCollection() {
  return (await getDatabase()).collection("payments");
}

export async function getSubscriptionsCollection() {
  return (await getDatabase()).collection("subscriptions");
}

export async function listUserSubscriptions(userId) {
  return (await getSubscriptionsCollection()).find({ userId: String(userId) }).sort({ createdAt: -1 }).limit(50).toArray();
}

export async function getLoginChallengesCollection() {
  return (await getDatabase()).collection("loginChallenges");
}

export async function findUserById(userId) {
  const collection = await getUsersCollection();
  const user = await collection.findOne({ userId }, { projection: userProjection() });
  return user;
}

export async function findUserByEmail(email) {
  const collection = await getUsersCollection();
  return collection.findOne({ email: String(email || "").trim().toLowerCase() }, { projection: userProjection() });
}

export async function findUserByPublicKey(publicKey) {
  const collection = await getUsersCollection();
  return collection.findOne({ publicKey: String(publicKey || "").trim() }, { projection: userProjection() });
}

export async function findUserBySessionId(sessionId) {
  const collection = await getUsersCollection();
  const id = String(sessionId || "").trim();
  if (!id) return null;
  return collection.findOne({ $or: [{ sessionId: id }, { userId: id }, { publicKey: id }] }, { projection: userProjection() });
}

export function sanitizeUser(user) {
  if (!user) return null;
  const { _id, passwordHash, privateKey, encryptedSecret, ...safeUser } = user;
  return {
    ...safeUser,
    userId: user.userId,
    sessionId: user.sessionId || (user.authType === "crypto" ? user.userId : null),
    premium: Boolean(user.premium),
    premiumPlan: user.premiumPlan || "free",
    premiumExpiresAt: user.premiumExpiresAt || null,
    authType: user.authType || "google",
    createdAt: user.createdAt || new Date().toISOString(),
  };
}

export async function upsertUser(input = {}) {
  const collection = await getUsersCollection();
  const userId = String(input.userId || input.id || `user_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const now = new Date();
  const user = {
    userId,
    username: String(input.username || input.name || "Cinemora User").trim() || "Cinemora User",
    email: input.email ? String(input.email).trim().toLowerCase() : null,
    publicKey: input.publicKey ? String(input.publicKey).trim() : null,
    sessionId: input.sessionId ? String(input.sessionId).trim() : (input.authType === "crypto" ? userId : null),
    avatar: input.avatar || input.photoURL || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    authType: input.authType || (input.publicKey ? "crypto" : "google"),
    premium: Boolean(input.premium),
    premiumPlan: input.premiumPlan || "free",
    premiumExpiresAt: input.premiumExpiresAt || null,
    createdAt: input.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const existing = await collection.findOne({ userId });
  if (!existing) {
    await collection.insertOne(user);
    return sanitizeUser(user);
  }

  const updates = {
    username: user.username,
    publicKey: user.publicKey || existing.publicKey,
    sessionId: user.sessionId || existing.sessionId,
    avatar: user.avatar,
    authType: user.authType || existing.authType,
    updatedAt: user.updatedAt,
  };
  if (user.email) updates.email = user.email;
  await collection.updateOne({ userId }, { $set: updates });
  return sanitizeUser({ ...existing, ...updates, userId });
}

export function isPremiumActive(user) {
  if (!user || !user.premium) return false;
  if (user.premiumPlan === "lifetime") return true;
  if (!user.premiumExpiresAt) return false;
  return new Date(user.premiumExpiresAt).getTime() > Date.now();
}

export function getPlanDuration(plan) {
  const normalized = String(plan || "free").toLowerCase();
  return PREMIUM_PLANS[normalized]?.durationMs ?? 0;
}

export async function createPayment(input = {}) {
  const collection = await getPaymentsCollection();
  const payment = {
    paymentId: String(input.paymentId || `pay_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    userId: input.userId ? String(input.userId).trim() : "guest",
    sessionId: input.sessionId ? String(input.sessionId).trim() : null,
    authType: input.authType ? String(input.authType).trim() : null,
    username: String(input.username || "").trim(),
    email: input.email ? String(input.email).trim().toLowerCase() : null,
    plan: String(input.plan || "1-month").trim(),
    phoneNumber: String(input.phoneNumber || "").trim(),
    amount: Number(input.amount || 0),
    transactionId: String(input.transactionId || "").trim(),
    status: "pending",
    notes: String(input.notes || "").trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await collection.insertOne(payment);
  return payment;
}

export async function listPayments(status = null) {
  const collection = await getPaymentsCollection();
  const query = status ? { status } : {};
  return collection.find(query).sort({ createdAt: -1 }).toArray();
}

export async function deletePayment(paymentId) {
  const collection = await getPaymentsCollection();
  const result = await collection.deleteOne({ paymentId: String(paymentId || "").trim() });
  return result.deletedCount > 0;
}

export async function updatePaymentStatus(paymentId, status, adminName = "admin", plan = null) {
  const collection = await getPaymentsCollection();
  const updates = { status, updatedAt: new Date().toISOString(), reviewedBy: adminName };
  if (plan) updates.plan = String(plan).trim();
  await collection.updateOne({ paymentId }, { $set: updates });
  return collection.findOne({ paymentId });
}

export async function createSubscription(userId, plan, grantedBy = "admin") {
  const collection = await getSubscriptionsCollection();
  const durationMs = getPlanDuration(plan);
  const expiresAt = durationMs > 0 ? new Date(Date.now() + durationMs).toISOString() : null;
  const subscription = {
    userId: String(userId),
    plan: String(plan || "1-month"),
    startsAt: new Date().toISOString(),
    expiresAt,
    lifetime: durationMs === 0,
    grantedBy,
    createdAt: new Date().toISOString(),
  };
  await collection.insertOne(subscription);
  await (await getUsersCollection()).updateOne({ userId }, { $set: { premium: true, premiumPlan: String(plan || "1-month"), premiumExpiresAt: expiresAt, updatedAt: new Date().toISOString() } });
  return subscription;
}

export async function revokePremium(userId) {
  const collection = await getUsersCollection();
  await collection.updateOne({ userId }, { $set: { premium: false, premiumPlan: "free", premiumExpiresAt: null, updatedAt: new Date().toISOString() } });
  await (await getSubscriptionsCollection()).insertOne({ userId: String(userId), plan: "free", startsAt: new Date().toISOString(), expiresAt: new Date().toISOString(), lifetime: false, grantedBy: "admin", revokedAt: new Date().toISOString(), active: false, createdAt: new Date().toISOString() });
}

export async function createLoginChallenge({ userId, publicKey, challenge, expiryMs = 5 * 60 * 1000 }) {
  const collection = await getLoginChallengesCollection();
  const record = {
    challengeId: `challenge_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    userId: userId || null,
    publicKey: publicKey ? String(publicKey).trim() : null,
    challenge: String(challenge || "").trim(),
    expiresAt: new Date(Date.now() + expiryMs).toISOString(),
    used: false,
    createdAt: new Date().toISOString(),
  };
  await collection.insertOne(record);
  return record;
}

export async function readLoginChallenge(challengeId) {
  const collection = await getLoginChallengesCollection();
  return collection.findOne({ challengeId });
}

export async function markChallengeUsed(challengeId) {
  const collection = await getLoginChallengesCollection();
  await collection.updateOne({ challengeId }, { $set: { used: true, usedAt: new Date().toISOString() } });
}
