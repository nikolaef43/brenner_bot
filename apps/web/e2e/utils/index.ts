/**
 * E2E Test Utilities
 *
 * Re-exports all utilities for easy importing.
 */

// Enhanced test fixtures with logging
export { test, expect } from "./test-fixtures";

// Navigation and interaction helpers
export {
  navigateTo,
  waitForContent,
  clickElement,
  fillInput,
  takeScreenshot,
  assertTextContent,
  assertElementCount,
  assertUrl,
  waitForNetworkIdle,
  assertPageHasContent,
} from "./test-fixtures";

// Logging utilities
export {
  createE2ELogger,
  withStep,
  log,
  getTestLogs,
  formatLogsAsJson,
  formatLogsAsText,
  type E2ELogLevel,
  type E2ELogEntry,
} from "./e2e-logging";
