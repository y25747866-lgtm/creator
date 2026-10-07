import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const { listProductsPage, getProductMetrics, getProductFeedback } = vi.hoisted(() => ({
  listProductsPage: vi.fn(),
  getProductMetrics: vi.fn(),
  getProductFeedback: vi.fn(),
}));

vi.mock("@/lib/productTracking", () => ({ listProductsPage, getProductMetrics, getProductFeedback }));
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
});

describe("Dashboard product pages", () => {
  it("requests the next stable cursor page on demand", async () => {
    render(<Dashboard />);
    const button = await screen.findByRole("button", { name: "Load more products" });
    expect(listProductsPage).toHaveBeenCalledWith(null);
    fireEvent.click(button);
    await waitFor(() => expect(listProductsPage).toHaveBeenCalledWith(cursor));
  });
});
