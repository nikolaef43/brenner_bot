import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionDashboard } from "./SessionDashboard";

const mocks = vi.hoisted(() => ({
  prev: vi.fn(),
  next: vi.fn(),
  goTo: vi.fn(),
  saveSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useAsyncOperation", () => ({
  useAsyncOperation: () => ({
    isLoading: false,
    isError: false,
    state: {},
    run: async (fn: () => Promise<void>) => await fn(),
  }),
}));

vi.mock("@/components/ui/loading-overlay", () => ({
  LoadingOverlay: () => null,
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("./CorpusSearch", () => ({
  CorpusSearchDialog: () => null,
}));

vi.mock("./HypothesisCard", () => ({
  HypothesisCard: () => <div data-testid="hypothesis-card" />,
}));

vi.mock("./PhaseTimeline", () => ({
  PhaseTimeline: () => <div data-testid="phase-timeline" />,
}));

vi.mock("@/lib/brenner-loop", async () => {
  const PHASE_ORDER = [
    "intake",
    "sharpening",
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
    "evidence_gathering",
    "revision",
    "complete",
  ] as const;

  return {
    PHASE_ORDER,
    getSessionProgress: () => 25,
    exportSession: vi.fn(async () => new Blob()),
    useSession: () => ({
      session: {
        id: "TEST-1",
        phase: "level_split",
        primaryHypothesisId: "H1",
      },
      primaryHypothesis: {
        id: "H1",
        statement: "Test hypothesis",
        createdAt: new Date(),
        updatedAt: new Date(),
        confidence: 50,
        version: 1,
      },
      isLoading: false,
      error: null,
      attachQuote: vi.fn(),
      isDirty: false,
      saveState: { status: "saved" },
      saveSession: mocks.saveSession,
    }),
    useSessionMachine: () => ({
      reachablePhases: [...PHASE_ORDER],
      isComplete: false,
    }),
    usePhaseNavigation: () => ({
      prev: mocks.prev,
      next: mocks.next,
      canPrev: true,
      canNext: true,
      goTo: mocks.goTo,
    }),
  };
});

describe("SessionDashboard keyboard shortcuts", () => {
  it("uses ArrowLeft/ArrowRight to navigate phases", async () => {
    const user = userEvent.setup();
    mocks.prev.mockClear();
    mocks.next.mockClear();

    render(<SessionDashboard />);

    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{ArrowRight}");

    expect(mocks.prev).toHaveBeenCalledTimes(1);
    expect(mocks.next).toHaveBeenCalledTimes(1);
  });

  it("supports numeric phase jumps (1-9)", async () => {
    const user = userEvent.setup();
    mocks.goTo.mockClear();

    render(<SessionDashboard />);

    await user.keyboard("2");
    expect(mocks.goTo).toHaveBeenCalledWith("sharpening");
  });

  it("ignores shortcuts while typing in an input", async () => {
    const user = userEvent.setup();
    mocks.prev.mockClear();

    render(<SessionDashboard />);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    await user.keyboard("{ArrowLeft}");
    expect(mocks.prev).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("toggles the shortcuts dialog with ?", async () => {
    const user = userEvent.setup();

    render(<SessionDashboard />);

    await user.keyboard("?");
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
  });
});

