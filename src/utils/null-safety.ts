/**
 * Null Safety Utilities
 *
 * Provides type-safe functions for handling null/undefined values consistently
 * across the codebase. These utilities help prevent null exceptions at runtime
 * while maintaining TypeScript type safety.
 *
 * @module utils/null-safety
 */

/**
 * Safely access an array element by index.
 * Returns undefined if the array is null/undefined or the index is out of bounds.
 *
 * @param arr - The array to access (can be null or undefined)
 * @param index - The index to access (must be non-negative)
 * @returns The element at the index, or undefined if not accessible
 *
 * @example
 * const arr = [1, 2, 3];
 * safeArrayAccess(arr, 1); // 2
 * safeArrayAccess(arr, 10); // undefined
 * safeArrayAccess(null, 0); // undefined
 */
export function safeArrayAccess<T>(
  arr: T[] | readonly T[] | null | undefined,
  index: number
): T | undefined {
  if (!arr || index < 0 || index >= arr.length) {
    return undefined;
  }
  return arr[index];
}

/**
 * Safely access a regex capture group from a match result.
 * Returns undefined if the match is null or the group index is invalid.
 *
 * @param match - The RegExpMatchArray result from String.match()
 * @param groupIndex - The capture group index (0 = full match, 1+ = capture groups)
 * @returns The captured string, or undefined if not accessible
 *
 * @example
 * const match = "HTTP/1.1 200".match(/HTTP\/[\d.]+\s+(\d+)/);
 * safeRegexGroup(match, 1); // "200"
 * safeRegexGroup(match, 5); // undefined
 * safeRegexGroup(null, 0); // undefined
 */
export function safeRegexGroup(
  match: RegExpMatchArray | null,
  groupIndex: number
): string | undefined {
  if (!match || groupIndex < 0 || groupIndex >= match.length) {
    return undefined;
  }
  return match[groupIndex];
}

/**
 * Type guard to check if a value is defined (not null or undefined).
 * Useful for filtering arrays and narrowing types.
 *
 * @param value - The value to check
 * @returns true if the value is not null and not undefined
 *
 * @example
 * const arr = [1, null, 2, undefined, 3];
 * arr.filter(isDefined); // [1, 2, 3]
 *
 * if (isDefined(maybeValue)) {
 *   // TypeScript knows maybeValue is not null/undefined here
 * }
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Asserts that a value is defined, throwing an error if it is not.
 * Use when a null/undefined value indicates a programming error.
 *
 * @param value - The value to check
 * @param errorMessage - The error message to throw if value is null/undefined
 * @throws Error if the value is null or undefined
 *
 * @example
 * const config = getConfig();
 * assertDefined(config, "Configuration must be initialized");
 * // TypeScript knows config is not null/undefined after this line
 */
export function assertDefined<T>(
  value: T | null | undefined,
  errorMessage: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
}

/**
 * Provides a default value when the input is null or undefined.
 * Type-safe alternative to || operator that correctly handles falsy values.
 *
 * @param value - The value to check
 * @param defaultValue - The default value to return if input is null/undefined
 * @returns The input value if defined, otherwise the default value
 *
 * @example
 * withDefault(null, "default"); // "default"
 * withDefault(0, 10); // 0 (correctly preserves falsy values)
 * withDefault("", "default"); // "" (correctly preserves empty string)
 */
export function withDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

/**
 * Safely access nested object properties using a path array.
 * Returns undefined if any property in the path is null/undefined.
 *
 * @param obj - The object to access
 * @param path - Array of property names to traverse
 * @returns The value at the path, or undefined if not accessible
 *
 * @example
 * const obj = { a: { b: { c: 1 } } };
 * safeGet(obj, ["a", "b", "c"]); // 1
 * safeGet(obj, ["a", "x", "c"]); // undefined
 */
export function safeGet<T = unknown>(
  obj: Record<string, unknown> | null | undefined,
  path: string[]
): T | undefined {
  if (!obj || path.length === 0) {
    return undefined;
  }

  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T | undefined;
}

/**
 * Checks if a string is non-empty (not null, undefined, or whitespace-only).
 *
 * @param value - The string to check
 * @returns true if the string has content after trimming
 *
 * @example
 * isNonEmptyString("hello"); // true
 * isNonEmptyString("  "); // false
 * isNonEmptyString(null); // false
 */
export function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Safely parses JSON without throwing, returning undefined on failure.
 *
 * @param json - The JSON string to parse
 * @returns The parsed value, or undefined if parsing fails
 *
 * @example
 * safeJsonParse('{"a":1}'); // { a: 1 }
 * safeJsonParse('invalid'); // undefined
 * safeJsonParse(null); // undefined
 */
export function safeJsonParse<T = unknown>(json: string | null | undefined): T | undefined {
  if (!json) {
    return undefined;
  }
  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}
