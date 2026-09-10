import test from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "../src/lib/api.js";
import { sortRecommendations } from "../src/lib/recommendations.js";

test("rate limiter allows requests until its threshold", () => {
  const request = new Request("http://localhost/api", { headers: { "x-forwarded-for": "test-client" } });
  assert.equal(rateLimit(request, 2), null);
  assert.equal(rateLimit(request, 2), null);
  assert.equal(rateLimit(request, 2)?.status, 429);
});

test("newer movies surface first in recommendations", () => {
  const now = Date.now();
  const movies = [
    { id: "older", title: "Older Hit", score: 95, rating: 8.9, addedAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "newer", title: "Fresh Arrival", score: 80, rating: 8.4, addedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
    { id: "mid", title: "Mid Tier", score: 88, rating: 8.5, addedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  const ranked = sortRecommendations(movies).map((movie) => movie.id);
  assert.deepEqual(ranked, ["newer", "mid", "older"]);
});
