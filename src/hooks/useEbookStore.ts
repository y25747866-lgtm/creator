import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Ebook {
  id: string;
  title: string;
  topic: string;
  content: string;
  coverImageUrl: string;
  pages: number;
  createdAt: string;
}

interface EbookStore {
  ebooks: Ebook[];
  addEbook: (ebook: Ebook) => void;
  removeEbook: (id: string) => void;
  getEbook: (id: string) => Ebook | undefined;
}

export const useEbookStore = create<EbookStore>()(
  persist(
    (set, get) => ({
      ebooks: [],
      addEbook: (ebook) => set((state) => ({ ebooks: [ebook, ...state.ebooks] })),
      removeEbook: (id) => set((state) => ({ ebooks: state.ebooks.filter((e) => e.id !== id) })),
      getEbook: (id) => get().ebooks.find((e) => e.id === id),
    }),
    {
      name: "nexora-ebooks",
    }
  )
);
