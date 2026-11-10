import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ViewableRoute from "./ViewableRoute";

const authState = { user: null as null | { id: string }, session: null as null | { user: { id: string } }, loading: false };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

function SignInDestination() {
  const location = useLocation();
  return <p>Sign-in screen{location.search}</p>;
}

function TestRoutes() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ViewableRoute allowGuestPreview>
            <p>Agent workspace preview</p>
          </ViewableRoute>
        }
      />
      <Route
        path="/dashboard/products"
        element={
          <ViewableRoute>
            <p>Private projects</p>
          </ViewableRoute>
        }
      />
      <Route path="/auth/signin" element={<SignInDestination />} />
    </Routes>
  );
}

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <TestRoutes />
  </MemoryRouter>,
);

describe("ViewableRoute guest preview", () => {
  beforeEach(() => {
    authState.user = null;
    authState.session = null;
    authState.loading = false;
  });

  it("lets signed-out visitors browse the agent dashboard without showing sign-in", () => {
    renderAt("/dashboard");

    expect(screen.getByText("Agent workspace preview")).toBeInTheDocument();
    expect(screen.queryByText(/Sign-in screen/)).not.toBeInTheDocument();
  });

  it("keeps account-specific routes protected and preserves the requested destination", () => {
    renderAt("/dashboard/products");

    expect(screen.getByText("Sign-in screen?redirect=%2Fdashboard%2Fproducts")).toBeInTheDocument();
    expect(screen.queryByText("Private projects")).not.toBeInTheDocument();
  });

  it("keeps the screen black while auth is being checked rather than rendering dashboard or sign-in content", () => {
    authState.loading = true;
    const { container } = renderAt("/dashboard");

    expect(container.firstChild).toHaveClass("min-h-screen", "bg-[#080A0C]");
    expect(screen.queryByText("Agent workspace preview")).not.toBeInTheDocument();
    expect(screen.queryByText(/Sign-in screen/)).not.toBeInTheDocument();
  });

  it("continues to render protected content for authenticated users", () => {
    authState.session = { user: { id: "creator-1" } };
    authState.user = { id: "creator-1" };
    renderAt("/dashboard/products");

    expect(screen.getByText("Private projects")).toBeInTheDocument();
  });
});
