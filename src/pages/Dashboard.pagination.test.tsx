import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const { listProductsPage, getProductMetrics, getProductFeedback, getDashboardAggregates } = vi.hoisted(() => ({
  listProductsPage: vi.fn(),
  getProductMetrics: vi.fn(),
  getProductFeedback: vi.fn(),
  getDashboardAggregates: vi.fn(),
}));

vi.mock("@/lib/productTracking", () => ({ listProductsPage, getProductMetrics, getProductFeedback, getDashboardAggregates }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ hasPaidSubscription: true, subscription: { status: "active" } }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("framer-motion", () => ({ motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div> } }));
vi.mock("recharts", () => Object.fromEntries(["ResponsiveContainer", "LineChart", "Line", "BarChart", "Bar", "XAxis", "YAxis", "CartesianGrid", "Tooltip", "Legend", "PieChart", "Pie", "Cell"].map((name) => [name, ({ children }: { children?: React.ReactNode }) => <div>{children}</div>])));

const cursor = { created_at: "2026-10-01T00:00:00.000Z", id: "00000000-0000-4000-8000-000000000001" };

beforeEach(() => {
  vi.clearAllMocks();
  listProductsPage.mockResolvedValue({ items: [{ id: "p1", title: "Product one", topic: "Topic", created_at: cursor.created_at }], nextCursor: cursor, hasMore: true });
  getProductMetrics.mockResolvedValue({ metrics: [], summary: {} });
  getProductFeedback.mockResolvedValue({ items: [] });
  getDashboardAggregates.mockResolvedValue({ metrics: [], feedback: [] });
});

describe("Dashboard product pages", () => {
  it("requests the next stable cursor page on demand", async () => {
    render(<Dashboard />);
    const button = await screen.findByRole("button", { name: "Load more products" });
    expect(listProductsPage).toHaveBeenCalledWith(null);
    fireEvent.click(button);
    await waitFor(() => expect(listProductsPage).toHaveBeenCalledWith(cursor));
  });

  it("loads metrics and feedback for the whole page in one batched request", async () => {
    const products = [1, 2, 3].map((index) => ({ id: `p${index}`, title: `Product ${index}`, topic: "Topic", created_at: cursor.created_at }));
    listProductsPage.mockResolvedValue({ items: products, nextCursor: null, hasMore: false });
    getDashboardAggregates.mockResolvedValue({
      metrics: products.map((product) => ({ id: `${product.id}-m`, product_id: product.id, metric_type: "download", value: 2, recorded_at: new Date().toISOString() })),
      feedback: products.map((product) => ({ id: `${product.id}-f`, product_id: product.id, user_id: "u1", rating: 5, comment: null, section_reference: null, feedback_type: "general", created_at: new Date().toISOString() })),
    });

    render(<Dashboard />);
    await waitFor(() => expect(getDashboardAggregates).toHaveBeenCalledTimes(1));
    expect(getDashboardAggregates).toHaveBeenCalledWith(["p1", "p2", "p3"]);
    expect(getProductMetrics).not.toHaveBeenCalled();
    expect(getProductFeedback).not.toHaveBeenCalled();
    // One product-page request plus one batch request, regardless of product count
    expect(listProductsPage.mock.calls.length + getDashboardAggregates.mock.calls.length).toBe(2);
  });
});
