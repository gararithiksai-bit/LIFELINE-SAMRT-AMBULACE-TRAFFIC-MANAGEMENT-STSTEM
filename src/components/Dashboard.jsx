import React, { useRef, useEffect } from 'react';
import {
  Timer, Navigation, Gauge, RefreshCw, Hospital,
  CheckCircle2, AlertCircle, ArrowUpRight, Terminal, Zap
} from 'lucide-react';

export default function Dashboard({
  simulationState,
  corridorActive,
  onOpenExplain
}) {
  const logContainerRef = useRef(null);

  // Auto-scroll logs to bottom on new entry
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [simulationState?.logs]);

  const etaSec = Math.round(simulationState?.etaSecondsRemaining || 0);
  const etaMinutes = Math.floor(etaSec / 60);
  const etaSeconds = etaSec % 60;
  const etaDisplay = `${etaMinutes}:${etaSeconds.toString().padStart(2, '0')}`;

  const targetHospital = simulationState?.targetHospital;

  return (
    <div className="flex flex-col h-full bg-dark-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-dark-850 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">LIVE TELEMETRY</h2>
            <p className="text-[11px] text-slate-400">Emergency Unit 04 Mission Status</p>
          </div>
        </div>

        <button
          onClick={onOpenExplain}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 hover:border-blue-500 transition-colors flex items-center gap-1"
        >
          <span>Route Decision Explain</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Top Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. Live ETA Countdown */}
          <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
                Live ETA
              </span>
              <span className="text-[10px] font-mono text-slate-500">REMAINING</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-slate-100 tracking-tight">
                {etaDisplay}
              </span>
              <span className="text-xs font-semibold text-slate-400">min ({etaSec}s)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Updated every sim tick</span>
            </div>
          </div>

          {/* 2. Remaining Distance */}
          <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                Distance Left
              </span>
              <span className="text-[10px] font-mono text-slate-500">TRIP</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-blue-400 tracking-tight">
                {simulationState?.distanceRemainingKm ?? 0}
              </span>
              <span className="text-xs font-semibold text-slate-400">km remaining</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Traveled: <span className="text-slate-300 font-mono">{simulationState?.distanceTravelledKm ?? 0} km</span>
            </div>
          </div>

          {/* 3. Current Speed & Corridor Status */}
          <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                Current Speed
              </span>
              {corridorActive && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  +20% BOOST
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                {simulationState?.currentSpeedKmh ?? 0}
              </span>
              <span className="text-xs font-semibold text-slate-400">km/h</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              Road: <span className="text-slate-300">{simulationState?.currentSegment?.street || 'Intersection'}</span>
            </div>
          </div>

          {/* 4. Dynamic Route Changes */}
          <div className="p-3 rounded-xl bg-dark-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                Reroute Count
              </span>
              <span className="text-[10px] font-mono text-slate-500">DYNAMIC</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-purple-400 tracking-tight">
                {simulationState?.routeChangesCount ?? 0}
              </span>
              <span className="text-xs font-semibold text-slate-400">recomputes</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Trigger: <span className="text-slate-300">Incident &gt;10% threshold</span>
            </div>
          </div>
        </div>

        {/* Destination Hospital Card */}
        {targetHospital && (
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center text-white font-bold text-xs">
                  +
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-200">{targetHospital.name}</h4>
                  <p className="text-[10px] text-slate-400">{targetHospital.specialty}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ICU READY ({targetHospital.icuBeds} Beds)
              </span>
            </div>
          </div>
        )}

        {/* Real-time Status Log */}
        <div className="space-y-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              Real-Time Simulation Event Log
            </span>
            <span className="text-[10px] font-mono text-slate-500">{simulationState?.logs?.length || 0} events</span>
          </div>

          <div
            ref={logContainerRef}
            className="flex-1 min-h-[160px] max-h-[220px] bg-dark-950/90 border border-slate-800/90 rounded-xl p-3 overflow-y-auto space-y-2 font-mono text-[11px]"
          >
            {simulationState?.logs?.map(log => {
              let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
              if (log.type === 'DISPATCH') badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
              if (log.type === 'REROUTE') badgeColor = 'bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse';
              if (log.type === 'SUCCESS') badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
              if (log.type === 'CRITICAL' || log.type === 'ERROR') badgeColor = 'bg-red-500/20 text-red-400 border-red-500/40';

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[10px] text-slate-500 shrink-0 font-mono mt-0.5">[{log.timestamp}]</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border shrink-0 ${badgeColor}`}>
                    {log.type}
                  </span>
                  <span className="text-slate-300 break-words">{log.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
