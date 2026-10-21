'use client';

import React, { useState } from 'react';

interface SimulateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (scenario: 'stripe_concurrency' | 'pagination_off_by_one' | 'auth_missing_await') => Promise<void>;
  isLoading: boolean;
}

export const SimulateModal: React.FC<SimulateModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
  isLoading,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<
    'stripe_concurrency' | 'pagination_off_by_one' | 'auth_missing_await'
  >('stripe_concurrency');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#0E1117] border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#12161E]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#06B6D4]">play_circle</span>
            <h3 className="text-base font-semibold text-white tracking-tight">Simulate Failing CI Webhook</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-400">
            Select a realistic production CI failure scenario. The autonomous agent will ingest the failure, execute multi-step root-cause analysis via Gemini tool calling, test the candidate fix in an isolated Docker sandbox, and stage a verified PR review diff.
          </p>

          <div className="space-y-3">
            {/* Option 1: Stripe Concurrency */}
            <div
              onClick={() => setSelectedScenario('stripe_concurrency')}
              className={`p-3.5 rounded border cursor-pointer transition-all ${
                selectedScenario === 'stripe_concurrency'
                  ? 'border-[#06B6D4] bg-[#06B6D4]/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'border-white/10 bg-[#161B22]/50 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
                  Scenario 1: Stripe Idempotent Concurrency Bug
                </span>
                <span className="font-mono text-[10px] text-zinc-400">services/billing/webhook_handler.py</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                Stripe webhook retry bursts cause race conditions due to missing <code className="text-[#06B6D4]">nx=True</code> in distributed Redis lock acquisition.
              </p>
            </div>

            {/* Option 2: Pagination Off-By-One */}
            <div
              onClick={() => setSelectedScenario('pagination_off_by_one')}
              className={`p-3.5 rounded border cursor-pointer transition-all ${
                selectedScenario === 'pagination_off_by_one'
                  ? 'border-[#06B6D4] bg-[#06B6D4]/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'border-white/10 bg-[#161B22]/50 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  Scenario 2: Database Pagination Off-By-One
                </span>
                <span className="font-mono text-[10px] text-zinc-400">services/database/query_builder.ts</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                Offset calculation calculates <code className="text-[#10B981]">page * pageSize</code>, accidentally skipping page 1 items in API list views.
              </p>
            </div>

            {/* Option 3: Auth Missing Await */}
            <div
              onClick={() => setSelectedScenario('auth_missing_await')}
              className={`p-3.5 rounded border cursor-pointer transition-all ${
                selectedScenario === 'auth_missing_await'
                  ? 'border-[#06B6D4] bg-[#06B6D4]/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'border-white/10 bg-[#161B22]/50 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
                  Scenario 3: Async JWT Token Missing Await
                </span>
                <span className="font-mono text-[10px] text-zinc-400">services/auth/token_verifier.ts</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                Async function fails with unhandled Promise rejections because session validator omits <code className="text-[#8B5CF6]">await</code> on JWT verification.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#12161E] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
            <span className="material-symbols-outlined text-xs">info</span>
            Requires zero GitHub App credentials
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSimulate(selectedScenario)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#06B6D4] hover:bg-[#4cd7f6] text-[#090A0F] font-semibold text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Triage in Progress...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  Launch Agent Pipeline
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
