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
  for (const method of ["select", "eq", "order", "limit", "insert", "delete", "update", "upsert"]) query[method] = vi.fn(() => query);
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
      query.single.mockImplementation(() => {
        saveAttempts += 1;
        if (saveAttempts === 1) return new Promise((resolve) => { resolveFirstSave = resolve; });
        return Promise.resolve({ data: { id: "saved-draft", headline: "Launch headline", subheadline: "A strong subhead", problem: "Pain", solution: "Fix", benefits: "Value", cta: "Start" }, error: null });
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
});
