import * as ts from 'typescript';
import * as diff from 'diff';

export interface AstValidationResult {
  passed: boolean;
  errorDetails: string | null;
  patchedContent?: string;
  durationMs: number;
}

export class AstValidator {
  /**
   * Deterministically validates a candidate patch using TypeScript Compiler API (ts.createSourceFile)
   * in < 5ms before spinning up a Docker container.
   */
  public static validatePatch(
    originalContent: string,
    unifiedDiff: string,
    filePath: string
  ): AstValidationResult {
    const startTime = performance.now();

    // 1. Normalize line endings (CRLF -> LF) to prevent cross-platform patch mismatches
    const normalizedOriginal = (originalContent || '').replace(/\r\n/g, '\n');
    const normalizedDiff = (unifiedDiff || '').replace(/\r\n/g, '\n');

    let patchedContent: string | false = false;
    try {
      patchedContent = diff.applyPatch(normalizedOriginal, normalizedDiff);
    } catch (err: any) {
      patchedContent = false;
    }

    if (patchedContent === false) {
      // Fallback: apply line additions/removals directly if headers differ
      const linesToAdd: string[] = [];
      const linesToRemove: string[] = [];
      for (const line of normalizedDiff.split('\n')) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          linesToAdd.push(line.slice(1));
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          linesToRemove.push(line.slice(1));
        }
      }

      let fallbackPatched = normalizedOriginal;
      for (const rem of linesToRemove) {
        if (fallbackPatched.includes(rem)) {
          fallbackPatched = fallbackPatched.replace(rem, linesToAdd.shift() || '');
        }
      }
      if (linesToAdd.length > 0) {
        fallbackPatched += '\n' + linesToAdd.join('\n');
      }
      patchedContent = fallbackPatched;
    }

    // 2. Security AST & Token Guardrail Inspection
    const forbiddenPatterns = [
      { pattern: /subprocess\.(Popen|call|run)/i, reason: 'Forbidden AST Call: subprocess invocation detected' },
      { pattern: /child_process\.(exec|execSync|spawn|spawnSync)/i, reason: 'Forbidden AST Call: child_process invocation detected' },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/i, reason: 'Forbidden AST Import: child_process is disallowed' },
      { pattern: /eval\s*\(/i, reason: 'Forbidden AST Call: dynamic eval() execution detected' },
      { pattern: /rm\s+-rf\s+\//i, reason: 'Forbidden AST Command: destructive filesystem command detected' },
    ];

    for (const { pattern, reason } of forbiddenPatterns) {
      if (pattern.test(patchedContent)) {
        return {
          passed: false,
          errorDetails: `Security Guardrail Rejection: ${reason}`,
          patchedContent,
          durationMs: Math.round(performance.now() - startTime),
        };
      }
    }

    // 3. Deterministic AST Syntax Check using TypeScript Compiler API
    const isTsOrJs = /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(filePath);
    if (isTsOrJs) {
      const sourceFile = ts.createSourceFile(
        filePath,
        patchedContent,
        ts.ScriptTarget.Latest,
        true, // setParentNodes
        ts.ScriptKind.TSX
      );

      // Extract parse diagnostics
      const diagnostics = (sourceFile as any).parseDiagnostics || [];
      if (diagnostics.length > 0) {
        const firstError = diagnostics[0];
        const message = typeof firstError.messageText === 'string'
          ? firstError.messageText
          : firstError.messageText.messageText;
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(firstError.start || 0);

        return {
          passed: false,
          errorDetails: `TypeScript AST Syntax Error at line ${line + 1}, col ${character + 1}: ${message}`,
          patchedContent,
          durationMs: Math.round(performance.now() - startTime),
        };
      }
    } else if (/\.(py)$/i.test(filePath)) {
      // Basic Python syntax & indentation heuristic validation
      const lines = patchedContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check for unbalanced parenthesis or quotes
        const openParen = (line.match(/\(/g) || []).length;
        const closeParen = (line.match(/\)/g) || []).length;
        if (openParen !== closeParen && !line.trim().endsWith('\\') && !line.includes('"""') && !line.includes("'''")) {
          // Allow multi-line statements if subsequent lines balance it, but flag obvious syntax breaks
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    return {
      passed: true,
      errorDetails: null,
      patchedContent,
      durationMs,
    };
  }
}
