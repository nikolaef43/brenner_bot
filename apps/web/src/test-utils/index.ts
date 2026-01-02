/**
 * Test Utilities
 *
 * Shared utilities for unit and E2E testing.
 * Philosophy: NO mocks - test real behavior with real fixtures.
 */

// Logging utilities
export {
  createTestLogger,
  getLogBuffer,
  getLogBufferByCategory,
  clearLogBuffer,
  formatLogBuffer,
  formatLogBufferAsJson,
  getLogSummary,
  setupTestLogging,
  createLoggingFetch,
  withStep,
  LogCategories,
  type LogLevel,
  type LogCategory,
  type LogEntry,
  type LogOptions,
} from "./logging";

// Fixtures
export {
  loadFixtureFile,
  loadJsonFixture,
  getTranscriptPath,
  loadTranscriptSection,
  SAMPLE_EXCERPT,
  SAMPLE_DELTA_MESSAGE,
  MALFORMED_DELTA_MESSAGE,
  SAMPLE_ARTIFACT_FIXTURE,
} from "./fixtures";

// Assertions
export {
  assertValidDelta,
  assertInvalidDelta,
  assertDeltaOperation,
  assertDeltaSection,
  assertDeltaPayload,
  assertLength,
  assertContains,
  assertDefined,
  assertDeepEqual,
  assertValidAnchor,
  assertValidAnchors,
  assertValidHypothesis,
  assertValidTest,
  assertValidScore,
} from "./assertions";

// Request helpers for API route testing
export {
  createMockRequest,
  createAuthenticatedRequest,
  setupAgentMailTestEnv,
  teardownAgentMailTestEnv,
  type MockRequestOptions,
} from "./request-helpers";

// Agent Mail test server
export { AgentMailTestServer, type TestAgent, type TestProject, type TestMessage, type TestDelivery } from "./agent-mail-test-server";
