import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";

const mocks = vi.hoisted(() => ({
  setCollapsed: vi.fn(),
  setMobileOpen: vi.fn(),
  signOut: vi.fn(),
  toast: vi.fn(),
  listCreatorConversations: vi.fn(),
  supabaseFrom: vi.fn(),
  access: { loading: false, hasPaidSubscription: true, analyticsAccess: true, agentAccess: true, renewalRequired: false, isExpired: false, error: false },
}));

vi.mock("./DashboardLayout", () => ({
  useDashboardAccess: () => mocks.access,
  useSidebarState: () => ({
    collapsed: false,
    setCollapsed: mocks.setCollapsed,
    mobileOpen: true,
    setMobileOpen: mocks.setMobileOpen,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "creator@example.com" },
    signOut: mocks.signOut,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.supabaseFrom },
}));
vi.mock("@/lib/chatPersistence", () => ({
  getLocalCreatorConversations: () => [],
  listCreatorConversations: mocks.listCreatorConversations,
}));

describe("DashboardSidebar Plugins navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCreatorConversations.mockResolvedValue([]);
    mocks.supabaseFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }));
  });

  it("routes to the existing Plugins management page and closes the mobile drawer", () => {
    render(
      <MemoryRouter initialEntries={["/app/connectors"]}>
        <DashboardSidebar />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Plugins" });
    expect(link).toHaveAttribute("href", "/app/connectors");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).not.toHaveClass("bg-[#111318]");
    expect(link).toHaveClass("text-white", "border-l-2", "border-transparent");
    expect(link).toHaveStyle({
      background: "linear-gradient(135deg, rgba(112,34,252,0.2), rgba(240,159,51,0.08))",
      borderLeft: "2px solid #7022FC",
    });
    expect(link.querySelector("svg")).toBeTruthy();

    fireEvent.click(link);
    expect(mocks.setMobileOpen).toHaveBeenCalledWith(false);
  });

  it("applies the subtle gradient to the active Product Studio row", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardSidebar />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Product Studio" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).not.toHaveClass("bg-[#111318]");
    expect(link).toHaveStyle({
      background: "linear-gradient(135deg, rgba(112,34,252,0.2), rgba(240,159,51,0.08))",
      borderLeft: "2px solid #7022FC",
    });
  });

  it("routes locked workspace pages and Analytics to pricing when there is no paid plan", () => {
    mocks.access = { loading: false, hasPaidSubscription: false, analyticsAccess: false, agentAccess: false, renewalRequired: true, isExpired: true, error: false };
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardSidebar />
      </MemoryRouter>,
    );

    for (const label of ["Product Studio", "Downloads", "Projects", "Skills", "Analytics"]) {
      const link = screen.getByRole("link", { name: new RegExp(label) });
      expect(link).toHaveAttribute("href", "/pricing");
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link).toHaveAttribute("title", "Upgrade to Pro");
    }
  });
});
