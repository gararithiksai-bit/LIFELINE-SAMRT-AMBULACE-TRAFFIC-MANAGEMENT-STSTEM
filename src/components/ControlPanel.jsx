import React from 'react';
import {
  Play, Pause, RotateCcw, Send, Clock, ShieldAlert, Zap,
  Activity, Sliders, AlertTriangle, Hospital, Navigation
} from 'lucide-react';
import { PRESET_INCIDENTS, HOSPITALS } from '../data/roadNetwork.js';
import { isPeakHour, formatDecimalTime } from '../engine/congestion.js';
import { CORRIDOR_DISCLAIMER } from '../engine/corridor.js';

export default function ControlPanel({
  network,
  simulationState,
  simulationTime,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  onReset,
  speedMultiplier,
  onSpeedChange,
  corridorActive,
  onToggleCorridor,
  onDispatch,
  selectedStartNodeId,
  onSelectStartNode,
  onApplyPreset,
  activePresetId
}) {
  const isEnRoute = simulationState?.status === 'EN_ROUTE';
  const isArrived = simulationState?.status === 'ARRIVED';
  const hourNum = parseFloat(simulationTime.split(':')[0]) + parseFloat(simulationTime.split(':')[1]) / 60;
  const inPeak = isPeakHour(hourNum);

  return (
    <div className="flex flex-col h-full bg-dark-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 bg-dark-850 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">MISSION CONTROL</h2>
            <p className="text-[11px] text-slate-400">Emergency Dispatch & Sim Parameters</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${inPeak ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
            {inPeak ? 'Peak Rush Hour' : 'Normal Flow'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        {/* 1. Primary Dispatch Button */}
        <div>
          <button
            id="dispatch-ambulance-btn"
            onClick={onDispatch}
            disabled={isEnRoute}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg ${
              isEnRoute
                ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-600/30 hover:shadow-red-600/50 border border-red-500 active:scale-[0.98]'
            }`}
          >
            <Send className="w-4 h-4" />
            {isEnRoute ? 'Ambulance in Transit...' : isArrived ? 'Re-Dispatch New Emergency' : 'DISPATCH AMBULANCE (AUTO-ETA)'}
          </button>
        </div>

        {/* 2. Playback Speed & Controls */}
        <div className="bg-dark-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              Simulation Playback
            </span>
            <span className="text-[11px] font-mono text-slate-400">{speedMultiplier}x Speed</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border ${
                isPlaying
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isPlaying ? 'Pause Sim' : 'Resume Sim'}
            </button>

            <button
              onClick={onReset}
              className="py-2 px-3 rounded-lg font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Speed Multipliers */}
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 5, 10].map(speed => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`py-1 rounded text-xs font-mono font-bold transition-all ${
                  speedMultiplier === speed
                    ? 'bg-slate-700 text-white border border-slate-500 shadow-sm'
                    : 'bg-dark-900 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* 3. Emergency Corridor Toggle */}
        <div className="bg-dark-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${corridorActive ? 'text-emerald-400 fill-emerald-400' : 'text-slate-500'}`} />
              <label htmlFor="corridor-toggle" className="text-xs font-bold text-slate-200 cursor-pointer">
                Emergency Corridor
              </label>
            </div>
            <button
              id="corridor-toggle"
              role="switch"
              aria-checked={corridorActive}
              onClick={onToggleCorridor}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                corridorActive ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  corridorActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Preempts traffic signals to green and clears vehicles along the path ahead.
          </p>

          {/* Mandatory Disclaimer Badge */}
          <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[10px] text-emerald-400/90 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{CORRIDOR_DISCLAIMER}</span>
          </div>
        </div>

        {/* 4. Time of Day Clock & Peak Hour Slider */}
        <div className="bg-dark-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              City Simulation Clock
            </span>
            <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-xs">
              {simulationTime}
            </span>
          </div>

          <input
            type="range"
            min="6"
            max="22"
            step="0.25"
            value={hourNum}
            onChange={(e) => onTimeChange(formatDecimalTime(parseFloat(e.target.value)))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>06:00 (Dawn)</span>
            <span className="text-orange-400 font-semibold">08:45 (AM Peak)</span>
            <span>13:00 (Noon)</span>
            <span className="text-orange-400 font-semibold">18:00 (PM Peak)</span>
            <span>22:00</span>
          </div>
        </div>

        {/* 5. Emergency Incident Presets */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            Emergency Presets
          </div>
          <div className="grid grid-cols-1 gap-2">
            {PRESET_INCIDENTS.map(preset => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs ${
                  activePresetId === preset.id
                    ? 'bg-red-950/40 border-red-500/60 text-slate-100 shadow-md'
                    : 'bg-dark-950/40 hover:bg-dark-850/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-100 flex items-center justify-between">
                  <span>{preset.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{preset.defaultTime}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 6. Emergency Origin Node Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
            Emergency Location Scene
          </label>
          <select
            value={selectedStartNodeId}
            onChange={(e) => onSelectStartNode(e.target.value)}
            disabled={isEnRoute}
            className="w-full bg-dark-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            {network && network.nodes.map(node => (
              <option key={node.id} value={node.id}>
                {node.id}: {node.name} {node.isHospital ? '(Hospital)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
