import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectedComposioApp } from "@/lib/connectors/api";
import ConnectedAppIndicators from "./ConnectedAppIndicators";

const mockConnectionState = vi.hoisted(() => ({
  apps: [] as ConnectedComposioApp[],
  loading: false,
  error: null as string | null,
  serviceConfigured: true,
}));

vi.mock("@/hooks/useConnectorConnections", () => ({
  useConnectorConnections: () => mockConnectionState,
}));

vi.mock("@/lib/connectors/api", () => ({
  startComposioConnection: vi.fn(),
}));

describe("ConnectedAppIndicators", () => {
  beforeEach(() => {
    mockConnectionState.apps = [];
    mockConnectionState.loading = false;
    mockConnectionState.error = null;
    mockConnectionState.serviceConfigured = true;
  });

  it("shows no count or icon when no connected apps are verified", () => {
    const { container } = render(<ConnectedAppIndicators />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the actual logo and count for one active Composio app", () => {
    mockConnectionState.apps = [{ slug: "gmail", connected: true }];
    render(<ConnectedAppIndicators />);

    const indicator = screen.getByRole("img", { name: "1 connected app: Gmail" });
    expect(within(indicator).getByText("1")).toBeInTheDocument();
    expect(indicator.querySelector("img")).toHaveAttribute("alt", "Gmail logo");
  });

  it("shows up to three real service logos, an overflow count, and the total", () => {
    mockConnectionState.apps = [
      { slug: "gmail", connected: true },
      { slug: "slack", connected: true },
      { slug: "stripe", connected: true },
      { slug: "github", connected: true },
      { slug: "firecrawl", connected: true },
    ];
    render(<ConnectedAppIndicators />);

    const indicator = screen.getByRole("img", { name: "5 connected apps: Gmail, Slack, Stripe, GitHub, Firecrawl" });
    expect(indicator.querySelectorAll("img")).toHaveLength(3);
    expect(indicator.querySelectorAll("img").length).toBeLessThan(5);
    expect(within(indicator).getByText("+2")).toBeInTheDocument();
    expect(within(indicator).getByText("5")).toBeInTheDocument();
  });

  it("hides stale app data while loading or after an error", () => {
    mockConnectionState.apps = [{ slug: "gmail", connected: true }];
    mockConnectionState.loading = true;
    const { rerender, queryByTestId } = render(<ConnectedAppIndicators />);
    expect(queryByTestId("connected-app-indicators")).not.toBeInTheDocument();

    mockConnectionState.loading = false;
    mockConnectionState.error = "Could not load connections";
    rerender(<ConnectedAppIndicators />);
    expect(queryByTestId("connected-app-indicators")).not.toBeInTheDocument();
  });

  it("hides the indicator when the connection service is not configured", () => {
    mockConnectionState.apps = [{ slug: "gmail", connected: true }];
    mockConnectionState.serviceConfigured = false;
    const { container } = render(<ConnectedAppIndicators />);
    expect(container.firstChild).toBeNull();
  });
});
