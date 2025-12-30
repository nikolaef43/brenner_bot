/**
 * Test Setup for Vitest
 *
 * Extends Vitest's expect with jest-dom matchers for DOM assertions.
 * This file is automatically run before each test file.
 *
 * @see https://testing-library.com/docs/ecosystem-jest-dom/
 */

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Animation props used by framer-motion that should be stripped in tests
const ANIMATION_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "layout",
  "layoutId",
  "onAnimationStart",
  "onAnimationComplete",
]);

/**
 * Strip framer-motion animation props from an object, returning only HTML-safe props.
 */
function stripAnimationProps<T extends Record<string, unknown>>(props: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => !ANIMATION_PROPS.has(key))
  ) as Partial<T>;
}

// Mock framer-motion to render without animations in tests
// This prevents elements from being stuck at initial opacity: 0
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: {
      div: ({ children, ...props }: React.ComponentProps<"div">) => (
        <div {...(stripAnimationProps(props) as React.ComponentProps<"div">)}>{children}</div>
      ),
      section: ({ children, ...props }: React.ComponentProps<"section">) => (
        <section {...(stripAnimationProps(props) as React.ComponentProps<"section">)}>{children}</section>
      ),
      span: ({ children, ...props }: React.ComponentProps<"span">) => (
        <span {...(stripAnimationProps(props) as React.ComponentProps<"span">)}>{children}</span>
      ),
      p: ({ children, ...props }: React.ComponentProps<"p">) => (
        <p {...(stripAnimationProps(props) as React.ComponentProps<"p">)}>{children}</p>
      ),
      button: ({ children, ...props }: React.ComponentProps<"button">) => (
        <button {...(stripAnimationProps(props) as React.ComponentProps<"button">)}>{children}</button>
      ),
      a: ({ children, ...props }: React.ComponentProps<"a">) => (
        <a {...(stripAnimationProps(props) as React.ComponentProps<"a">)}>{children}</a>
      ),
    },
  };
});
