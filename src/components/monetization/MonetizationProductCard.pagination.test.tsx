import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MonetizationProductCard from "./MonetizationProductCard";

const { listMonetizationModules } = vi.hoisted(() => ({ listMonetizationModules: vi.fn() }));
vi.mock("@/lib/monetization", () => ({
  MODULE_TYPES: [],
  listMonetizationModules,
}));

const cursor = {
  created_at: "2026-10-08T00:00:00.000Z",
  id: "00000000-0000-4000-8000-000000000020",
};

const firstPage = Array.from({ length: 20 }, (_, index) => ({
  id: `module-${index}`,
  product_id: "campaign-1",
  module_type: `asset-${index}`,
  title: `Asset ${index}`,
  status: "generated",
  created_at: cursor.created_at,
}));

beforeEach(() => {
  vi.clearAllMocks();
  listMonetizationModules.mockResolvedValue({
    items: [{
      id: "module-next",
      product_id: "campaign-1",
      module_type: "asset-next",
      title: "Next asset",
      status: "generated",
      created_at: "2026-10-07T00:00:00.000Z",
    }],
    nextCursor: null,
    hasMore: false,
  });
});

describe("MonetizationProductCard module pagination", () => {
  it("loads and appends the next stable cursor page on demand", async () => {
    render(
      <MonetizationProductCard
        product={{
          id: "campaign-1",
          user_id: "user-1",
          title: "Campaign",
          topic: "Topic",
          source_type: "idea",
          created_at: cursor.created_at,
          monetization_modules: firstPage,
          moduleNextCursor: cursor,
          moduleHasMore: true,
        }}
        onModuleClick={vi.fn()}
      />,
    );

    const loadMore = screen.getByRole("button", { name: "Load more assets" });
    expect(screen.getByText("20+ assets")).toBeTruthy();
    fireEvent.click(loadMore);

    await waitFor(() => expect(listMonetizationModules).toHaveBeenCalledWith("campaign-1", cursor));
    expect(await screen.findByRole("button", { name: "asset-next generated" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more assets" })).toBeNull();
  });
});
