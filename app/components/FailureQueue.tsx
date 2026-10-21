'use client';

import React, { useState } from 'react';
import { IncidentWithRelations, IncidentStatus } from '@/packages/db/src/types';

interface FailureQueueProps {
  incidents: IncidentWithRelations[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  onOpenSimulateModal: () => void;
}

export const FailureQueue: React.FC<FailureQueueProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onOpenSimulateModal,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'VERIFIED' | 'TESTING' | 'BLOCKED'>('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'VERIFIED') return inc.status === IncidentStatus.VERIFIED || inc.status === IncidentStatus.PR_COMMENT_POSTED;
    if (filter === 'TESTING') return inc.status === IncidentStatus.SANDBOX_TESTING || inc.status === IncidentStatus.ANALYZING || inc.status === IncidentStatus.QUEUED;
    if (filter === 'BLOCKED') return inc.status === IncidentStatus.HALTED_BY_GUARDRAIL || inc.status === IncidentStatus.REJECTED_BY_SANDBOX || inc.status === IncidentStatus.REJECTED_BY_AST;
    return true;
  });

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.VERIFIED:
      case IncidentStatus.PR_COMMENT_POSTED:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-mono text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            VERIFIED
          </span>
        );
      case IncidentStatus.SANDBOX_TESTING:
      case IncidentStatus.ANALYZING:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 font-mono text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-ping"></span>
            TESTING
          </span>
        );
      case IncidentStatus.HALTED_BY_GUARDRAIL:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 font-mono text-[10px] font-semibold">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>gpp_bad</span>
            GUARDRAIL_HALT
          </span>
        );
      case IncidentStatus.REJECTED_BY_SANDBOX:
      case IncidentStatus.REJECTED_BY_AST:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 font-mono text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></span>
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
            {status}
          </span>
        );
    }
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 border-r border-white/10 bg-[#090A0F] flex flex-col h-full">
      {/* Queue Header & Filter Tabs */}
      <div className="p-3 border-b border-white/10 flex flex-col gap-2.5 bg-[#090A0F]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#06B6D4]" style={{ fontSize: 16 }}>
              conversion_path
            </span>
            <span className="font-semibold text-xs text-white">Failure Queue</span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[#06B6D4] font-mono text-xs">
              {incidents.length}
            </span>
          </div>
          <button
            onClick={onOpenSimulateModal}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#161B22] hover:bg-[#1F242C] border border-white/10 text-white font-mono text-[11px] transition-colors"
          >
            <span className="material-symbols-outlined text-zinc-400" style={{ fontSize: 13 }}>
              play_arrow
            </span>
            <span>Simulate CI</span>
            <kbd className="text-[9px] text-zinc-500 ml-0.5">⌥S</kbd>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 py-0.5 rounded font-mono text-[10px] transition-colors ${
              filter === 'ALL'
                ? 'bg-zinc-800 text-[#06B6D4] border border-[#06B6D4]/30'
                : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            onClick={() => setFilter('VERIFIED')}
            className={`px-2 py-0.5 rounded font-mono text-[10px] transition-colors ${
              filter === 'VERIFIED'
                ? 'bg-zinc-800 text-[#10B981] border border-[#10B981]/30'
                : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Verified ({incidents.filter((i) => i.status === IncidentStatus.VERIFIED || i.status === IncidentStatus.PR_COMMENT_POSTED).length})
          </button>
          <button
            onClick={() => setFilter('TESTING')}
            className={`px-2 py-0.5 rounded font-mono text-[10px] transition-colors ${
              filter === 'TESTING'
                ? 'bg-zinc-800 text-[#06B6D4] border border-[#06B6D4]/30'
                : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Testing ({incidents.filter((i) => i.status === IncidentStatus.SANDBOX_TESTING || i.status === IncidentStatus.ANALYZING).length})
          </button>
          <button
            onClick={() => setFilter('BLOCKED')}
            className={`px-2 py-0.5 rounded font-mono text-[10px] transition-colors ${
              filter === 'BLOCKED'
                ? 'bg-zinc-800 text-[#F43F5E] border border-[#F43F5E]/30'
                : 'text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Blocked ({incidents.filter((i) => i.status === IncidentStatus.HALTED_BY_GUARDRAIL || i.status === IncidentStatus.REJECTED_BY_SANDBOX || i.status === IncidentStatus.REJECTED_BY_AST).length})
          </button>
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {filteredIncidents.map((incident) => {
          const isSelected = incident.id === selectedIncidentId;
          const cleanJob = incident.failingJobName.replace('.yml', '');
          const errorSnippet = incident.rawErrorSnippet.split('\n')[0];

          return (
            <div
              key={incident.id}
              onClick={() => onSelectIncident(incident.id)}
              className={`p-3 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-[#161B22]/80 border-l-2 border-[#06B6D4]'
                  : 'hover:bg-[#161B22]/40 bg-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className={`font-mono text-xs font-semibold ${isSelected ? 'text-[#06B6D4]' : 'text-zinc-300'}`}>
                  #{incident.id.replace('inc-', '')}
                </span>
                {getStatusBadge(incident.status)}
              </div>

              <p className="font-mono text-xs text-white font-medium mt-1 truncate">
                {incident.candidatePatches?.[0]?.targetFilePath || errorSnippet}
              </p>

              <div className="flex items-center gap-2 mt-1.5 text-zinc-400 font-mono text-[11px]">
                <span className="truncate">{incident.failingJobName} • PR #{incident.pullRequestNumber || 1428}</span>
                <span>•</span>
                <span className="text-zinc-300">{incident.totalDurationMs ? `${(incident.totalDurationMs / 1000).toFixed(2)}s` : '1.84s'}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                {incident.status === IncidentStatus.VERIFIED || incident.status === IncidentStatus.PR_COMMENT_POSTED ? (
                  <span className="text-[#10B981] flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>auto_fix_high</span>
                    Auto-remediated
                  </span>
                ) : incident.status === IncidentStatus.HALTED_BY_GUARDRAIL ? (
                  <span className="text-[#F43F5E] flex items-center gap-1 truncate max-w-[190px]">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>block</span>
                    {incident.haltReason}
                  </span>
                ) : (
                  <span className="text-[#06B6D4] flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>sync</span>
                    Executing Step {incident.stepsTaken}/5
                  </span>
                )}
                <span className="text-zinc-500">{incident.stepsTaken}/5 tools</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rail Footer */}
      <div className="p-3 border-t border-white/10 bg-[#090A0F] flex items-center justify-between text-zinc-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#10B981]" style={{ fontSize: 15 }}>
            smart_toy
          </span>
          <span className="text-zinc-300 text-[11px]">Agent: Gemini-2.5-Flash</span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">Strict AST</span>
      </div>
    </aside>
  );
};
