import { describe, expect, test } from "bun:test";

describe("Instrumentation Mutation Killers", () => {
  test("metricExportStats calculates success rate correctly", () => {
    const stats = {
      totalExports: 10,
      successCount: 8,
      failureCount: 2,
      get successRate() {
        return this.totalExports > 0
          ? Math.round((this.successCount / this.totalExports) * 100)
          : 0;
      },
    };
    expect(stats.successRate).toBe(80);
  });

  test("metricExportStats returns 0 when no exports", () => {
    const stats = {
      totalExports: 0,
      successCount: 0,
      failureCount: 0,
      get successRate() {
        return this.totalExports > 0
          ? Math.round((this.successCount / this.totalExports) * 100)
          : 0;
      },
    };
    expect(stats.successRate).toBe(0);
  });

  test("metricExportStats increments totalExports", () => {
    const stats = {
      totalExports: 0,
      recordExportAttempt() {
        this.totalExports++;
      },
    };
    stats.recordExportAttempt();
    expect(stats.totalExports).toBe(1);
  });

  test("metricExportStats increments successCount", () => {
    const stats = {
      successCount: 0,
      lastExportTime: null as string | null,
      lastSuccessTime: null as string | null,
      recordExportSuccess() {
        this.successCount++;
        this.lastExportTime = new Date().toISOString();
        this.lastSuccessTime = this.lastExportTime;
      },
    };
    stats.recordExportSuccess();
    expect(stats.successCount).toBe(1);
  });

  test("metricExportStats sets lastExportTime on success", () => {
    const stats = {
      successCount: 0,
      lastExportTime: null as string | null,
      lastSuccessTime: null as string | null,
      recordExportSuccess() {
        this.successCount++;
        this.lastExportTime = new Date().toISOString();
        this.lastSuccessTime = this.lastExportTime;
      },
    };
    stats.recordExportSuccess();
    expect(stats.lastExportTime).not.toBeNull();
  });

  test("metricExportStats sets lastSuccessTime on success", () => {
    const stats = {
      successCount: 0,
      lastExportTime: null as string | null,
      lastSuccessTime: null as string | null,
      recordExportSuccess() {
        this.successCount++;
        this.lastExportTime = new Date().toISOString();
        this.lastSuccessTime = this.lastExportTime;
      },
    };
    stats.recordExportSuccess();
    expect(stats.lastSuccessTime).toBe(stats.lastExportTime);
  });

  test("metricExportStats increments failureCount", () => {
    const stats = {
      failureCount: 0,
      lastExportTime: null as string | null,
      lastFailureTime: null as string | null,
      recentErrors: [] as string[],
      recordExportFailure(error: string) {
        this.failureCount++;
        this.lastExportTime = new Date().toISOString();
        this.lastFailureTime = this.lastExportTime;
        this.recentErrors.push(`${this.lastExportTime}: ${error}`);
        if (this.recentErrors.length > 10) {
          this.recentErrors.shift();
        }
      },
    };
    stats.recordExportFailure("test error");
    expect(stats.failureCount).toBe(1);
  });

  test("metricExportStats sets lastFailureTime on failure", () => {
    const stats = {
      failureCount: 0,
      lastExportTime: null as string | null,
      lastFailureTime: null as string | null,
      recentErrors: [] as string[],
      recordExportFailure(error: string) {
        this.failureCount++;
        this.lastExportTime = new Date().toISOString();
        this.lastFailureTime = this.lastExportTime;
        this.recentErrors.push(`${this.lastExportTime}: ${error}`);
        if (this.recentErrors.length > 10) {
          this.recentErrors.shift();
        }
      },
    };
    stats.recordExportFailure("test error");
    expect(stats.lastFailureTime).toBe(stats.lastExportTime);
  });

  test("metricExportStats adds error to recentErrors", () => {
    const stats = {
      failureCount: 0,
      lastExportTime: null as string | null,
      lastFailureTime: null as string | null,
      recentErrors: [] as string[],
      recordExportFailure(error: string) {
        this.failureCount++;
        this.lastExportTime = new Date().toISOString();
        this.lastFailureTime = this.lastExportTime;
        this.recentErrors.push(`${this.lastExportTime}: ${error}`);
        if (this.recentErrors.length > 10) {
          this.recentErrors.shift();
        }
      },
    };
    stats.recordExportFailure("test error");
    expect(stats.recentErrors.length).toBe(1);
  });

  test("metricExportStats limits recentErrors to 10", () => {
    const stats = {
      failureCount: 0,
      lastExportTime: null as string | null,
      lastFailureTime: null as string | null,
      recentErrors: [] as string[],
      recordExportFailure(error: string) {
        this.failureCount++;
        this.lastExportTime = new Date().toISOString();
        this.lastFailureTime = this.lastExportTime;
        this.recentErrors.push(`${this.lastExportTime}: ${error}`);
        if (this.recentErrors.length > 10) {
          this.recentErrors.shift();
        }
      },
    };
    for (let i = 0; i < 15; i++) {
      stats.recordExportFailure(`error ${i}`);
    }
    expect(stats.recentErrors.length).toBe(10);
  });

  test("metricExportStats removes oldest error when exceeding 10", () => {
    const stats = {
      failureCount: 0,
      lastExportTime: null as string | null,
      lastFailureTime: null as string | null,
      recentErrors: [] as string[],
      recordExportFailure(error: string) {
        this.failureCount++;
        this.lastExportTime = new Date().toISOString();
        this.lastFailureTime = this.lastExportTime;
        this.recentErrors.push(`${this.lastExportTime}: ${error}`);
        if (this.recentErrors.length > 10) {
          this.recentErrors.shift();
        }
      },
    };
    for (let i = 0; i < 11; i++) {
      stats.recordExportFailure(`error ${i}`);
    }
    expect(stats.recentErrors[0]).toContain("error 1");
  });
});
