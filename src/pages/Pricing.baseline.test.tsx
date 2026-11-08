import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, signOut: mocks.signOut }) }));
vi.mock("@/hooks/useSubscription", () => ({ useSubscription: () => ({ hasPaidSubscription: false, loading: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));

import Pricing from "./Pricing";

beforeEach(() => vi.clearAllMocks());

describe("Pricing page", () => {
  it("renders only Starter, Pro, and Hybrid AI OS with the approved credits and CTAs", () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Starter" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hybrid AI OS" })).toBeInTheDocument();
    expect(screen.getByText("1,000 credits / month")).toBeInTheDocument();
    expect(screen.getByText("4,000 credits / month")).toBeInTheDocument();
    expect(screen.getByText("10,000 credits / month")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Creating" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go Pro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Hybrid AI OS" })).toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText("Creator")).not.toBeInTheDocument();
  });

  it("renders the comparison table and sign-in prompt for visitors", () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);

    expect(screen.getByText("Compare what's included")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Starter" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Hybrid AI OS" })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument();
    expect(screen.getByText("Secure payment processing powered by Whop · Cancel anytime")).toBeInTheDocument();
  });
});
