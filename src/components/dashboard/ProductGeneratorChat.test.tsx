import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import ProductGeneratorChat from "./ProductGeneratorChat";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  recordUsage: vi.fn(),
  addEbook: vi.fn(),
  generatePDF: vi.fn(),
  toast: vi.fn(),
  authUser: null as { id: string; email: string } | null,
  authLoading: false,
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/components/dashboard/DashboardSidebar", () => ({ default: () => null }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.authUser,
    loading: mocks.authLoading,
    sendMagicLink: mocks.sendMagicLink,
    signOut: vi.fn(),
  }),
}));
vi.mock("@/hooks/useFeatureAccess", () => ({
  useFeatureAccess: () => ({
    recordUsage: mocks.recordUsage,
    hasPaidSubscription: true,
    isExpired: false,
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/useEbookStore", () => ({
  useEbookStore: (selector: (state: { addEbook: typeof mocks.addEbook }) => unknown) => selector({ addEbook: mocks.addEbook }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/lib/pdfGenerator", () => ({ generatePDF: mocks.generatePDF }));
vi.mock("@/lib/auth/login", () => ({ signInWithGoogle: mocks.signInWithGoogle }));

const renderWorkspace = () => render(
  <MemoryRouter>
    <DashboardLayout>
      <ProductGeneratorChat />
    </DashboardLayout>
  </MemoryRouter>,
);

const setTestViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.authUser = { id: "test-user", email: "creator@example.com" };
  mocks.authLoading = false;
  setTestViewportWidth(1024);
  mocks.sendMagicLink.mockResolvedValue({ error: null });
  mocks.signInWithGoogle.mockResolvedValue(undefined);
  mocks.recordUsage.mockResolvedValue(true);
  mocks.generatePDF.mockResolvedValue(undefined);
  mocks.invoke.mockResolvedValue({
    data: {
      title: "A Better Workflow",
      content: "# A Better Workflow\n\n## Introduction\nStart with a clear outcome.\n\n## Chapter 1: Make a plan\nChoose one useful next step.",
    },
    error: null,
  });
});

describe("Chat-first product workspace", () => {
  it("starts with an uncluttered prompt and keeps non-ebook types visibly disabled", () => {
    renderWorkspace();

    expect(screen.queryByRole("heading", { name: "What are we creating today?" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ebook" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Send topic" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Course" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Workbook" })).toBeDisabled();
  });

  it.each([375, 1365])("lets an unauthenticated visitor submit and preserves the topic at %i px", async (viewportWidth) => {
    setTestViewportWidth(viewportWidth);
    mocks.authUser = null;
    renderWorkspace();

    const topic = "A practical guide to starting a home garden";
    expect(screen.getByRole("textbox", { name: "Describe the ebook topic" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ebook" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByRole("textbox", { name: "Describe the ebook topic" }), { target: { value: topic } });
    fireEvent.click(screen.getByRole("button", { name: "Send topic" }));

    expect(await screen.findByRole("dialog", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog", { name: "Sign in to continue" })).getByText(topic)).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.recordUsage).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), { target: { value: "new-creator@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with email" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
    expect(mocks.sendMagicLink).toHaveBeenCalledWith("new-creator@example.com");
    expect(localStorage.getItem("nexoraos.pending-chat-topic.v1")).toContain(topic);
  });

  it.each([375, 1365])("resumes the preserved topic after authentication at %i px", async (viewportWidth) => {
    setTestViewportWidth(viewportWidth);
    mocks.authUser = null;
    const workspace = renderWorkspace();
    const topic = "A simple home composting guide";

    fireEvent.change(screen.getByRole("textbox", { name: "Describe the ebook topic" }), { target: { value: topic } });
    fireEvent.click(screen.getByRole("button", { name: "Send topic" }));
    expect(await screen.findByRole("dialog", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(screen.queryByText("Six formats · choose one to begin")).not.toBeInTheDocument();

    mocks.authUser = { id: "new-user", email: "new-creator@example.com" };
    workspace.rerender(
      <MemoryRouter>
        <DashboardLayout>
          <ProductGeneratorChat />
        </DashboardLayout>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Six formats · choose one to begin")).toBeInTheDocument();
    expect(screen.getByText(topic)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Sign in to continue" })).not.toBeInTheDocument();
    expect(localStorage.getItem("nexoraos.pending-chat-topic.v1")).toBeNull();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it.each([375, 1365])("allows the authenticated generation flow at %i px", async (viewportWidth) => {
    setTestViewportWidth(viewportWidth);
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Ebook" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Describe the ebook topic" }), {
      target: { value: "A calmer weekly planning system" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send topic" }));

    expect(await screen.findByText("Six formats · choose one to begin")).toBeInTheDocument();
    expect(screen.getAllByRole("button").filter((button) => /Essential guide|Action plan|Guided workbook|Quick-start playbook|Field manual|Deep-dive handbook/.test(button.textContent ?? ""))).toHaveLength(6);

    fireEvent.click(screen.getByRole("button", { name: /Essential guide/ }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith(
      "generate-ebook",
      expect.objectContaining({ body: expect.objectContaining({ topic: "A calmer weekly planning system" }) }),
    ));
    expect(await screen.findByText("Your ebook is ready to export.", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
    expect(mocks.addEbook).toHaveBeenCalledWith(expect.objectContaining({ topic: "A calmer weekly planning system" }));
  });

  it.each([375, 1365])("does not export a saved ebook after sign-out at %i px", async (viewportWidth) => {
    setTestViewportWidth(viewportWidth);
    const workspace = renderWorkspace();
    fireEvent.change(screen.getByRole("textbox", { name: "Describe the ebook topic" }), {
      target: { value: "A calmer weekly planning system" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send topic" }));
    expect(await screen.findByText("Six formats · choose one to begin")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Essential guide/ }));
    expect(await screen.findByRole("button", { name: "Download PDF" }, { timeout: 5000 })).toBeEnabled();

    mocks.authUser = null;
    workspace.rerender(
      <MemoryRouter>
        <DashboardLayout>
          <ProductGeneratorChat />
        </DashboardLayout>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(await screen.findByRole("dialog", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(mocks.generatePDF).not.toHaveBeenCalled();
  });
});
