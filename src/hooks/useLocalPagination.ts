import { useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/lib/keysetPagination";

export function useLocalPagination<T>(
  items: readonly T[],
  pageSize = DEFAULT_PAGE_SIZE,
  resetKey?: string | null,
) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, resetKey]);

  return {
    visibleItems: items.slice(0, visibleCount),
    hasMore: items.length > visibleCount,
    loadMore: () => setVisibleCount((count) => count + pageSize),
    totalCount: items.length,
    visibleCount: Math.min(visibleCount, items.length),
  };
}
