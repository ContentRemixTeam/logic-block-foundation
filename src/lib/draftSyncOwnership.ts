export interface DraftVersionRef {
  current: number;
}

/** Starts a new local draft version and invalidates every older async owner. */
export function beginDraftVersion(ref: DraftVersionRef): number {
  const version = ref.current + 1;
  ref.current = version;
  return version;
}

/** True only while an async operation still owns the latest local draft. */
export function ownsDraftVersion(ref: DraftVersionRef, version: number): boolean {
  return ref.current === version;
}

/** Parses only finite timestamps; malformed server/local values are rejected. */
export function parseValidDraftTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
