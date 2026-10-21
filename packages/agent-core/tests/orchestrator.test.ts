import { AgentOrchestrator } from '../src/orchestrator';
import {
  IncidentWithRelations,
  IncidentStatus,
  GuardrailHaltReason,
  IncidentStore,
} from '../../db/src/client';
import * as assert from 'assert';

async function runOrchestratorTests() {
  console.log('🧪 Starting Milestone 3 Suite: AgentOrchestrator & Guardrails tests...\n');
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => Promise<void> | void) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✅ PASS: ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ FAIL: ${name}\n     ${err.message}`);
            failed++;
          });
      } else {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}\n     ${err.message}`);
      failed++;
    }
  }

  // 1. End-to-end multi-step reasoning and sandbox verification
  await test('AgentOrchestrator executes multi-step analysis and verifies patch with exitCode 0', async () => {
    const testIncident: IncidentWithRelations = {
      id: 'test-inc-stripe-001',
      repositoryId: 'repo-test',
      workflowRunId: '100200300',
      commitSha: 'a1b2c3d4e5f',
      failingJobName: 'ci-matrix.yml',
      rawErrorSnippet: 'FAILED tests/billing/test_stripe_webhook.py - KeyError in lock acquisition',
      status: IncidentStatus.QUEUED,
      haltReason: GuardrailHaltReason.NONE,
      stepsTaken: 0,
      maxStepsAllowed: 5,
      totalPromptTokens: 0,
      totalOutputTokens: 0,
      tokenBudgetLimit: 25000,
      createdAt: new Date(),
    };

    const orchestrator = new AgentOrchestrator({
      incident: testIncident,
      repoPath: process.cwd(),
      maxSteps: 5,
      tokenBudgetLimit: 25000,
    });

    const result = await orchestrator.run();

    assert.strictEqual(result.status, IncidentStatus.VERIFIED);
    assert.strictEqual(result.haltReason, GuardrailHaltReason.NONE);
    assert.ok(result.stepsTaken <= 5, `Steps taken ${result.stepsTaken} exceeded max 5`);
    assert.ok(result.stepTraces && result.stepTraces.length > 0, 'No step traces recorded');
    assert.ok(result.toolCalls && result.toolCalls.length > 0, 'No tool calls recorded');
    assert.ok(result.candidatePatches && result.candidatePatches.length > 0, 'No patch recorded');
    assert.strictEqual(result.candidatePatches[0].sandboxExitCode, 0);
    assert.strictEqual(result.candidatePatches[0].astPassed, true);
  });

  // 2. Token Budget Circuit Breaker Guardrail
  await test('AgentOrchestrator trips circuit breaker when token budget is exceeded', async () => {
    const testIncident: IncidentWithRelations = {
      id: 'test-inc-token-halt',
      repositoryId: 'repo-test',
      workflowRunId: '100200301',
      commitSha: 'b2c3d4e5f6a',
      failingJobName: 'ci-matrix.yml',
      rawErrorSnippet: 'FAILED tests/billing/test_stripe_webhook.py',
      status: IncidentStatus.QUEUED,
      haltReason: GuardrailHaltReason.NONE,
      stepsTaken: 0,
      maxStepsAllowed: 5,
      totalPromptTokens: 24500, // Nearly at limit
      totalOutputTokens: 500,   // Cumulative = 25000
      tokenBudgetLimit: 25000,
      createdAt: new Date(),
    };

    const orchestrator = new AgentOrchestrator({
      incident: testIncident,
      repoPath: process.cwd(),
      maxSteps: 5,
      tokenBudgetLimit: 25000,
    });

    const result = await orchestrator.run();

    assert.strictEqual(result.status, IncidentStatus.HALTED_BY_GUARDRAIL);
    assert.strictEqual(result.haltReason, GuardrailHaltReason.TOKEN_BUDGET_EXCEEDED);
  });

  // 3. Step Cap Guardrail
  await test('AgentOrchestrator enforces hard 5-step loop cap without runaway cycles', async () => {
    const testIncident: IncidentWithRelations = {
      id: 'test-inc-step-cap',
      repositoryId: 'repo-test',
      workflowRunId: '100200302',
      commitSha: 'c3d4e5f6a7b',
      failingJobName: 'ci-matrix.yml',
      rawErrorSnippet: 'Unrecognized obscure compilation failure without patch resolution',
      status: IncidentStatus.QUEUED,
      haltReason: GuardrailHaltReason.NONE,
      stepsTaken: 0,
      maxStepsAllowed: 2, // Hard cap of 2 steps for this test
      totalPromptTokens: 0,
      totalOutputTokens: 0,
      tokenBudgetLimit: 25000,
      createdAt: new Date(),
    };

    const orchestrator = new AgentOrchestrator({
      incident: testIncident,
      repoPath: process.cwd(),
      maxSteps: 2,
    });

    const result = await orchestrator.run();

    assert.ok(result.stepsTaken <= 2, `Steps taken ${result.stepsTaken} exceeded cap 2`);
    assert.strictEqual(result.status, IncidentStatus.HALTED_BY_GUARDRAIL);
    assert.strictEqual(result.haltReason, GuardrailHaltReason.STEP_CAP_REACHED);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runOrchestratorTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
