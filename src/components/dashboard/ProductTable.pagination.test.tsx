import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductTable from "./ProductTable";

const product = {
  id: "product-1",
  title: "Example product",
  topic: "Learning",
  description: null,
  status: "published",
  length: "medium",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  views: 20,
  downloads: 4,
  conversionRate: 20,
  avgRating: 4,
};

describe("ProductTable pagination", () => {
  it("shows a button to fetch the next page when more products exist", () => {
    const onLoadMore = vi.fn();
    render(
      <ProductTable
        products={[product]}
        loading={false}
        onSelect={vi.fn()}
        selectedId={null}
        hasMoreProducts
        loadingMore={false}
        onLoadMore={onLoadMore}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more products" }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("disables pagination while the next product page is loading", () => {
    render(
      <ProductTable
        products={[product]}
        loading={false}
        onSelect={vi.fn()}
        selectedId={null}
        hasMoreProducts
        loadingMore
        onLoadMore={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Loading products…" })).toBeDisabled();
  });
});
