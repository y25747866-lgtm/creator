import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ConnectedComposioApp } from "@/lib/connectors/api";
import ConnectorCatalog from "./ConnectorCatalog";

const mocks = vi.hoisted(() => ({
  apps: [] as ConnectedComposioApp[],
  loading: false,
  error: null as string | null,
  serviceConfigured: true,
  refresh: vi.fn(),
  startConnection: vi.fn(),
}));

vi.mock("@/hooks/useConnectorConnections", () => ({
  useConnectorConnections: () => ({
    apps: mocks.apps,
    loading: mocks.loading,
    error: mocks.error,
    serviceConfigured: mocks.serviceConfigured,
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/lib/connectors/api", () => ({
  startComposioConnection: mocks.startConnection,
}));

const renderCatalog = () => render(
  <MemoryRouter>
    <ConnectorCatalog />
  </MemoryRouter>,
);

describe("Plugins management catalog", () => {
  beforeEach(() => {
    mocks.apps = [];
    mocks.loading = false;
    mocks.error = null;
    mocks.serviceConfigured = true;
    vi.clearAllMocks();
  });

  it("lists only active known Composio apps with their real logos and connected states", () => {
    mocks.apps = [
      { slug: "gmail", connected: true },
      { slug: "slack", connected: false },
      { slug: "github", connected: true },
    ];
    renderCatalog();

    const section = screen.getByRole("region", { name: "Connected applications" });
    expect(section).toHaveTextContent("2 connected");
    const list = within(section).getByRole("list", { name: "Verified connected apps" });
    expect(list).toHaveClass("grid-cols-1", "sm:grid-cols-2");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(list).toHaveTextContent("Gmail");
    expect(list).toHaveTextContent("GitHub");
    expect(list).not.toHaveTextContent("Slack");
    expect(list.querySelector('img[alt="Gmail logo"]')).toBeInTheDocument();
    expect(list.querySelector('img[alt="GitHub logo"]')).toBeInTheDocument();
    expect(within(list).getAllByText("Connected")).toHaveLength(2);
  });

  it("reports a truthful empty state when the verified account list is empty", () => {
    renderCatalog();
    const section = screen.getByRole("region", { name: "Connected applications" });
    expect(section).toHaveTextContent("0 connected");
    expect(section).toHaveTextContent("No connected apps were returned for this account.");
    expect(within(section).queryByRole("list")).not.toBeInTheDocument();
  });

  it("preserves the existing Connect action when the service confirms an app is disconnected", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Gmail connector details" }));
    expect(screen.getByRole("button", { name: "Connect" })).toBeEnabled();
  });

  it("does not show cached connection details during loading", () => {
    mocks.apps = [{ slug: "gmail", connected: true }];
    mocks.loading = true;
    renderCatalog();

    const section = screen.getByRole("region", { name: "Connected applications" });
    expect(section).toHaveTextContent("Checking your connected apps");
    expect(within(section).queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gmail connector details" })).toHaveTextContent("Checking…");
  });

  it("reports status errors and does not render stale apps as connected", () => {
    mocks.apps = [{ slug: "gmail", connected: true }];
    mocks.error = "Composio unavailable";
    renderCatalog();

    const section = screen.getByRole("region", { name: "Connected applications" });
    expect(section).toHaveTextContent("Could not verify connected apps");
    expect(within(section).queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gmail connector details" })).toHaveTextContent("Status unavailable");

    fireEvent.click(screen.getByRole("button", { name: "Gmail connector details" }));
    expect(screen.getByRole("button", { name: "Status unavailable" })).toBeDisabled();
  });

  it("does not claim a zero count when the connection service is not configured", () => {
    mocks.serviceConfigured = false;
    renderCatalog();

    const section = screen.getByRole("region", { name: "Connected applications" });
    expect(section).toHaveTextContent("cannot be verified");
    expect(section).not.toHaveTextContent("0 connected");
  });
});
