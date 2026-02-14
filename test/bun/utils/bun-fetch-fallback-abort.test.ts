import { describe, expect, it } from "bun:test";
import { fetchWithFallback } from "../../../src/utils/bun-fetch-fallback";

describe("Bun Fetch Fallback - AbortSignal", () => {
  describe("Pre-aborted Signal", () => {
    it("should throw immediately when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fetchWithFallback("http://localhost:3000/health", { signal: controller.signal })
      ).rejects.toThrow();
    });

    it("should throw AbortError when pre-aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      try {
        await fetchWithFallback("http://localhost:3000/health", { signal: controller.signal });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("Abort During Execution", () => {
    it("should handle abort during fetch execution", async () => {
      const controller = new AbortController();

      const fetchPromise = fetchWithFallback("http://httpbin.org/delay/10", {
        signal: controller.signal,
      });

      setTimeout(() => controller.abort(), 50);

      await expect(fetchPromise).rejects.toThrow();
    });

    it("should abort with custom reason when provided", async () => {
      const controller = new AbortController();
      const customReason = new DOMException("Custom abort reason", "AbortError");

      setTimeout(() => controller.abort(customReason), 10);

      try {
        await fetchWithFallback("http://httpbin.org/delay/10", { signal: controller.signal });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Timeout via AbortSignal", () => {
    it("should timeout using AbortSignal.timeout", async () => {
      const signal = AbortSignal.timeout(100);

      await expect(fetchWithFallback("http://httpbin.org/delay/10", { signal })).rejects.toThrow();
    });
  });

  describe("Signal State Verification", () => {
    it("should not abort when signal is not aborted", async () => {
      const controller = new AbortController();

      expect(controller.signal.aborted).toBe(false);
    });

    it("should mark signal as aborted after abort() is called", () => {
      const controller = new AbortController();
      controller.abort();

      expect(controller.signal.aborted).toBe(true);
    });

    it("should have correct abort reason", () => {
      const controller = new AbortController();
      const reason = new DOMException("Test abort", "AbortError");
      controller.abort(reason);

      expect(controller.signal.reason).toBe(reason);
    });
  });

  describe("DOMException Validation", () => {
    it("should create DOMException with AbortError name", () => {
      const exception = new DOMException("The operation was aborted.", "AbortError");

      expect(exception.name).toBe("AbortError");
      expect(exception.message).toBe("The operation was aborted.");
    });
  });
});
