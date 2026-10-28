export const DEFAULT_PAGE_SIZE = 20;

export interface KeysetCursor {
  created_at: string;
  id: string;
}

export type KeysetRow = KeysetCursor;

export interface KeysetPage<T> {
  items: T[];
  nextCursor: KeysetCursor | null;
  hasMore: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseKeysetCursor(raw: string | null | undefined): KeysetCursor | null {
  if (!raw || raw.length > 2048) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.created_at !== "string" ||
      !Number.isFinite(Date.parse(candidate.created_at)) ||
      typeof candidate.id !== "string" ||
      !UUID_PATTERN.test(candidate.id)
    ) {
      return null;
    }
    return { created_at: candidate.created_at, id: candidate.id };
  } catch {
    return null;
  }
}

export function serializeKeysetCursor(cursor: KeysetCursor): string {
  return JSON.stringify(cursor);
}

export function keysetCursorFilter(cursor: KeysetCursor): string {
  return `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`;
}

export function toKeysetPage<T extends KeysetRow>(
  rows: readonly T[] | null | undefined,
  pageSize = DEFAULT_PAGE_SIZE,
): KeysetPage<T> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer");
  }

  const fetched = rows ? [...rows] : [];
  const hasMore = fetched.length > pageSize;
  const items = fetched.slice(0, pageSize);
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? { created_at: last.created_at, id: last.id } : null,
  };
}
