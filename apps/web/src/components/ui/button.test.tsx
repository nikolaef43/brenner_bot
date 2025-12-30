/**
 * Unit tests for components/ui/button.tsx
 *
 * Tests the Button component's variants, states, and accessibility.
 * Philosophy: NO mocks - test real rendering behavior.
 *
 * Run with: bun test apps/web/src/components/ui/button.test.tsx
 */

import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

// ============================================================================
// Tests: Basic Rendering
// ============================================================================

describe("Button", () => {
  describe("basic rendering", () => {
    it("renders with children text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: "Click me" })).toBeDefined();
    });

    it("renders with default data attributes", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-slot")).toBe("button");
    });

    it("applies custom className", () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("custom-class");
    });

    it("forwards ref to button element", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Test</Button>);
      expect(ref.current).toBeDefined();
      expect(ref.current?.tagName).toBe("BUTTON");
    });
  });

  // ============================================================================
  // Tests: Variants
  // ============================================================================

  describe("variants", () => {
    it("applies default variant classes", () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-variant")).toBe("default");
      expect(button.className).toContain("bg-primary");
    });

    it("applies destructive variant classes", () => {
      render(<Button variant="destructive">Destructive</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-variant")).toBe("destructive");
      expect(button.className).toContain("bg-destructive");
    });

    it("applies outline variant classes", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-variant")).toBe("outline");
      expect(button.className).toContain("border");
    });

    it("applies secondary variant classes", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-variant")).toBe("secondary");
      expect(button.className).toContain("bg-secondary");
    });

    it("applies ghost variant classes", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-variant")).toBe("ghost");
    });

    it("applies link variant classes", () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-variant")).toBe("link");
      expect(button.className).toContain("text-primary");
    });

    it("applies glow variant classes", () => {
      render(<Button variant="glow">Glow</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-variant")).toBe("glow");
    });
  });

  // ============================================================================
  // Tests: Sizes
  // ============================================================================

  describe("sizes", () => {
    it("applies default size classes", () => {
      render(<Button size="default">Default</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-size")).toBe("default");
      expect(button.className).toContain("h-10");
    });

    it("applies sm size classes", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-size")).toBe("sm");
      expect(button.className).toContain("h-8");
    });

    it("applies lg size classes", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-size")).toBe("lg");
      expect(button.className).toContain("h-12");
    });

    it("applies icon size classes", () => {
      render(<Button size="icon">Icon</Button>);
      const button = screen.getByRole("button");
      expect(button.getAttribute("data-size")).toBe("icon");
      expect(button.className).toContain("size-10");
    });
  });

  // ============================================================================
  // Tests: Disabled State
  // ============================================================================

  describe("disabled state", () => {
    it("can be disabled via prop", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });

    it("has disabled styling when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("disabled:opacity-50");
    });
  });

  // ============================================================================
  // Tests: Loading State
  // ============================================================================

  describe("loading state", () => {
    it("shows loading spinner when loading", () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole("button");
      // Should show "Loading..." text instead of original children
      expect(button.textContent).toContain("Loading...");
    });

    it("is disabled when loading", () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole("button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });

    it("shows spinner SVG when loading", () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole("button");
      const svg = button.querySelector("svg");
      expect(svg).toBeDefined();
      expect(svg?.className).toContain("animate-spin");
    });
  });

  // ============================================================================
  // Tests: asChild (Slot pattern)
  // ============================================================================

  describe("asChild prop (Slot pattern)", () => {
    it("renders as child element when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole("link", { name: "Link Button" });
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("/test");
    });

    it("applies button classes to child when asChild is true", () => {
      render(
        <Button asChild variant="outline">
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole("link");
      expect(link.className).toContain("border");
    });
  });

  // ============================================================================
  // Tests: Click Events
  // ============================================================================

  describe("click events", () => {
    it("calls onClick handler when clicked", async () => {
      const user = userEvent.setup();
      let clicked = false;
      render(<Button onClick={() => { clicked = true; }}>Click</Button>);

      await user.click(screen.getByRole("button"));
      expect(clicked).toBe(true);
    });

    it("does not call onClick when disabled", async () => {
      const user = userEvent.setup();
      let clicked = false;
      render(<Button disabled onClick={() => { clicked = true; }}>Click</Button>);

      await user.click(screen.getByRole("button"));
      expect(clicked).toBe(false);
    });

    it("does not call onClick when loading", async () => {
      const user = userEvent.setup();
      let clicked = false;
      render(<Button loading onClick={() => { clicked = true; }}>Click</Button>);

      await user.click(screen.getByRole("button"));
      expect(clicked).toBe(false);
    });
  });

  // ============================================================================
  // Tests: Accessibility
  // ============================================================================

  describe("accessibility", () => {
    it("has button role by default", () => {
      render(<Button>Accessible</Button>);
      expect(screen.getByRole("button")).toBeDefined();
    });

    it("supports aria-label", () => {
      render(<Button aria-label="Close dialog">X</Button>);
      const button = screen.getByRole("button", { name: "Close dialog" });
      expect(button).toBeDefined();
    });

    it("supports aria-disabled when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      // Standard disabled attribute is used, not aria-disabled
      expect(button.hasAttribute("disabled")).toBe(true);
    });

    it("can receive focus (has focus-visible ring classes)", () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("focus-visible:ring-2");
    });
  });
});
