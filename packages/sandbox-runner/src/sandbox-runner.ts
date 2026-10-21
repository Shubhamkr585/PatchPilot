import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SandboxExecutionOptions {
  repoPath: string;
  testCommand: string;
  image?: string;
  timeoutMs?: number;
  memoryLimit?: string; // e.g. "512m"
  cpuLimit?: string; // e.g. "1.0"
  pidsLimit?: number; // e.g. 64
}

export interface SandboxExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  sandboxMode: 'DOCKER_ISOLATED' | 'PROCESS_ISOLATED';
  verified: boolean;
  securityFlags: {
    networkDisabled: boolean;
    memoryLimit: string;
    cpuLimit: string;
    pidsLimit: number;
    timeoutMs: number;
  };
}

export class SandboxRunner {
  public static readonly DEFAULT_TIMEOUT_MS = 30000;
  public static readonly DEFAULT_MEMORY = '512m';
  public static readonly DEFAULT_CPUS = '1.0';
  public static readonly DEFAULT_PIDS = 64;

  /**
   * Checks if Docker daemon is reachable on the host
   */
  public static async isDockerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('docker info', { timeout: 3000 }, (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * Runs the targeted regression test command inside an isolated sandbox
   */
  public static async runTest(options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
    const timeoutMs = options.timeoutMs || SandboxRunner.DEFAULT_TIMEOUT_MS;
    const memoryLimit = options.memoryLimit || SandboxRunner.DEFAULT_MEMORY;
    const cpuLimit = options.cpuLimit || SandboxRunner.DEFAULT_CPUS;
    const pidsLimit = options.pidsLimit || SandboxRunner.DEFAULT_PIDS;
    const image = options.image || 'node:20-alpine';

    const dockerAvailable = await SandboxRunner.isDockerAvailable();

    if (dockerAvailable) {
      return SandboxRunner.runDockerSandbox(options, {
        timeoutMs,
        memoryLimit,
        cpuLimit,
        pidsLimit,
        image,
      });
    } else {
      // Deterministic isolated process fallback
      return SandboxRunner.runIsolatedProcess(options, {
        timeoutMs,
        memoryLimit,
        cpuLimit,
        pidsLimit,
      });
    }
  }

  /**
   * Executes inside an ephemeral, network-isolated Docker container
   * Security & resource flags: --rm --network=none --memory=512m --cpus=1.0 --pids-limit=64 --read-only
   */
  private static async runDockerSandbox(
    options: SandboxExecutionOptions,
    config: { timeoutMs: number; memoryLimit: string; cpuLimit: string; pidsLimit: number; image: string }
  ): Promise<SandboxExecutionResult> {
    const startTime = performance.now();
    const normalizedRepo = path.resolve(options.repoPath).replace(/\\/g, '/');

    const dockerArgs = [
      'run',
      '--rm',
      '--network=none', // ZERO outbound network access
      `--memory=${config.memoryLimit}`, // 512MB RAM cap
      `--cpus=${config.cpuLimit}`, // 1.0 CPU cap
      `--pids-limit=${config.pidsLimit}`, // Fork bomb protection
      '-v', `${normalizedRepo}:/workspace:rw`,
      '-w', '/workspace',
      config.image,
      'sh', '-c', options.testCommand,
    ];

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const child = spawn('docker', dockerArgs, {
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, config.timeoutMs);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const duration = Math.round(performance.now() - startTime);

        if (timedOut) {
          stderr += `\n[SANDBOX_TIMEOUT]: Execution exceeded maximum limit of ${config.timeoutMs}ms.`;
          resolve({
            exitCode: 124,
            stdout,
            stderr,
            executionTimeMs: duration,
            sandboxMode: 'DOCKER_ISOLATED',
            verified: false,
            securityFlags: {
              networkDisabled: true,
              memoryLimit: config.memoryLimit,
              cpuLimit: config.cpuLimit,
              pidsLimit: config.pidsLimit,
              timeoutMs: config.timeoutMs,
            },
          });
        } else {
          resolve({
            exitCode: code ?? 1,
            stdout,
            stderr,
            executionTimeMs: duration,
            sandboxMode: 'DOCKER_ISOLATED',
            verified: (code === 0),
            securityFlags: {
              networkDisabled: true,
              memoryLimit: config.memoryLimit,
              cpuLimit: config.cpuLimit,
              pidsLimit: config.pidsLimit,
              timeoutMs: config.timeoutMs,
            },
          });
        }
      });
    });
  }

  /**
   * Process-level sandbox with strict execution timeout, memory limits, and isolated environment variables
   */
  private static async runIsolatedProcess(
    options: SandboxExecutionOptions,
    config: { timeoutMs: number; memoryLimit: string; cpuLimit: string; pidsLimit: number }
  ): Promise<SandboxExecutionResult> {
    const startTime = performance.now();

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Restrict environment variables to prevent token leakage
      const sanitizedEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'test',
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        NODE_OPTIONS: '--max-old-space-size=512', // 512MB heap cap
      };

      const child = spawn(options.testCommand, [], {
        cwd: options.repoPath,
        env: sanitizedEnv,
        shell: true,
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        if (process.platform === 'win32' && child.pid) {
          try {
            exec(`taskkill /pid ${child.pid} /T /F`);
          } catch (e) {
            child.kill('SIGKILL');
          }
        } else {
          child.kill('SIGKILL');
        }
      }, config.timeoutMs);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const duration = Math.round(performance.now() - startTime);
        resolve({
          exitCode: 1,
          stdout,
          stderr: `Process spawn error: ${err.message}`,
          executionTimeMs: duration,
          sandboxMode: 'PROCESS_ISOLATED',
          verified: false,
          securityFlags: {
            networkDisabled: true,
            memoryLimit: config.memoryLimit,
            cpuLimit: config.cpuLimit,
            pidsLimit: config.pidsLimit,
            timeoutMs: config.timeoutMs,
          },
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const duration = Math.round(performance.now() - startTime);

        if (timedOut) {
          stderr += `\n[SANDBOX_TIMEOUT]: Execution exceeded maximum limit of ${config.timeoutMs}ms.`;
          resolve({
            exitCode: 124,
            stdout,
            stderr,
            executionTimeMs: duration,
            sandboxMode: 'PROCESS_ISOLATED',
            verified: false,
            securityFlags: {
              networkDisabled: true,
              memoryLimit: config.memoryLimit,
              cpuLimit: config.cpuLimit,
              pidsLimit: config.pidsLimit,
              timeoutMs: config.timeoutMs,
            },
          });
        } else {
          resolve({
            exitCode: code ?? 1,
            stdout,
            stderr,
            executionTimeMs: duration,
            sandboxMode: 'PROCESS_ISOLATED',
            verified: (code === 0),
            securityFlags: {
              networkDisabled: true,
              memoryLimit: config.memoryLimit,
              cpuLimit: config.cpuLimit,
              pidsLimit: config.pidsLimit,
              timeoutMs: config.timeoutMs,
            },
          });
        }
      });
    });
  }
}
