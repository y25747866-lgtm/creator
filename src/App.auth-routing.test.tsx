import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import App from "./App";

const mocks = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  loading: false,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(), signOut: vi.fn() } },
}));

vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: mocks.user, loading: mocks.loading }),
}));
vi.mock("./pages/Landing", () => ({ default: () => <main>Landing route</main> }));
vi.mock("./pages/Blog", () => ({ default: () => <main>Blog route</main> }));
vi.mock("./pages/Dashboard", () => ({ default: () => <main>Public chat workspace route</main> }));
vi.mock("./pages/Downloads", () => ({ default: () => <main>Private downloads route</main> }));
vi.mock("./pages/Auth", () => ({ default: () => <main>Sign-in route</main> }));

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

beforeEach(() => {
  mocks.user = null;
  mocks.loading = false;
});

describe("dashboard authentication routing", () => {
  it("redirects an unauthenticated dashboard visitor to sign-in with the original destination", async () => {
    window.history.replaceState({}, "", "/dashboard");
    render(<App />);

    expect(await screen.findByText("Sign-in route")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/auth/signin");
    expect(window.location.search).toBe("?redirect=%2Fdashboard");
    expect(screen.queryByText("Public chat workspace route")).not.toBeInTheDocument();
  });

  it("continues to protect private Downloads behind sign-in", async () => {
    window.history.replaceState({}, "", "/dashboard/downloads");
    render(<App />);

    expect(await screen.findByText("Sign-in route")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/auth/signin");
    expect(screen.queryByText("Private downloads route")).not.toBeInTheDocument();
  });
});
