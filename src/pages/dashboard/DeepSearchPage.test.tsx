import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeepSearchPage from "./DeepSearchPage";

const mocks = vi.hoisted(() => ({
  subscription: { loading: false, error: null as string | null, planType: "free", hasPaidSubscription: false },
}));

vi.mock("@/components/dashboard/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => mocks.subscription,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <DeepSearchPage />
    </MemoryRouter>,
  );
}

describe("Deep Search page access", () => {
  beforeEach(() => {
    mocks.subscription = { loading: false, error: null, planType: "free", hasPaidSubscription: false };
  });

  it("shows a plan-specific upgrade prompt without exposing the SCOUT placeholder to Free users", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Upgrade to unlock Deep Search" })).toBeInTheDocument();
    expect(screen.getByText(/available with Pro and Hybrid AI OS plans/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View plans" })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();
  });

  it.each(["pro", "hybrid"])("opens the SCOUT workspace for the %s plan", (planType) => {
    mocks.subscription = { loading: false, error: null, planType, hasPaidSubscription: true };
    renderPage();

    expect(screen.getByRole("heading", { name: "Coming Soon" })).toBeInTheDocument();
    expect(screen.getByText("SCOUT agent")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View plans" })).not.toBeInTheDocument();
  });

  it("keeps Starter outside the Pro/Hybrid entitlement", () => {
    mocks.subscription = { loading: false, error: null, planType: "creator", hasPaidSubscription: true };
    renderPage();

    expect(screen.getByRole("heading", { name: "Upgrade to unlock Deep Search" })).toBeInTheDocument();
  });

  it("shows access verification status instead of an incorrect upgrade prompt while checking", () => {
    mocks.subscription = { loading: true, error: null, planType: "free", hasPaidSubscription: false };
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Checking plan access");
    expect(screen.queryByRole("link", { name: "View plans" })).not.toBeInTheDocument();
  });

  it("does not present a false upsell when plan verification fails", () => {
    mocks.subscription = { loading: false, error: "Failed to fetch subscription", planType: "free", hasPaidSubscription: false };
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t verify your plan");
    expect(screen.queryByRole("link", { name: "View plans" })).not.toBeInTheDocument();
  });
});
