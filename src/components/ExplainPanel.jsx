import React from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, ChevronRight, TrendingUp, Info } from 'lucide-react';

export default function ExplainPanel({
  isOpen,
  onClose,
  simulationState,
  alternativeRoutes,
  blockedEdgeIds
}) {
  if (!isOpen) return null;

  const activeRoute = simulationState?.activeRoute;
  const costBreakdowns = activeRoute?.edgeCostBreakdowns || [];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-dark-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <Info className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">EXPLAINABLE ROUTING DECISIONS</h3>
              <p className="text-xs text-slate-400">Algorithmic Cost Breakdown & Alternative Path Evaluations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
          {/* 1. Summary Rationale Banner */}
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-blue-300">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Optimal Route Selected: {activeRoute?.totalDistanceKm} km in ~{Math.round(activeRoute?.totalTimeSec || 0)}s</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs">
              LIFELINE evaluates real-time BPR volume-delay curves, signal cycle preemption, and dynamic incident reports.
              Destination hospital was selected based on the absolute lowest arrival ETA rather than raw geographic proximity.
            </p>
            {blockedEdgeIds.length > 0 && (
              <div className="flex items-center gap-2 text-amber-300 font-medium text-[11px] pt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Safely circumnavigated {blockedEdgeIds.length} active road blockage incident(s) in the network.</span>
              </div>
            )}
          </div>

          {/* 2. Alternative Routes Considered (K-Shortest Paths) */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Comparative Alternative Routes Considered
            </h4>

            <div className="grid grid-cols-1 gap-2.5">
              {alternativeRoutes && alternativeRoutes.length > 0 ? (
                alternativeRoutes.map((alt, index) => (
                  <div
                    key={index}
                    className={`p-3.5 rounded-xl border transition-all ${
                      index === 0
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-100 shadow-sm'
                        : 'bg-dark-950/50 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          index === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {index === 0 ? 'SELECTED (OPTIMAL)' : `OPTION ${String.fromCharCode(65 + index)}`}
                        </span>
                        <span className="text-xs">{alt.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span>{Math.round(alt.totalTimeSec)}s</span>
                        {alt.timeDeltaSec > 0 && (
                          <span className="text-red-400 text-[11px] font-semibold">(+{alt.timeDeltaSec}s)</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400 flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{alt.reason}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-slate-400 italic">Computing alternative paths...</div>
              )}
            </div>
          </div>

          {/* 3. Detailed Per-Segment Cost Breakdown Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
              Segment-by-Segment Dijkstra Cost Formulation
            </h4>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-dark-850 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-2 px-3">Segment / Street</th>
                    <th className="py-2 px-2">Dist</th>
                    <th className="py-2 px-2">BPR Factor</th>
                    <th className="py-2 px-2">Speed</th>
                    <th className="py-2 px-2">Signal</th>
                    <th className="py-2 px-2">Corridor</th>
                    <th className="py-2 px-3 text-right">Net Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {costBreakdowns.map((seg, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-slate-200">
                        {seg.street || `Edge ${idx + 1}`}
                      </td>
                      <td className="py-2 px-2 text-slate-300">{seg.lengthKm} km</td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          seg.congestionFactor < 1.3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {seg.congestionFactor}x
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-300">{seg.effectiveSpeedKmh} km/h</td>
                      <td className="py-2 px-2 text-slate-400">+{seg.signalDelaySec}s</td>
                      <td className="py-2 px-2 text-emerald-400">-{seg.corridorDiscountSec}s</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-100">
                        {Math.round(seg.travelTimeSec)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Contributing Factors Legend */}
          <div className="p-3.5 rounded-xl bg-dark-950/60 border border-slate-800/80 space-y-1.5">
            <span className="font-semibold text-slate-300 text-xs">Cost Function Mathematical Representation:</span>
            <p className="font-mono text-[11px] text-emerald-400/90 bg-dark-900/80 p-2 rounded border border-slate-800">
              Edge Cost = (Length / (BaseSpeed / CongestionFactor)) + IntersectionDelay - CorridorBenefit
            </p>
            <p className="text-[10px] text-slate-500 leading-normal">
              Where CongestionFactor = 1.0 + 0.15 &times; (Volume / Capacity)&sup4; (Bureau of Public Roads standard).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-dark-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
}
