import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BrowserPanel from "./BrowserPanel";

describe("BrowserPanel", () => {
  it("opens from a SCOUT browsing request and keeps the URL bar read-only", async () => {
    const onBrowsingChange = vi.fn();
    render(<BrowserPanel onBrowsingChange={onBrowsingChange} />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.dispatchEvent(new CustomEvent("nexoraos:scout-browsing", {
      detail: { url: "https://nexoraos.digital/research", label: "Browsing nexoraos.digital…" },
    }));

    await waitFor(() => expect(screen.getByRole("complementary", { name: "SCOUT browser" })).toHaveAttribute("aria-hidden", "false"));
    expect(screen.getByLabelText("Current browser URL")).toHaveTextContent("https://nexoraos.digital/research");
    expect(screen.getByText("Browsing nexoraos.digital…")).toBeInTheDocument();
    expect(onBrowsingChange).toHaveBeenCalledWith(true);
  });

  it("supports controlled back and forward navigation", async () => {
    render(<BrowserPanel />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    window.dispatchEvent(new CustomEvent("nexoraos:scout-browsing", { detail: { url: "https://example.com/one" } }));
    await waitFor(() => expect(screen.getByLabelText("Current browser URL")).toHaveTextContent("https://example.com/one"));
    window.dispatchEvent(new CustomEvent("nexoraos:scout-browsing", { detail: { url: "https://example.com/two" } }));
    await waitFor(() => expect(screen.getByLabelText("Current browser URL")).toHaveTextContent("https://example.com/two"));

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByLabelText("Current browser URL")).toHaveTextContent("https://example.com/one");
    fireEvent.click(screen.getByRole("button", { name: "Go forward" }));
    expect(screen.getByLabelText("Current browser URL")).toHaveTextContent("https://example.com/two");
  });
});
