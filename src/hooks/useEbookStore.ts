import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Ebook {
  id: string;
  title: string;
  topic: string;
  description?: string;
  content: string;
  coverImageUrl: string | null;
  pages: number;
  length?: "short" | "medium" | "long";
  createdAt: string;
  dbProductId?: string;
  userId?: string; // track which user owns this ebook
}

interface EbookStore {
  ebooks: Ebook[];
  addEbook: (ebook: Ebook) => void;
  updateEbook: (id: string, updates: Partial<Ebook>) => void;
  removeEbook: (id: string) => void;
  getEbook: (id: string) => Ebook | undefined;
  getEbooksForUser: (userId: string) => Ebook[];
  replaceUserEbooks: (userId: string, ebooks: Ebook[]) => void;
  clearAllEbooks: () => void;
}

export const useEbookStore = create<EbookStore>()(
  persist(
    (set, get) => ({
      ebooks: [],
      addEbook: (ebook) =>
        set((state) => ({ ebooks: [ebook, ...state.ebooks.filter((existing) => existing.id !== ebook.id)] })),
      updateEbook: (id, updates) =>
        set((state) => ({ ebooks: state.ebooks.map((ebook) => ebook.id === id ? { ...ebook, ...updates } : ebook) })),
      removeEbook: (id) =>
        set((state) => ({ ebooks: state.ebooks.filter((e) => e.id !== id) })),
      getEbook: (id) => get().ebooks.find((e) => e.id === id),
      getEbooksForUser: (userId) =>
        get().ebooks.filter((e) => e.userId === userId),
      replaceUserEbooks: (userId, ebooks) =>
        set((state) => ({
          ebooks: [...state.ebooks.filter((ebook) => ebook.userId !== userId), ...ebooks],
        })),
      clearAllEbooks: () => set({ ebooks: [] }),
    }),
    {
      name: "nexora-ebooks",
    }
  )
);
