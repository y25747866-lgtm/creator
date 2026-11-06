import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import ProductGeneratorChat from "./ProductGeneratorChat";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  recordUsage: vi.fn(),
  addEbook: vi.fn(),
  saveGeneratedEbook: vi.fn(),
  uploadCreatorMedia: vi.fn(),
  deleteCreatorMedia: vi.fn(),
  refreshMediaLinks: vi.fn(),
  getLocalCreatorConversations: vi.fn(),
  listCreatorConversations: vi.fn(),
  saveCreatorConversation: vi.fn(),
  cacheLocalCreatorConversation: vi.fn(),
  loadCreatorConversation: vi.fn(),
  readLocalCreatorConversation: vi.fn(),
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
vi.mock("@/lib/ebookRepository", () => ({
  saveGeneratedEbook: mocks.saveGeneratedEbook,
  uploadCreatorMedia: mocks.uploadCreatorMedia,
  deleteCreatorMedia: mocks.deleteCreatorMedia,
  refreshMediaLinks: mocks.refreshMediaLinks,
}));
vi.mock("@/lib/chatPersistence", () => ({
  cacheLocalCreatorConversation: mocks.cacheLocalCreatorConversation,
  getLocalCreatorConversations: mocks.getLocalCreatorConversations,
  listCreatorConversations: mocks.listCreatorConversations,
  loadCreatorConversation: mocks.loadCreatorConversation,
  readLocalCreatorConversation: mocks.readLocalCreatorConversation,
  saveCreatorConversation: mocks.saveCreatorConversation,
}));
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
  mocks.saveGeneratedEbook.mockImplementation(async (ebook, userId) => ({ ...ebook, id: "saved-ebook", dbProductId: "saved-ebook", userId }));
  mocks.uploadCreatorMedia.mockImplementation(async (file: File, userId: string) => ({ id: `${userId}/${file.name}`, path: `${userId}/${file.name}`, name: file.name, mimeType: file.type, size: file.size, signedUrl: "https://media.example/uploaded-file" }));
  mocks.deleteCreatorMedia.mockResolvedValue(undefined);
  mocks.refreshMediaLinks.mockImplementation(async (attachments) => attachments);
  mocks.getLocalCreatorConversations.mockReturnValue([]);
  mocks.listCreatorConversations.mockResolvedValue([]);
  mocks.saveCreatorConversation.mockResolvedValue(undefined);
  mocks.cacheLocalCreatorConversation.mockReturnValue(undefined);
  mocks.loadCreatorConversation.mockResolvedValue([]);
  mocks.readLocalCreatorConversation.mockReturnValue([]);
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
    const composer = screen.getByRole("textbox", { name: "Describe the ebook topic" });
    expect(composer).toHaveClass("min-h-[60px]", "text-[16px]", "leading-[1.6]");
    expect(composer.closest("form")).toHaveClass("min-h-[120px]", "px-6", "py-5", "rounded-[24px]");
    expect(screen.getByRole("button", { name: "Send topic" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Course" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Workbook" })).toBeDisabled();
  });

  it("toggles the desktop sidebar from the main header and flips the expanded icon", () => {
    renderWorkspace();
    const toggle = screen.getByRole("button", { name: "Toggle sidebar" });
    const icon = toggle.querySelector("svg");

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(icon?.style.transform).toBe("scaleX(-1)");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(icon?.style.transform).toBe("");
    expect(screen.getByRole("main")).toHaveClass("md:ml-20");
    expect(localStorage.getItem("nexora_sidebar_collapsed")).toBe("true");
  });

  it("uses the same main-header toggle to open the sidebar drawer on mobile", () => {
    setTestViewportWidth(375);
    renderWorkspace();
    const toggle = screen.getByRole("button", { name: "Toggle sidebar" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle.querySelector("svg")?.style.transform).toBe("scaleX(-1)");
    expect(localStorage.getItem("nexora_sidebar_collapsed")).toBeNull();
  });

  it("opens the add-to-chat sheet with working media and workspace destinations", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Add to chat" }));
    const sheet = screen.getByRole("dialog", { name: "Add to chat" });
    for (const action of ["Camera", "Picture", "File", "Library", "Creations", "Recent tasks", "Skills"]) {
      expect(within(sheet).getByText(action)).toBeInTheDocument();
    }
    expect(sheet).toHaveTextContent("five files per conversation");
    expect(sheet).toHaveTextContent("50 MB each");
  });

  it("opens the connector catalog from the separate plug button", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Open workspace capabilities" }));
    const panel = screen.getByRole("dialog", { name: "Workspace capabilities" });
    expect(panel).toHaveTextContent("60 curated apps · seven categories");
    expect(panel).toHaveTextContent("Productivity");
    expect(panel).toHaveTextContent("AI Tools");
    expect(panel).toHaveTextContent("Research & Web");
    expect(within(panel).getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    expect(within(panel).getAllByRole("button", { name: /connector details/ })).toHaveLength(60);
    expect(within(panel).queryByText(/Browse all 1,000\+ apps/)).not.toBeInTheDocument();
    expect(panel).toHaveClass("!bottom-20", "!left-1/2", "max-h-[70dvh]");
    fireEvent.click(within(panel).getByRole("tab", { name: "Productivity" }));
    expect(within(panel).getAllByRole("button", { name: /connector details/ })).toHaveLength(13);
  });

  it("closes the system selector on outside interaction without resetting the selected mode", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Product mode: AI Product Generator" }));
    const menu = screen.getByRole("menu", { name: "NexoraOS system selector" });
    expect(menu).toHaveTextContent("Activate your NEXUS, SCOUT, FLUX, FORGE and APEX agents.");
    expect(menu).not.toHaveTextContent("Not connected in this preview; no agent run will be simulated.");
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: /Hybrid Agentic System/ }));

    expect(screen.queryByRole("menu", { name: "NexoraOS system selector" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Product mode: Hybrid Agentic System" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Product mode: Hybrid Agentic System" }));
    expect(screen.getByRole("menu", { name: "NexoraOS system selector" })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu", { name: "NexoraOS system selector" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Product mode: Hybrid Agentic System" })).toBeInTheDocument();
  });

  it("opens an app details modal when a connector row is clicked", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Open workspace capabilities" }));
    fireEvent.click(screen.getByRole("button", { name: "Gmail connector details" }));

    const details = screen.getByRole("dialog", { name: "Gmail" });
    expect(details).toHaveTextContent("OAuth 2.0");
    expect(details).toHaveTextContent("Example prompts");
    expect(within(details).getByRole("button", { name: "Connect" })).toBeEnabled();
  });

  it.each([375, 1365])("shows product-specific Google Workspace logos at %i px", (viewportWidth) => {
    setTestViewportWidth(viewportWidth);
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Open workspace capabilities" }));

    const menu = screen.getByRole("dialog", { name: "Workspace capabilities" });
    const apps = [
      ["Gmail", "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg"],
      ["Google Calendar", "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"],
      ["Google Drive", "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg"],
      ["Google Docs", "https://upload.wikimedia.org/wikipedia/commons/0/01/Google_Docs_logo_%282014-2020%29.svg"],
      ["Google Sheets", "https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg"],
    ];

    for (const [name, logo] of apps) {
      expect(within(menu).getByRole("img", { name: `${name} logo` })).toHaveAttribute("src", logo);
      expect(within(menu).getByText(name)).toBeInTheDocument();
    }
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
    expect(screen.getAllByText(topic)).toHaveLength(2);
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
      "generate-ebook-content",
      expect.objectContaining({ body: expect.objectContaining({ topic: "A calmer weekly planning system" }) }),
    ));
    expect(await screen.findByText("Your ebook is ready to export.", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
    expect(mocks.addEbook).toHaveBeenCalledWith(expect.objectContaining({ topic: "A calmer weekly planning system" }));
    expect(mocks.saveGeneratedEbook).toHaveBeenCalledWith(expect.objectContaining({ topic: "A calmer weekly planning system" }), "test-user");
  });

  it("uploads and keeps an image attached to the chat message", async () => {
    renderWorkspace();
    const file = new File(["image bytes"], "cover-reference.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose pictures or videos"), { target: { files: [file] } });

    expect(await screen.findByText("cover-reference.png")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Describe the ebook topic" }), { target: { value: "Create an ebook inspired by this cover" } });
    fireEvent.click(screen.getByRole("button", { name: "Send topic" }));

    expect(await screen.findByText("Six formats · choose one to begin")).toBeInTheDocument();
    expect(screen.getAllByText("cover-reference.png").length).toBeGreaterThan(0);
    expect(mocks.uploadCreatorMedia).toHaveBeenCalledWith(file, "test-user");
  });

  it("opens the File picker and accepts private PDF attachments", async () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Add to chat" }));
    const fileInput = screen.getByLabelText("Upload image, video, or PDF files");
    const clickFilePicker = vi.spyOn(fileInput, "click");
    fireEvent.click(within(screen.getByRole("dialog", { name: "Add to chat" })).getByRole("button", { name: "File" }));
    expect(clickFilePicker).toHaveBeenCalled();
    expect(fileInput.getAttribute("accept")).toContain("application/pdf");

    const pdf = new File(["private pdf"], "project-brief.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [pdf] } });
    expect(await screen.findByText("project-brief.pdf")).toBeInTheDocument();
    expect(mocks.uploadCreatorMedia).toHaveBeenCalledWith(pdf, "test-user");
  });

  it("enforces five uploaded files across the whole conversation", async () => {
    renderWorkspace();
    const fileInput = screen.getByLabelText("Upload image, video, or PDF files");
    const firstFile = new File(["one"], "first.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [firstFile] } });
    expect(await screen.findByText("first.png")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Describe the ebook topic" }), { target: { value: "A useful project guide" } });
    fireEvent.click(screen.getByRole("button", { name: "Send topic" }));
    expect(await screen.findByText("Six formats · choose one to begin")).toBeInTheDocument();

    const remainingFiles = Array.from({ length: 5 }, (_, index) => new File([`file-${index}`], `extra-${index}.png`, { type: "image/png" }));
    fireEvent.change(fileInput, { target: { files: remainingFiles } });
    await waitFor(() => expect(mocks.uploadCreatorMedia).toHaveBeenCalledTimes(5));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Some files were skipped" }));
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
