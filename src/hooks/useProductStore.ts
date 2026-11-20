import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Product {
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
  userId?: string; // track which user owns this product
}

interface ProductStore {
  products: Product[];
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  getProductsForUser: (userId: string) => Product[];
  clearAllProducts: () => void;
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      addProduct: (product) =>
        set((state) => ({ products: [product, ...state.products] })),
      removeProduct: (id) =>
        set((state) => ({ products: state.products.filter((e) => e.id !== id) })),
      getProduct: (id) => get().products.find((e) => e.id === id),
      getProductsForUser: (userId) =>
        get().products.filter((e) => e.userId === userId),
      clearAllProducts: () => set({ products: [] }),
    }),
    {
      name: "nexora-products",
    }
  )
);
