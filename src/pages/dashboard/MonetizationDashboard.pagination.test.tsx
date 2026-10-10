import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MonetizationDashboard from "./MonetizationDashboard";

const { listMonetizationProducts } = vi.hoisted(() => ({ listMonetizationProducts: vi.fn() }));
vi.mock("@/lib/monetization", () => ({ listMonetizationProducts }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ hasPaidSubscription: true, subscription: { status: "active" }, loading: false }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/UpgradeOverlay", () => ({ UpgradeOverlay: () => null }));
vi.mock("@/components/monetization/MonetizationProductCard", () => ({ default: ({ product }: { product: { title: string } }) => <div>{product.title}</div> }));
vi.mock("@/components/monetization/MonetizationWizard", () => ({ MonetizationWizard: () => null }));

const cursor = { created_at: "2026-10-01T00:00:00.000Z", id: "00000000-0000-4000-8000-000000000001" };

beforeEach(() => {
  vi.clearAllMocks();
  listMonetizationProducts.mockResolvedValue({ products: [{ id: "p1", title: "Campaign one", monetization_modules: [] }], nextCursor: cursor, hasMore: true });
});

describe("Monetization Dashboard pagination", () => {
  it("fetches the next campaign cursor on demand", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><MonetizationDashboard /></QueryClientProvider>);

    const button = await screen.findByRole("button", { name: "Load more campaigns" });
    expect(listMonetizationProducts).toHaveBeenCalledWith(null);
    fireEvent.click(button);
    await waitFor(() => expect(listMonetizationProducts).toHaveBeenCalledWith(cursor));
  });
});
