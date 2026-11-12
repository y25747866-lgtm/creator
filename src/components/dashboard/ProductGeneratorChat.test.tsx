import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import DashboardLayout from "./DashboardLayout";
import ProductGeneratorChat from "./ProductGeneratorChat";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  recordUsage: vi.fn(),
  addEbook: vi.fn(),
  saveGeneratedEbook: vi.fn(),
  submitHybridTask: vi.fn(),
  waitForHybridTask: vi.fn(),
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
  supabaseFrom: vi.fn(),
  supabaseRpc: vi.fn(),
  subscriptionRow: null as null | { plan: string; plan_type: string; status: string; end_date: string | null; expires_at: string | null },
}));

vi.mock("@/components/dashboard/DashboardSidebar", () => ({ default: () => null }));
vi.mock("border-beam", () => ({
  BorderBeam: ({ children, active, colorVariant, size, strength }: { children: ReactNode; active?: boolean; colorVariant?: string; size?: string; strength?: number }) => (
    <div data-testid="composer-border-beam" data-active={String(active)} data-color-variant={colorVariant} data-size={size} data-strength={strength}>{children}</div>
  ),
}));
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
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.supabaseFrom, rpc: mocks.supabaseRpc, functions: { invoke: mocks.invoke } } }));
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
vi.mock("@/lib/hybridAgent", () => ({ submitHybridTask: mocks.submitHybridTask, waitForHybridTask: mocks.waitForHybridTask }));
vi.mock("@/lib/auth/login", () => ({ signInWithGoogle: mocks.signInWithGoogle }));

const renderWorkspace = () => {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" storageKey="nexora-theme" enableSystem={false}>
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DashboardLayout>
            <ProductGeneratorChat />
          </DashboardLayout>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

let testQueryClient: QueryClient;

const setTestViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
};

beforeEach(() => {
  vi.clearAllMocks();
  testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  localStorage.clear();
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.style.colorScheme = "";
  mocks.authUser = { id: "test-user", email: "creator@example.com" };
  mocks.authLoading = false;
  mocks.subscriptionRow = { plan: "pro", plan_type: "pro", status: "active", end_date: null, expires_at: null };
  mocks.supabaseFrom.mockImplementation(() => {
    type SubscriptionQuery = {
      select: () => SubscriptionQuery;
      eq: () => SubscriptionQuery;
      order: () => SubscriptionQuery;
      limit: () => SubscriptionQuery;
      maybeSingle: () => Promise<{ data: typeof mocks.subscriptionRow; error: null }>;
    };
    const builder = {} as SubscriptionQuery;
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.order = () => builder;
    builder.limit = () => builder;
    builder.maybeSingle = () => Promise.resolve({ data: mocks.subscriptionRow, error: null });
    return builder;
  });
  mocks.supabaseRpc.mockResolvedValue({ data: true, error: null });
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
  it("starts with an uncluttered prompt and hides product types that are not enabled", () => {
    const { container } = renderWorkspace();

    expect(container.querySelector(".nexora-chat-workspace")).toHaveStyle({ background: "var(--nexora-workspace-background)", color: "var(--nexora-workspace-foreground)" });
    expect(screen.queryByRole("heading", { name: "What are we creating today?" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ebook" })).toHaveAttribute("aria-pressed", "true");
    const composer = screen.getByRole("textbox", { name: "Describe the ebook topic" });
    expect(composer).toHaveClass("nexora-composer-input", "min-h-[48px]", "sm:min-h-[56px]", "w-full", "text-[16px]", "leading-[1.5]", "placeholder:text-[#8B929E]");
    expect(composer).toHaveStyle({ color: "var(--nexora-workspace-foreground)" });
    expect(composer.closest("form")).toHaveClass("nexora-composer-form", "min-h-[120px]", "px-3", "py-3", "sm:px-6", "sm:py-5", "rounded-[24px]", "border-[#303640]", "focus-within:border-[rgba(112,34,252,0.3)]");
    expect(composer.closest("form")).toHaveStyle({ background: "var(--nexora-composer-background)" });
    expect(composer.closest("form")?.parentElement?.parentElement).toHaveClass("px-0", "sm:px-4");
    expect(screen.getByTestId("composer-border-beam")).toHaveAttribute("data-color-variant", "mono");
    expect(screen.getByTestId("composer-border-beam")).toHaveAttribute("data-size", "pulse-inner");
    expect(screen.getByTestId("composer-border-beam")).toHaveAttribute("data-strength", "0.45");
    expect(screen.getByTestId("composer-border-beam")).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "Send topic" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Course" })).toHaveClass("hidden");
    expect(screen.getByRole("button", { name: "Workbook" })).toHaveClass("hidden");
  });

  it("offers Deep Search from the Add to chat quick-access menu", async () => {
    renderWorkspace();

    fireEvent.click(screen.getByRole("button", { name: "Add to chat" }));
    const deepSearchLink = await screen.findByRole("link", { name: /Deep Search/ });

    expect(deepSearchLink).toHaveAttribute("href", "/dashboard/deep-search");
    expect(within(deepSearchLink).getByText("PRO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Camera" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Picture" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "File" })).toBeInTheDocument();
  });

  it("toggles dark and light mode and persists the choice under nexora-theme", async () => {
    renderWorkspace();

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));
    await waitFor(() => {
      expect(document.documentElement).toHaveClass("light");
      expect(localStorage.getItem("nexora-theme")).toBe("light");
    });
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(localStorage.getItem("nexora-theme")).toBe("dark");
    });
  });

  it("restores a saved light mode when the workspace loads", async () => {
    localStorage.setItem("nexora-theme", "light");
    renderWorkspace();

    await waitFor(() => expect(document.documentElement).toHaveClass("light"));
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });

  it("shows the character counter only above 1500, turns red at 1900, warns at 2000, and clears after send", () => {
    renderWorkspace();
    const composer = screen.getByRole("textbox", { name: "Describe the ebook topic" });

    fireEvent.change(composer, { target: { value: "a".repeat(1500) } });
    expect(screen.queryByText("1,500 / 2,000")).not.toBeInTheDocument();

    fireEvent.change(composer, { target: { value: "a".repeat(1847) } });
    expect(screen.getByText("1,847 / 2,000").parentElement).toHaveClass("text-white/60");

    fireEvent.change(composer, { target: { value: "a".repeat(1900) } });
    expect(screen.getByText("1,900 / 2,000").parentElement).toHaveClass("text-red-400");

    fireEvent.change(composer, { target: { value: "a".repeat(2000) } });
    expect(screen.getByText("2,000 / 2,000").parentElement).toHaveClass("text-red-400");
    expect(screen.getByText("Max reached — longer content will become a file")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send topic" }));
    expect(screen.queryByText("2,000 / 2,000")).not.toBeInTheDocument();
  });

  it("grows the textarea to 200px, then scrolls internally and returns to hidden overflow", () => {
    renderWorkspace();
    const composer = screen.getByRole("textbox", { name: "Describe the ebook topic" });
    let scrollHeight = 88;
    Object.defineProperty(composer, "scrollHeight", { configurable: true, get: () => scrollHeight });

    fireEvent.input(composer, { target: { value: "A longer draft" } });
    expect(composer).toHaveStyle({ height: "88px", overflowY: "hidden" });

    scrollHeight = 248;
    fireEvent.input(composer, { target: { value: "A much longer draft" } });
    expect(composer).toHaveStyle({ height: "200px", overflowY: "auto" });

    scrollHeight = 96;
    fireEvent.input(composer, { target: { value: "Short again" } });
    expect(composer).toHaveStyle({ height: "96px", overflowY: "hidden" });
  });

  it("allows paste up to 2000 characters and turns longer text into a local file pill", () => {
    renderWorkspace();
    const composer = screen.getByRole("textbox", { name: "Describe the ebook topic" });
    composer.focus();

    const shortText = "s".repeat(2000);
    expect(fireEvent.paste(composer, { clipboardData: { getData: () => shortText } })).toBe(true);
    expect(screen.queryByText("pasted-content.txt")).not.toBeInTheDocument();

    const longText = "l".repeat(2001);
    expect(fireEvent.paste(composer, { clipboardData: { getData: () => longText } })).toBe(false);
    expect(composer).toHaveValue("");
    expect(composer).toHaveFocus();
    const filename = screen.getByText("pasted-content.txt");
    const pill = filename.closest("span.inline-flex");
    expect(pill).toHaveClass("bg-[#1a1a1a]", "border-[#333]", "text-white");
    expect(within(pill as HTMLElement).getByRole("button", { name: "Remove pasted-content.txt" })).toBeInTheDocument();
    expect(mocks.uploadCreatorMedia).not.toHaveBeenCalled();

    fireEvent.click(within(pill as HTMLElement).getByRole("button", { name: "Remove pasted-content.txt" }));
    expect(screen.queryByText("pasted-content.txt")).not.toBeInTheDocument();
    expect(mocks.deleteCreatorMedia).not.toHaveBeenCalled();
  });

  it("stops the monochrome beam on first focus and does not restart after blur", () => {
    renderWorkspace();
    const composer = screen.getByRole("textbox", { name: "Describe the ebook topic" });
    const beam = screen.getByTestId("composer-border-beam");

    fireEvent.focus(composer);
    expect(beam).toHaveAttribute("data-active", "false");
    fireEvent.blur(composer);
    expect(beam).toHaveAttribute("data-active", "false");
  });

  it("stops the monochrome beam on the first pointer interaction", () => {
    renderWorkspace();
    const composer = screen.getByRole("textbox", { name: "Describe the ebook topic" });
    const beam = screen.getByTestId("composer-border-beam");

    fireEvent.pointerDown(composer);
    expect(beam).toHaveAttribute("data-active", "false");
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
    expect(screen.getByRole("main")).toHaveClass("md:pl-20");
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
    for (const action of ["Camera", "Picture", "File", "Downloads", "Skills"]) {
      expect(within(sheet).getByText(action)).toBeInTheDocument();
    }
    expect(within(sheet).queryByText("Library")).not.toBeInTheDocument();
    expect(within(sheet).getByText("Creations").closest("a")).toHaveClass("hidden");
    expect(within(sheet).getByText("Recent tasks").closest("button")).toHaveClass("hidden");
    expect(sheet).toHaveTextContent("five files per conversation");
    expect(sheet).toHaveTextContent("50 MB each");
  });

  it("keeps the Plus and Plugin controls together on the lower-left rail", () => {
    renderWorkspace();
    const plus = screen.getByRole("button", { name: "Add to chat" });
    const plugin = screen.getByRole("button", { name: "Open workspace capabilities" });
    expect(plus.parentElement).toBe(plugin.parentElement);
    expect(plus.parentElement).toHaveClass("bg-[#1A1D24]/70", "p-1");
    expect(plus.parentElement?.parentElement).toHaveClass("border-t", "justify-between");
    expect(screen.getByRole("button", { name: "Send topic" }).parentElement).toHaveClass("ml-auto", "min-w-0");
  });

  it("opens the connector catalog from the separate plug button", () => {
    renderWorkspace();
    const plugButton = screen.getByRole("button", { name: "Open workspace capabilities" });
    const icon = plugButton.querySelector("svg");
    expect(plugButton).toHaveStyle({ backgroundColor: "var(--nexora-connector-icon-background)", color: "var(--nexora-connector-icon-color)" });
    expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
    expect(icon?.querySelector("g")).toHaveAttribute("stroke-width", "2");
    expect(icon?.querySelectorAll("path")).toHaveLength(4);
    fireEvent.click(plugButton);
    expect(plugButton).toHaveStyle({ backgroundColor: "var(--nexora-connector-icon-background)", color: "var(--nexora-connector-icon-color)" });
    const panel = screen.getByRole("dialog", { name: "Workspace capabilities" });
    expect(panel).toHaveTextContent("60 curated apps · seven categories");
    expect(panel).toHaveTextContent("Productivity");
    expect(panel).toHaveTextContent("AI Tools");
    expect(panel).toHaveTextContent("Research & Web");
    expect(within(panel).getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    expect(within(panel).getAllByRole("button", { name: /connector details/ })).toHaveLength(60);
    expect(panel.querySelector(".nexora-connector-logo")).toHaveStyle({
      backgroundColor: "var(--nexora-connector-icon-background)",
      borderColor: "var(--nexora-connector-icon-border)",
    });
    expect(within(panel).queryByText(/Browse all 1,000\+ apps/)).not.toBeInTheDocument();
    expect(within(panel).getByRole("tab", { name: "All" })).toHaveClass("border-[#F0F2F5]", "bg-[#F0F2F5]", "text-[#080A0C]");
    expect(panel).toHaveClass("!bottom-20", "!left-1/2", "max-h-[70dvh]");
    fireEvent.click(within(panel).getByRole("tab", { name: "Productivity" }));
    expect(within(panel).getAllByRole("button", { name: /connector details/ })).toHaveLength(13);
    expect(within(panel).getByRole("tab", { name: "Productivity" })).toHaveClass("bg-[#F0F2F5]", "text-[#080A0C]");
  });

  it("closes the system selector on outside interaction without resetting the selected mode", async () => {
    setTestViewportWidth(360);
    renderWorkspace();
    const productModeButton = screen.getByRole("button", { name: "Product mode: AI Product Generator" });
    expect(productModeButton).toHaveClass("max-w-[180px]");
    expect(within(productModeButton).getByText("AI Product Generator")).toBeVisible();
    fireEvent.click(productModeButton);
    const menu = await screen.findByRole("menu", { name: "NexoraOS system selector" });
    expect(menu).toHaveClass("fixed", "z-[100]", "overflow-y-auto");
    expect(menu).toHaveTextContent("Activate your NEXUS, SCOUT, FLUX, FORGE and APEX agents.");
    expect(menu).not.toHaveTextContent("Not connected in this preview; no agent run will be simulated.");
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: /Hybrid Agentic System/ }));

    expect(screen.queryByRole("menu", { name: "NexoraOS system selector" })).not.toBeInTheDocument();
    const hybridModeButton = screen.getByRole("button", { name: "Product mode: Hybrid Agentic System" });
    expect(hybridModeButton).toBeInTheDocument();
    expect(hybridModeButton.querySelector("svg")).toHaveClass("text-[#B7BEC8]");

    fireEvent.click(screen.getByRole("button", { name: "Product mode: Hybrid Agentic System" }));
    expect(await screen.findByRole("menu", { name: "NexoraOS system selector" })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu", { name: "NexoraOS system selector" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Product mode: Hybrid Agentic System" })).toBeInTheDocument();
  });

  it("hides the Hybrid Agentic System option when the account has no agent access", async () => {
    mocks.subscriptionRow = { plan: "free", plan_type: "free", status: "active", end_date: null, expires_at: null };
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Product mode: AI Product Generator" }));
    const menu = await screen.findByRole("menu", { name: "NexoraOS system selector" });
    expect(within(menu).queryByRole("menuitemradio", { name: /Hybrid Agentic System/ })).not.toBeInTheDocument();
  });

  it("shows Hybrid mode to guests but requires sign-in before dispatching an agent task", async () => {
    setTestViewportWidth(375);
    mocks.authUser = null;
    renderWorkspace();

    fireEvent.click(screen.getByRole("button", { name: "Product mode: AI Product Generator" }));
    const menu = await screen.findByRole("menu", { name: "NexoraOS system selector" });
    const hybridOption = within(menu).getByRole("menuitemradio", { name: /Hybrid Agentic System/ });
    expect(hybridOption).toHaveTextContent("Preview the system; sign in to check access and run agents.");
    fireEvent.click(hybridOption);

    expect(screen.getByRole("button", { name: "Product mode: Hybrid Agentic System" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Describe the ebook topic" }), { target: { value: "Coordinate agents to plan a launch" } });
    fireEvent.click(screen.getByRole("button", { name: "Send topic" }));

    expect(await screen.findByRole("dialog", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(mocks.submitHybridTask).not.toHaveBeenCalled();
    expect(mocks.waitForHybridTask).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("opens an app details modal when a connector row is clicked", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Open workspace capabilities" }));
    fireEvent.click(screen.getByRole("button", { name: "Gmail connector details" }));

    const details = screen.getByRole("dialog", { name: "Gmail" });
    expect(details).toHaveTextContent("OAuth 2.0");
    expect(details).toHaveTextContent("Example prompts");
    expect(within(details).getByRole("button", { name: "Status unavailable" })).toBeDisabled();
  });

  it.each([360, 1365])("shows product-specific Google Workspace logos at %i px", (viewportWidth) => {
    setTestViewportWidth(viewportWidth);
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Open workspace capabilities" }));

    const menu = screen.getByRole("dialog", { name: "Workspace capabilities" });
    const apps = [
      ["Gmail", "/connector-logos/gmail.svg"],
      ["Google Calendar", "/connector-logos/google-calendar.svg"],
      ["Google Drive", "/connector-logos/google-drive.svg"],
      ["Google Docs", "/connector-logos/google-docs.svg"],
      ["Google Sheets", "/connector-logos/google-sheets.svg"],
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
    expect(screen.queryByRole("dialog", { name: "Sign in to continue" })).not.toBeInTheDocument();
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
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DashboardLayout>
            <ProductGeneratorChat />
          </DashboardLayout>
        </MemoryRouter>
      </QueryClientProvider>,
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
      <ThemeProvider attribute="class" defaultTheme="dark" storageKey="nexora-theme" enableSystem={false}>
        <QueryClientProvider client={testQueryClient}>
          <MemoryRouter>
            <DashboardLayout>
              <ProductGeneratorChat />
            </DashboardLayout>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(await screen.findByRole("dialog", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(mocks.generatePDF).not.toHaveBeenCalled();
  });
});
