# PatchPilot — Guardrails & Observability Architecture

## The 3-Layer Defense Against Hallucinations

Autonomous coding agents commonly hallucinate non-existent APIs, non-compiling syntax, or fixes that break secondary test cases. PatchPilot implements a deterministic **3-layer defense system** to eliminate hallucinated code:

```
[Layer 1: Structured Tool Calling]
        │  (Strict Zod validation, path-traversal sanitation, context-bounded ranges)
        ▼
[Layer 2: AST Pre-Flight Syntax Check]
        │  (TypeScript Compiler API validates syntax & imports in < 5ms before container launch)
        ▼
[Layer 3: Ephemeral Docker Sandbox Execution]
        │  (Runs actual test runner inside network-isolated container; exitCode === 0 required)
        ▼
[Verified Patch Dispatched to PR]
```

---

### Layer 1: Structured JSON Schema & Bounded Tool Calling
1. **Strict Zod Input Validation:**
   Every tool argument (`search_code`, `read_file`, `git_diff`, `propose_patch`) is validated using Zod. Extra or invalid fields result in immediate tool validation errors.
2. **Path Traversal Protection:**
   The `ToolExecutor.sanitizePath` method verifies that all requested file paths resolve strictly inside the repository root. Any path containing `..` or external directory references throws a fatal path traversal exception.
3. **Context Window Protection:**
   The `read_file` tool caps line requests to a maximum of **200 lines per invocation**. If an LLM requests 10,000 lines, the executor automatically clamps the window to 200 lines, preventing context bloat and degraded model attention.

---

### Layer 2: Deterministic AST Syntax Verification (< 5 ms)
- Rather than immediately paying the high latency and compute cost of spawning a Docker container, PatchPilot parses the patched code in-memory using `ts.createSourceFile`.
- **Syntax Check:** Checks `sourceFile.parseDiagnostics`. If the LLM generates unclosed brackets, missing semicolons, or invalid TypeScript types, the AST check fails in **< 5 ms**.
- **Security Check:** Inspects the AST for forbidden invocations (`subprocess.Popen`, `child_process.exec`, `eval`).
- **Cost Saving:** Blocks syntax-invalid fixes from spinning up containers, saving seconds of execution time and host CPU cycles.

---

### Layer 3: Ephemeral Docker Sandbox Regression Testing
- Even if code is syntactically valid and compiles, it may not fix the actual bug or may introduce regressions in existing test cases.
- PatchPilot executes the targeted test command inside an ephemeral container:
  - `--network=none`: Zero network access eliminates SSRF and exfiltration.
  - `--memory=512m`: Hard RAM quota prevents memory starvation.
  - `--cpus=1.0`: Prevents CPU hoarding.
  - `--pids-limit=64`: Protects against malicious recursive process spawning.
  - `SANDBOX_TIMEOUT_MS = 30000`: Strict 30-second execution cap.
- **Strict Verification Gate:** The patch is only marked `VERIFIED` if `exitCode === 0`. If `exitCode !== 0`, the patch is classified as `REJECTED_BY_SANDBOX` and blocked from maintainer review.

---

## Observability & Telemetry Data Model

PatchPilot persists end-to-end execution traces in PostgreSQL to ensure 100% observability:

| PostgreSQL Table | Captured Telemetry Data |
| :--- | :--- |
| **`IncidentRun`** | Workflow run ID, commit SHA, PR number, status, halt reason, prompt tokens, completion tokens, duration (ms). |
| **`AgentStepTrace`** | Step index (1 to 5), Gemini thought summary, step prompt/completion tokens, LLM wall-clock latency (`llmLatencyMs`). |
| **`ToolCallLog`** | Invoked tool name, exact JSON arguments, tool output snippet, tool execution latency (`toolLatencyMs`), error status. |
| **`CandidatePatch`** | Unified diff, target file path, AST validation status, AST error message, Docker exit code, stdout, stderr, sandbox duration. |
| **`WebhookDelivery`** | `X-GitHub-Delivery` UUID, event type, SHA-256 payload hash, processed timestamp for idempotency. |

---

## Token-Budget Circuit Breaker
- **Limit:** `MAX_TOKENS_PER_RUN = 25000` cumulative tokens.
- **Mechanism:** Evaluated before every LLM API call. If the cumulative token count reaches or exceeds 25,000 tokens, the circuit breaker trips immediately.
- **Halt Reason:** `TOKEN_BUDGET_EXCEEDED`
- **Result:** Prevents runaway financial costs from adversarial inputs or verbose log outputs.
