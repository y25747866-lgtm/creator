import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEbookStore } from "@/hooks/useEbookStore";
import { listGeneratedEbooks } from "@/lib/ebookRepository";

export function useOwnedEbooks() {
  const { user } = useAuth();
  const ebooks = useEbookStore((state) => state.ebooks.filter((ebook) => ebook.userId === user?.id));
  const replaceUserEbooks = useEbookStore((state) => state.replaceUserEbooks);
  const [loading, setLoading] = useState(Boolean(user?.id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const savedEbooks = await listGeneratedEbooks(user.id);
      replaceUserEbooks(user.id, savedEbooks);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load your saved products.");
    } finally {
      setLoading(false);
    }
  }, [replaceUserEbooks, user?.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { ebooks, loading, error, refresh, user };
}
