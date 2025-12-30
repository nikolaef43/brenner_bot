/**
 * Unit tests for brenner.ts CLI
 *
 * Tests argument parsing, command routing, and error handling.
 * Philosophy: NO mocks - test real CLI behavior via subprocess.
 *
 * Run with: bun test brenner.test.ts
 */

import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

// ============================================================================
// Test Helpers
// ============================================================================

const CLI_PATH = resolve(__dirname, "brenner.ts");

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Run the brenner CLI with given arguments and return output.
 */
async function runCli(args: string[], timeout = 5000): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", ["run", CLI_PATH, ...args], {
      timeout,
      env: {
        ...process.env,
        // Disable Agent Mail for most tests
        AGENT_MAIL_BASE_URL: "http://127.0.0.1:59999", // Non-existent port
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

// ============================================================================
// Tests: Help and Usage
// ============================================================================

describe("help and usage", () => {
  it("shows usage with --help flag", async () => {
    const result = await runCli(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("Commands:");
    expect(result.stdout).toContain("mail");
    expect(result.stdout).toContain("prompt");
    expect(result.stdout).toContain("session");
  });

  it("shows usage with help command", async () => {
    const result = await runCli(["help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("shows usage with -h flag", async () => {
    const result = await runCli(["-h"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("shows usage with no arguments", async () => {
    const result = await runCli([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("usage includes all main commands", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("version");
    expect(result.stdout).toContain("mail health");
    expect(result.stdout).toContain("mail tools");
    expect(result.stdout).toContain("mail send");
    expect(result.stdout).toContain("mail inbox");
    expect(result.stdout).toContain("mail read");
    expect(result.stdout).toContain("mail ack");
    expect(result.stdout).toContain("mail thread");
    expect(result.stdout).toContain("prompt compose");
    expect(result.stdout).toContain("session start");
    expect(result.stdout).toContain("session status");
  });

  it("usage includes environment variable documentation", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("AGENT_MAIL_BASE_URL");
    expect(result.stdout).toContain("AGENT_MAIL_PATH");
    expect(result.stdout).toContain("AGENT_MAIL_BEARER_TOKEN");
  });

  it("usage includes aliases", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toContain("Aliases:");
    expect(result.stdout).toContain("orchestrate start");
  });
});

// ============================================================================
// Tests: Version Output
// ============================================================================

describe("version output", () => {
  it("supports --version flag", async () => {
    const result = await runCli(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("brenner");
    expect(result.stdout).toContain("git:");
    expect(result.stdout).toContain("built:");
    expect(result.stdout).toContain("target:");
  });

  it("supports version command", async () => {
    const result = await runCli(["version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("brenner");
  });
});

// ============================================================================
// Tests: Unknown Commands
// ============================================================================

describe("unknown commands", () => {
  it("rejects unknown top-level command", async () => {
    const result = await runCli(["foobar"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  it("rejects unknown mail subcommand", async () => {
    const result = await runCli(["mail", "foobar"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown mail command");
  });

  it("rejects prompt without subcommand", async () => {
    const result = await runCli(["prompt"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });

  it("rejects session without subcommand", async () => {
    const result = await runCli(["session"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unknown command");
  });
});

// ============================================================================
// Tests: mail send Command Validation
// ============================================================================

describe("mail send validation", () => {
  it("requires --sender flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--to",
      "Agent",
      "--subject",
      "Test",
      "--body-file",
      "test.md",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--sender");
  });

  it("requires --to flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--sender",
      "TestAgent",
      "--subject",
      "Test",
      "--body-file",
      "test.md",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--to");
  });

  it("requires --subject flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--sender",
      "TestAgent",
      "--to",
      "Agent",
      "--body-file",
      "test.md",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--subject");
  });

  it("requires --body-file flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--sender",
      "TestAgent",
      "--to",
      "Agent",
      "--subject",
      "Test",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--body-file");
  });
});

// ============================================================================
// Tests: mail inbox Command Validation
// ============================================================================

describe("mail inbox validation", () => {
  it("requires --agent flag", async () => {
    const result = await runCli(["mail", "inbox"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--agent");
  });
});

// ============================================================================
// Tests: mail read Command Validation
// ============================================================================

describe("mail read validation", () => {
  it("requires --agent flag", async () => {
    const result = await runCli(["mail", "read", "--message-id", "123"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--agent");
  });

  it("requires --message-id flag", async () => {
    const result = await runCli(["mail", "read", "--agent", "TestAgent"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--message-id");
  });
});

// ============================================================================
// Tests: mail ack Command Validation
// ============================================================================

describe("mail ack validation", () => {
  it("requires --agent flag", async () => {
    const result = await runCli(["mail", "ack", "--message-id", "123"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--agent");
  });

  it("requires --message-id flag", async () => {
    const result = await runCli(["mail", "ack", "--agent", "TestAgent"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--message-id");
  });
});

// ============================================================================
// Tests: mail thread Command Validation
// ============================================================================

describe("mail thread validation", () => {
  it("requires --thread-id flag", async () => {
    const result = await runCli(["mail", "thread"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });
});

// ============================================================================
// Tests: prompt compose Command Validation
// ============================================================================

describe("prompt compose validation", () => {
  it("requires --excerpt-file flag", async () => {
    const result = await runCli(["prompt", "compose"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--excerpt-file");
  });

  it("fails on non-existent excerpt file", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "/nonexistent/file.md",
    ]);
    expect(result.exitCode).toBe(1);
    // Error message will vary by platform
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it("fails on non-existent template file", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--template",
      "/nonexistent/template.md",
      "--excerpt-file",
      "README.md",
    ]);
    expect(result.exitCode).toBe(1);
  });
});

// ============================================================================
// Tests: session start Command Validation
// ============================================================================

describe("session start validation", () => {
  it("requires --sender flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--to",
      "Agent",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--sender");
  });

  it("requires --to flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--to");
  });

  it("requires --thread-id flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "Agent",
      "--excerpt-file",
      "README.md",
      "--question",
      "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });

  it("requires --excerpt-file flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "Agent",
      "--thread-id",
      "TEST-1",
      "--question",
      "Test?",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--excerpt-file");
  });

  it("requires --question flag", async () => {
    const result = await runCli([
      "session",
      "start",
      "--sender",
      "Test",
      "--to",
      "Agent",
      "--thread-id",
      "TEST-1",
      "--excerpt-file",
      "README.md",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--question");
  });
});

// ============================================================================
// Tests: session status Command Validation
// ============================================================================

describe("session status validation", () => {
  it("requires --thread-id flag", async () => {
    const result = await runCli(["session", "status"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--thread-id");
  });

  it("rejects non-integer --timeout value", async () => {
    const result = await runCli([
      "session",
      "status",
      "--thread-id",
      "TEST-1",
      "--timeout",
      "abc",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("expected integer");
  });

  it("accepts valid --timeout value and fails on Agent Mail connect", async () => {
    const result = await runCli([
      "session",
      "status",
      "--thread-id",
      "TEST-1",
      "--timeout",
      "60",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: orchestrate Alias
// ============================================================================

describe("orchestrate alias", () => {
  it("orchestrate start works like session start", async () => {
    // Both should fail with same missing arg error
    const orchestrateResult = await runCli(["orchestrate", "start"]);
    const sessionResult = await runCli(["session", "start"]);

    expect(orchestrateResult.exitCode).toBe(sessionResult.exitCode);
    // Both require --sender
    expect(orchestrateResult.stderr).toContain("--sender");
  });
});

// ============================================================================
// Tests: Flag Parsing Edge Cases
// ============================================================================

describe("flag parsing edge cases", () => {
  it("handles flag with equals sign format", async () => {
    // --help=true should still show help
    const result = await runCli(["--help=true"]);
    // This will be interpreted as a string value, but help check uses asBoolFlag
    // The CLI actually checks `asBoolFlag(flags, "help")` which returns true only for boolean true
    // So --help=true will NOT trigger help. Let's verify the behavior.
    // Actually, looking at the code: if (!top || asBoolFlag(flags, "help")...)
    // Since top is undefined here (no positional), it still shows help
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
  });

  it("handles multiple flags", async () => {
    const result = await runCli([
      "mail",
      "inbox",
      "--agent",
      "TestAgent",
      "--limit",
      "5",
      "--urgent-only",
      "--include-bodies",
    ]);
    // Will fail because Agent Mail is not available, but should not fail on parsing
    expect(result.exitCode).toBe(1);
    // Should not complain about missing flags
    expect(result.stderr).not.toContain("Missing --agent");
    expect(result.stderr).not.toContain("Missing --limit");
  });

  it("handles comma-separated values in --to flag", async () => {
    const result = await runCli([
      "mail",
      "send",
      "--sender",
      "Test",
      "--to",
      "Agent1,Agent2,Agent3",
      "--subject",
      "Test",
      "--body-file",
      "README.md",
    ]);
    // Will fail on Agent Mail connect, not on parsing
    expect(result.exitCode).toBe(1);
    expect(result.stderr).not.toContain("Missing --to");
  });
});

// ============================================================================
// Tests: prompt compose (with real files)
// ============================================================================

describe("prompt compose with real files", () => {
  it("composes prompt with default template and README as excerpt", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
    ]);
    // Uses default template: metaprompt_by_gpt_52.md
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## TRANSCRIPT EXCERPT(S)");
  });

  it("includes optional theme in composed prompt", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
      "--theme",
      "scientific method",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## FOCUS THEME");
    expect(result.stdout).toContain("scientific method");
  });

  it("includes optional domain in composed prompt", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
      "--domain",
      "molecular biology",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## TARGET RESEARCH DOMAIN");
    expect(result.stdout).toContain("molecular biology");
  });

  it("includes optional question in composed prompt", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
      "--question",
      "How does X work?",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## CURRENT RESEARCH QUESTION");
    expect(result.stdout).toContain("How does X work?");
  });

  it("composes prompt with all optional parameters", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
      "--theme",
      "hypothesis testing",
      "--domain",
      "immunology",
      "--question",
      "What causes autoimmune diseases?",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## FOCUS THEME");
    expect(result.stdout).toContain("hypothesis testing");
    expect(result.stdout).toContain("## TARGET RESEARCH DOMAIN");
    expect(result.stdout).toContain("immunology");
    expect(result.stdout).toContain("## CURRENT RESEARCH QUESTION");
    expect(result.stdout).toContain("What causes autoimmune diseases?");
  });
});

// ============================================================================
// Tests: Error Message Formatting
// ============================================================================

describe("error message formatting", () => {
  it("error messages go to stderr", async () => {
    const result = await runCli(["foobar"]);
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stdout).toBe("");
  });

  it("error messages are concise", async () => {
    const result = await runCli(["mail", "send"]);
    // Error should be a single line, not a full stack trace
    const lines = result.stderr.trim().split("\n");
    expect(lines.length).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// Tests: Mail Command Output Formatting
// ============================================================================

describe("mail command output formatting", () => {
  it("mail health produces JSON output on connection failure", async () => {
    const result = await runCli(["mail", "health"]);
    // Will fail to connect but should still produce output
    expect(result.exitCode).toBe(1);
    // Output should indicate connection issue
    expect(result.stderr.length + result.stdout.length).toBeGreaterThan(0);
  });

  it("mail tools fails gracefully when server unavailable", async () => {
    const result = await runCli(["mail", "tools"]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("connect");
  });

  it("mail agents fails gracefully when server unavailable", async () => {
    const result = await runCli([
      "mail",
      "agents",
      "--project-key",
      "/tmp/test",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: Mail Command with AGENT_NAME Environment Variable
// ============================================================================

/**
 * Run CLI with custom environment variables.
 */
async function runCliWithEnv(
  args: string[],
  env: Record<string, string>,
  timeout = 5000
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", ["run", CLI_PATH, ...args], {
      timeout,
      env: {
        ...process.env,
        AGENT_MAIL_BASE_URL: "http://127.0.0.1:59999",
        ...env,
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

describe("AGENT_NAME environment variable", () => {
  it("mail inbox uses AGENT_NAME if --agent not provided", async () => {
    const result = await runCliWithEnv(["mail", "inbox"], {
      AGENT_NAME: "EnvAgent",
    });
    // Should not complain about missing --agent
    expect(result.stderr).not.toContain("Missing --agent");
    // Will fail on connection, not on missing arg
    expect(result.stderr).toContain("connect");
  });

  it("mail read uses AGENT_NAME if --agent not provided", async () => {
    const result = await runCliWithEnv(
      ["mail", "read", "--message-id", "123"],
      { AGENT_NAME: "EnvAgent" }
    );
    expect(result.stderr).not.toContain("Missing --agent");
    expect(result.stderr).toContain("connect");
  });

  it("mail ack uses AGENT_NAME if --agent not provided", async () => {
    const result = await runCliWithEnv(["mail", "ack", "--message-id", "123"], {
      AGENT_NAME: "EnvAgent",
    });
    expect(result.stderr).not.toContain("Missing --agent");
    expect(result.stderr).toContain("connect");
  });

  it("mail send uses AGENT_NAME if --sender not provided", async () => {
    const result = await runCliWithEnv(
      [
        "mail",
        "send",
        "--to",
        "Agent",
        "--subject",
        "Test",
        "--body-file",
        "README.md",
      ],
      { AGENT_NAME: "EnvAgent" }
    );
    expect(result.stderr).not.toContain("Missing --sender");
    // Will fail on connection
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: Default Values
// ============================================================================

describe("default values", () => {
  it("mail inbox uses default limit of 20", async () => {
    const result = await runCliWithEnv(["mail", "inbox"], {
      AGENT_NAME: "TestAgent",
    });
    // Can't directly verify limit, but should not error on missing limit
    expect(result.stderr).not.toContain("limit");
  });

  it("session start uses cwd as default project-key", async () => {
    const result = await runCliWithEnv(
      [
        "session",
        "start",
        "--to",
        "Agent",
        "--thread-id",
        "TEST-1",
        "--excerpt-file",
        "README.md",
        "--question",
        "Test?",
      ],
      { AGENT_NAME: "TestAgent" }
    );
    // Should not complain about missing --project-key
    expect(result.stderr).not.toContain("project-key");
    // Will fail on connection
    expect(result.stderr).toContain("connect");
  });

  it("prompt compose uses default template path", async () => {
    const result = await runCli([
      "prompt",
      "compose",
      "--excerpt-file",
      "README.md",
    ]);
    // Should succeed using default template
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Tests: Integer Flag Validation
// ============================================================================

describe("integer flag validation", () => {
  it("rejects non-integer --limit value", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--limit", "abc"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("expected integer");
  });

  it("rejects non-integer --message-id value", async () => {
    const result = await runCliWithEnv(
      ["mail", "read", "--message-id", "abc"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("expected integer");
  });

  it("accepts valid integer --limit value", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--limit", "50"],
      { AGENT_NAME: "TestAgent" }
    );
    // Should not complain about limit format
    expect(result.stderr).not.toContain("expected integer");
    // Will fail on connection
    expect(result.stderr).toContain("connect");
  });
});

// ============================================================================
// Tests: Boolean Flags
// ============================================================================

describe("boolean flags", () => {
  it("--urgent-only is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--urgent-only"],
      { AGENT_NAME: "TestAgent" }
    );
    // Should not error on flag parsing
    expect(result.stderr).not.toContain("urgent-only");
    expect(result.stderr).toContain("connect");
  });

  it("--include-bodies is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--include-bodies"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("include-bodies");
    expect(result.stderr).toContain("connect");
  });

  it("--ack-required is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      [
        "mail",
        "send",
        "--to",
        "Agent",
        "--subject",
        "Test",
        "--body-file",
        "README.md",
        "--ack-required",
      ],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("ack-required");
    expect(result.stderr).toContain("connect");
  });

  it("--threads is recognized as boolean", async () => {
    const result = await runCliWithEnv(
      ["mail", "inbox", "--threads"],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("threads");
    expect(result.stderr).toContain("connect");
  });

  it("--unified is recognized as boolean for session start", async () => {
    const result = await runCliWithEnv(
      [
        "session",
        "start",
        "--to",
        "Agent",
        "--thread-id",
        "TEST-1",
        "--excerpt-file",
        "README.md",
        "--question",
        "Test?",
        "--unified",
      ],
      { AGENT_NAME: "TestAgent" }
    );
    expect(result.stderr).not.toContain("unified");
    expect(result.stderr).toContain("connect");
  });
});
