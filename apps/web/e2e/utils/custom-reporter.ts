/**
 * Custom Playwright Reporter
 *
 * Provides detailed, structured output for E2E test runs.
 * Philosophy: Make test failures easy to diagnose.
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  FullConfig,
  Suite,
  FullResult,
} from "@playwright/test/reporter";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

interface TestSummary {
  title: string;
  file: string;
  status: "passed" | "failed" | "skipped" | "timedOut" | "interrupted";
  duration: number;
  retries: number;
  errors: string[];
  steps: string[];
}

interface RunSummary {
  startedAt: string;
  finishedAt: string;
  duration: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  tests: TestSummary[];
}

export default class BrennerBotReporter implements Reporter {
  private summary: RunSummary = {
    startedAt: "",
    finishedAt: "",
    duration: 0,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    timedOut: 0,
    tests: [],
  };
  private outputDir: string = "./test-results";

  onBegin(config: FullConfig, suite: Suite): void {
    this.summary.startedAt = new Date().toISOString();
    this.outputDir = config.projects[0]?.outputDir || "./test-results";

    const testCount = this.countTests(suite);
    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║           BRENNER BOT E2E TEST SUITE                     ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  Tests to run: ${String(testCount).padEnd(42)}║`);
    console.log(`║  Started at: ${this.summary.startedAt.slice(0, 19).padEnd(44)}║`);
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("\n");
  }

  onTestBegin(test: TestCase): void {
    const titlePath = test.titlePath().join(" → ");
    console.log(`\x1b[36m▶ Starting:\x1b[0m ${titlePath}`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const titlePath = test.titlePath().join(" → ");
    const duration = result.duration;
    const durationStr = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;

    // Status icon and color
    let statusIcon: string;
    let statusColor: string;
    switch (result.status) {
      case "passed":
        statusIcon = "✓";
        statusColor = "\x1b[32m"; // green
        this.summary.passed++;
        break;
      case "failed":
        statusIcon = "✗";
        statusColor = "\x1b[31m"; // red
        this.summary.failed++;
        break;
      case "skipped":
        statusIcon = "⊘";
        statusColor = "\x1b[33m"; // yellow
        this.summary.skipped++;
        break;
      case "timedOut":
        statusIcon = "⏱";
        statusColor = "\x1b[33m"; // yellow
        this.summary.timedOut++;
        break;
      case "interrupted":
        statusIcon = "⚡";
        statusColor = "\x1b[35m"; // magenta
        this.summary.failed++; // Count interrupted as failed
        break;
      default:
        statusIcon = "?";
        statusColor = "\x1b[90m"; // gray
    }

    console.log(`${statusColor}${statusIcon} ${result.status.toUpperCase()}\x1b[0m ${titlePath} \x1b[90m(${durationStr})\x1b[0m`);

    // Log errors with details
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`\x1b[31m  Error: ${error.message?.split("\n")[0] || "Unknown error"}\x1b[0m`);
        if (error.stack) {
          const relevantStack = error.stack
            .split("\n")
            .slice(0, 3)
            .map((line) => `    ${line}`)
            .join("\n");
          console.log(`\x1b[90m${relevantStack}\x1b[0m`);
        }
      }
    }

    // Log attachments (screenshots, traces)
    for (const attachment of result.attachments) {
      if (attachment.path) {
        console.log(`\x1b[90m  📎 ${attachment.name}: ${attachment.path}\x1b[0m`);
      }
    }

    // Extract step names from result
    const steps = result.steps.map((step) => step.title);

    // Add to summary
    const testSummary: TestSummary = {
      title: test.title,
      file: test.location.file,
      status: result.status,
      duration: result.duration,
      retries: result.retry,
      errors: result.errors.map((e) => e.message || "Unknown error"),
      steps,
    };
    this.summary.tests.push(testSummary);
    this.summary.total++;
  }

  onEnd(result: FullResult): void {
    this.summary.finishedAt = new Date().toISOString();
    this.summary.duration = result.duration;

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║                    TEST RESULTS SUMMARY                  ║");
    console.log("╠══════════════════════════════════════════════════════════╣");

    const passedStr = `\x1b[32m${this.summary.passed} passed\x1b[0m`;
    const failedStr = this.summary.failed > 0 ? `\x1b[31m${this.summary.failed} failed\x1b[0m` : "0 failed";
    const skippedStr = this.summary.skipped > 0 ? `\x1b[33m${this.summary.skipped} skipped\x1b[0m` : "";
    const timedOutStr = this.summary.timedOut > 0 ? `\x1b[33m${this.summary.timedOut} timed out\x1b[0m` : "";

    console.log(`║  Total: ${this.summary.total} tests`.padEnd(62) + "║");
    console.log(`║  ${passedStr} | ${failedStr}${skippedStr ? ` | ${skippedStr}` : ""}${timedOutStr ? ` | ${timedOutStr}` : ""}`.padEnd(70) + "");

    const durationStr = this.summary.duration < 1000
      ? `${this.summary.duration}ms`
      : `${(this.summary.duration / 1000).toFixed(2)}s`;
    console.log(`║  Duration: ${durationStr}`.padEnd(62) + "║");

    // Overall status
    const overallStatus = result.status === "passed" ? "\x1b[32m✓ PASSED\x1b[0m" : "\x1b[31m✗ FAILED\x1b[0m";
    console.log(`║  Status: ${overallStatus}`.padEnd(70) + "");
    console.log("╚══════════════════════════════════════════════════════════╝");

    // List failed tests
    if (this.summary.failed > 0) {
      console.log("\n\x1b[31mFailed Tests:\x1b[0m");
      for (const test of this.summary.tests) {
        if (test.status === "failed") {
          console.log(`  • ${test.title}`);
          for (const error of test.errors) {
            console.log(`    \x1b[31m${error}\x1b[0m`);
          }
        }
      }
    }

    // Write summary JSON
    this.writeSummaryFile();

    console.log("\n");
  }

  private countTests(suite: Suite): number {
    let count = 0;
    for (const test of suite.tests) {
      count++;
    }
    for (const child of suite.suites) {
      count += this.countTests(child);
    }
    return count;
  }

  private writeSummaryFile(): void {
    try {
      if (!existsSync(this.outputDir)) {
        mkdirSync(this.outputDir, { recursive: true });
      }

      const summaryPath = join(this.outputDir, "test-summary.json");
      writeFileSync(summaryPath, JSON.stringify(this.summary, null, 2));
      console.log(`\x1b[90m📄 Summary written to: ${summaryPath}\x1b[0m`);
    } catch (error) {
      console.error(`Failed to write summary: ${error}`);
    }
  }
}
