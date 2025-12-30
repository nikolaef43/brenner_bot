/**
 * Vitest Configuration for Bun
 *
 * Unit testing configuration for brenner_bot web app.
 * Philosophy: NO mocks - test real implementations with real data fixtures.
 *
 * @see https://vitest.dev/config/
 */

import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use Bun's native test runner environment
    environment: "node",

    // Include test files matching these patterns
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],

    // Exclude E2E tests (handled by Playwright)
    exclude: ["e2e/**/*", "node_modules/**/*"],

    // Enable source maps for better debugging
    sourcemap: true,

    // Global test timeout (5 seconds)
    testTimeout: 5000,

    // Reporters for detailed output
    reporters: ["verbose"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "node_modules/**",
        ".next/**",
      ],
      // Coverage thresholds (can be tightened as coverage improves)
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },

    // Root directory for test resolution
    root: ".",

    // Watch mode settings
    watch: false,

    // Globals (describe, it, expect) - auto-imported
    globals: true,
  },

  resolve: {
    // Match tsconfig path aliases
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
