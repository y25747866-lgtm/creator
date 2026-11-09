import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import SkillsPage from "./SkillsPage";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/components/dashboard/DashboardLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "skills-user" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

function renderSkills() {
  return render(
    <MemoryRouter>
      <SkillsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.from.mockImplementation((table: "skill_packs" | "user_skills") => {
    const result = Promise.resolve({ data: [], error: null });
    if (table === "skill_packs") return { select: () => ({ order: () => result }) };
    return { select: () => ({ eq: () => result }) };
  });
});

describe("Skills catalogue", () => {
  it("shows the three official starter skills and filters by category", async () => {
    renderSkills();
    expect(await screen.findByRole("heading", { name: "Deep Research Engine" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sales Page Writer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Marketing Copy Studio" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Official/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Personal/ }));
    expect(await screen.findByText("No skills in this category")).toBeInTheDocument();
  });

  it("creates, edits, and deletes a personal skill in user-scoped local storage", async () => {
    const user = userEvent.setup();
    renderSkills();
    await screen.findByRole("heading", { name: "Deep Research Engine" });
    fireEvent.click(screen.getByRole("button", { name: "New skill" }));
    expect(await screen.findByRole("heading", { name: "Create a skill" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Launch checklist" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Plan a product launch." } });
    fireEvent.change(screen.getByLabelText("Instructions"), { target: { value: "List the launch steps and owners." } });
    fireEvent.click(screen.getByRole("button", { name: "Save skill" }));
    expect(await screen.findByRole("heading", { name: "Launch checklist" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("nexoraos.skills.skills-user") ?? "{}").customSkills[0].instructions).toBe("List the launch steps and owners.");

    await user.click(screen.getByRole("button", { name: "Launch checklist options" }));
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Product launch checklist" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("heading", { name: "Product launch checklist" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Product launch checklist options" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const confirmation = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirmation).getByRole("button", { name: "Delete skill" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Product launch checklist" })).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem("nexoraos.skills.skills-user") ?? "{}").customSkills).toHaveLength(0);
  });
});
