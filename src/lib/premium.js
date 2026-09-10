import crypto from "crypto";

export const defaultPremiumConfig = {
  phoneNumber: "0785552454",
  amount: 5000,
  planPrices: {
    "1-day": 500,
    "1-week": 2000,
    "1-month": 1000,
    "3-months": 3000,
    lifetime: 1000,
  },
  tokenExpiryMinutes: 15,
  requiresWatchedMovies: 1,
};

export function getPremiumThreshold(config = defaultPremiumConfig) {
  return Number(config?.requiresWatchedMovies ?? defaultPremiumConfig.requiresWatchedMovies ?? 1);
}

export function getPremiumAccessState({ actualWatchCount = 0, requestedWatchCount = 0, config = defaultPremiumConfig } = {}) {
  const threshold = getPremiumThreshold(config);
  const actualCount = Number(actualWatchCount || 0);
  const requestedCount = Number(requestedWatchCount ?? actualCount ?? 0);
  return {
    threshold,
    actualWatchCount: actualCount,
    requestedWatchCount: requestedCount,
    meetsThreshold: actualCount >= threshold,
  };
}

export function hasWatchedEnoughToRequirePremium(watchCount, config = defaultPremiumConfig) {
  return getPremiumAccessState({ actualWatchCount: watchCount, config }).meetsThreshold;
}

export function isWatchedToday(watchedAt, now = new Date()) {
  if (!watchedAt) return false;
  const watchedDate = new Date(watchedAt);
  if (Number.isNaN(watchedDate.getTime())) return false;
  return watchedDate.toDateString() === new Date(now).toDateString();
}

export function generatePremiumToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}
