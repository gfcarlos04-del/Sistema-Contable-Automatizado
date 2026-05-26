import { describe, it, expect } from "vitest";
import { rateLimit, rateLimitHeaders } from "./rate-limit";

// The module-level memCounters Map persists between tests unless we reset
// the module. We clear it indirectly by using unique keys per test.
// Since REDIS_URL is not set in the test environment, all calls use the
// in-memory fallback automatically.

function uniqueKey(label: string): string {
  return `test:${label}:${Math.random().toString(36).slice(2)}`;
}

// ── Memory fallback — basic behaviour ────────────────────────────────────

describe("memory fallback — first call in a window", () => {
  it("is allowed and remaining = limit - 1", async () => {
    const result = await rateLimit({ key: uniqueKey("first"), limit: 5, windowSec: 60 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
    expect(result.backend).toBe("memory");
  });
});

// ── Multiple calls increment the counter ─────────────────────────────────

describe("memory fallback — multiple calls within the same window", () => {
  it("decrements remaining on each call", async () => {
    const key = uniqueKey("multi");
    const opts = { key, limit: 5, windowSec: 60 };

    const r1 = await rateLimit(opts);
    const r2 = await rateLimit(opts);
    const r3 = await rateLimit(opts);

    expect(r1.remaining).toBe(4);
    expect(r2.remaining).toBe(3);
    expect(r3.remaining).toBe(2);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });
});

// ── Exceeding the limit ───────────────────────────────────────────────────

describe("memory fallback — exceeding the limit", () => {
  it("returns allowed=false and remaining=0 when limit is reached", async () => {
    const key = uniqueKey("exceed");
    const opts = { key, limit: 3, windowSec: 60 };

    await rateLimit(opts); // call 1
    await rateLimit(opts); // call 2
    await rateLimit(opts); // call 3 — exactly at limit

    const over = await rateLimit(opts); // call 4 — over limit

    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it("call exactly at limit is still allowed", async () => {
    const key = uniqueKey("at-limit");
    const opts = { key, limit: 2, windowSec: 60 };

    await rateLimit(opts); // call 1
    const atLimit = await rateLimit(opts); // call 2

    expect(atLimit.allowed).toBe(true);
    expect(atLimit.remaining).toBe(0);
  });
});

// ── resetAt points to the start of the next window ───────────────────────

describe("resetAt", () => {
  it("is at the start of the next bucket", async () => {
    const windowSec = 60;
    const windowMs = windowSec * 1000;
    const before = Date.now();

    const result = await rateLimit({ key: uniqueKey("reset"), limit: 10, windowSec });

    const after = Date.now();

    // The bucket is floor(now / windowMs); resetAt = (bucket+1) * windowMs
    const expectedBucketMin = Math.floor(before / windowMs);
    const expectedBucketMax = Math.floor(after / windowMs);

    const resetAtMin = (expectedBucketMin + 1) * windowMs;
    const resetAtMax = (expectedBucketMax + 1) * windowMs;

    expect(result.resetAt).toBeGreaterThanOrEqual(resetAtMin);
    expect(result.resetAt).toBeLessThanOrEqual(resetAtMax);

    // Must be in the future
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1);

    // Must be within the next full window from now
    expect(result.resetAt).toBeLessThanOrEqual(Date.now() + windowMs);
  });
});

// ── backend field ─────────────────────────────────────────────────────────

describe("backend field", () => {
  it('is "memory" when REDIS_URL is not set', async () => {
    const result = await rateLimit({ key: uniqueKey("backend"), limit: 5, windowSec: 60 });
    expect(result.backend).toBe("memory");
  });
});

// ── rateLimitHeaders ──────────────────────────────────────────────────────

describe("rateLimitHeaders", () => {
  it("returns correct header keys and values", async () => {
    const result = await rateLimit({ key: uniqueKey("headers"), limit: 10, windowSec: 60 });
    const headers = rateLimitHeaders(result);

    expect(headers["X-RateLimit-Limit"]).toBe(String(result.limit));
    expect(headers["X-RateLimit-Remaining"]).toBe(String(result.remaining));
    expect(headers["X-RateLimit-Reset"]).toBe(String(Math.floor(result.resetAt / 1000)));
  });

  it("X-RateLimit-Reset is in seconds (epoch)", async () => {
    const result = await rateLimit({ key: uniqueKey("reset-sec"), limit: 10, windowSec: 60 });
    const headers = rateLimitHeaders(result);

    const resetSeconds = Number(headers["X-RateLimit-Reset"]);
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Must be a future Unix timestamp (seconds, not ms)
    expect(resetSeconds).toBeGreaterThan(nowSeconds);
    expect(resetSeconds).toBeLessThanOrEqual(nowSeconds + 60 + 1); // within one window + grace
  });
});

// ── Edge case: limit=1 ────────────────────────────────────────────────────

describe("edge case: limit=1", () => {
  it("first call is allowed, second is not", async () => {
    const key = uniqueKey("limit1");
    const opts = { key, limit: 1, windowSec: 60 };

    const first = await rateLimit(opts);
    const second = await rateLimit(opts);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);

    expect(second.allowed).toBe(false);
    expect(second.remaining).toBe(0);
  });
});

// ── Edge case: independent keys ───────────────────────────────────────────

describe("edge case: distinct keys are independent counters", () => {
  it("exhausting one key does not affect another", async () => {
    const keyA = uniqueKey("key-a");
    const keyB = uniqueKey("key-b");
    const limit = 2;

    // Exhaust keyA
    await rateLimit({ key: keyA, limit, windowSec: 60 });
    await rateLimit({ key: keyA, limit, windowSec: 60 });
    const overA = await rateLimit({ key: keyA, limit, windowSec: 60 });

    // keyB should be untouched
    const firstB = await rateLimit({ key: keyB, limit, windowSec: 60 });

    expect(overA.allowed).toBe(false);
    expect(firstB.allowed).toBe(true);
    expect(firstB.remaining).toBe(limit - 1);
  });
});
