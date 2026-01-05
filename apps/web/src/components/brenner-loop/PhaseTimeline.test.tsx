import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhaseTimeline } from "./PhaseTimeline";
import type { SessionPhase } from "@/lib/brenner-loop";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe("PhaseTimeline", () => {
  it("renders current phase and triggers clicks for available phases", async () => {
    const user = userEvent.setup();
    const onPhaseClick = vi.fn();

    render(
      <PhaseTimeline
        phases={["intake", "sharpening", "level_split", "exclusion_test"] as SessionPhase[]}
        currentPhase="level_split"
        completedPhases={["intake", "sharpening"]}
        availablePhases={["exclusion_test"]}
        skippedPhases={[]}
        onPhaseClick={onPhaseClick}
      />
    );

    const current = screen.getByRole("button", { name: /level split/i });
    expect(current).toHaveAttribute("aria-current", "step");

    const next = screen.getByRole("button", { name: /exclusion test/i });
    await user.click(next);

    expect(onPhaseClick).toHaveBeenCalledWith("exclusion_test");
  });

  it("supports arrow-key navigation and Enter to activate", async () => {
    const user = userEvent.setup();
    const onPhaseClick = vi.fn();

    render(
      <PhaseTimeline
        phases={["intake", "sharpening", "level_split", "exclusion_test"] as SessionPhase[]}
        currentPhase="level_split"
        completedPhases={["intake", "sharpening"]}
        availablePhases={["exclusion_test"]}
        skippedPhases={[]}
        onPhaseClick={onPhaseClick}
      />
    );

    const current = screen.getByRole("button", { name: /level split/i });
    const next = screen.getByRole("button", { name: /exclusion test/i });

    current.focus();
    await user.keyboard("{ArrowRight}");
    expect(next).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onPhaseClick).toHaveBeenCalledWith("exclusion_test");
  });
});

