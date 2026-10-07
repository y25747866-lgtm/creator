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
  for (const method of ["select", "eq", "order", "limit", "insert", "delete", "update", "upsert"]) query[method] = vi.fn(() => query);
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
});
