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
  // Avoid writing cache files into `node_modules/.vite` (some cache files are tracked in this repo).
  cacheDir: "./.vitest-cache",
  test: {
    // Use happy-dom for React component testing (faster than jsdom)
    // Node environment is auto-selected for non-tsx files
    environment: "happy-dom",

    // Include test files matching these patterns
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],

    // Exclude E2E tests (handled by Playwright)
    exclude: ["e2e/**/*", "node_modules/**/*"],

    // Global test timeout (5 seconds)
    testTimeout: 5000,

    // Reporters for detailed output
    reporters: ["verbose"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html", "json"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/__fixtures__/**",
        "src/types/**",
        "**/*.d.ts",
        "src/lib/operators.local.ts",
        "node_modules/**",
        ".next/**",
      ],
      // Coverage thresholds (tighten with intent; prefer tests over excludes)
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        perFile: true,
        "src/lib/artifact-merge.ts": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        "src/lib/delta-parser.ts": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
      },
    },

    // Root directory for test resolution
    root: ".",

    // Watch mode settings
    watch: false,

    // Globals (describe, it, expect) - auto-imported
    globals: true,

    // Setup files for extending expect and test utilities
    setupFiles: ["./src/test-setup.tsx"],
  },

  resolve: {
    // Match tsconfig path aliases
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
