import { IncidentStore, IncidentWithRelations, IncidentStatus, GuardrailHaltReason } from './client';

export const SEED_INCIDENTS: IncidentWithRelations[] = [
  {
    id: 'inc-4819',
    repositoryId: 'repo-acme-payment',
    workflowRunId: '984128912',
    pullRequestNumber: 1428,
    commitSha: 'c7b91d4e689',
    failingJobName: 'ci-matrix.yml',
    rawErrorSnippet: `FAILED tests/billing/test_stripe_webhook.py::test_idempotent_stripe_webhook_retry
KeyError: 'lock'
During redis lock acquisition on stripe duplicate retry event:
  File "services/billing/webhook_handler.py", line 86, in process_stripe_event
    lock = await redis.set(f"idemp:{event_id}", "locked", ex=10)
AssertionError: Expected atomic lock acquisition with nx=True but got concurrent duplicate execution`,
    status: IncidentStatus.VERIFIED,
    haltReason: GuardrailHaltReason.NONE,
    stepsTaken: 5,
    maxStepsAllowed: 5,
    totalPromptTokens: 4810,
    totalOutputTokens: 1120,
    tokenBudgetLimit: 25000,
    totalDurationMs: 1840,
    createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    completedAt: new Date(Date.now() - 1000 * 60 * 44),
    repository: {
      id: 'repo-acme-payment',
      githubRepoId: '7829104',
      owner: 'acme-corp',
      name: 'payment-gw',
      defaultBranch: 'main',
      autoPostPrReview: false,
    },
    stepTraces: [
      {
        id: 'trace-4819-1',
        incidentRunId: 'inc-4819',
        stepNumber: 1,
        thoughtSummary:
          'Analyzing pytest failure log: KeyError in stripe idempotent lock release on webhook retry. Searching codebase for Redis lock acquire pattern...',
        promptTokens: 1150,
        completionTokens: 180,
        llmLatencyMs: 240,
        createdAt: new Date(),
      },
      {
        id: 'trace-4819-2',
        incidentRunId: 'inc-4819',
        stepNumber: 2,
        thoughtSummary:
          'Examining lines 75-110 in webhook_handler.py: Lock key has expiration but lacks the nx=True atomic check, leading to duplicate concurrent worker races during high-concurrency burst.',
        promptTokens: 1420,
        completionTokens: 210,
        llmLatencyMs: 185,
        createdAt: new Date(),
      },
      {
        id: 'trace-4819-3',
        incidentRunId: 'inc-4819',
        stepNumber: 3,
        thoughtSummary:
          'Running AST syntax pre-flight analysis on candidate hotfix: verifying safe async syntax and lack of disallowed imports or credential leaks.',
        promptTokens: 980,
        completionTokens: 120,
        llmLatencyMs: 64,
        createdAt: new Date(),
      },
      {
        id: 'trace-4819-4',
        incidentRunId: 'inc-4819',
        stepNumber: 4,
        thoughtSummary:
          'Staging candidate unified patch into target workspace file services/billing/webhook_handler.py with atomic nx parameter and ConcurrentProcessingConflict guard.',
        promptTokens: 620,
        completionTokens: 310,
        llmLatencyMs: 112,
        createdAt: new Date(),
      },
      {
        id: 'trace-4819-5',
        incidentRunId: 'inc-4819',
        stepNumber: 5,
        thoughtSummary:
          'Isolated Docker sandbox regression test completed: pytest suite executed with exit code 0. Zero regressions detected.',
        promptTokens: 640,
        completionTokens: 300,
        llmLatencyMs: 420,
        createdAt: new Date(),
      },
    ],
    toolCalls: [
      {
        id: 'tool-4819-1',
        incidentRunId: 'inc-4819',
        stepNumber: 1,
        toolName: 'search_code',
        toolArgsJson: { query: 'def acquire_lock stripe idempotency', paths: ['services/billing/'] },
        toolOutputText: 'Matched: services/billing/webhook_handler.py (lines 75-110)',
        toolLatencyMs: 142,
        isError: false,
        createdAt: new Date(),
      },
      {
        id: 'tool-4819-2',
        incidentRunId: 'inc-4819',
        stepNumber: 2,
        toolName: 'read_file',
        toolArgsJson: { filePath: 'services/billing/webhook_handler.py', startLine: 75, endLine: 110 },
        toolOutputText: `75: async def process_stripe_event(event_id: str, payload: dict):
86:     lock = await redis.set(f"idemp:{event_id}", "locked", ex=10)
87:     return await execute_billing_workflow(payload)`,
        toolLatencyMs: 88,
        isError: false,
        createdAt: new Date(),
      },
      {
        id: 'tool-4819-3',
        incidentRunId: 'inc-4819',
        stepNumber: 3,
        toolName: 'git_diff',
        toolArgsJson: { commitSha: 'c7b91d4e689', filePath: 'services/billing/webhook_handler.py' },
        toolOutputText: 'Commit diff shows recent refactor converting sync redis to async client.',
        toolLatencyMs: 64,
        isError: false,
        createdAt: new Date(),
      },
      {
        id: 'tool-4819-4',
        incidentRunId: 'inc-4819',
        stepNumber: 4,
        toolName: 'propose_patch',
        toolArgsJson: {
          targetFile: 'services/billing/webhook_handler.py',
          rootCauseSummary: 'Missing atomic nx=True lock flag in Redis SET call leads to race conditions.',
          targetTestCommand: 'pytest tests/billing/test_stripe_webhook.py -k "test_idempotent_stripe_webhook_retry"',
        },
        toolOutputText: 'Patch staged for AST validation and Docker sandbox execution.',
        toolLatencyMs: 112,
        isError: false,
        createdAt: new Date(),
      },
      {
        id: 'tool-4819-5',
        incidentRunId: 'inc-4819',
        stepNumber: 5,
        toolName: 'execute_sandbox_test',
        toolArgsJson: {
          containerImage: 'python:3.11-alpine',
          command: 'pytest tests/billing/test_stripe_webhook.py -k "test_idempotent_stripe_webhook_retry" -vv',
          timeoutMs: 30000,
        },
        toolOutputText: `============================= test session starts ==============================
collected 4 items / 3 deselected / 1 selected
tests/billing/test_stripe_webhook.py::test_idempotent_stripe_webhook_retry PASSED [100%]
======================== 1 passed, 3 deselected in 0.42s ========================`,
        toolLatencyMs: 420,
        isError: false,
        createdAt: new Date(),
      },
    ],
    candidatePatches: [
      {
        id: 'patch-4819',
        incidentRunId: 'inc-4819',
        targetFilePath: 'services/billing/webhook_handler.py',
        unifiedDiff: `--- a/services/billing/webhook_handler.py
+++ b/services/billing/webhook_handler.py
@@ -84,4 +84,5 @@
     async def process_stripe_event(event_id: str, payload: dict):
         """Processes incoming webhooks with distributed idempotency lock."""
-        lock = await redis.set(f"idemp:{event_id}", "locked", ex=10)
+        lock = await redis.set(f"idemp:{event_id}", "locked", nx=True, px=30000)
+        if not lock: raise ConcurrentProcessingConflict(f"Event {event_id} is processing")
         return await execute_billing_workflow(payload)`,
        rootCauseSummary:
          'Distributed race condition caused by non-atomic Redis SET. Added nx=True and 30s TTL with explicit ConcurrentProcessingConflict handler.',
        astPassed: true,
        astErrorDetails: null,
        sandboxExitCode: 0,
        sandboxStdout: `tests/billing/test_stripe_webhook.py::test_idempotent_stripe_webhook_retry PASSED [100%]
======================== 1 passed, 3 deselected in 0.42s ========================`,
        sandboxStderr: '',
        sandboxDurationMs: 420,
        postedToGithubPrUrl: null,
        createdAt: new Date(),
      },
    ],
  },
  {
    id: 'inc-4817',
    repositoryId: 'repo-acme-payment',
    workflowRunId: '984128905',
    pullRequestNumber: 1415,
    commitSha: 'f2a89c104e1',
    failingJobName: 'postgres-pool.yml',
    rawErrorSnippet: `FATAL: remaining connection slots are reserved for non-replication superuser connections
TimeoutError: Pool connection checkout timed out after 5000ms`,
    status: IncidentStatus.HALTED_BY_GUARDRAIL,
    haltReason: GuardrailHaltReason.AST_SYNTAX_ERROR,
    stepsTaken: 3,
    maxStepsAllowed: 5,
    totalPromptTokens: 3200,
    totalOutputTokens: 850,
    tokenBudgetLimit: 25000,
    totalDurationMs: 1120,
    createdAt: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
    completedAt: new Date(Date.now() - 1000 * 60 * 179),
    repository: {
      id: 'repo-acme-payment',
      githubRepoId: '7829104',
      owner: 'acme-corp',
      name: 'payment-gw',
      defaultBranch: 'main',
      autoPostPrReview: false,
    },
    stepTraces: [
      {
        id: 'trace-4817-1',
        incidentRunId: 'inc-4817',
        stepNumber: 1,
        thoughtSummary: 'Investigating database pool connection leak in connection cleanup routine.',
        promptTokens: 1200,
        completionTokens: 250,
        llmLatencyMs: 310,
        createdAt: new Date(),
      },
      {
        id: 'trace-4817-2',
        incidentRunId: 'inc-4817',
        stepNumber: 2,
        thoughtSummary:
          'Candidate fix proposed by LLM attempted to spawn external shell command to kill rogue postgres connections.',
        promptTokens: 1100,
        completionTokens: 350,
        llmLatencyMs: 450,
        createdAt: new Date(),
      },
      {
        id: 'trace-4817-3',
        incidentRunId: 'inc-4817',
        stepNumber: 3,
        thoughtSummary:
          'AST Pre-flight check triggered: Disallowed dangerous module injection (subprocess.Popen). Halted execution immediately.',
        promptTokens: 900,
        completionTokens: 250,
        llmLatencyMs: 360,
        createdAt: new Date(),
      },
    ],
    toolCalls: [
      {
        id: 'tool-4817-1',
        incidentRunId: 'inc-4817',
        stepNumber: 1,
        toolName: 'search_code',
        toolArgsJson: { query: 'create_pool max_connections' },
        toolOutputText: 'Matched: db/pool.py (lines 12-40)',
        toolLatencyMs: 95,
        isError: false,
        createdAt: new Date(),
      },
      {
        id: 'tool-4817-2',
        incidentRunId: 'inc-4817',
        stepNumber: 2,
        toolName: 'propose_patch',
        toolArgsJson: {
          targetFile: 'db/pool.py',
          rootCauseSummary: 'Kill hung connection processes via shell injection.',
        },
        toolOutputText: 'AST syntax error / security rule violation: forbidden module import detected.',
        toolLatencyMs: 12,
        isError: true,
        createdAt: new Date(),
      },
    ],
    candidatePatches: [
      {
        id: 'patch-4817',
        incidentRunId: 'inc-4817',
        targetFilePath: 'db/pool.py',
        unifiedDiff: `--- a/db/pool.py
+++ b/db/pool.py
@@ -20,2 +20,4 @@
+import subprocess
+subprocess.Popen(["killall", "-9", "postgres"])`,
        rootCauseSummary: 'Dangerous patch attempted subprocess invocation to kill database process.',
        astPassed: false,
        astErrorDetails: 'Forbidden AST Import: Agent attempted to inject subprocess.Popen',
        sandboxExitCode: null,
        sandboxStdout: null,
        sandboxStderr: null,
        sandboxDurationMs: null,
        postedToGithubPrUrl: null,
        createdAt: new Date(),
      },
    ],
  },
];

export async function seedDatabase() {
  console.log('Seeding PatchPilot database with historical incident runs...');
  for (const incident of SEED_INCIDENTS) {
    await IncidentStore.saveIncident(incident);
  }
  console.log(`Successfully seeded ${SEED_INCIDENTS.length} historical incidents!`);
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
