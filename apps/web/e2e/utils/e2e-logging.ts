/**
 * E2E Test Logging Utilities for Playwright
 *
 * Provides detailed, structured logging for E2E test debugging.
 * Philosophy: Make failures easy to diagnose with step-by-step output.
 */

import type { Page, TestInfo } from "@playwright/test";

export type E2ELogLevel = "debug" | "info" | "step" | "warn" | "error";

export interface E2ELogEntry {
  timestamp: string;
  level: E2ELogLevel;
  testTitle: string;
  step: number;
  message: string;
  url?: string;
  duration?: number;
  data?: unknown;
}

export interface E2ETestContext {
  testTitle: string;
  stepCounter: number;
  startTime: number;
  logs: E2ELogEntry[];
}

const testContexts = new Map<string, E2ETestContext>();

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Create a logging context for a test.
 */
export function createTestContext(testTitle: string): E2ETestContext {
  const context: E2ETestContext = {
    testTitle,
    stepCounter: 0,
    startTime: Date.now(),
    logs: [],
  };
  testContexts.set(testTitle, context);
  return context;
}

/**
 * Get or create a test context.
 */
export function getTestContext(testTitle: string): E2ETestContext {
  let context = testContexts.get(testTitle);
  if (!context) {
    context = createTestContext(testTitle);
  }
  return context;
}

/**
 * Clear a test context.
 */
export function clearTestContext(testTitle: string): void {
  testContexts.delete(testTitle);
}

/**
 * Log a message to the test context.
 */
export function log(
  testTitle: string,
  level: E2ELogLevel,
  message: string,
  options?: { url?: string; duration?: number; data?: unknown }
): void {
  const context = getTestContext(testTitle);
  const entry: E2ELogEntry = {
    timestamp: getTimestamp(),
    level,
    testTitle,
    step: level === "step" ? ++context.stepCounter : context.stepCounter,
    message,
    ...options,
  };
  context.logs.push(entry);

  // Console output with colors and formatting
  const prefix = `[${entry.timestamp.slice(11, 19)}]`;
  const levelStr = level.toUpperCase().padEnd(5);
  const stepStr = level === "step" ? ` [Step ${entry.step}]` : "";
  const urlStr = entry.url ? ` (${entry.url})` : "";
  const durationStr = entry.duration ? ` [${formatDuration(entry.duration)}]` : "";

  const formatted = `${prefix} ${levelStr}${stepStr} ${message}${urlStr}${durationStr}`;

  switch (level) {
    case "error":
      console.error(`\x1b[31m${formatted}\x1b[0m`);
      break;
    case "warn":
      console.warn(`\x1b[33m${formatted}\x1b[0m`);
      break;
    case "step":
      console.log(`\x1b[36m${formatted}\x1b[0m`);
      break;
    case "info":
      console.log(`\x1b[32m${formatted}\x1b[0m`);
      break;
    case "debug":
      console.log(`\x1b[90m${formatted}\x1b[0m`);
      break;
  }

  if (options?.data) {
    console.log(`\x1b[90m  Data: ${JSON.stringify(options.data, null, 2)}\x1b[0m`);
  }
}

/**
 * Get all logs for a test.
 */
export function getTestLogs(testTitle: string): E2ELogEntry[] {
  return getTestContext(testTitle).logs;
}

/**
 * Format logs as JSON for structured output.
 */
export function formatLogsAsJson(testTitle: string): string {
  const context = getTestContext(testTitle);
  return JSON.stringify(
    {
      test: testTitle,
      totalDuration: Date.now() - context.startTime,
      stepCount: context.stepCounter,
      logs: context.logs,
    },
    null,
    2
  );
}

/**
 * Format logs as human-readable text.
 */
export function formatLogsAsText(testTitle: string): string {
  const context = getTestContext(testTitle);
  const duration = formatDuration(Date.now() - context.startTime);

  const header = `\n${"=".repeat(60)}\nTest: ${testTitle}\nDuration: ${duration}\nSteps: ${context.stepCounter}\n${"=".repeat(60)}\n`;

  const logLines = context.logs.map((entry) => {
    const stepStr = entry.level === "step" ? `[Step ${entry.step}] ` : "";
    const urlStr = entry.url ? ` (${entry.url})` : "";
    const durationStr = entry.duration ? ` [${formatDuration(entry.duration)}]` : "";
    return `${entry.timestamp.slice(11, 23)} ${entry.level.toUpperCase().padEnd(5)} ${stepStr}${entry.message}${urlStr}${durationStr}`;
  });

  return header + logLines.join("\n");
}

/**
 * Create a logger bound to a test.
 */
export function createE2ELogger(testTitle: string) {
  return {
    debug: (message: string, data?: unknown) => log(testTitle, "debug", message, { data }),
    info: (message: string, data?: unknown) => log(testTitle, "info", message, { data }),
    step: (message: string, options?: { url?: string; duration?: number; data?: unknown }) =>
      log(testTitle, "step", message, options),
    warn: (message: string, data?: unknown) => log(testTitle, "warn", message, { data }),
    error: (message: string, data?: unknown) => log(testTitle, "error", message, { data }),
    getContext: () => getTestContext(testTitle),
    formatAsJson: () => formatLogsAsJson(testTitle),
    formatAsText: () => formatLogsAsText(testTitle),
  };
}

/**
 * Helper to wrap a page action with step logging.
 */
export async function withStep<T>(
  logger: ReturnType<typeof createE2ELogger>,
  page: Page,
  description: string,
  action: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  logger.step(`Starting: ${description}`, { url: page.url() });

  try {
    const result = await action();
    logger.step(`Completed: ${description}`, {
      url: page.url(),
      duration: Date.now() - startTime,
    });
    return result;
  } catch (error) {
    logger.error(`Failed: ${description}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Attach logs to Playwright test info for reporting.
 */
export async function attachLogsToTest(
  testInfo: TestInfo,
  testTitle: string
): Promise<void> {
  const jsonLogs = formatLogsAsJson(testTitle);
  const textLogs = formatLogsAsText(testTitle);

  await testInfo.attach("test-logs.json", {
    body: jsonLogs,
    contentType: "application/json",
  });

  await testInfo.attach("test-logs.txt", {
    body: textLogs,
    contentType: "text/plain",
  });
}
