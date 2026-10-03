import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, AlertOctagon, Zap, Cross, Compass } from 'lucide-react';

export default function Legend() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute bottom-6 left-6 z-[1000] glass-panel-elevated rounded-xl border border-slate-700/60 shadow-2xl backdrop-blur-md overflow-hidden text-xs max-w-xs transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-dark-900/80 hover:bg-dark-850 border-b border-slate-800 text-slate-200 font-semibold tracking-wide"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-red-400" />
          Map Network Legend
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-3.5 space-y-3 bg-dark-950/70">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
              Congestion Factor (BPR)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                <span className="text-slate-300">Flowing (&lt;1.25)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
                <span className="text-slate-300">Moderate (1.3-1.7)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
                <span className="text-slate-300">Heavy (1.7-2.3)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1.5 rounded-full bg-red-600 shadow-sm shadow-red-600/50"></span>
                <span className="text-slate-300">Severe (2.3+)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-2 rounded bg-emerald-400 corridor-glow border border-emerald-300"></div>
              <span className="text-emerald-300 font-medium">Emergency Corridor (Priority)</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-6 h-0.5 border-t-2 border-dashed border-red-500 flex items-center justify-center">
                <span className="text-[10px] text-red-500 font-black">✕</span>
              </div>
              <span className="text-red-400 font-medium">Blocked Road / Incident</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded bg-red-600/80 border border-red-400 flex items-center justify-center text-[10px] text-white font-bold">
                +
              </div>
              <span className="text-slate-200">Hospital ICU Destination</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-red-500 beacon-pulse flex items-center justify-center text-[9px] text-white font-bold">
                !
              </div>
              <span className="text-slate-200">Emergency Origin Scene</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300">Preempted Green Wave Signal</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
