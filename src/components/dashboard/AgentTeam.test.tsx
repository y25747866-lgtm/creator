import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgentTeam from "./AgentTeam";

describe("AgentTeam", () => {
  it("shows all five agents with idle status by default", () => {
    render(<AgentTeam />);

    expect(screen.getByRole("heading", { name: "Your AI Team" })).toBeInTheDocument();
    for (const name of ["SCOUT", "NEXUS", "FORGE", "FLUX", "APEX"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Idle")).toHaveLength(5);
  });

  it("opens an agent detail card and shows activity for a working agent", () => {
    render(<AgentTeam workingAgent="SCOUT" />);

    expect(screen.getByLabelText("SCOUT activity")).toBeInTheDocument();
    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(screen.getByText("Reading sources")).toBeInTheDocument();
    expect(screen.getByText("Checking data")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /FORGE/ }));
    expect(screen.getByText("Turns a brief into a structured product people can use.")).toBeInTheDocument();
  });
});
