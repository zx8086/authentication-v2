/* src/utils/performance.ts */

const isBun = () => typeof Bun !== "undefined";

export async function measure<T>(name: string, op: () => Promise<T>) {
  const start = isBun() ? Bun.nanoseconds() : performance.now() * 1_000_000;
  const result = await op();
  const ms = (isBun() ? Bun.nanoseconds() : performance.now() * 1_000_000 - start) / 1_000_000;

  console.log(`[PERF] ${name}: ${ms.toFixed(2)}ms`);
  return { result, ms };
}

export function measureSync<T>(name: string, op: () => T) {
  const start = isBun() ? Bun.nanoseconds() : performance.now() * 1_000_000;
  const result = op();
  const ms = (isBun() ? Bun.nanoseconds() : performance.now() * 1_000_000 - start) / 1_000_000;

  console.log(`[PERF] ${name}: ${ms.toFixed(2)}ms`);
  return { result, ms };
}

export function getHighResTime(): number {
  return isBun() ? Bun.nanoseconds() : performance.now() * 1_000_000;
}

export function calculateDuration(startTime: number): number {
  return (getHighResTime() - startTime) / 1_000_000;
}
