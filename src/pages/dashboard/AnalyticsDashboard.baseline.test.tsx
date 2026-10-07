/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn(), toast: vi.fn(), user: { id: "test-user" } }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/UpgradeOverlay", () => ({ UpgradeOverlay: () => null }));
vi.mock("framer-motion", () => ({ motion: new Proxy({}, { get: (_target, tag: string) => tag }), AnimatePresence: ({ children }: any) => <>{children}</> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ hasPaidSubscription: true, subscription: { status: "active" }, loading: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, functions: { invoke: mocks.invoke } } }));
vi.mock("recharts", () => {
  const Chart = ({ children }: any) => <div>{children}</div>;
  return { ResponsiveContainer: Chart, AreaChart: Chart, Area: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, BarChart: Chart, Bar: () => null };
});

function makeQuery(data: any[] = []) {
  const query: Record<string, any> = {};
  for (const method of ["select", "eq", "order", "limit", "or", "insert", "delete", "update", "upsert"]) query[method] = vi.fn(() => query);
  const result = Promise.resolve({ data, error: null });
  query.then = result.then.bind(result);
  return query;
}

beforeEach(() => {
  mocks.invoke.mockReset().mockImplementation(async (name: string) => name === "analytics-fetch"
    ? { data: { summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, products: [], orders: [] }, error: null }
    : { data: { reply: "ok" }, error: null });
  mocks.from.mockReset().mockImplementation((table: string) => makeQuery(table === "platform_connections" ? [{ platform: "whop", status: "connected", connected_at: new Date().toISOString(), last_sync_at: null }] : []));
  mocks.toast.mockReset();
  localStorage.clear();
});

import AnalyticsDashboard from "./AnalyticsDashboard";

describe("Analytics Dashboard baseline", () => {
  it("renders AI Advisor and invokes its existing chat endpoint", async () => {
    render(<AnalyticsDashboard />);
    expect(await screen.findByText("AI Advisor")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Ask about your data...");
    fireEvent.change(input, { target: { value: "Summarize revenue" } });
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("analytics-chat", expect.objectContaining({ body: expect.objectContaining({ message: "Summarize revenue" }) })));
  });

  it("shows the user turn immediately and keeps a failed message available for retry", async () => {
    let resolveFirstChat: (result: any) => void = () => undefined;
    let chatAttempts = 0;
    mocks.invoke.mockImplementation(async (name: string) => {
      if (name === "analytics-fetch") {
        return { data: { summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, products: [], orders: [] }, error: null };
      }
      chatAttempts += 1;
      if (chatAttempts === 1) return new Promise((resolve) => { resolveFirstChat = resolve; });
      return { data: { reply: "Recovered answer" }, error: null };
    });

    render(<AnalyticsDashboard />);
    expect(await screen.findByText("AI Advisor")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Ask about your data...");
    fireEvent.change(input, { target: { value: "Summarize revenue" } });
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });
    expect(screen.getByText("Summarize revenue")).toBeInTheDocument();
    expect(screen.getByText("Sending…")).toBeInTheDocument();
    expect(screen.getByText("Thinking…")).toBeInTheDocument();

    resolveFirstChat({ data: null, error: { message: "Temporary network failure" } });
    expect(await screen.findByText("Not sent")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Recovered answer")).toBeInTheDocument();
    expect(chatAttempts).toBe(2);
  });

  it("loads chat history in stable 20-message pages without duplicating older rows", async () => {
    const latestRows = Array.from({ length: 21 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(21 - index).padStart(12, "0")}`,
      role: "user",
      content: `History ${index}`,
      created_at: "2026-10-08T00:00:00.000Z",
    }));
    const olderRows = [1, 0].map((suffix, index) => ({
      id: `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
      role: "user",
      content: `Earlier ${index}`,
      created_at: "2026-10-08T00:00:00.000Z",
    }));
    const chatQueries: any[] = [];
    let pageRequest = 0;
    mocks.from.mockImplementation((table: string) => {
      if (table === "analytics_chat_messages") {
        const query = makeQuery(pageRequest++ === 0 ? latestRows : olderRows);
        chatQueries.push(query);
        return query;
      }
      return makeQuery(table === "platform_connections" ? [{ platform: "whop", status: "connected", connected_at: new Date().toISOString(), last_sync_at: null }] : []);
    });

    render(<AnalyticsDashboard />);
    const loadEarlier = await screen.findByRole("button", { name: "Load earlier messages" });
    expect(chatQueries[0].limit).toHaveBeenCalledWith(21);
    expect(screen.getByText("History 19")).toBeInTheDocument();
    expect(screen.queryByText("History 20")).not.toBeInTheDocument();
    fireEvent.click(loadEarlier);
    await waitFor(() => expect(chatQueries).toHaveLength(2));
    expect(chatQueries[1].or).toHaveBeenCalledWith(expect.stringContaining("id.lt."));
    expect(await screen.findByText("Earlier 0")).toBeInTheDocument();
  });

  it("requests the next Whop provider page using returned API cursors", async () => {
    const whopCursors = { products: "products-cursor", orders: "orders-cursor" };
    let analyticsRequests = 0;
    mocks.invoke.mockImplementation(async (name: string, options: any) => {
      if (name !== "analytics-fetch") return { data: { reply: "ok" }, error: null };
      analyticsRequests += 1;
      if (analyticsRequests === 1) {
        return { data: {
          summary: { totalRevenue: 10, totalSales: 1, activeProducts: 1, conversionRate: 100, completedSales: 1 },
          products: [{ id: "w1", platform: "whop", name: "First page product", sales: 1, revenue: 10 }],
          orders: [],
          nextCursors: { whop: whopCursors },
        }, error: null };
      }
      expect(options.body).toEqual({ platform: "whop", cursors: { whop: whopCursors } });
      return { data: {
        summary: { totalRevenue: 20, totalSales: 1, activeProducts: 1, conversionRate: 100, completedSales: 1 },
        products: [{ id: "w2", platform: "whop", name: "Second page product", sales: 1, revenue: 20 }],
        orders: [],
        nextCursors: { whop: null },
      }, error: null };
    });

    render(<AnalyticsDashboard />);
    const button = await screen.findByRole("button", { name: "Load more provider results" });
    fireEvent.click(button);
    expect(await screen.findByText("Second page product")).toBeInTheDocument();
    expect(analyticsRequests).toBe(2);
  });
});
