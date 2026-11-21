import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreditBalance from "./CreditBalance";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

const query = (data: unknown) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve({ data, error: null }),
    }),
  }),
});

describe("CreditBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) => table === "user_credits" ? query({ balance: 2_500 }) : query({ plan_type: "pro" }));
  });

  it("loads the balance and exposes both Pro top-up packs", async () => {
    render(<CreditBalance showLabels />);

    expect(await screen.findByText("2,500")).toBeInTheDocument();
    expect(screen.getByText("63%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /top up/i }));
    expect(screen.getByRole("menuitem", { name: /1,000 cr/ })).toHaveAttribute("href", "https://whop.com/checkout/plan_P7Ank0qdHtHHF");
    expect(screen.getByRole("menuitem", { name: /5,000 cr/ })).toHaveAttribute("href", "https://whop.com/checkout/plan_YvUfetosyziGZ");
  });

  it("does not show top-ups for Starter", async () => {
    mocks.from.mockImplementation((table: string) => table === "user_credits" ? query({ balance: 500 }) : query({ plan_type: "starter" }));
    render(<CreditBalance showLabels />);

    await waitFor(() => expect(screen.getByText("500")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /top up/i })).not.toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
