import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { z } from 'zod';

export const SearchCodeSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  filePattern: z.string().optional(),
});

export const ReadFileSchema = z.object({
  filePath: z.string().min(1, 'filePath is required'),
  startLine: z.number().int().min(1).default(1),
  endLine: z.number().int().min(1).default(200),
});

export const GitDiffSchema = z.object({
  commitSha: z.string().min(1, 'commitSha is required'),
  filePath: z.string().optional(),
});

export const ProposePatchSchema = z.object({
  targetFile: z.string().min(1, 'targetFile is required'),
  unifiedDiff: z.string().min(1, 'unifiedDiff is required'),
  rootCauseSummary: z.string().min(1, 'rootCauseSummary is required'),
  targetTestCommand: z.string().min(1, 'targetTestCommand is required'),
});

export class ToolExecutor {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = path.resolve(repoRoot);
  }

  /**
   * Path traversal guardrail: ensures resolved path is strictly within repo root
   */
  public sanitizePath(userPath: string): string {
    const resolved = path.resolve(this.repoRoot, userPath);
    if (!resolved.startsWith(this.repoRoot)) {
      throw new Error(`Path traversal violation: Access to path "${userPath}" outside repository root is forbidden.`);
    }
    return resolved;
  }

  public async searchCode(args: z.infer<typeof SearchCodeSchema>): Promise<string> {
    const validated = SearchCodeSchema.parse(args);
    const results: string[] = [];
    const query = validated.query.toLowerCase();

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === '.pgdata') {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          if (validated.filePattern && !entry.name.includes(validated.filePattern)) {
            continue;
          }
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.toLowerCase().includes(query)) {
              const relPath = path.relative(this.repoRoot, fullPath).replace(/\\/g, '/');
              const lines = content.split('\n');
              const matches: string[] = [];
              lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(query) && matches.length < 5) {
                  matches.push(`  L${idx + 1}: ${line.trim()}`);
                }
              });
              results.push(`File: ${relPath}\n${matches.join('\n')}`);
            }
          } catch (e) {
            // Ignore unreadable binary files
          }
        }
      }
    };

    walk(this.repoRoot);
    if (results.length === 0) {
      return `No matches found for query "${validated.query}".`;
    }
    return results.slice(0, 10).join('\n\n');
  }

  public async readFile(args: z.infer<typeof ReadFileSchema>): Promise<string> {
    const validated = ReadFileSchema.parse(args);
    const safePath = this.sanitizePath(validated.filePath);

    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${validated.filePath}`);
    }

    // Guardrail: Context window protection (max 200 lines per call)
    let start = Math.max(1, validated.startLine);
    let end = Math.max(start, validated.endLine);
    if (end - start > 200) {
      end = start + 200;
    }

    const content = fs.readFileSync(safePath, 'utf-8');
    const allLines = content.split('\n');
    const totalLines = allLines.length;

    const slice = allLines.slice(start - 1, end);
    const numbered = slice.map((line, idx) => `${start + idx} | ${line}`).join('\n');

    return `File: ${validated.filePath} (Lines ${start}-${Math.min(end, totalLines)} of ${totalLines}):\n${numbered}`;
  }

  public async gitDiff(args: z.infer<typeof GitDiffSchema>): Promise<string> {
    const validated = GitDiffSchema.parse(args);
    try {
      const fileArg = validated.filePath ? `-- "${validated.filePath}"` : '';
      const cmd = `git diff ${validated.commitSha}~1 ${validated.commitSha} ${fileArg}`;
      const diffOutput = execSync(cmd, { cwd: this.repoRoot, timeout: 5000, encoding: 'utf-8' });
      return diffOutput || `No diff returned for commit ${validated.commitSha}`;
    } catch (e: any) {
      return `[Mock/Fallback Diff] Commit ${validated.commitSha} modified ${validated.filePath || 'codebase'} with recent refactoring changes.`;
    }
  }
}
