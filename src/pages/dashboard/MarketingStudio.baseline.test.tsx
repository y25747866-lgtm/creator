/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn(), recordUsage: vi.fn(), toast: vi.fn(), user: { id: "test-user" } }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/UpgradeOverlay", () => ({ UpgradeOverlay: () => null }));
vi.mock("framer-motion", () => ({ motion: new Proxy({}, { get: (_target, tag: string) => tag }), AnimatePresence: ({ children }: any) => <>{children}</> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ hasPaidSubscription: true, subscription: { status: "active" }, loading: false }) }));
vi.mock("@/hooks/useFeatureAccess", () => ({ useFeatureAccess: () => ({ recordUsage: mocks.recordUsage, getRemainingUses: () => null, isFreePlan: false, canUseFeature: () => true }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/useEbookStore", () => ({ useEbookStore: () => ({ getEbooksForUser: () => [] }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, functions: { invoke: mocks.invoke } } }));

function makeQuery() {
  const query: Record<string, any> = {};
  for (const method of ["select", "eq", "order", "limit", "or", "insert", "delete", "update", "upsert"]) query[method] = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue({ data: { id: "saved-result" }, error: null });
  query.then = Promise.resolve({ data: [], error: null }).then.bind(Promise.resolve({ data: [], error: null }));
  return query;
}

beforeEach(() => {
  mocks.invoke.mockReset().mockResolvedValue({ data: { results: [] }, error: null });
  mocks.from.mockReset().mockImplementation(() => makeQuery());
  mocks.recordUsage.mockReset().mockResolvedValue(true);
  mocks.toast.mockReset();
  localStorage.clear();
});

function renderWithQueryClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

import MarketingStudio from "./MarketingStudio";

describe("Marketing Studio baseline", () => {
  it("renders and invokes the existing generation endpoint", async () => {
    renderWithQueryClient(<MarketingStudio />);
    expect(screen.getByRole("heading", { name: "Marketing Studio" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("e.g. Launch of my SaaS tool"), { target: { value: "Test launch" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate Posts/ }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("generate-marketing", expect.objectContaining({ body: expect.objectContaining({ title: "Test launch" }) })));
  });

  it("shows generated posts optimistically and rolls back with a working save retry", async () => {
    let resolveFirstSave: (result: any) => void = () => undefined;
    let resolveUsage: (allowed: boolean) => void = () => undefined;
    let saveAttempts = 0;
    mocks.recordUsage.mockImplementation(() => new Promise((resolve) => { resolveUsage = resolve; }));
    mocks.invoke.mockResolvedValue({ data: { results: [{ hook: "Launch hook", main_copy: "Launch copy", cta: "Try it" }] }, error: null });
    mocks.from.mockImplementation(() => {
      const query = makeQuery();
      query.insert = vi.fn(() => {
        saveAttempts += 1;
        const result: Promise<any> = saveAttempts === 1
          ? new Promise((resolve) => { resolveFirstSave = resolve; })
          : Promise.resolve({ data: [{ id: "saved-result", hook: "Launch hook", main_copy: "Launch copy", cta: "Try it", platform: "instagram" }], error: null });
        const chain: any = { select: vi.fn(() => chain) };
        chain.then = (onFulfilled: any, onRejected: any) => result.then(onFulfilled, onRejected);
        return chain;
      });
      return query;
    });

    renderWithQueryClient(<MarketingStudio />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Launch of my SaaS tool"), { target: { value: "Test launch" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate Posts/ }));
    expect(screen.getByRole("button", { name: /Checking access/ })).toBeDisabled();
    resolveUsage(true);
    expect(await screen.findByText("Launch hook")).toBeInTheDocument();
    expect(screen.getByText("Saving…")).toBeInTheDocument();

    resolveFirstSave({ data: null, error: { message: "Temporary database error" } });
    const retryButton = await screen.findByRole("button", { name: /Retry saving 1 post/ });
    expect(screen.getByRole("alert")).toHaveTextContent("Temporary database error");
    expect(screen.queryByText("Launch hook")).not.toBeInTheDocument();
    fireEvent.click(retryButton);

    expect(await screen.findByText("Launch hook")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(saveAttempts).toBe(2);
  });

  it("loads saved posts in 20-item keyset pages", async () => {
    const pageRows = Array.from({ length: 21 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(21 - index).padStart(12, "0")}`,
      created_at: "2026-10-08T00:00:00.000Z",
      hook: `Hook ${index}`,
      main_copy: "Copy",
      cta: "Try it",
      hashtags: null,
      platform: "instagram",
    }));
    const olderRows = [1, 0].map((suffix, index) => ({
      id: `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
      created_at: "2026-10-08T00:00:00.000Z",
      hook: `Older hook ${index}`,
      main_copy: "Copy",
      cta: "Try it",
      hashtags: null,
      platform: "instagram",
    }));
    let pageRequest = 0;
    mocks.from.mockImplementation(() => {
      const query = makeQuery();
      const result = Promise.resolve({ data: pageRequest++ === 0 ? pageRows : olderRows, error: null });
      query.then = result.then.bind(result);
      return query;
    });

    renderWithQueryClient(<MarketingStudio />);
    const loadMore = await screen.findByRole("button", { name: "Load more saved posts" });
    expect(mocks.from.mock.results[0].value.limit).toHaveBeenCalledWith(21);
    expect(mocks.from.mock.results[0].value.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(screen.getByText("Hook 19")).toBeInTheDocument();
    expect(screen.queryByText("Hook 20")).not.toBeInTheDocument();

    fireEvent.click(loadMore);
    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));
    expect(mocks.from.mock.results[1].value.or).toHaveBeenCalledWith(expect.stringContaining("id.lt."));
  });

  it("saves every generated post in a single batched insert request", async () => {
    mocks.invoke.mockResolvedValue({ data: { results: [1, 2, 3].map((n) => ({ hook: `Hook ${n}`, main_copy: `Copy ${n}`, cta: "Try it" })) }, error: null });
    const insertCalls: any[][] = [];
    mocks.from.mockImplementation(() => {
      const query = makeQuery();
      query.insert = vi.fn((rows: any) => {
        insertCalls.push(rows);
        const chain: any = { select: vi.fn(() => chain) };
        chain.then = (onFulfilled: any, onRejected: any) => Promise.resolve({ data: rows.map((row: any) => ({ ...row })), error: null }).then(onFulfilled, onRejected);
        return chain;
      });
      return query;
    });

    renderWithQueryClient(<MarketingStudio />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Launch of my SaaS tool"), { target: { value: "Test launch" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate Posts/ }));
    await waitFor(() => expect(insertCalls).toHaveLength(1));
    expect(insertCalls[0]).toHaveLength(3);
    await waitFor(() => expect(screen.getByText("Hook 1")).toBeInTheDocument());
    expect(screen.getAllByText(/^Hook \d$/)).toHaveLength(3);
  });
});
