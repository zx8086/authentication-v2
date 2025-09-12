/* src/utils/performance.ts */

// Performance monitoring utilities using Bun's high-precision timing
export class PerformanceMonitor {
  private static measurements = new Map<string, number[]>();

  static async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    logResults = true
  ): Promise<{ result: T; duration: number }> {
    const start = Bun.nanoseconds();
    
    try {
      const result = await fn();
      const duration = (Bun.nanoseconds() - start) / 1_000_000; // Convert to milliseconds
      
      if (logResults) {
        console.log(`⏱️  ${operation}: ${duration.toFixed(2)}ms`);
      }
      
      this.recordMeasurement(operation, duration);
      
      return { result, duration };
    } catch (error) {
      const duration = (Bun.nanoseconds() - start) / 1_000_000;
      console.error(`❌ ${operation} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  static measure<T>(
    operation: string,
    fn: () => T,
    logResults = true
  ): { result: T; duration: number } {
    const start = Bun.nanoseconds();
    
    try {
      const result = fn();
      const duration = (Bun.nanoseconds() - start) / 1_000_000; // Convert to milliseconds
      
      if (logResults) {
        console.log(`⏱️  ${operation}: ${duration.toFixed(2)}ms`);
      }
      
      this.recordMeasurement(operation, duration);
      
      return { result, duration };
    } catch (error) {
      const duration = (Bun.nanoseconds() - start) / 1_000_000;
      console.error(`❌ ${operation} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  static recordMeasurement(operation: string, duration: number): void {
    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }
    
    const measurements = this.measurements.get(operation)!;
    measurements.push(duration);
    
    if (measurements.length > 100) {
      measurements.shift();
    }
  }

  static getStats(operation: string) {
    const durations = this.measurements.get(operation);
    if (!durations || durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      operation,
      count: durations.length,
      avg: sum / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  static getAllStats() {
    const stats = [];
    for (const operation of this.measurements.keys()) {
      const operationStats = this.getStats(operation);
      if (operationStats) {
        stats.push(operationStats);
      }
    }
    return stats;
  }

  static clearStats(): void {
    this.measurements.clear();
  }
}

export class RateLimiter {
  private limits = new Map<number, number[]>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  checkLimit(identifier: string): boolean {
    const key = Bun.hash(identifier);
    const now = Bun.nanoseconds() / 1_000_000; // Convert to milliseconds
    
    const requests = this.limits.get(key) || [];
    
    const recentRequests = requests.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    if (recentRequests.length >= this.maxRequests) {
      return false; // Rate limited
    }
    
    recentRequests.push(now);
    this.limits.set(key, recentRequests);
    
    return true; // Request allowed
  }

  getStats(identifier: string): { requests: number; remaining: number; resetTime: number } {
    const key = Bun.hash(identifier);
    const now = Bun.nanoseconds() / 1_000_000;
    
    const requests = this.limits.get(key) || [];
    const recentRequests = requests.filter(timestamp => 
      now - timestamp < this.windowMs
    );
    
    const remaining = Math.max(0, this.maxRequests - recentRequests.length);
    const oldestRequest = recentRequests.length > 0 ? Math.min(...recentRequests) : now;
    const resetTime = oldestRequest + this.windowMs;
    
    return {
      requests: recentRequests.length,
      remaining,
      resetTime,
    };
  }

  cleanup(): void {
    const now = Bun.nanoseconds() / 1_000_000;
    
    for (const [key, requests] of this.limits.entries()) {
      const recentRequests = requests.filter(timestamp => 
        now - timestamp < this.windowMs
      );
      
      if (recentRequests.length === 0) {
        this.limits.delete(key);
      } else {
        this.limits.set(key, recentRequests);
      }
    }
  }
}