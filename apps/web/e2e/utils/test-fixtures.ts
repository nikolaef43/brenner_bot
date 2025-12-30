/**
 * E2E Test Fixtures
 *
 * Extends Playwright's base test with logging and common utilities.
 * Philosophy: Every test should produce detailed, actionable output.
 */

import { test as base, expect, type Page } from "@playwright/test";
import {
  createE2ELogger,
  withStep,
  clearTestContext,
  attachLogsToTest,
} from "./e2e-logging";
import {
  setupNetworkLogging,
  collectPerformanceTiming,
  attachNetworkLogsToTest,
  clearNetworkContext,
} from "./network-logging";

/**
 * Extended test fixtures with logging.
 */
export const test = base.extend<{
  logger: ReturnType<typeof createE2ELogger>;
}>({
  logger: async ({ page }, provideLogger, testInfo) => {
    const logger = createE2ELogger(testInfo.title);
    logger.info(`Test started: ${testInfo.title}`);
    logger.debug("Test file", { file: testInfo.file });

    // Setup network logging for this test
    setupNetworkLogging(page, testInfo.title);
    logger.debug("Network logging enabled");

    // Use the logger
    await provideLogger(logger);

    // Collect performance timing before cleanup
    try {
      await collectPerformanceTiming(page, testInfo.title);
    } catch {
      // Performance timing may fail if page is closed
    }

    // After test: attach logs
    logger.info(`Test finished: ${testInfo.status || "unknown"}`);

    try {
      await attachLogsToTest(testInfo, testInfo.title);
      await attachNetworkLogsToTest(testInfo, testInfo.title);
    } catch {
      // Ignore attachment errors
    }

    // Clean up
    clearTestContext(testInfo.title);
    clearNetworkContext(testInfo.title);
  },
});

export { expect };

/**
 * Helper: Navigate and log the action.
 */
export async function navigateTo(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  path: string,
  options?: { waitUntil?: "load" | "networkidle" | "domcontentloaded" }
): Promise<void> {
  await withStep(logger, page, `Navigate to ${path}`, async () => {
    await page.goto(path, { waitUntil: options?.waitUntil || "networkidle" });
  });
}

/**
 * Helper: Wait for content and log.
 */
export async function waitForContent(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  await withStep(logger, page, `Wait for: ${selector}`, async () => {
    await page.locator(selector).first().waitFor({
      state: "visible",
      timeout: options?.timeout || 10000,
    });
  });
}

/**
 * Helper: Click and log.
 */
export async function clickElement(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string | ReturnType<Page["locator"]>,
  description?: string
): Promise<void> {
  const locator = typeof selector === "string" ? page.locator(selector) : selector;
  const desc = description || (typeof selector === "string" ? selector : "element");

  await withStep(logger, page, `Click: ${desc}`, async () => {
    await locator.click();
  });
}

/**
 * Helper: Fill input and log.
 */
export async function fillInput(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string,
  value: string,
  description?: string
): Promise<void> {
  const desc = description || selector;

  await withStep(logger, page, `Fill: ${desc}`, async () => {
    await page.locator(selector).fill(value);
  });
}

/**
 * Helper: Take a screenshot and log.
 */
export async function takeScreenshot(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  name: string,
  options?: { fullPage?: boolean }
): Promise<void> {
  await withStep(logger, page, `Screenshot: ${name}`, async () => {
    await page.screenshot({
      path: `./screenshots/${name}.png`,
      fullPage: options?.fullPage ?? true,
    });
  });
}

/**
 * Helper: Assert text content and log.
 */
export async function assertTextContent(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string,
  expectedText: string | RegExp,
  description?: string
): Promise<void> {
  const desc = description || `${selector} contains "${expectedText}"`;

  await withStep(logger, page, `Assert: ${desc}`, async () => {
    const locator = page.locator(selector);
    if (typeof expectedText === "string") {
      await expect(locator).toContainText(expectedText);
    } else {
      await expect(locator).toContainText(expectedText);
    }
  });
}

/**
 * Helper: Assert element count and log.
 */
export async function assertElementCount(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string,
  expectedCount: number | { min?: number; max?: number },
  description?: string
): Promise<void> {
  const desc = description || `${selector} count matches`;

  await withStep(logger, page, `Assert count: ${desc}`, async () => {
    const locator = page.locator(selector);
    const count = await locator.count();

    if (typeof expectedCount === "number") {
      expect(count).toBe(expectedCount);
    } else {
      if (expectedCount.min !== undefined) {
        expect(count).toBeGreaterThanOrEqual(expectedCount.min);
      }
      if (expectedCount.max !== undefined) {
        expect(count).toBeLessThanOrEqual(expectedCount.max);
      }
    }

    logger.debug(`Element count`, { selector, count, expected: expectedCount });
  });
}

/**
 * Helper: Assert URL and log.
 */
export async function assertUrl(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  expectedPath: string | RegExp
): Promise<void> {
  await withStep(logger, page, `Assert URL: ${expectedPath}`, async () => {
    if (typeof expectedPath === "string") {
      await expect(page).toHaveURL(new RegExp(expectedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } else {
      await expect(page).toHaveURL(expectedPath);
    }
  });
}

/**
 * Helper: Wait for network idle.
 */
export async function waitForNetworkIdle(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  timeout?: number
): Promise<void> {
  await withStep(logger, page, "Wait for network idle", async () => {
    await page.waitForLoadState("networkidle", { timeout: timeout || 30000 });
  });
}

/**
 * Helper: Check page has minimum content (not blank).
 */
export async function assertPageHasContent(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  minLength: number = 100
): Promise<void> {
  await withStep(logger, page, `Assert page has content (min ${minLength} chars)`, async () => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(minLength);
    logger.debug("Page content length", { length: bodyText?.length });
  });
}
