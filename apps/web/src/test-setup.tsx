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

// Mock framer-motion to render without animations in tests
// This prevents elements from being stuck at initial opacity: 0
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: {
      div: ({ children, ...props }: React.ComponentProps<"div">) => {
        // Strip animation props, keep regular HTML props
        const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, whileHover: _whileHover, whileTap: _whileTap, ...rest } = props as Record<string, unknown>;
        return <div {...(rest as React.ComponentProps<"div">)}>{children}</div>;
      },
      section: ({ children, ...props }: React.ComponentProps<"section">) => {
        const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, whileHover: _whileHover, whileTap: _whileTap, ...rest } = props as Record<string, unknown>;
        return <section {...(rest as React.ComponentProps<"section">)}>{children}</section>;
      },
      span: ({ children, ...props }: React.ComponentProps<"span">) => {
        const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, whileHover: _whileHover, whileTap: _whileTap, ...rest } = props as Record<string, unknown>;
        return <span {...(rest as React.ComponentProps<"span">)}>{children}</span>;
      },
      p: ({ children, ...props }: React.ComponentProps<"p">) => {
        const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, whileHover: _whileHover, whileTap: _whileTap, ...rest } = props as Record<string, unknown>;
        return <p {...(rest as React.ComponentProps<"p">)}>{children}</p>;
      },
      button: ({ children, ...props }: React.ComponentProps<"button">) => {
        const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, whileHover: _whileHover, whileTap: _whileTap, ...rest } = props as Record<string, unknown>;
        return <button {...(rest as React.ComponentProps<"button">)}>{children}</button>;
      },
      a: ({ children, ...props }: React.ComponentProps<"a">) => {
        const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, variants: _variants, whileHover: _whileHover, whileTap: _whileTap, ...rest } = props as Record<string, unknown>;
        return <a {...(rest as React.ComponentProps<"a">)}>{children}</a>;
      },
    },
  };
});
