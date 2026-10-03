import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getCongestionStyle } from '../engine/congestion.js';
import { HOSPITALS } from '../data/roadNetwork.js';
import { Eye, EyeOff, Layers, MapPin, Zap } from 'lucide-react';

// Map Event Listener component for user click-to-snap and map recenter
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Controller to auto-pan to ambulance if following
function CameraController({ center, followActive }) {
  const map = useMap();
  useEffect(() => {
    if (followActive && center) {
      map.panTo([center.lat, center.lng], { animate: true, duration: 0.2 });
    }
  }, [center, followActive, map]);
  return null;
}

// Custom Leaflet Icons
function createAmbulanceIcon(heading = 0, isCorridorActive = false) {
  return L.divIcon({
    className: 'custom-ambulance-icon',
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="siren-aura"></div>
        <div style="transform: rotate(${heading}deg); transition: transform 0.12s ease-out;" class="relative z-10 w-9 h-9 rounded-full bg-slate-900 border-2 ${isCorridorActive ? 'border-emerald-400 shadow-[0_0_15px_#22c55e]' : 'border-red-500 shadow-[0_0_15px_#ef4444]'} flex items-center justify-center">
          <svg class="w-5 h-5 ${isCorridorActive ? 'text-emerald-400' : 'text-red-500'} animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8h1v3c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-3h10v3c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-3h1zm-10-4H7V8h2v2zm4 0h-2V8h2v2zm5-1.5L16 6h2.5l1.5 2.5z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

function createHospitalIcon(hospital, isTarget = false) {
  return L.divIcon({
    className: 'custom-hospital-icon',
    html: `
      <div class="relative flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
        <div class="w-7 h-7 rounded-lg ${isTarget ? 'bg-red-600 ring-4 ring-red-400/50 scale-110 shadow-[0_0_20px_#ef4444]' : 'bg-slate-900 border-2 border-red-500'} flex items-center justify-center transition-all duration-300">
          <svg class="w-4 h-4 text-white font-bold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        ${isTarget ? '<span class="mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-red-600 text-white rounded shadow-md whitespace-nowrap uppercase tracking-wider animate-bounce">Target ICU</span>' : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function createEmergencyBeaconIcon() {
  return L.divIcon({
    className: 'custom-beacon-icon',
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="beacon-pulse w-8 h-8 rounded-full bg-red-600/30 flex items-center justify-center">
          <div class="w-4 h-4 rounded-full bg-red-600 border border-white flex items-center justify-center shadow-lg">
            <span class="text-[9px] text-white font-extrabold">!</span>
          </div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function createSignalIcon(isGreen = false) {
  return L.divIcon({
    className: 'custom-signal-icon',
    html: `
      <div class="w-3.5 h-3.5 rounded-full ${isGreen ? 'bg-emerald-500 shadow-[0_0_8px_#22c55e]' : 'bg-amber-500 shadow-[0_0_5px_#f59e0b]'} border border-slate-900 flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

function createBlockedMidpointIcon() {
  return L.divIcon({
    className: 'custom-blocked-x-icon',
    html: `
      <div class="w-5 h-5 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white font-black text-xs shadow-lg -translate-x-1/2 -translate-y-1/2">
        ✕
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
}

function createNodeDebugIcon(nodeId, isSelected = false) {
  return L.divIcon({
    className: 'custom-node-debug-icon',
    html: `
      <div class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${isSelected ? 'bg-red-500 text-white ring-2 ring-white scale-110' : 'bg-slate-900/90 text-cyan-300 border border-cyan-500/60'} shadow-md -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
        ${nodeId}
      </div>
    `,
    iconSize: [28, 18],
    iconAnchor: [14, 9]
  });
}

export default function MapView({
  network,
  simulationState,
  simulationTime,
  blockedEdgeIds,
  corridorActive,
  onMapClick,
  onToggleEdgeBlock,
  onSelectNode
}) {
  // Chennai Vadapalani center and bounds as strictly requested
  const defaultCenter = [13.0508214, 80.2106727];
  const maxBounds = [
    [13.035, 80.190], // Southwest bound
    [13.068, 80.232]  // Northeast bound
  ];

  const [showNodeDebug, setShowNodeDebug] = useState(true);
  const [mapTheme, setMapTheme] = useState('dark');

  const blockedSet = useMemo(() => new Set(blockedEdgeIds), [blockedEdgeIds]);

  // Compute road segments with real road geometry polylines
  const roadPolylines = useMemo(() => {
    if (!network) return [];

    return network.edges.map(edge => {
      const fromNode = network.getNode(edge.from);
      const toNode = network.getNode(edge.to);
      if (!fromNode || !toNode) return null;

      const isBlocked = edge.blocked || blockedSet.has(edge.id);
      const congestionInfo = !isBlocked
        ? { congestionFactor: 1.0, effectiveSpeedKmh: edge.baseSpeedKmh, contributingFactors: [] }
        : { congestionFactor: Infinity, effectiveSpeedKmh: 0, contributingFactors: [] };

      const style = getCongestionStyle(congestionInfo.congestionFactor, isBlocked);

      // Use real road geometry polyline
      const positions = edge.geometry && edge.geometry.length >= 2
        ? edge.geometry
        : [
            [fromNode.lat, fromNode.lng],
            [toNode.lat, toNode.lng]
          ];

      // Midpoint coordinate of the road geometry for blocked "X" marker
      const midIndex = Math.floor(positions.length / 2);
      const midpoint = positions[midIndex];

      return {
        edge,
        positions,
        isBlocked,
        style,
        midpoint,
        fromNode,
        toNode
      };
    }).filter(Boolean);
  }, [network, blockedSet, simulationTime]);

  // Traveled portion of route (dimmed)
  const traveledPolyline = simulationState?.traveledPolyline || [];

  // Remaining portion of route (bright green / corridor glow)
  const remainingPolyline = simulationState?.remainingPolyline || [];

  // Signal nodes that are preempted green by corridor
  const greenSignalsSet = useMemo(() => {
    if (!corridorActive || !simulationState?.activeRoute?.nodes) return new Set();
    const aheadNodeIds = simulationState.activeRoute.nodes.slice(simulationState.currentEdgeIndex || 0);
    return new Set(aheadNodeIds);
  }, [corridorActive, simulationState?.activeRoute, simulationState?.currentEdgeIndex]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-dark-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={15}
        minZoom={14}
        maxZoom={17}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        className={`w-full h-full z-0 ${mapTheme === 'dark' ? 'dark-tiles' : ''}`}
        zoomControl={false}
      >
        {/* OpenStreetMap Basemap (Standard & Free, No API key) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapClickHandler onMapClick={onMapClick} />
        <CameraController
          center={simulationState?.currentPosition}
          followActive={simulationState?.status === 'EN_ROUTE'}
        />

        {/* 1. Base Road Network Segments (Real Road Shapes) */}
        {roadPolylines.map(({ edge, positions, isBlocked, style, midpoint }) => (
          <React.Fragment key={`edge-${edge.id}`}>
            <Polyline
              positions={positions}
              pathOptions={{
                color: isBlocked ? '#ef4444' : style.color,
                weight: isBlocked ? 4 : 5,
                opacity: isBlocked ? 0.95 : 0.7,
                dashArray: isBlocked ? '8, 8' : undefined,
                lineCap: 'round',
                lineJoin: 'round'
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  if (onToggleEdgeBlock) onToggleEdgeBlock(edge.id);
                }
              }}
            >
              <Tooltip sticky className="custom-leaflet-tooltip bg-dark-900 border border-slate-700 text-slate-200 text-xs p-2 rounded-lg shadow-xl">
                <div>
                  <div className="font-bold text-slate-100 flex items-center justify-between gap-3">
                    <span>{edge.street || edge.id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {isBlocked ? 'BLOCKED' : `${edge.lanes} Lanes`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                    <div>Road Length: <span className="text-slate-200 font-mono">{edge.length_km} km</span> ({positions.length} curve vertices)</div>
                    <div>Base Speed: <span className="text-slate-200 font-mono">{edge.baseSpeedKmh} km/h</span></div>
                    <div>Signal: <span className="text-slate-200">{edge.hasSignal ? 'Traffic Light' : 'Free Flow'}</span></div>
                    <div>Nodes: <span className="text-cyan-400 font-mono">{edge.from} ↔ {edge.to}</span></div>
                    <div className="text-[10px] text-slate-500 italic mt-1">Click road to toggle blockage</div>
                  </div>
                </div>
              </Tooltip>
            </Polyline>

            {/* Blocked Road "X" Marker at Midpoint of Geometry */}
            {isBlocked && midpoint && (
              <Marker
                position={midpoint}
                icon={createBlockedMidpointIcon()}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (onToggleEdgeBlock) onToggleEdgeBlock(edge.id);
                  }
                }}
              >
                <Tooltip direction="top" className="bg-red-950 text-red-200 text-[10px] px-1.5 py-0.5 rounded">
                  Road Blocked: {edge.street || edge.id}
                </Tooltip>
              </Marker>
            )}
          </React.Fragment>
        ))}

        {/* 2. Traveled Route Polyline (Dimmer Cyan/Slate along real road) */}
        {traveledPolyline.length >= 2 && (
          <Polyline
            positions={traveledPolyline}
            pathOptions={{
              color: '#0284c7',
              weight: 6,
              opacity: 0.45,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {/* 3. Remaining Route Polyline (Bright Green / Glowing Corridor along real road) */}
        {remainingPolyline.length >= 2 && (
          <Polyline
            positions={remainingPolyline}
            pathOptions={{
              color: corridorActive ? '#22c55e' : '#10b981',
              weight: 8,
              opacity: 0.95,
              className: corridorActive ? 'corridor-glow' : undefined,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {/* 4. Intersection & Hospital Nodes */}
        {network && network.nodes.map(node => {
          const isOrigin = simulationState?.startNodeId === node.id;
          const hospitalInfo = HOSPITALS.find(h => h.nodeId === node.id);
          const isTargetHospital = simulationState?.targetHospitalNodeId === node.id;
          const isGreenWave = greenSignalsSet.has(node.id);

          if (hospitalInfo) {
            return (
              <Marker
                key={`hospital-${node.id}`}
                position={[node.lat, node.lng]}
                icon={createHospitalIcon(hospitalInfo, isTargetHospital)}
                eventHandlers={{
                  click: () => onSelectNode && onSelectNode(node.id)
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1 text-xs">
                    <div className="font-bold text-slate-900">{hospitalInfo.name}</div>
                    <div className="text-slate-600 mt-0.5">{hospitalInfo.specialty}</div>
                    <div className="text-[11px] font-mono text-emerald-600 mt-1 font-semibold">ICU Capacity: {hospitalInfo.icuBeds} Beds</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Node ID: {node.id} &bull; {node.name}</div>
                  </div>
                </Popup>
              </Marker>
            );
          }

          if (isOrigin) {
            return (
              <Marker
                key={`origin-${node.id}`}
                position={[node.lat, node.lng]}
                icon={createEmergencyBeaconIcon()}
                zIndexOffset={100}
              >
                <Tooltip permanent direction="top" offset={[0, -12]} className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow">
                  Emergency Scene ({node.name})
                </Tooltip>
              </Marker>
            );
          }

          if (node.hasSignal) {
            return (
              <Marker
                key={`signal-${node.id}`}
                position={[node.lat, node.lng]}
                icon={createSignalIcon(isGreenWave)}
              >
                <Tooltip direction="top" className="bg-dark-900 text-slate-200 text-[10px] px-1.5 py-0.5 rounded">
                  {node.name} — {isGreenWave ? 'GREEN WAVE PREEMPTED' : 'Signal Junction'}
                </Tooltip>
              </Marker>
            );
          }

          // Node ID Debug marker if enabled
          if (showNodeDebug) {
            return (
              <Marker
                key={`node-debug-${node.id}`}
                position={[node.lat, node.lng]}
                icon={createNodeDebugIcon(node.id, simulationState?.startNodeId === node.id)}
                eventHandlers={{
                  click: () => onSelectNode && onSelectNode(node.id)
                }}
              >
                <Tooltip direction="bottom" className="bg-dark-950 text-slate-200 text-[10px] px-1.5 py-0.5 rounded">
                  {node.id}: {node.name}
                </Tooltip>
              </Marker>
            );
          }

          return null;
        })}

        {/* 5. Animated Ambulance Marker Following Real Road Geometry */}
        {simulationState?.currentPosition && simulationState.status !== 'IDLE' && (
          <Marker
            position={[simulationState.currentPosition.lat, simulationState.currentPosition.lng]}
            icon={createAmbulanceIcon(simulationState.heading, corridorActive)}
            zIndexOffset={500}
          >
            <Tooltip direction="top" offset={[0, -20]} className="bg-dark-900 border border-slate-700 text-slate-100 text-xs px-2 py-1 rounded shadow-xl">
              <div className="font-bold text-red-400 flex items-center gap-1.5">
                <span>AMBULANCE 108</span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-red-500/20 rounded">
                  {simulationState.currentSpeedKmh} km/h
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                ETA: <span className="font-mono text-emerald-400 font-bold">{Math.round(simulationState.etaSecondsRemaining)}s</span> ({simulationState.distanceRemainingKm} km)
              </div>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Status & Debug Tools on Top of Map */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="glass-panel px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-lg flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
            {simulationState?.status === 'EN_ROUTE' ? 'DISPATCH ACTIVE' : simulationState?.status === 'ARRIVED' ? 'PATIENT TRANSFERRED' : 'STANDBY READY'}
          </span>
        </div>

        {corridorActive && (
          <div className="glass-panel px-3 py-1.5 rounded-lg border border-emerald-500/50 shadow-[0_0_12px_rgba(34,197,94,0.3)] bg-emerald-950/40 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
              EMERGENCY CORRIDOR ON
            </span>
          </div>
        )}

        {/* Node ID Debug Toggle */}
        <button
          id="node-debug-toggle"
          onClick={() => setShowNodeDebug(!showNodeDebug)}
          className={`glass-panel px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg ${
            showNodeDebug
              ? 'bg-cyan-950/50 border-cyan-500/60 text-cyan-300'
              : 'bg-dark-900 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle display of Node IDs (N1-N25) for intersection alignment verification"
        >
          {showNodeDebug ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>Node IDs ({showNodeDebug ? 'ON' : 'OFF'})</span>
        </button>

        {/* Map Theme Toggle */}
        <button
          onClick={() => setMapTheme(mapTheme === 'dark' ? 'standard' : 'dark')}
          className="glass-panel px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 shadow-lg"
          title="Toggle map visual style"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>{mapTheme === 'dark' ? 'Night Vision' : 'Standard OSM'}</span>
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-4 right-4 z-[1000] glass-panel px-3 py-1 rounded-md text-[11px] text-slate-400 border border-slate-800 flex items-center gap-2">
        <MapPin className="w-3 h-3 text-red-400" />
        <span>Vadapalani &bull; Saligramam &bull; Kodambakkam &bull; Ashok Nagar (Chennai)</span>
      </div>
    </div>
  );
}
