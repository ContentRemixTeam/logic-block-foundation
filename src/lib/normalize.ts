/**
 * Utility functions for normalizing data from the backend
 */

/**
 * Safely normalize an array, ensuring all elements are strings
 */
export function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

/**
 * Safely normalize a string value
 */
export function normalizeString(value: unknown, defaultValue = ''): string {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

/**
 * Safely normalize a number value
 */
export function normalizeNumber(value: unknown, defaultValue = 0): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Safely normalize a boolean value
 */
export function normalizeBoolean(value: unknown, defaultValue = false): boolean {
  if (value === null || value === undefined) return defaultValue;
  return Boolean(value);
}

/**
 * Safely normalize a JSONB object
 */
export function normalizeObject<T extends Record<string, any>>(
  value: unknown,
  defaultValue: T
): T {
  if (!value || typeof value !== 'object') return defaultValue;
  return value as T;
}
