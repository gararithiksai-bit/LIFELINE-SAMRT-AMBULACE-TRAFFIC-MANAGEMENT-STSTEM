import React from 'react';
import { X, Rocket, MapPin, Radio, Cpu, Network, Sparkles, Layers, ShieldCheck } from 'lucide-react';

const ROADMAP_ITEMS = [
  {
    icon: MapPin,
    title: 'Live Real-World Traffic Feeds & OpenStreetMap GPS',
    description: 'Direct ingestion of real-time TomTom, HERE, and Google Roads traffic telemetry API feeds with sub-meter coordinate mapping.',
    badge: 'Planned — not in this prototype',
    category: 'Telemetry'
  },
  {
    icon: Radio,
    title: 'IoT Signal-Controller Preemption (NTCIP 1202 / V2I)',
    description: 'Hardware integration with physical city traffic light cabinets using emergency vehicle optical/radio preemption protocols.',
    badge: 'Planned — not in this prototype',
    category: 'Hardware'
  },
  {
    icon: Cpu,
    title: 'Predictive ML Congestion Forecasting (Graph Neural Networks)',
    description: 'Spatio-temporal graph convolutional networks (ST-GCN) predicting bottleneck emergence 15-30 minutes into the future.',
    badge: 'Planned — not in this prototype',
    category: 'AI / Machine Learning'
  },
  {
    icon: Network,
    title: 'Multi-Ambulance & Emergency Fleet Orchestration',
    description: 'Decentralized multi-agent reinforcement learning (MARL) for coordinating simultaneous dispatches without cross-corridor gridlocks.',
    badge: 'Planned — not in this prototype',
    category: 'Fleet Management'
  },
  {
    icon: Layers,
    title: 'City-Scale Deployment & Multi-Jurisdiction CAD Integration',
    description: 'Seamless integration with existing 911 Computer-Aided Dispatch (CAD) systems and statewide trauma triage registries.',
    badge: 'Planned — not in this prototype',
    category: 'Enterprise'
  }
];

export default function RoadmapModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-dark-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">FUTURE SYSTEM ROADMAP</h3>
              <p className="text-xs text-slate-400">Next-Generation Smart City & Emergency Infrastructure Scaling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-200 text-xs">
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 leading-relaxed text-xs">
            <span className="font-bold text-purple-300">Architecture Scope Notice: </span>
            This interactive prototype simulates pure client-side mathematical graph optimization, BPR congestion curves, and virtual emergency corridors. The following capabilities represent future architectural phases.
          </div>

          <div className="space-y-3">
            {ROADMAP_ITEMS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-dark-950/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-start gap-3.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-100 text-xs">{item.title}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-dark-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Close Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}
