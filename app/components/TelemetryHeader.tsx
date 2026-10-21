'use client';

import React from 'react';

interface TelemetryHeaderProps {
  stats: {
    activeIncidents: number;
    sandboxPassRatePercent: number;
    hallucinationsBlocked: number;
    astViolationsBlocked: number;
    sandboxRegressionsBlocked: number;
    avgToolLatencyMs: number;
    tokenQuotaTotal: number;
    tokenQuotaUsed: number;
    tokenBudgetPercent: number;
  };
}

export const TelemetryHeader: React.FC<TelemetryHeaderProps> = ({ stats }) => {
  return (
    <section className="w-full bg-[#090A0F] border-b border-white/10 px-6 py-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: Active Incidents */}
        <div className="p-3 rounded-md bg-[#0E1117] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Active Incidents</span>
            <span className="material-symbols-outlined text-[#06B6D4]" style={{ fontSize: 15 }}>
              error_med
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-semibold text-white tracking-tight">{stats.activeIncidents} Running</span>
            <span className="font-mono text-xs text-zinc-400">+1 queued</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-zinc-800 overflow-hidden flex">
              <div className="h-full bg-[#06B6D4] w-2/3"></div>
              <div className="h-full bg-[#8B5CF6] w-1/3"></div>
            </div>
            <span className="font-mono text-[10px] text-zinc-400">2 sandbox / 1 reasoning</span>
          </div>
        </div>

        {/* Card 2: Sandbox Pass Rate */}
        <div className="p-3 rounded-md bg-[#0E1117] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Sandbox Pass Rate</span>
            <span className="material-symbols-outlined text-[#10B981]" style={{ fontSize: 15 }}>
              verified
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-semibold text-[#10B981] tracking-tight">{stats.sandboxPassRatePercent}%</span>
            <span className="font-mono text-xs text-[#10B981] font-medium">+2.4%</span>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-400">
            <span>24h rolling CI verification</span>
            <span className="text-zinc-300">38/40 runs</span>
          </div>
        </div>

        {/* Card 3: Hallucinations Blocked */}
        <div className="p-3 rounded-md bg-[#0E1117] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Hallucinations Blocked</span>
            <span className="material-symbols-outlined text-[#F43F5E]" style={{ fontSize: 15 }}>
              shield
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-semibold text-white tracking-tight">{stats.hallucinationsBlocked}</span>
            <span className="font-mono text-xs text-[#F43F5E] font-medium">100% Intercepted</span>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-400">
            <span>{stats.astViolationsBlocked} AST violations</span>
            <span className="text-zinc-300">{stats.sandboxRegressionsBlocked} test regressions</span>
          </div>
        </div>

        {/* Card 4: Average Tool Latency */}
        <div className="p-3 rounded-md bg-[#0E1117] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Avg Tool Latency</span>
            <span className="material-symbols-outlined text-[#06B6D4]" style={{ fontSize: 15 }}>
              speed
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-semibold text-white tracking-tight">{stats.avgToolLatencyMs}ms</span>
            <span className="font-mono text-xs text-zinc-400">p95: 610ms</span>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-400">
            <span>Cache hit: 88.4%</span>
            <span className="text-[#10B981]">Optimal</span>
          </div>
        </div>

        {/* Card 5: Token Budget Utilization */}
        <div className="p-3 rounded-md bg-[#0E1117] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Token Budget Quota</span>
            <span className="material-symbols-outlined text-[#8B5CF6]" style={{ fontSize: 15 }}>
              data_usage
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-semibold text-white tracking-tight">{stats.tokenBudgetPercent}%</span>
            <span className="font-mono text-xs text-zinc-400">{stats.tokenQuotaUsed.toLocaleString()} / 250k</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-[#8B5CF6] transition-all duration-500"
                style={{ width: `${Math.min(100, stats.tokenBudgetPercent)}%` }}
              ></div>
            </div>
            <span className="font-mono text-[10px] text-[#10B981]">Under quota</span>
          </div>
        </div>
      </div>
    </section>
  );
};
