import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Auth mock state
let authAuthorized = true;
let authReason = "ok";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({}),
}));

vi.mock("@/lib/auth", () => ({
  checkOrchestrationAuth: () => ({ authorized: authAuthorized, reason: authReason }),
}));

import type { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

describe("POST /api/experiments", () => {
  let testDir: string;

  beforeEach(() => {
    // Reset auth state
    authAuthorized = true;
    authReason = "ok";

    // Create a temp directory for each test
    testDir = join(tmpdir(), `brenner-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  describe("auth", () => {
    it("rejects unauthorized requests", async () => {
      authAuthorized = false;
      authReason = "Lab mode disabled";

      const response = await POST(
        makeRequest({
          threadId: "TEST-1",
          testId: "T1",
          command: ["echo", "hello"],
        })
      );

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "AUTH_ERROR",
        error: "Lab mode disabled",
      });
    });
  });

  describe("validation", () => {
    it("rejects missing threadId", async () => {
      const response = await POST(
        makeRequest({
          testId: "T1",
          command: ["echo", "hello"],
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Missing threadId",
      });
    });

    it("rejects missing testId", async () => {
      const response = await POST(
        makeRequest({
          threadId: "TEST-1",
          command: ["echo", "hello"],
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Missing testId",
      });
    });

    it("rejects missing command", async () => {
      const response = await POST(
        makeRequest({
          threadId: "TEST-1",
          testId: "T1",
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Missing or invalid command (must be non-empty array)",
      });
    });

    it("rejects empty command array", async () => {
      const response = await POST(
        makeRequest({
          threadId: "TEST-1",
          testId: "T1",
          command: [],
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Missing or invalid command (must be non-empty array)",
      });
    });

    it("rejects non-string command elements", async () => {
      const response = await POST(
        makeRequest({
          threadId: "TEST-1",
          testId: "T1",
          command: ["echo", 123],
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Command array must contain only strings",
      });
    });

    it("rejects invalid timeout", async () => {
      const response = await POST(
        makeRequest({
          threadId: "TEST-1",
          testId: "T1",
          command: ["echo", "hello"],
          timeout: 0,
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Invalid timeout: must be 1-3600 seconds",
      });
    });

    it("rejects timeout > 3600", async () => {
      const response = await POST(
        makeRequest({
          threadId: "TEST-1",
          testId: "T1",
          command: ["echo", "hello"],
          timeout: 7200,
        })
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Invalid timeout: must be 1-3600 seconds",
      });
    });
  });

  describe("execution", () => {
    it("runs a simple echo command and captures output", async () => {
      const response = await POST(
        makeRequest({
          projectKey: testDir,
          threadId: "TEST-ECHO",
          testId: "T1",
          command: ["echo", "hello world"],
          timeout: 10,
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.result).toBeDefined();
      expect(json.result.schema_version).toBe("experiment_result_v0.1");
      expect(json.result.thread_id).toBe("TEST-ECHO");
      expect(json.result.test_id).toBe("T1");
      expect(json.result.exit_code).toBe(0);
      expect(json.result.timed_out).toBe(false);
      expect(json.result.stdout).toContain("hello world");
      expect(json.result.duration_ms).toBeGreaterThanOrEqual(0);

      // Verify result file was written
      expect(json.resultFile).toBeDefined();
      expect(existsSync(json.resultFile)).toBe(true);

      // Verify file contents match response
      const fileContents = JSON.parse(readFileSync(json.resultFile, "utf-8"));
      expect(fileContents.result_id).toBe(json.result.result_id);
    });

    it("captures stderr output", async () => {
      const response = await POST(
        makeRequest({
          projectKey: testDir,
          threadId: "TEST-STDERR",
          testId: "T2",
          command: ["bash", "-c", "echo error 1>&2"],
          timeout: 10,
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.result.stderr).toContain("error");
    });

    it("captures non-zero exit code", async () => {
      const response = await POST(
        makeRequest({
          projectKey: testDir,
          threadId: "TEST-EXIT",
          testId: "T3",
          command: ["bash", "-c", "exit 42"],
          timeout: 10,
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.result.exit_code).toBe(42);
    });

    it("includes runtime metadata", async () => {
      const response = await POST(
        makeRequest({
          projectKey: testDir,
          threadId: "TEST-META",
          testId: "T4",
          command: ["echo", "test"],
          timeout: 10,
        })
      );

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.result.runtime).toBeDefined();
      expect(json.result.runtime.platform).toBe(process.platform);
      expect(json.result.runtime.arch).toBe(process.arch);
      expect(json.result.runtime.bun_version).toBeDefined();
    });
  });
});
