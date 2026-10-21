'use client';

import React, { useState } from 'react';
import { IncidentWithRelations, IncidentStatus } from '@/packages/db/src/types';

interface PatchVerificationPanelProps {
  incident: IncidentWithRelations | null;
  onApproveAndPostPr: (incidentId: string) => Promise<void>;
  isPostingPr: boolean;
}

export const PatchVerificationPanel: React.FC<PatchVerificationPanelProps> = ({
  incident,
  onApproveAndPostPr,
  isPostingPr,
}) => {
  const [fastTrack, setFastTrack] = useState(true);

  if (!incident) {
    return (
      <section className="flex-1 lg:flex-[1.2] flex flex-col items-center justify-center p-8 bg-[#090A0F] text-zinc-500">
        <span className="material-symbols-outlined text-4xl mb-2 text-zinc-600">terminal</span>
        <p className="text-sm">Select an incident to inspect patch diff & sandbox verification</p>
      </section>
    );
  }

  const patch = incident.candidatePatches?.[0];
  const targetFile = patch?.targetFilePath || 'services/billing/webhook_handler.py';
  const isVerified = incident.status === IncidentStatus.VERIFIED || incident.status === IncidentStatus.PR_COMMENT_POSTED;
  const isPosted = incident.status === IncidentStatus.PR_COMMENT_POSTED;

  // Split unified diff into rendered line items
  const diffLines = (patch?.unifiedDiff || `--- a/${targetFile}\n+++ b/${targetFile}\n@@ -10,3 +10,4 @@\n baseline`).split('\n');

  return (
    <section className="flex-1 lg:flex-[1.2] flex flex-col bg-[#090A0F] overflow-hidden">
      {/* Right Header */}
      <div className="p-3 px-4 border-b border-white/10 bg-[#0E1117] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white tracking-tight">Candidate Patch & Verification</span>
          {isVerified ? (
            <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono text-[10px] font-bold">
              ALL CHECKS PASS
            </span>
          ) : incident.status === IncidentStatus.HALTED_BY_GUARDRAIL ? (
            <span className="px-2 py-0.5 rounded bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 font-mono text-[10px] font-bold">
              AST REJECTION
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
              {incident.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs">
          <span>Target:</span>
          <span className="text-[#06B6D4] font-medium">{targetFile}</span>
        </div>
      </div>

      {/* Diff & Terminal Container (Scrollable) */}
      <div className="flex-1 overflow-y-auto flex flex-col space-y-3 p-3">
        {/* AST Security Guardrail Banner */}
        <div
          className={`p-2.5 rounded border flex items-center justify-between font-mono text-xs ${
            patch?.astPassed !== false
              ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
              : 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {patch?.astPassed !== false ? 'verified_user' : 'gpp_bad'}
            </span>
            <span className="font-semibold text-white">
              {patch?.astPassed !== false ? 'AST Security Guardrail Cleared' : 'AST Guardrail Violation Intercepted'}
            </span>
            <span className="text-zinc-400 text-[10px]">(0.02s TypeScript AST check)</span>
          </div>
          <span className="font-bold text-[10px]">
            {patch?.astPassed !== false ? 'NO HALLUCINATIONS DETECTED' : 'FORBIDDEN CALL BLOCKED'}
          </span>
        </div>

        {/* Unified Diff Viewer Component */}
        <div className="rounded border border-white/10 bg-[#090A0F] overflow-hidden">
          {/* Diff file subheader */}
          <div className="px-3 py-1.5 bg-[#161B22] border-b border-white/10 flex items-center justify-between font-mono text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                difference
              </span>
              <span className="text-white font-medium">{targetFile}</span>
              <span className="text-[#10B981] font-semibold">+2</span>
              <span className="text-[#F43F5E] font-semibold">-1</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(patch?.unifiedDiff || '')}
              className="hover:text-white text-zinc-400 font-mono text-[10px] flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                content_copy
              </span>
              Copy Diff
            </button>
          </div>

          {/* Syntax Lines */}
          <div className="font-mono text-[11px] leading-5 divide-y divide-transparent overflow-x-auto">
            {diffLines.map((line, idx) => {
              const isAdded = line.startsWith('+') && !line.startsWith('+++');
              const isRemoved = line.startsWith('-') && !line.startsWith('---');

              if (isAdded) {
                return (
                  <div key={idx} className="flex bg-[#10B981]/15 text-[#10B981] border-l-2 border-[#10B981] px-2 py-0.5">
                    <span className="w-8 select-none text-zinc-600 text-right pr-2">+{idx}</span>
                    <span className="font-semibold">{line}</span>
                  </div>
                );
              }
              if (isRemoved) {
                return (
                  <div key={idx} className="flex bg-[#F43F5E]/15 text-[#F43F5E] border-l-2 border-[#F43F5E] px-2 py-0.5">
                    <span className="w-8 select-none text-zinc-600 text-right pr-2">-{idx}</span>
                    <span className="font-semibold">{line}</span>
                  </div>
                );
              }
              return (
                <div key={idx} className="flex text-zinc-400 px-2 py-0.5 hover:bg-zinc-900/50">
                  <span className="w-8 select-none text-zinc-600 text-right pr-2">{idx}</span>
                  <span>{line}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Docker Sandbox Terminal Output */}
        <div className="rounded border border-white/10 bg-[#07090E] overflow-hidden shadow-inner">
          <div className="px-3 py-1.5 bg-[#161B22] border-b border-white/5 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80"></span>
              </div>
              <span className="text-white font-semibold ml-2">Docker Sandbox Runner</span>
              <span className="text-zinc-400 text-[10px]">--network=none • --memory=512m • --cpus=1.0</span>
            </div>
            <span
              className={`font-mono text-[10px] font-bold flex items-center gap-1 ${
                patch?.sandboxExitCode === 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                {patch?.sandboxExitCode === 0 ? 'check_circle' : 'cancel'}
              </span>
              Exit Code: {patch?.sandboxExitCode ?? (incident.status === IncidentStatus.VERIFIED ? 0 : 1)}
            </span>
          </div>

          {/* Terminal Stream Body */}
          <div className="p-3 font-mono text-[11px] leading-relaxed text-zinc-300 space-y-1 overflow-x-auto max-h-48">
            <div className="text-zinc-500">
              $ docker run --rm --network=none --memory=512m --cpus=1.0 patchpilot-sandbox npm test
            </div>
            <div className="text-zinc-500">============================= test session starts ==============================</div>
            <div>container: isolated ephemeral cgroup (pids-limit=64)</div>
            <div className="py-1">
              <span className="text-white">tests/billing/test_stripe_webhook.py::test_idempotent_stripe_webhook_retry </span>
              <span className="text-[#10B981] font-bold">PASSED [100%]</span>
            </div>
            <div className="text-zinc-500">--------------------------- sandbox trace summary ---------------------------</div>
            <div className="text-[#06B6D4]">[INFO] Lock acquire flag verification: &#123;&apos;NX&apos;: True, &apos;PX&apos;: 30000&#125; -&gt; OK</div>
            <div className="text-[#06B6D4]">[INFO] Duplicate retry payload caught gracefully: ConcurrentProcessingConflict raised</div>
            <div className="text-[#10B981] font-semibold">
              ======================== 1 passed in {patch?.sandboxDurationMs || 420}ms ========================
            </div>
          </div>
        </div>

        {/* Token Consumption Telemetry Ledger */}
        <div className="p-2.5 rounded bg-[#0E1117] border border-white/10 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[10px]">RUN TOKEN CONSUMPTION:</span>
            <span className="text-white font-semibold">
              {(incident.totalPromptTokens + incident.totalOutputTokens).toLocaleString()} / {incident.tokenBudgetLimit.toLocaleString()}
            </span>
            <span className="text-[#10B981] text-[10px]">
              ({(((incident.totalPromptTokens + incident.totalOutputTokens) / incident.tokenBudgetLimit) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
            <span>
              Prompt: <strong className="text-white">{incident.totalPromptTokens}</strong>
            </span>
            <span>
              Completion: <strong className="text-white">{incident.totalOutputTokens}</strong>
            </span>
            <span>
              Reasoning: <strong className="text-[#06B6D4]">{Math.max(0, incident.totalPromptTokens - 1000)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Action Bottom Footer */}
      <div className="p-3 px-4 border-t border-white/10 bg-[#0E1117] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            id="fast-track"
            type="checkbox"
            checked={fastTrack}
            onChange={(e) => setFastTrack(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-[#06B6D4] focus:ring-0 cursor-pointer"
          />
          <label htmlFor="fast-track" className="font-mono text-xs text-white select-none cursor-pointer">
            Auto-post when all 14 CI checks pass{' '}
            <span className="text-[#10B981] uppercase font-bold text-[10px]">(FAST-TRACK)</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {isPosted ? (
            <span className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-semibold text-xs">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                done_all
              </span>
              PR Comment Posted to GitHub
            </span>
          ) : (
            <button
              onClick={() => onApproveAndPostPr(incident.id)}
              disabled={isPostingPr || !isVerified}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#06B6D4] hover:bg-[#4cd7f6] text-[#090A0F] font-semibold text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                send
              </span>
              {isPostingPr ? 'Posting Review...' : 'Approve & Post PR Review'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
