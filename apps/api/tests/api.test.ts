import { ApiController } from '../src/controller';
import { IncidentStore, IncidentStatus } from '../../../packages/db/src/client';
import * as crypto from 'crypto';
import * as assert from 'assert';

async function runApiTests() {
  console.log('🧪 Starting Milestone 4 Suite: API, Webhook Ingestion & Idempotency tests...\n');
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

  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'patchpilot_super_secret_webhook_key_2026';

  // 1. HMAC Signature Verification
  await test('ApiController verifies valid X-Hub-Signature-256 HMAC digest', () => {
    const payload = JSON.stringify({ action: 'completed', workflow_run: { conclusion: 'failure' } });
    const hmac = crypto.createHmac('sha256', secret);
    const validSignature = 'sha256=' + hmac.update(payload).digest('hex');

    const isValid = ApiController.verifyWebhookSignature(payload, validSignature);
    assert.strictEqual(isValid, true);

    const isInvalid = ApiController.verifyWebhookSignature(payload, 'sha256=invalidhash');
    assert.strictEqual(isInvalid, false);
  });

  // 2. Webhook Ingestion & Idempotency Gate
  await test('ApiController enforces idempotency on duplicate X-GitHub-Delivery headers', async () => {
    const testDeliveryId = `deliv-test-${Date.now()}`;
    const payload = {
      action: 'completed',
      workflow_run: { id: 99401, conclusion: 'failure', name: 'ci-matrix.yml', head_sha: 'c7b91d4e689' },
    };
    const rawPayload = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    const signature = 'sha256=' + hmac.update(rawPayload).digest('hex');

    const headers = {
      'x-github-delivery': testDeliveryId,
      'x-hub-signature-256': signature,
      'x-github-event': 'workflow_run',
    };

    // First arrival: should process and return 202 Accepted
    const res1 = await ApiController.handleGithubWebhook(headers, payload);
    assert.strictEqual(res1.status, 202);
    assert.strictEqual(res1.response.deliveryId, testDeliveryId);

    // Duplicate retry arrival: should return 200 OK without triggering duplicate runs
    const res2 = await ApiController.handleGithubWebhook(headers, payload);
    assert.strictEqual(res2.status, 200);
    assert.ok(res2.response.message.includes('Duplicate delivery already processed'));
  });

  // 3. 1-Click Simulation Scenario (Stripe concurrency)
  await test('ApiController.simulateFailure executes end-to-end triage for Stripe concurrency scenario', async () => {
    const result = await ApiController.simulateFailure('stripe_concurrency');
    assert.strictEqual(result.status, IncidentStatus.VERIFIED);
    assert.ok(result.stepsTaken >= 1);
    assert.ok(result.candidatePatches && result.candidatePatches.length > 0);
    assert.strictEqual(result.candidatePatches[0].astPassed, true);
    assert.strictEqual(result.candidatePatches[0].sandboxExitCode, 0);
  });

  // 4. Telemetry stats calculation
  await test('ApiController.getTelemetryStats aggregates live KPI metrics and token utilization', async () => {
    const stats = await ApiController.getTelemetryStats();
    assert.ok(stats.sandboxPassRatePercent > 0);
    assert.ok(stats.hallucinationsBlocked >= 48);
    assert.ok(stats.avgToolLatencyMs > 0);
    assert.ok(stats.tokenQuotaUsed > 0);
  });

  // 5. Approve & Post PR Review
  await test('ApiController.approveAndPostPr transitions status to PR_COMMENT_POSTED', async () => {
    const all = await IncidentStore.getAllIncidents();
    const verified = all.find((i) => i.status === IncidentStatus.VERIFIED) || all[0];

    const updated = await ApiController.approveAndPostPr(verified.id);
    assert.strictEqual(updated.status, IncidentStatus.PR_COMMENT_POSTED);
    assert.ok(updated.candidatePatches?.[0]?.postedToGithubPrUrl?.includes('github.com'));
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runApiTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
