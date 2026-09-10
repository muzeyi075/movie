import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionToken,
  verifySessionToken,
} from "../src/lib/auth-session.js";
import {
  defaultPremiumConfig,
  generatePremiumToken,
  getPremiumAccessState,
  hashToken,
  hasWatchedEnoughToRequirePremium,
  isWatchedToday,
} from "../src/lib/premium.js";
import { getPlanDuration } from "../src/lib/user-store.js";

test("premium payment is required after one watched movie", () => {
  assert.equal(hasWatchedEnoughToRequirePremium(0), false);
  assert.equal(hasWatchedEnoughToRequirePremium(1), true);
  assert.equal(hasWatchedEnoughToRequirePremium(2), true);
});

test("daily watch checks reset at the local calendar day", () => {
  const now = new Date("2026-09-09T12:00:00");
  assert.equal(isWatchedToday("2026-09-09T08:00:00", now), true);
  assert.equal(isWatchedToday("2026-09-08T23:59:59", now), false);
});

test("the 1-day Premium plan lasts exactly 24 hours", () => {
  assert.equal(getPlanDuration("1-day"), 24 * 60 * 60 * 1000);
});

test("premium config exposes the admin phone number and default amount", () => {
  assert.equal(defaultPremiumConfig.phoneNumber, "0785552454");
  assert.equal(defaultPremiumConfig.amount, 5000);
});

test("premium access is based on the user’s real watch count, not a client-supplied value", () => {
  const state = getPremiumAccessState({ actualWatchCount: 4, requestedWatchCount: 1, config: { requiresWatchedMovies: 3 } });
  assert.equal(state.threshold, 3);
  assert.equal(state.meetsThreshold, true);
  assert.equal(state.requestedWatchCount, 1);
});

test("crypto session tokens restore the sessionId after a restart", () => {
  const token = createSessionToken({ uid: "pk1234567890", userId: "pk1234567890", sessionId: "pk1234567890", authType: "crypto" });
  const decoded = verifySessionToken(token);
  assert.equal(decoded.sessionId, "pk1234567890");
  assert.equal(decoded.authType, "crypto");
});

test("payment tokens are generated uniquely and hashed deterministically", () => {
  const token = generatePremiumToken();
  assert.ok(token.length >= 20);
  assert.notEqual(token, hashToken(token));
  assert.equal(hashToken(token), hashToken(token));
});
