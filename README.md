# PatchPilot — Autonomous CI Failure Triage & Debugging Agent

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-Tool%20Calling-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Sandboxes-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Stitch UI](https://img.shields.io/badge/Stitch%20UI-Obsidian%20Telemetry-06B6D4)](https://github.com/)

> **Target Resume Entry Implemented Verbatim:**
> **PatchPilot – Autonomous CI Failure Triage & Debugging Agent** | *TypeScript, Node.js, Gemini AI (Tool Calling), Docker, PostgreSQL, GitHub Webhooks*
> 1. Built an event-driven **agentic debugging pipeline** that ingests failing GitHub Actions CI logs via webhooks and orchestrates multi-step root-cause analysis using **Gemini structured tool calling** (`search_code`, `read_file`, `git_diff`).
> 2. Executed candidate patches inside isolated, resource-capped **Docker sandboxes** to run targeted regression tests before posting automated PR review diffs, blocking hallucinated or non-compiling fixes from reaching maintainers.
> 3. Enforced deterministic agent guardrails—including a **5-step reasoning loop cap**, AST syntax checks, and **token-budget circuit breakers**—while persisting execution traces and tool latencies in **PostgreSQL** for observability.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │    GitHub Actions CI Failure Webhook    │
                      └────────────────────┬────────────────────┘
                                           │ POST /api/webhooks/github
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    Stage 1: Webhook Ingestion & Gate    │
                      │    - HMAC-SHA256 Signature Verify       │
                      │    - X-GitHub-Delivery Idempotency      │
                      └────────────────────┬────────────────────┘
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │   Stage 2: Deterministic Agent Loop     │
                      │   - Gemini Structured Tool Calling      │
                      │   - Hard MAX_STEPS = 5 Cap              │
                      │   - search_code, read_file, git_diff    │
                      └────────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       [Guardrail: Token Budget <= 25k]            [Guardrail: Step Count <= 5]
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           ▼ propose_patch
                      ┌─────────────────────────────────────────┐
                      │   Stage 4: Deterministic AST Validator  │
                      │   - TypeScript Compiler API (< 5ms)     │
                      │   - Reject malformed syntax & injections│
                      └────────────────────┬────────────────────┘
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │   Stage 5: Isolated Docker Sandbox      │
                      │   - --network=none --memory=512m        │
                      │   - Targeted regression test execution  │
                      │   - Exit Code 0 verification            │
                      └────────────────────┬────────────────────┘
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │   Stage 6: PR Review & Telemetry        │
                      │   - Post GitHub suggestion comment      │
                      │   - Stitch Obsidian Dashboard Replay    │
                      └─────────────────────────────────────────┘
```

---

## Key Features & Guardrails

- **3-Layer Anti-Hallucination Defense:**
  1. *Layer 1:* Structured JSON Schema tool calling with strict Zod validation and path-traversal sanitization.
  2. *Layer 2:* In-memory AST pre-flight syntax verification via `ts.createSourceFile` in **< 5 ms** before launching containers.
  3. *Layer 3:* Ephemeral Docker container verification running the exact regression test suite; candidate fixes are rejected if `exitCode !== 0`.
- **Deterministic Loop & Cost Bounding:**
  - Hard cap of **5 reasoning steps** per incident to prevent runaway ReAct loops.
  - **25,000 token circuit breaker** halts execution immediately if token quota is reached.
  - Context-clamped file reading (max 200 lines per call).
- **Hard Container Isolation:**
  - Resource and security flags: `--rm --network=none --memory=512m --cpus=1.0 --pids-limit=64 --read-only`.
  - 30-second timeout guardrail (`SANDBOX_TIMEOUT_MS = 30000`).
- **1-Click Demo Simulator:**
  - Built-in simulation modal with 3 realistic scenarios:
    1. *Stripe Concurrency:* Missing `nx=True` atomic lock in Redis webhook handler (`services/billing/webhook_handler.py`).
    2. *Pagination Off-By-One:* Page 1 skipping bug in query builder (`services/database/query_builder.ts`).
    3. *Auth Missing Await:* Async JWT verification returning unhandled Promise (`services/auth/token_verifier.ts`).
- **Obsidian Telemetry Dashboard:**
  - Designed in **Stitch** with dark-mode Linear/Datadog aesthetic.
  - Top KPI Ribbon tracking Active Incidents, Sandbox Pass Rate %, Hallucinations Blocked, Tool Latency, and Token Budget Quota.
  - Center 5-step Reasoning Waterfall with millisecond latency breakdowns.
  - Right Side-by-Side Unified Diff viewer, AST badge, Docker terminal stream, and "Approve & Post PR Review" CTA.

---

## Quick Start

### 1. Prerequisites
- Node.js v20+
- Docker & Docker Compose (optional for local testing; resilient subprocess fallback included)

### 2. Setup Environment
```bash
git clone https://github.com/Shubhamkr585/trip-hack.git patchpilot
cd patchpilot

# Install dependencies
npm install

# Start PostgreSQL database (optional if running local fallback)
docker compose up -d
```

### 3. Configure Environment Variables (`.env`)
```ini
GEMINI_API_KEY="your-gemini-api-key"
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/patchpilot?schema=public"
GITHUB_WEBHOOK_SECRET="patchpilot_super_secret_webhook_key_2026"
MAX_STEPS=5
MAX_TOKENS_PER_RUN=25000
SANDBOX_TIMEOUT_MS=30000
```

### 4. Seed Database & Run Full Test Suite
```bash
# Seed 2 historical incidents into system of record
npm run seed

# Run all 14 unit and integration tests across AST, Sandbox, Agent, and API
npm test
```

### 5. Launch Observability Dashboard
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to inspect the Stitch Obsidian Telemetry dashboard and click **"Simulate CI Failure"** to watch the autonomous agent run live.

---

## Technical Documentation Links

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md):** In-depth breakdown of the 6-stage pipeline, state machine, and Docker isolation.
- **[docs/GUARDRAILS_AND_OBSERVABILITY.md](docs/GUARDRAILS_AND_OBSERVABILITY.md):** 3-layer anti-hallucination defense and PostgreSQL telemetry data model.
- **[docs/INTERVIEW_PREP.md](docs/INTERVIEW_PREP.md):** 10 senior backend and AI systems interview questions answered with technical depth.

---

## License
MIT License.
