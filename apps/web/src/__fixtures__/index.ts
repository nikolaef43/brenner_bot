/**
 * Test Data Fixtures Library
 *
 * Comprehensive, realistic test data fixtures for the BrennerBot web application.
 * These fixtures mirror real data structures and can be used across unit tests,
 * integration tests, and E2E tests.
 *
 * Philosophy: NO mocks - use actual data structures.
 *
 * Usage:
 * ```typescript
 * import { validArtifactFixture, createSession, quoteBankFixture } from "@/__fixtures__";
 *
 * describe("MyComponent", () => {
 *   it("renders with real data", () => {
 *     render(<MyComponent artifact={validArtifactFixture} />);
 *   });
 *
 *   it("handles custom session", () => {
 *     const session = createSession({
 *       status: "active",
 *       research_question: "Custom question",
 *     });
 *     render(<SessionView session={session} />);
 *   });
 * });
 * ```
 *
 * @module __fixtures__
 * @see brenner_bot-77t2
 */

// ============================================================================
// Document Fixtures
// ============================================================================

export {
  // Types
  type DocumentSection,
  type TranscriptDocument,
  type DistillationDocument,
  type QuoteBankEntry,
  type QuoteBankDocument,
  type MetapromptDocument,
  // Transcript fixtures
  minimalTranscript,
  comprehensiveTranscript,
  emptyTranscript,
  // Distillation fixtures
  opusDistillation,
  gptDistillation,
  geminiDistillation,
  // Quote bank fixtures
  quoteBankFixture,
  // Metaprompt fixtures
  metapromptFixture,
  // Raw markdown (for parser testing)
  rawTranscriptMarkdown,
  rawMultiQuoteMarkdown,
  rawNoSectionsMarkdown,
} from "./documents";

// ============================================================================
// Session Fixtures
// ============================================================================

export {
  // Types
  type SessionStatus,
  type SessionParticipant,
  type SessionExcerpt,
  type Session,
  // Research thread
  sampleResearchThread,
  // Hypothesis fixtures
  sampleHypotheses,
  // Test fixtures
  sampleTests,
  // Assumption fixtures
  sampleAssumptions,
  // Critique fixtures
  sampleCritiques,
  // Prediction fixtures
  samplePredictions,
  // Complete artifact fixtures
  validArtifactFixture,
  draftArtifactFixture,
  emptyArtifactFixture,
  // Session fixtures
  activeSessionFixture,
  completedSessionFixture,
  errorSessionFixture,
  pendingSessionFixture,
  cancelledSessionFixture,
} from "./sessions";

// ============================================================================
// User Fixtures
// ============================================================================

export {
  // Types
  type UserRole,
  type User,
  type UserPreferences,
  type AuthSession,
  type CloudflareAccessPayload,
  // User fixtures
  authenticatedUserFixture,
  adminUserFixture,
  observerUserFixture,
  guestUserFixture,
  minimalUserFixture,
  // Auth session fixtures
  validAuthSessionFixture,
  expiredAuthSessionFixture,
  adminAuthSessionFixture,
  // Cloudflare Access fixtures
  validCloudflarePayloadFixture,
  expiredCloudflarePayloadFixture,
  invalidAudienceCloudflarePayloadFixture,
  // Permission matrix
  permissionMatrixFixture,
} from "./users";

// ============================================================================
// API Response Fixtures
// ============================================================================

export {
  // Types
  type AgentMailMessage,
  type AgentMailInbox,
  type AgentMailThread,
  type AgentProfile,
  type JsonRpcResponse,
  type JsonRpcError,
  // Agent Mail success fixtures
  agentMailInboxFixture,
  emptyInboxFixture,
  agentMailThreadFixture,
  agentProfileFixture,
  agentListFixture,
  // Agent Mail error fixtures
  agentNotFoundErrorFixture,
  projectNotFoundErrorFixture,
  fileReservationConflictErrorFixture,
  rateLimitErrorFixture,
  // HTTP error fixtures
  error400Fixture,
  error401Fixture,
  error403Fixture,
  error404Fixture,
  error409Fixture,
  error422Fixture,
  error429Fixture,
  error500Fixture,
  error502Fixture,
  error503Fixture,
  error504Fixture,
  // JSON-RPC fixtures
  jsonRpcSuccessFixture,
  jsonRpcErrorFixture,
  jsonRpcParseErrorFixture,
  jsonRpcMethodNotFoundFixture,
} from "./api";

// ============================================================================
// Factory Functions
// ============================================================================

export {
  // Utilities
  generateId,
  resetIdCounter,
  generateTimestamp,
  // Document factories
  createTranscriptDocument,
  createDistillationDocument,
  // Session factories
  createSession,
  createParticipant,
  createExcerpt,
  // Artifact factories
  createArtifactMetadata,
  createHypothesis,
  createTest,
  createAssumption,
  createCritique,
  createPrediction,
  createResearchThread,
  createArtifact,
  createValidArtifact,
  // User factories
  createUser,
  createAuthSession,
  // Agent Mail factories
  createAgentMailMessage,
  createAgentMailInbox,
  createAgentProfile,
} from "./factories";
