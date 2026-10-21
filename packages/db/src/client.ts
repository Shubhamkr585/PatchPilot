import { PrismaClient, IncidentStatus, GuardrailHaltReason } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Singleton Prisma Client
let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: [],
    });
  }
  return prismaInstance;
}

export { PrismaClient, IncidentStatus, GuardrailHaltReason };

// Pluggable repository interface supporting both PostgreSQL Prisma and resilient local fallback
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

// Resilient Storage Layer
const FALLBACK_DB_PATH = path.join(process.cwd(), '.patchpilot_store.json');

export class IncidentStore {
  private static memoryIncidents: IncidentWithRelations[] = [];
  private static initialized = false;

  private static loadFromFile() {
    try {
      if (fs.existsSync(FALLBACK_DB_PATH)) {
        const raw = fs.readFileSync(FALLBACK_DB_PATH, 'utf-8');
        IncidentStore.memoryIncidents = JSON.parse(raw);
      }
    } catch (e) {
      // Ignore read errors
    }
  }

  private static persistToFile() {
    try {
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(IncidentStore.memoryIncidents, null, 2), 'utf-8');
    } catch (e) {
      // Ignore write errors
    }
  }

  public static async getAllIncidents(): Promise<IncidentWithRelations[]> {
    try {
      const prisma = getPrismaClient();
      const records = await prisma.incidentRun.findMany({
        include: {
          repository: true,
          stepTraces: { orderBy: { stepNumber: 'asc' } },
          toolCalls: { orderBy: { stepNumber: 'asc' } },
          candidatePatches: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (records && records.length > 0) {
        return records as unknown as IncidentWithRelations[];
      }
    } catch (e) {
      // Fallback
    }

    if (!IncidentStore.initialized) {
      IncidentStore.loadFromFile();
      IncidentStore.initialized = true;
    }
    return IncidentStore.memoryIncidents;
  }

  public static async getIncidentById(id: string): Promise<IncidentWithRelations | null> {
    try {
      const prisma = getPrismaClient();
      const record = await prisma.incidentRun.findUnique({
        where: { id },
        include: {
          repository: true,
          stepTraces: { orderBy: { stepNumber: 'asc' } },
          toolCalls: { orderBy: { stepNumber: 'asc' } },
          candidatePatches: true,
        },
      });
      if (record) return record as unknown as IncidentWithRelations;
    } catch (e) {
      // Fallback
    }

    if (!IncidentStore.initialized) {
      IncidentStore.loadFromFile();
      IncidentStore.initialized = true;
    }
    return IncidentStore.memoryIncidents.find((i) => i.id === id) || null;
  }

  public static async saveIncident(incident: IncidentWithRelations): Promise<IncidentWithRelations> {
    try {
      const prisma = getPrismaClient();
      await prisma.incidentRun.upsert({
        where: { id: incident.id },
        create: {
          id: incident.id,
          repositoryId: incident.repositoryId,
          workflowRunId: BigInt(incident.workflowRunId),
          pullRequestNumber: incident.pullRequestNumber,
          commitSha: incident.commitSha,
          failingJobName: incident.failingJobName,
          rawErrorSnippet: incident.rawErrorSnippet,
          status: incident.status,
          haltReason: incident.haltReason,
          stepsTaken: incident.stepsTaken,
          maxStepsAllowed: incident.maxStepsAllowed,
          totalPromptTokens: incident.totalPromptTokens,
          totalOutputTokens: incident.totalOutputTokens,
          tokenBudgetLimit: incident.tokenBudgetLimit,
          totalDurationMs: incident.totalDurationMs,
        },
        update: {
          status: incident.status,
          haltReason: incident.haltReason,
          stepsTaken: incident.stepsTaken,
          totalPromptTokens: incident.totalPromptTokens,
          totalOutputTokens: incident.totalOutputTokens,
          totalDurationMs: incident.totalDurationMs,
          completedAt: incident.completedAt,
        },
      });
    } catch (e) {
      // Fallback
    }

    if (!IncidentStore.initialized) {
      IncidentStore.loadFromFile();
      IncidentStore.initialized = true;
    }

    const idx = IncidentStore.memoryIncidents.findIndex((i) => i.id === incident.id);
    if (idx >= 0) {
      IncidentStore.memoryIncidents[idx] = incident;
    } else {
      IncidentStore.memoryIncidents.unshift(incident);
    }
    IncidentStore.persistToFile();
    return incident;
  }

  public static async isDeliveryProcessed(deliveryId: string): Promise<boolean> {
    try {
      const prisma = getPrismaClient();
      const existing = await prisma.webhookDelivery.findUnique({ where: { deliveryId } });
      if (existing) return true;
    } catch (e) {
      // Fallback
    }

    try {
      const seenFile = path.join(process.cwd(), '.seen_deliveries.json');
      if (fs.existsSync(seenFile)) {
        const seen: string[] = JSON.parse(fs.readFileSync(seenFile, 'utf-8'));
        return seen.includes(deliveryId);
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  public static async recordDelivery(deliveryId: string, eventType: string, payloadHash: string): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.webhookDelivery.create({
        data: { deliveryId, eventType, payloadHash },
      });
    } catch (e) {
      // Fallback
    }

    try {
      const seenFile = path.join(process.cwd(), '.seen_deliveries.json');
      let seen: string[] = [];
      if (fs.existsSync(seenFile)) {
        seen = JSON.parse(fs.readFileSync(seenFile, 'utf-8'));
      }
      if (!seen.includes(deliveryId)) {
        seen.push(deliveryId);
        fs.writeFileSync(seenFile, JSON.stringify(seen, null, 2), 'utf-8');
      }
    } catch (e) {
      // ignore
    }
  }
}
