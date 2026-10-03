import React, { useState, useMemo } from 'react';
import {
  BarChart3, Clock, AlertTriangle, ShieldCheck, Zap,
  TrendingDown, CheckCircle2, Play, Award, ArrowRight
} from 'lucide-react';
import { BENCHMARK_SCENARIOS, runScenarioComparison } from '../engine/metrics.js';

export default function ComparisonChart({
  network,
  hospitals,
  isOpen,
  onClose,
  onApplyScenarioToLive
}) {
  const [selectedScenarioId, setSelectedScenarioId] = useState('peak-hour-rush');
  const [comparisonResult, setComparisonResult] = useState(null);

  // Run benchmark comparison whenever scenario changes or modal opens
  const activeResult = useMemo(() => {
    if (!network || !hospitals) return null;
    return runScenarioComparison(network, selectedScenarioId, hospitals);
  }, [network, hospitals, selectedScenarioId]);

  if (!isOpen) return null;

  const currentResult = comparisonResult || activeResult;
  const { scenario, baseline, lifeline, savings } = currentResult || {};

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-dark-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">LIFELINE VS STATIC BASELINE IMPACT ANALYSIS</h3>
              <p className="text-xs text-slate-400">Deterministic Parallel Benchmark & Emergency Optimization Proof</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* 1. Scenario Selection Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Select Controlled Benchmark Scenario
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {BENCHMARK_SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedScenarioId(s.id);
                    setComparisonResult(runScenarioComparison(network, s.id, hospitals));
                  }}
                  className={`p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                    selectedScenarioId === s.id
                      ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg text-slate-100 ring-1 ring-emerald-500/30'
                      : 'bg-dark-950/60 hover:bg-dark-850/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                    <span>{s.title}</span>
                    <span className="font-mono text-[10px] text-emerald-400">{s.time}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {s.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Details & Live Sync Button */}
          <div className="p-3.5 rounded-xl bg-dark-950/70 border border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-300 max-w-xl">
              <span className="font-bold text-emerald-400">Scenario Context: </span>
              {scenario?.description}
            </div>

            <button
              onClick={() => {
                if (onApplyScenarioToLive) {
                  onApplyScenarioToLive(scenario);
                  onClose();
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 hover:border-blue-500 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Load in Live Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Top Savings Highlight Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/40">
              <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Time Saved
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-emerald-300">
                  {savings?.timeSavedSec}s
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  (-{savings?.percentSaved}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Faster critical delivery</div>
            </div>

            <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/50 to-slate-900 border border-blue-500/40">
              <div className="text-[11px] text-blue-400 font-bold uppercase tracking-wide flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Signal Delay Saved
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-blue-300">
                  {savings?.signalDelaySavedSec}s
                </span>
                <span className="text-xs text-slate-400">cleared</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Emergency corridor wave</div>
            </div>

            <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/50 to-slate-900 border border-purple-500/40">
              <div className="text-[11px] text-purple-400 font-bold uppercase tracking-wide flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                Stops Eliminated
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-purple-300">
                  {savings?.stopsSaved}
                </span>
                <span className="text-xs text-slate-400">red lights</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Zero standstill stops</div>
            </div>

            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/50 to-slate-900 border border-amber-500/40">
              <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wide flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                ETA Accuracy
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-amber-300">
                  {lifeline?.etaAccuracyPercent}%
                </span>
                <span className="text-xs text-slate-400 font-mono">vs {baseline?.etaAccuracyPercent}%</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Dynamic prediction reliability</div>
            </div>
          </div>

          {/* 3. Visual SVG Side-by-Side Comparison Charts */}
          <div className="bg-dark-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span>Metric Comparisons (Static Baseline vs LIFELINE)</span>
              <span className="text-[10px] text-slate-400 font-normal">Lower is better</span>
            </h4>

            {/* Travel Time Bar */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-300">Total Travel Time (Seconds to Hospital)</span>
                <span className="font-mono text-emerald-400">LIFELINE {lifeline?.travelTimeSec}s vs Baseline {baseline?.travelTimeSec}s</span>
              </div>
              <div className="space-y-1">
                {/* Baseline Bar */}
                <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, (baseline?.travelTimeSec / (baseline?.travelTimeSec || 1)) * 100)}%` }}
                    className="bg-red-600 h-full rounded-full flex items-center justify-end px-2 text-[10px] font-bold font-mono text-white transition-all duration-500"
                  >
                    Static Baseline: {baseline?.travelTimeSec}s
                  </div>
                </div>
                {/* LIFELINE Bar */}
                <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden flex">
                  <div
                    style={{ width: `${Math.max(15, Math.min(100, (lifeline?.travelTimeSec / (baseline?.travelTimeSec || 1)) * 100))}%` }}
                    className="bg-emerald-500 h-full rounded-full flex items-center justify-end px-2 text-[10px] font-bold font-mono text-slate-950 transition-all duration-500 shadow-[0_0_10px_#22c55e]"
                  >
                    LIFELINE: {lifeline?.travelTimeSec}s (-{savings?.percentSaved}%)
                  </div>
                </div>
              </div>
            </div>

            {/* Signal Delay Bar */}
            <div className="space-y-1.5 text-xs pt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-300">Signalized Intersection Delay</span>
                <span className="font-mono text-blue-400">LIFELINE {lifeline?.signalDelaySec}s vs Baseline {baseline?.signalDelaySec}s</span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, (baseline?.signalDelaySec / Math.max(1, baseline?.signalDelaySec)) * 100)}%` }}
                    className="bg-amber-600 h-full rounded-full flex items-center justify-end px-2 text-[10px] font-bold font-mono text-white transition-all duration-500"
                  >
                    Baseline: {baseline?.signalDelaySec}s wait
                  </div>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden flex">
                  <div
                    style={{ width: `${Math.max(10, Math.min(100, (lifeline?.signalDelaySec / Math.max(1, baseline?.signalDelaySec)) * 100))}%` }}
                    className="bg-blue-500 h-full rounded-full flex items-center justify-end px-2 text-[10px] font-bold font-mono text-white transition-all duration-500"
                  >
                    LIFELINE: {lifeline?.signalDelaySec}s (Preempted)
                  </div>
                </div>
              </div>
            </div>

            {/* Number of Red Light Stops Bar */}
            <div className="space-y-1.5 text-xs pt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-300">Complete Vehicle Stops</span>
                <span className="font-mono text-purple-400">LIFELINE {lifeline?.stopsCount} vs Baseline {baseline?.stopsCount}</span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, (baseline?.stopsCount / Math.max(1, baseline?.stopsCount)) * 100)}%` }}
                    className="bg-rose-700 h-full rounded-full flex items-center justify-end px-2 text-[10px] font-bold font-mono text-white transition-all duration-500"
                  >
                    Baseline: {baseline?.stopsCount} full stops
                  </div>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden flex">
                  <div
                    style={{ width: `${Math.max(5, (lifeline?.stopsCount / Math.max(1, baseline?.stopsCount)) * 100)}%` }}
                    className="bg-purple-500 h-full rounded-full flex items-center justify-end px-2 text-[10px] font-bold font-mono text-white transition-all duration-500"
                  >
                    LIFELINE: {lifeline?.stopsCount} stops
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Comparative Metrics Summary Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-850 text-slate-400 border-b border-slate-800 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Metric Dimension</th>
                  <th className="py-2.5 px-3 text-red-400">Static Baseline</th>
                  <th className="py-2.5 px-3 text-emerald-400">LIFELINE System</th>
                  <th className="py-2.5 px-3 text-right">Net Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                <tr>
                  <td className="py-2 px-3 font-sans text-slate-300">Travel Duration</td>
                  <td className="py-2 px-3 text-slate-300">{baseline?.travelTimeSec}s</td>
                  <td className="py-2 px-3 font-bold text-emerald-400">{lifeline?.travelTimeSec}s</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">-{savings?.percentSaved}% faster</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans text-slate-300">Traffic Signal Latency</td>
                  <td className="py-2 px-3 text-slate-300">+{baseline?.signalDelaySec}s wait</td>
                  <td className="py-2 px-3 text-emerald-400">+{lifeline?.signalDelaySec}s wait</td>
                  <td className="py-2 px-3 text-right text-blue-400 font-bold">-{savings?.signalDelaySavedSec}s delay</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans text-slate-300">Congestion Exposure Rate</td>
                  <td className="py-2 px-3 text-slate-300">{baseline?.congestionExposurePercent}%</td>
                  <td className="py-2 px-3 text-emerald-400">{lifeline?.congestionExposurePercent}%</td>
                  <td className="py-2 px-3 text-right text-purple-400 font-bold">
                    -{Math.max(0, (baseline?.congestionExposurePercent || 0) - (lifeline?.congestionExposurePercent || 0))}% exposure
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans text-slate-300">Dynamic Reroute Flexibility</td>
                  <td className="py-2 px-3 text-red-400">0 (Locked path)</td>
                  <td className="py-2 px-3 text-emerald-400">{lifeline?.routeChanges} dynamic recomputes</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">100% Incident Avoidance</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans text-slate-300">ETA Prediction Reliability</td>
                  <td className="py-2 px-3 text-slate-400">{baseline?.etaAccuracyPercent}%</td>
                  <td className="py-2 px-3 text-emerald-400 font-bold">{lifeline?.etaAccuracyPercent}%</td>
                  <td className="py-2 px-3 text-right text-emerald-400 font-bold">+{(lifeline?.etaAccuracyPercent || 0) - (baseline?.etaAccuracyPercent || 0)}% accuracy</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
