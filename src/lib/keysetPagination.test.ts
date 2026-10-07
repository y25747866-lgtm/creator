import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  keysetCursorFilter,
  parseKeysetCursor,
  toKeysetPage,
  type KeysetCursor,
} from "./keysetPagination";

describe("keyset pagination", () => {
  it("uses a default page size of twenty", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it("uses the timestamp and UUID pair as a stable descending cursor", () => {
    const cursor: KeysetCursor = {
      created_at: "2026-10-08T00:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000020",
    };
    expect(keysetCursorFilter(cursor)).toBe(
      "created_at.lt.2026-10-08T00:00:00.000Z,and(created_at.eq.2026-10-08T00:00:00.000Z,id.lt.00000000-0000-4000-8000-000000000020)",
    );
  });

  it("returns a next cursor only when the query supplied an extra row", () => {
    const rows = Array.from({ length: DEFAULT_PAGE_SIZE + 1 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      created_at: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));
    const page = toKeysetPage(rows);
    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual(rows[DEFAULT_PAGE_SIZE - 1]);
  });

  it("does not advertise another page when the query has no extra row", () => {
    const rows = Array.from({ length: DEFAULT_PAGE_SIZE }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      created_at: "2026-10-08T00:00:00.000Z",
    }));
    expect(toKeysetPage(rows)).toEqual({ items: rows, nextCursor: null, hasMore: false });
  });

  it("rejects malformed or unsafe cursor values", () => {
    expect(parseKeysetCursor("not-json")).toBeNull();
    expect(parseKeysetCursor(JSON.stringify({ created_at: "bad-date", id: "00000000-0000-4000-8000-000000000001" }))).toBeNull();
    expect(parseKeysetCursor(JSON.stringify({ created_at: "2026-10-08T00:00:00.000Z", id: "bad,filter" }))).toBeNull();
  });
});
