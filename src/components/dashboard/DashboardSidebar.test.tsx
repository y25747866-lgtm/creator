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
}));

vi.mock("./DashboardLayout", () => ({
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
    expect(link).toHaveClass("bg-[#111318]", "text-white");
    expect(link.querySelector("svg")).not.toHaveClass("text-[#00E68E]");

    fireEvent.click(link);
    expect(mocks.setMobileOpen).toHaveBeenCalledWith(false);
  });
});
