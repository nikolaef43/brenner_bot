/**
 * E2E Tests: Accessibility (axe-core)
 *
 * Runs lightweight axe scans against public pages by default.
 * These tests are intended to be safe to run against production (default BASE_URL).
 *
 * Policy:
 * - Fail CI on *critical* violations.
 * - Log/attach full results for triage.
 */

import { test, expect, waitForNetworkIdle } from "./utils";
import { withStep } from "./utils/e2e-logging";
import { checkAccessibility, filterViolationsByImpact, formatViolations } from "./utils/a11y-testing";

type PageSpec = { path: string; name: string };

const PUBLIC_PAGES: PageSpec[] = [
  { path: "/", name: "Home" },
  { path: "/corpus", name: "Corpus" },
  { path: "/distillations", name: "Distillations" },
  { path: "/method", name: "Method" },
  { path: "/glossary", name: "Glossary" },
];

const SPOTLIGHT_SHORTCUT = process.platform === "darwin" ? "Meta+k" : "Control+k";

test.describe("Accessibility (axe-core)", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} has no critical accessibility violations`, async ({ page, logger }, testInfo) => {
      let status = 0;

      await withStep(logger, page, `Navigate to ${path}`, async () => {
        const res = await page.goto(path);
        status = res?.status() ?? 0;
        await waitForNetworkIdle(page, logger);
      });

      // Production hides lab routes; some environments might also hide specific pages.
      if (status === 404) test.skip(true, `${path} returned 404 in this environment`);

      const results = await checkAccessibility(page, testInfo);
      const critical = filterViolationsByImpact(results, ["critical"]);

      if (critical.length > 0) {
        logger.error("Critical accessibility violations detected", {
          path,
          count: critical.length,
          details: formatViolations(critical),
        });
      } else {
        logger.info("No critical accessibility violations", {
          path,
          seriousCount: filterViolationsByImpact(results, ["serious"]).length,
          totalViolations: results.violations.length,
        });
      }

      expect(critical).toHaveLength(0);
    });
  }

  test("Spotlight search dialog has no critical violations", async ({ page, logger }, testInfo) => {
    await withStep(logger, page, "Navigate to /corpus", async () => {
      const res = await page.goto("/corpus");
      const status = res?.status() ?? 0;
      await waitForNetworkIdle(page, logger);
      if (status === 404) test.skip(true, "/corpus returned 404 in this environment");
    });

    await withStep(logger, page, "Open spotlight search", async () => {
      await page.keyboard.press(SPOTLIGHT_SHORTCUT);
      await expect(page.locator('[role="dialog"][aria-label="Search"]')).toBeVisible({ timeout: 5000 });
    });

    const results = await checkAccessibility(page, testInfo, {
      include: ['[role="dialog"][aria-label="Search"]'],
    });
    const critical = filterViolationsByImpact(results, ["critical"]);

    if (critical.length > 0) {
      logger.error("Critical accessibility violations detected in spotlight search", {
        count: critical.length,
        details: formatViolations(critical),
      });
    }

    expect(critical).toHaveLength(0);
  });
});

