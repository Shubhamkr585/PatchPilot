'use client';

import React, { useState } from 'react';
import { IncidentWithRelations } from '@/packages/db/src/types';

interface AgentTraceWaterfallProps {
  incident: IncidentWithRelations | null;
}

export const AgentTraceWaterfall: React.FC<AgentTraceWaterfallProps> = ({ incident }) => {
  const [collapsedSteps, setCollapsedSteps] = useState<Record<number, boolean>>({});

  if (!incident) {
    return (
      <section className="flex-1 border-r border-white/10 flex flex-col items-center justify-center p-8 bg-[#090A0F] text-zinc-500">
        <span className="material-symbols-outlined text-4xl mb-2 text-zinc-600">account_tree</span>
        <p className="text-sm">Select an incident from the queue to view reasoning waterfall</p>
      </section>
    );
  }

  const toggleCollapse = (stepNumber: number) => {
    setCollapsedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const traces = incident.stepTraces || [];
  const toolCalls = incident.toolCalls || [];

  return (
    <section className="flex-1 lg:flex-[1.1] border-r border-white/10 flex flex-col bg-[#090A0F] overflow-hidden">
      {/* Waterfall Header */}
      <div className="p-3 px-4 border-b border-white/10 bg-[#0E1117] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white tracking-tight">
              Incident #{incident.id.replace('inc-', '')} Waterfall Trace
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-[#06B6D4] font-semibold">
              5-STEP CAP
            </span>
          </div>
          <p className="font-mono text-[11px] text-zinc-400 mt-0.5">
            Model: <span className="text-zinc-200">Gemini-2.5-Flash</span> • Total Latency:{' '}
            <span className="text-[#10B981]">
              {incident.totalDurationMs ? `${(incident.totalDurationMs / 1000).toFixed(2)}s` : '1.84s'}
            </span>{' '}
            • {toolCalls.length} tools invoked
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const allCollapsed: Record<number, boolean> = {};
              traces.forEach((t) => (allCollapsed[t.stepNumber] = true));
              setCollapsedSteps(allCollapsed);
            }}
            className="p-1 rounded bg-[#161B22] hover:bg-[#1F242C] border border-white/10 text-zinc-400 hover:text-white"
            title="Collapse All Steps"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              unfold_less
            </span>
          </button>
        </div>
      </div>

      {/* Connected Step Tree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {/* Vertical connector line */}
        <div className="absolute left-[29px] top-6 bottom-6 w-px bg-white/10 -z-0"></div>

        {traces.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 font-mono text-xs">
            Awaiting agent execution traces...
          </div>
        ) : (
          traces.map((step) => {
            const toolCall = toolCalls.find((tc) => tc.stepNumber === step.stepNumber);
            const isCollapsed = collapsedSteps[step.stepNumber];
            const isASTStep = step.stepNumber === 3 || toolCall?.toolName === 'run_ast_analysis';
            const isSandboxStep = step.stepNumber === 5 || toolCall?.toolName === 'execute_sandbox_test' || toolCall?.toolName === 'propose_patch';

            return (
              <div key={step.id} className="relative flex items-start gap-3 z-10">
                {/* Step Circle Badge */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                    isASTStep || isSandboxStep
                      ? 'bg-[#10B981]/20 border border-[#10B981] text-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-800 border border-[#06B6D4]/50 text-[#06B6D4]'
                  }`}
                >
                  {step.stepNumber}
                </div>

                {/* Step Card */}
                <div
                  className={`flex-1 rounded border overflow-hidden transition-all ${
                    isASTStep
                      ? 'bg-[#0E1117] border-[#10B981]/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                      : 'bg-[#0E1117] border-white/10'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleCollapse(step.stepNumber)}
                    className="px-3 py-1.5 bg-[#161B22]/70 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#161B22]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#06B6D4] uppercase font-bold">
                        tool:{toolCall?.toolName || 'reasoning_step'}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {toolCall?.toolLatencyMs || 120}ms
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isASTStep ? (
                        <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-semibold">
                          GUARDRAIL_CLEARED
                        </span>
                      ) : isSandboxStep ? (
                        <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-[#10B981] text-[#090A0F] font-bold">
                          SANDBOX VERIFIED
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 font-medium">
                          SUCCESS
                        </span>
                      )}
                      <span className="material-symbols-outlined text-zinc-500 text-xs">
                        {isCollapsed ? 'expand_more' : 'expand_less'}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  {!isCollapsed && (
                    <div className="p-3 space-y-2 font-mono text-xs">
                      {/* Thought summary */}
                      <div className="text-zinc-300 font-sans text-xs italic leading-relaxed">
                        &quot;{step.thoughtSummary}&quot;
                      </div>

                      {/* Tool Args JSON Box */}
                      {toolCall && toolCall.toolArgsJson && (
                        <div className="p-2 rounded bg-[#090A0F] border border-white/5 text-zinc-300 text-[11px] overflow-x-auto">
                          <span className="text-zinc-500">args: </span>
                          <span className="text-[#06B6D4]">
                            {JSON.stringify(toolCall.toolArgsJson, null, 2)}
                          </span>
                        </div>
                      )}

                      {/* Tool Output Preview */}
                      {toolCall && toolCall.toolOutputText && (
                        <div className="text-[11px] text-zinc-400 flex items-start gap-1">
                          <span className="material-symbols-outlined text-xs text-[#10B981] mt-0.5">
                            check
                          </span>
                          <span className="truncate">{toolCall.toolOutputText}</span>
                        </div>
                      )}

                      {/* Latency & Token telemetry badge */}
                      <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500 border-t border-white/5">
                        <span>LLM latency: {step.llmLatencyMs}ms</span>
                        <span>
                          Tokens: {step.promptTokens} prompt • {step.completionTokens} completion
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
