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
vi.mock("@/hooks/useFeatureAccess", () => ({ useFeatureAccess: () => ({ recordUsage: mocks.recordUsage, getRemainingUses: () => null, isFreePlan: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/useEbookStore", () => ({ useEbookStore: (selector: any) => selector ? selector({ ebooks: [] }) : { ebooks: [] } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, functions: { invoke: mocks.invoke } } }));

function makeQuery() {
  const query: Record<string, any> = {};
  for (const method of ["select", "eq", "order", "limit", "or", "insert", "delete", "update", "upsert"]) query[method] = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue({ data: { id: "saved-result" }, error: null });
  const result = Promise.resolve({ data: [], error: null });
  query.then = result.then.bind(result);
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

import SalesPageBuilder from "./SalesPageBuilder";

describe("Sales Page Builder baseline", () => {
  it("renders and invokes the existing generation endpoint", async () => {
    renderWithQueryClient(<SalesPageBuilder />);
    expect(screen.getByRole("heading", { name: "Sales Page Builder" })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Your product name"), { target: { value: "Test product" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate 3 Sales Page Drafts/ }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("generate-marketing", expect.objectContaining({ body: expect.objectContaining({ title: "Test product" }) })));
  });

  it("shows loading before usage verification and retries failed optimistic draft saves", async () => {
    let resolveUsage: (allowed: boolean) => void = () => undefined;
    let resolveFirstSave: (result: any) => void = () => undefined;
    let saveAttempts = 0;
    mocks.recordUsage.mockImplementation(() => new Promise((resolve) => { resolveUsage = resolve; }));
    mocks.invoke.mockResolvedValue({ data: { results: [{ headline: "Launch headline", subheadline: "A strong subhead", problem: "Pain", solution: "Fix", benefits: "Value", cta: "Start" }] }, error: null });
    mocks.from.mockImplementation(() => {
      const query = makeQuery();
      query.insert = vi.fn(() => {
        saveAttempts += 1;
        const result: Promise<any> = saveAttempts === 1
          ? new Promise((resolve) => { resolveFirstSave = resolve; })
          : Promise.resolve({ data: [{ id: "saved-draft", headline: "Launch headline", subheadline: "A strong subhead", problem: "Pain", solution: "Fix", benefits: "Value", cta: "Start" }], error: null });
        const chain: any = { select: vi.fn(() => chain) };
        chain.then = (onFulfilled: any, onRejected: any) => result.then(onFulfilled, onRejected);
        return chain;
      });
      return query;
    });

    renderWithQueryClient(<SalesPageBuilder />);
    fireEvent.change(screen.getByPlaceholderText("Your product name"), { target: { value: "Test product" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate 3 Sales Page Drafts/ }));
    expect(screen.getByRole("button", { name: /Checking access/ })).toBeDisabled();
    resolveUsage(true);
    expect(await screen.findByText("Launch headline")).toBeInTheDocument();
    expect(screen.getByText("Sales Page Draft · Saving…")).toBeInTheDocument();

    resolveFirstSave({ data: null, error: { message: "Temporary database error" } });
    const retryButton = await screen.findByRole("button", { name: /Retry saving 1 draft/ });
    expect(screen.getByRole("alert")).toHaveTextContent("Temporary database error");
    expect(screen.queryByText("Launch headline")).not.toBeInTheDocument();
    fireEvent.click(retryButton);

    expect(await screen.findByText("Launch headline")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(saveAttempts).toBe(2);
  });

  it("loads saved drafts in 20-item keyset pages", async () => {
    const pageRows = Array.from({ length: 21 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(21 - index).padStart(12, "0")}`,
      created_at: "2026-10-08T00:00:00.000Z",
      headline: `Headline ${index}`,
      subheadline: "Subhead",
      problem: "Problem",
      solution: "Solution",
      benefits: "Benefits",
      cta: "Start",
    }));
    const olderRows = [1, 0].map((suffix, index) => ({
      id: `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
      created_at: "2026-10-08T00:00:00.000Z",
      headline: `Older headline ${index}`,
      subheadline: "Subhead",
      problem: "Problem",
      solution: "Solution",
      benefits: "Benefits",
      cta: "Start",
    }));
    let pageRequest = 0;
    mocks.from.mockImplementation(() => {
      const query = makeQuery();
      const result = Promise.resolve({ data: pageRequest++ === 0 ? pageRows : olderRows, error: null });
      query.then = result.then.bind(result);
      return query;
    });

    renderWithQueryClient(<SalesPageBuilder />);
    const loadMore = await screen.findByRole("button", { name: "Load more saved drafts" });
    expect(mocks.from.mock.results[0].value.limit).toHaveBeenCalledWith(21);
    expect(mocks.from.mock.results[0].value.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(screen.getByText("Headline 19")).toBeInTheDocument();
    expect(screen.queryByText("Headline 20")).not.toBeInTheDocument();

    fireEvent.click(loadMore);
    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));
    expect(mocks.from.mock.results[1].value.or).toHaveBeenCalledWith(expect.stringContaining("id.lt."));
  });

  it("saves every generated draft in a single batched insert request", async () => {
    mocks.invoke.mockResolvedValue({ data: { results: [1, 2, 3].map((n) => ({ headline: `Headline ${n}`, subheadline: "Subhead", problem: "Problem", solution: "Solution", benefits: "Benefits", cta: "Start" })) }, error: null });
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

    renderWithQueryClient(<SalesPageBuilder />);
    fireEvent.change(screen.getByPlaceholderText("Your product name"), { target: { value: "Test product" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate 3 Sales Page Drafts/ }));
    await waitFor(() => expect(insertCalls).toHaveLength(1));
    expect(insertCalls[0]).toHaveLength(3);
    await waitFor(() => expect(screen.getByText("Headline 1")).toBeInTheDocument());
  });
});
