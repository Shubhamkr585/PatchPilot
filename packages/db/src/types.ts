export enum IncidentStatus {
  QUEUED = 'QUEUED',
  ANALYZING = 'ANALYZING',
  SANDBOX_TESTING = 'SANDBOX_TESTING',
  VERIFIED = 'VERIFIED',
  PR_COMMENT_POSTED = 'PR_COMMENT_POSTED',
  REJECTED_BY_AST = 'REJECTED_BY_AST',
  REJECTED_BY_SANDBOX = 'REJECTED_BY_SANDBOX',
  HALTED_BY_GUARDRAIL = 'HALTED_BY_GUARDRAIL',
  FAILED = 'FAILED',
}

export enum GuardrailHaltReason {
  NONE = 'NONE',
  STEP_CAP_REACHED = 'STEP_CAP_REACHED',
  TOKEN_BUDGET_EXCEEDED = 'TOKEN_BUDGET_EXCEEDED',
  SANDBOX_TIMEOUT = 'SANDBOX_TIMEOUT',
  AST_SYNTAX_ERROR = 'AST_SYNTAX_ERROR',
}

export interface IncidentWithRelations {
  id: string;
  repositoryId: string;
  workflowRunId: string | bigint;
  pullRequestNumber?: number | null;
  commitSha: string;
  failingJobName: string;
  rawErrorSnippet: string;
  status: IncidentStatus;
  haltReason: GuardrailHaltReason;
  stepsTaken: number;
  maxStepsAllowed: number;
  totalPromptTokens: number;
  totalOutputTokens: number;
  tokenBudgetLimit: number;
  totalDurationMs?: number | null;
  createdAt: Date;
  completedAt?: Date | null;
  repository?: {
    id: string;
    githubRepoId: string | bigint;
    owner: string;
    name: string;
    defaultBranch: string;
    autoPostPrReview: boolean;
  };
  stepTraces?: Array<{
    id: string;
    incidentRunId: string;
    stepNumber: number;
    thoughtSummary: string;
    promptTokens: number;
    completionTokens: number;
    llmLatencyMs: number;
    createdAt: Date;
  }>;
  toolCalls?: Array<{
    id: string;
    incidentRunId: string;
    stepNumber: number;
    toolName: string;
    toolArgsJson: any;
    toolOutputText: string;
    toolLatencyMs: number;
    isError: boolean;
    createdAt: Date;
  }>;
  candidatePatches?: Array<{
    id: string;
    incidentRunId: string;
    targetFilePath: string;
    unifiedDiff: string;
    rootCauseSummary: string;
    astPassed: boolean;
    astErrorDetails?: string | null;
    sandboxExitCode?: number | null;
    sandboxStdout?: string | null;
    sandboxStderr?: string | null;
    sandboxDurationMs?: number | null;
    postedToGithubPrUrl?: string | null;
    createdAt: Date;
  }>;
}
