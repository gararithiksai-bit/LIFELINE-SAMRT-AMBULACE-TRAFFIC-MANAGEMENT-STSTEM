import React from 'react';
import { Shield, Siren, BarChart3, Rocket, Clock, Zap, RotateCcw, Activity } from 'lucide-react';
import { isPeakHour } from '../engine/congestion.js';

export default function Navbar({
  simulationTime,
  corridorActive,
  onOpenComparison,
  onOpenRoadmap,
  onReset
}) {
  const hourNum = parseFloat(simulationTime.split(':')[0]) + parseFloat(simulationTime.split(':')[1]) / 60;
  const inPeak = isPeakHour(hourNum);

  return (
    <header className="w-full bg-dark-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg z-50">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 border border-red-400 shadow-md shadow-red-600/30 flex items-center justify-center">
          <Siren className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-wider text-slate-100 font-mono">
              LIFELINE
            </h1>
            <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
              WEBX 2026
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Smart Ambulance Traffic Management &amp; Dynamic Emergency Corridor
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center gap-4">
        {/* City Clock */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-950/80 border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-mono font-bold text-slate-200">{simulationTime}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
            inPeak ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse' : 'bg-slate-800 text-slate-400'
          }`}>
            {inPeak ? 'Peak Rush' : 'Off-Peak'}
          </span>
        </div>

        {/* Corridor Active Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
          corridorActive
            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
            : 'bg-dark-950/80 text-slate-500 border-slate-800'
        }`}>
          <Zap className={`w-3.5 h-3.5 ${corridorActive ? 'fill-emerald-400 text-emerald-400' : ''}`} />
          <span>{corridorActive ? 'Emergency Corridor ACTIVE' : 'Corridor Standby'}</span>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          id="compare-btn"
          onClick={onOpenComparison}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Impact Analysis</span>
          <span className="sm:hidden">Benchmark</span>
        </button>

        <button
          id="roadmap-btn"
          onClick={onOpenRoadmap}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-dark-950 hover:bg-dark-850 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5"
        >
          <Rocket className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Roadmap</span>
        </button>

        <button
          onClick={onReset}
          title="Reset Simulation"
          className="p-2 rounded-xl bg-dark-950 hover:bg-dark-850 text-slate-400 hover:text-white border border-slate-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
