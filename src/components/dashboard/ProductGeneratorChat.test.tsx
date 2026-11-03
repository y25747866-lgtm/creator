import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
}));

vi.mock("@/components/dashboard/DashboardSidebar", () => ({ default: () => null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-user", email: "creator@example.com" } }) }));
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

const renderWorkspace = () => render(
  <MemoryRouter>
    <DashboardLayout>
      <ProductGeneratorChat />
    </DashboardLayout>
  </MemoryRouter>,
);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
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

    expect(screen.getByRole("heading", { name: "What are we creating today?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ebook" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Course" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Workbook" })).toBeDisabled();
  });

  it("shows six templates inline, invokes the existing Edge Function, and returns an inline PDF action", async () => {
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
      "generate-ebook-content",
      expect.objectContaining({ body: expect.objectContaining({ topic: "A calmer weekly planning system" }) }),
    ));
    expect(await screen.findByText("Your ebook is ready to export.", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
    expect(mocks.addEbook).toHaveBeenCalledWith(expect.objectContaining({ topic: "A calmer weekly planning system" }));
  });
});
