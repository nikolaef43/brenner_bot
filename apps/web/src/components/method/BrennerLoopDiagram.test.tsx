/**
 * Unit tests for BrennerLoopDiagram visualization component
 *
 * Tests real DOM rendering + basic interaction.
 * Philosophy: NO mocks (component-level).
 *
 * @see @/components/method/BrennerLoopDiagram.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BrennerLoopDiagram } from "./BrennerLoopDiagram";

describe("BrennerLoopDiagram", () => {
  it("renders all loop stages", () => {
    render(<BrennerLoopDiagram />);

    expect(screen.getByText("Problem Selection")).toBeInTheDocument();
    expect(screen.getByText("Parallel Hypotheses")).toBeInTheDocument();
    expect(screen.getByText("Discriminative Tests")).toBeInTheDocument();
    expect(screen.getByText("Bayesian Update")).toBeInTheDocument();
    // "Iterate" appears both as the desktop short label and mobile title; assert via heading.
    expect(screen.getByRole("heading", { name: "Iterate" })).toBeInTheDocument();
  });

  it("toggles the active stage detail card when a stage is clicked", async () => {
    const user = userEvent.setup();
    render(<BrennerLoopDiagram />);

    // Mobile stage buttons have explicit aria-labels and aria-expanded state.
    const stage1 = screen.getByRole("button", { name: "Stage 1: Problem Selection" });

    expect(stage1).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("heading", { name: "Problem Selection" })).toHaveLength(1);

    await user.click(stage1);
    expect(stage1).toHaveAttribute("aria-expanded", "true");
    // The desktop detail card adds a second heading when a stage is active.
    expect(screen.getAllByRole("heading", { name: "Problem Selection" })).toHaveLength(2);

    await user.click(stage1);
    expect(stage1).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("heading", { name: "Problem Selection" })).toHaveLength(1);
  });
});
