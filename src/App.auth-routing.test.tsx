import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import App from "./App";

const mocks = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  session: null as null | { user: { id: string; email: string } },
  loading: false,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(), signOut: vi.fn() } },
}));

vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ user: mocks.user, session: mocks.session, loading: mocks.loading }),
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
  mocks.session = null;
  mocks.loading = false;
});

describe("dashboard authentication routing", () => {
  it("lets an unauthenticated visitor browse the agent dashboard without opening sign-in", async () => {
    window.history.replaceState({}, "", "/dashboard");
    render(<App />);

    expect(await screen.findByText("Public chat workspace route")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
    expect(screen.queryByText("Sign-in route")).not.toBeInTheDocument();
  });

  it("continues to protect private Downloads behind sign-in", async () => {
    window.history.replaceState({}, "", "/dashboard/downloads");
    render(<App />);

    expect(await screen.findByText("Sign-in route")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/auth/signin");
    expect(screen.queryByText("Private downloads route")).not.toBeInTheDocument();
  });

  it("keeps sign-in blank while the Supabase session is unresolved", () => {
    window.history.replaceState({}, "", "/auth/signin");
    mocks.loading = true;
    render(<App />);

    expect(screen.queryByText("Sign-in route")).not.toBeInTheDocument();
    expect(document.querySelector("div[aria-hidden='true']")).toBeInTheDocument();
  });

  it("redirects an active session away from sign-in without rendering the sign-in page", async () => {
    window.history.replaceState({}, "", "/auth/signin");
    mocks.user = { id: "creator-1", email: "creator@example.com" };
    mocks.session = { user: mocks.user };
    render(<App />);

    expect(await screen.findByText("Public chat workspace route")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
    expect(screen.queryByText("Sign-in route")).not.toBeInTheDocument();
  });

  it("shows sign-in only after session resolution confirms there is no session", async () => {
    window.history.replaceState({}, "", "/auth/signin");
    render(<App />);

    expect(await screen.findByText("Sign-in route")).toBeInTheDocument();
  });
});
