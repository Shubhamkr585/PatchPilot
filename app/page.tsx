'use client';

import React, { useState, useEffect } from 'react';
import { IncidentWithRelations } from '@/packages/db/src/types';
import { TelemetryHeader } from './components/TelemetryHeader';
import { FailureQueue } from './components/FailureQueue';
import { AgentTraceWaterfall } from './components/AgentTraceWaterfall';
import { PatchVerificationPanel } from './components/PatchVerificationPanel';
import { SimulateModal } from './components/SimulateModal';

export default function PatchPilotDashboard() {
  const [incidents, setIncidents] = useState<IncidentWithRelations[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeIncidents: 3,
    sandboxPassRatePercent: 94.2,
    hallucinationsBlocked: 48,
    astViolationsBlocked: 3,
    sandboxRegressionsBlocked: 45,
    avgToolLatencyMs: 342,
    tokenQuotaTotal: 250000,
    tokenQuotaUsed: 84250,
    tokenBudgetPercent: 33.7,
  });
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPostingPr, setIsPostingPr] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(true);

  // Load data on mount
  useEffect(() => {
    fetchIncidents();
    fetchTelemetry();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        if (data.incidents && data.incidents.length > 0) {
          setIncidents(data.incidents);
          if (!selectedIncidentId) {
            setSelectedIncidentId(data.incidents[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching incidents:', e);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching telemetry:', e);
    }
  };

  const handleSimulate = async (
    scenario: 'stripe_concurrency' | 'pagination_off_by_one' | 'auth_missing_await'
  ) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/incidents/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchIncidents();
        await fetchTelemetry();
        if (data.incident) {
          setSelectedIncidentId(data.incident.id);
        }
        setIsSimulateOpen(false);
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApproveAndPostPr = async (incidentId: string) => {
    setIsPostingPr(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/post-pr`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchIncidents();
      }
    } catch (e) {
      console.error('Approve PR error:', e);
    } finally {
      setIsPostingPr(false);
    }
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;

  return (
    <div className="flex flex-col min-h-screen bg-[#090A0F] text-[#E1E2EB]">
      {/* ==================== TOP NAVIGATION BAR ==================== */}
      <header className="flex justify-between items-center w-full px-6 h-12 bg-[#090A0F]/90 backdrop-blur-md sticky top-0 z-40 border-b border-white/10">
        {/* Left: Brand + Active Repo Anchor */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#06B6D4]/20 border border-[#06B6D4]/40 flex items-center justify-center text-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                smart_toy
              </span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              PatchPilot
              <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-zinc-800 border border-white/10 text-[#06B6D4]">
                v2.4-agent
              </span>
            </span>
          </div>

          {/* Live Telemetry Pulse */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#161B22] border border-white/10 font-mono text-[10px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]"></span>
            <span className="text-[#10B981] font-medium">12ms</span> live stream
          </div>

          {/* Repository Switcher Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#161B22] border border-white/10 hover:border-white/20 cursor-pointer transition-colors text-xs font-mono">
            <span className="material-symbols-outlined text-zinc-400" style={{ fontSize: 14 }}>
              conversion_path
            </span>
            <span className="text-white font-medium">acme-corp/payment-gw</span>
            <span className="text-zinc-500">:</span>
            <span className="text-[#06B6D4]">main (c7b91d4)</span>
            <span className="material-symbols-outlined text-zinc-500" style={{ fontSize: 14 }}>
              unfold_more
            </span>
          </div>
        </div>

        {/* Center Search Bar */}
        <div className="hidden md:flex items-center relative w-72 max-w-sm">
          <span className="material-symbols-outlined absolute left-2.5 text-zinc-500" style={{ fontSize: 14 }}>
            search
          </span>
          <input
            className="w-full bg-[#161B22] border border-white/10 rounded pl-8 pr-12 py-1 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#06B6D4] transition-all"
            placeholder="Search runs, traces, AST rules..."
            type="text"
          />
          <kbd className="absolute right-2 px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[9px] border border-white/10">
            ⌘K
          </kbd>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Autonomous Mode Toggle */}
          <div className="flex items-center gap-2 bg-[#161B22] px-2.5 py-1 rounded border border-white/10">
            <div
              className={`w-2 h-2 rounded-full ${
                autonomousMode ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]' : 'bg-zinc-600'
              }`}
            ></div>
            <span className="font-mono text-[11px] text-zinc-300">Autonomous</span>
            <button
              onClick={() => setAutonomousMode(!autonomousMode)}
              className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autonomousMode ? 'bg-[#06B6D4]' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow transition duration-200 ease-in-out ${
                  autonomousMode ? 'translate-x-3' : 'translate-x-0'
                }`}
              ></span>
            </button>
          </div>

          {/* Quick Action: Simulate CI Failure */}
          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#06B6D4] hover:bg-[#4cd7f6] text-[#090A0F] font-semibold text-xs shadow-[0_0_14px_rgba(6,182,212,0.25)] transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              play_arrow
            </span>
            Simulate CI Failure
          </button>
        </div>
      </header>

      {/* ==================== TOP KPI TELEMETRY RIBBON ==================== */}
      <TelemetryHeader stats={stats} />

      {/* ==================== MAIN 3-PANE WORKSPACE ==================== */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[calc(100vh-8.5rem)]">
        {/* LEFT COLUMN: INCIDENT QUEUE */}
        <FailureQueue
          incidents={incidents}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={(id) => setSelectedIncidentId(id)}
          onOpenSimulateModal={() => setIsSimulateOpen(true)}
        />

        {/* CENTER COLUMN: 5-STEP AGENT REASONING WATERFALL */}
        <AgentTraceWaterfall incident={selectedIncident} />

        {/* RIGHT COLUMN: DIFF VIEWER & SANDBOX TERMINAL */}
        <PatchVerificationPanel
          incident={selectedIncident}
          onApproveAndPostPr={handleApproveAndPostPr}
          isPostingPr={isPostingPr}
        />
      </main>

      {/* ==================== 1-CLICK SIMULATOR MODAL ==================== */}
      <SimulateModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulate={handleSimulate}
        isLoading={isSimulating}
      />
    </div>
  );
}
