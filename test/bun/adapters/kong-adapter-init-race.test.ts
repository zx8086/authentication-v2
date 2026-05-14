// test/bun/adapters/kong-adapter-init-race.test.ts

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { KongAdapter } from "../../../src/adapters/kong.adapter";
import { resetConfigCache } from "../../../src/config/config";
import { CacheFactory } from "../../../src/services/cache/cache-factory";

describe("KongAdapter - cache initialization race", () => {
  let originalHighAvailability: string | undefined;

  beforeEach(async () => {
    originalHighAvailability = process.env.HIGH_AVAILABILITY;
    process.env.HIGH_AVAILABILITY = "false";
    await CacheFactory.reset();
    resetConfigCache();
  });

  afterEach(async () => {
    if (originalHighAvailability !== undefined) {
      process.env.HIGH_AVAILABILITY = originalHighAvailability;
    } else {
      delete process.env.HIGH_AVAILABILITY;
    }
    await CacheFactory.reset();
    resetConfigCache();
  });

  // Regression: prior to SIO-752 the constructor fired initializeCache() without
  // awaiting it, while ensureCacheInitialized() independently re-fired the same
  // path if this.cache was still null — producing two parallel CacheFactory
  // initialisations and duplicated cache.*/circuit_breaker.* telemetry on every
  // cold start. The adapter now memoises the in-flight promise so all entry
  // points await the same initialisation.
  it("invokes CacheFactory.createKongCache exactly once under concurrent early access", async () => {
    const spy = mock(CacheFactory.createKongCache.bind(CacheFactory));
    const original = CacheFactory.createKongCache;
    CacheFactory.createKongCache = spy as typeof CacheFactory.createKongCache;

    try {
      const adapter = new KongAdapter("API_GATEWAY", "http://localhost:8001", "");

      // Fire multiple cache-touching operations immediately, before the
      // constructor's initializeCache() has had a chance to resolve.
      const results = await Promise.allSettled([
        adapter.getCacheStats(),
        adapter.getCacheStats(),
        adapter.clearCache(),
        adapter.getCacheStats(),
      ]);

      // All operations should resolve (or reject) without producing extra
      // CacheFactory.createKongCache calls — the assertion is on call count,
      // not the operation outcome.
      expect(results.length).toBe(4);
      expect(spy.mock.calls.length).toBe(1);
    } finally {
      CacheFactory.createKongCache = original;
    }
  });
});
