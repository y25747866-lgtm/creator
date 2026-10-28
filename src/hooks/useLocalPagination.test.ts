import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLocalPagination } from "./useLocalPagination";

describe("useLocalPagination", () => {
  it("shows the first twenty items and reveals the next chunk on demand", () => {
    const items = Array.from({ length: 25 }, (_, index) => index);
    const { result } = renderHook(() => useLocalPagination(items));

    expect(result.current.visibleItems).toEqual(items.slice(0, 20));
    expect(result.current.hasMore).toBe(true);
    act(() => result.current.loadMore());
    expect(result.current.visibleItems).toEqual(items);
    expect(result.current.hasMore).toBe(false);
  });

  it("resets the visible page when the collection owner changes", () => {
    const items = Array.from({ length: 25 }, (_, index) => index);
    const { result, rerender } = renderHook(
      ({ owner }) => useLocalPagination(items, 20, owner),
      { initialProps: { owner: "first-user" } },
    );
    act(() => result.current.loadMore());
    expect(result.current.visibleItems).toHaveLength(25);
    rerender({ owner: "second-user" });
    expect(result.current.visibleItems).toHaveLength(20);
  });
});
