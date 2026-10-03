import React from 'react';
import { AlertOctagon, Shuffle, X, Ban, ShieldCheck, Flame } from 'lucide-react';

export default function IncidentControls({
  network,
  simulationState,
  blockedEdgeIds,
  onBlockRoadAhead,
  onGenerateRandomIncident,
  onClearAllIncidents,
  onToggleEdgeBlock
}) {
  const isEnRoute = simulationState?.status === 'EN_ROUTE';
  const blockedCount = blockedEdgeIds.length;

  return (
    <div className="bg-dark-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide">Incident Injection</h3>
            <p className="text-[10px] text-slate-400">Dynamic Obstacles & Road Closures</p>
          </div>
        </div>

        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
          blockedCount > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400'
        }`}>
          {blockedCount} Active Block{blockedCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          id="block-ahead-btn"
          onClick={onBlockRoadAhead}
          disabled={!isEnRoute}
          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
            isEnRoute
              ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/50 hover:border-red-500 active:scale-95'
              : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed'
          }`}
          title={isEnRoute ? "Block road segment directly ahead of ambulance" : "Dispatch ambulance first to block ahead"}
        >
          <Ban className="w-3.5 h-3.5 text-red-400" />
          Block Road Ahead
        </button>

        <button
          id="random-incident-btn"
          onClick={onGenerateRandomIncident}
          className="py-2 px-3 rounded-xl font-bold text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-500 transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
        >
          <Shuffle className="w-3.5 h-3.5 text-amber-400" />
          Random Incident
        </button>
      </div>

      {/* Active Incidents List */}
      {blockedCount > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Blocked Segments</span>
            <button
              onClick={onClearAllIncidents}
              className="text-[10px] text-red-400 hover:text-red-300 underline font-normal"
            >
              Clear All ({blockedCount})
            </button>
          </div>

          <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
            {blockedEdgeIds.map(edgeId => {
              const edge = network?.getEdge(edgeId);
              return (
                <div
                  key={edgeId}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-red-950/30 border border-red-500/30 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                    <span className="font-semibold text-red-300 truncate">{edge?.street || edgeId}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({edge?.from} ↔ {edge?.to})</span>
                  </div>
                  <button
                    onClick={() => onToggleEdgeBlock(edgeId)}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-white transition-colors"
                    title="Unblock road"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-2 px-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
          <span>All roads open. Click any road on map or buttons above to inject incidents.</span>
        </div>
      )}
    </div>
  );
}
