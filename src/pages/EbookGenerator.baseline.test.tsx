/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), from: vi.fn(), recordUsage: vi.fn(), toast: vi.fn(), user: { id: "test-user" } }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("thinking-orbs", () => ({ ThinkingOrb: () => null }));
vi.mock("border-beam", () => ({ BorderBeam: ({ children }: any) => <div>{children}</div> }));
vi.mock("framer-motion", () => ({ motion: new Proxy({}, { get: (_target, tag: string) => tag }), AnimatePresence: ({ children }: any) => <>{children}</> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ hasPaidSubscription: true, subscription: { status: "active" }, loading: false }) }));
vi.mock("@/hooks/useFeatureAccess", () => ({ useFeatureAccess: () => ({ recordUsage: mocks.recordUsage, isFreePlan: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/useEbookStore", () => ({ useEbookStore: () => ({ ebooks: [], addEbook: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, functions: { invoke: mocks.invoke } } }));

beforeEach(() => {
  mocks.invoke.mockReset().mockResolvedValue({ data: { niches: [] }, error: null });
  mocks.from.mockReset();
  mocks.recordUsage.mockReset().mockResolvedValue(true);
  mocks.toast.mockReset();
  localStorage.clear();
});

import EbookGenerator from "./EbookGenerator";

describe("Ebook Generator baseline", () => {
  it("renders before niche search or drafting", () => {
    render(<MemoryRouter><EbookGenerator /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "AI Product Generator" })).toBeInTheDocument();
  });

  it("shows the drafting step immediately while usage verification is pending", async () => {
    let resolveUsage: (allowed: boolean) => void = () => undefined;
    let resolveDraft: (result: any) => void = () => undefined;
    mocks.recordUsage.mockImplementation(() => new Promise((resolve) => { resolveUsage = resolve; }));
    mocks.invoke.mockImplementation((name: string) => {
      if (name === "search-winning-niches") {
        return Promise.resolve({ data: { niches: [{ category: "Business", subNiche: "Digital tools", headline: "A better workflow", painDescription: "Manual work", scores: { pain: 7, demand: 8, speed: 6 } }] }, error: null });
      }
      return new Promise((resolve) => { resolveDraft = resolve; });
    });

    render(<MemoryRouter><EbookGenerator /></MemoryRouter>);
    fireEvent.change(await screen.findByPlaceholderText("I don't know, you can find a good topic for me."), { target: { value: "Productivity" } });
    fireEvent.click(await screen.findByRole("button", { name: /Find Winning Niches/ }));
    fireEvent.click(await screen.findByText("A better workflow"));
    fireEvent.click(screen.getByRole("button", { name: /Lock This Angle/ }));

    expect(screen.getByText("Drafting Your Script")).toBeInTheDocument();
    resolveUsage(true);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("generate-ebook", expect.any(Object)));
    resolveDraft({ data: { title: "A better workflow", chapters: [] }, error: null });
  });
});
