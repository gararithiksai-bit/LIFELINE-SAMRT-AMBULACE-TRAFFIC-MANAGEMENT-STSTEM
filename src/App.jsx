import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RoadNetwork } from './engine/network.js';
import { NODES, EDGES, HOSPITALS, PRESET_INCIDENTS } from './data/roadNetwork.js';
import {
  createInitialSimulationState,
  dispatchAmbulance,
  tickSimulation,
  handleDynamicReroute
} from './engine/simulation.js';
import { findAlternativeRoutes, findShortestPath, findBestHospital } from './engine/routing.js';
import Navbar from './components/Navbar.jsx';
import MapView from './components/MapView.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import IncidentControls from './components/IncidentControls.jsx';
import Dashboard from './components/Dashboard.jsx';
import Legend from './components/Legend.jsx';
import ExplainPanel from './components/ExplainPanel.jsx';
import ComparisonChart from './components/ComparisonChart.jsx';
import RoadmapModal from './components/RoadmapModal.jsx';

export default function App() {
  // Graph network instance (memoized)
  const network = useMemo(() => new RoadNetwork(NODES, EDGES), []);

  // Primary State
  const [simulationState, setSimulationState] = useState(() => createInitialSimulationState());
  const [simulationTime, setSimulationTime] = useState('08:45'); // Morning peak by default
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(2); // 2x default for smooth demo
  const [corridorActive, setCorridorActive] = useState(true);
  const [blockedEdgeIds, setBlockedEdgeIds] = useState([]);
  const [selectedStartNodeId, setSelectedStartNodeId] = useState('N1');
  const [activePresetId, setActivePresetId] = useState('P1');
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);

  // Modals
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  // Active side panel tab for mobile
  const [mobileTab, setMobileTab] = useState('map'); // 'map' | 'controls' | 'telemetry'

  // Ref to hold mutable simulation state for high-frequency animation frames without re-render storms
  const stateRef = useRef(simulationState);
  stateRef.current = simulationState;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;

  const corridorRef = useRef(corridorActive);
  corridorRef.current = corridorActive;

  const blockedRef = useRef(blockedEdgeIds);
  blockedRef.current = blockedEdgeIds;

  const simTimeRef = useRef(simulationTime);
  simTimeRef.current = simulationTime;

  // Animation frame loop for 60fps smooth ambulance progress
  useEffect(() => {
    let lastTimestamp = performance.now();
    let animationFrameId;

    const loop = (timestamp) => {
      const deltaMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Bound delta to prevent huge jumps when tab switches
      const deltaSeconds = Math.min(0.1, deltaMs / 1000);

      if (isPlayingRef.current && stateRef.current.status === 'EN_ROUTE') {
        const deltaSimSeconds = deltaSeconds * speedRef.current;
        const nextState = tickSimulation(stateRef.current, network, deltaSimSeconds, {
          simulationTime: simTimeRef.current,
          corridorActive: corridorRef.current,
          blockedEdgeIds: blockedRef.current
        });

        if (nextState !== stateRef.current) {
          setSimulationState(nextState);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [network]);

  // Dispatch Ambulance Handler
  const handleDispatch = useCallback(() => {
    const nextState = dispatchAmbulance(network, selectedStartNodeId, HOSPITALS, {
      simulationTime,
      blockedEdgeIds,
      corridorActive
    });

    if (nextState) {
      setSimulationState(nextState);
      setIsPlaying(true);

      // Compute alternative routes for explainability panel
      if (nextState.targetHospital) {
        const alternatives = findAlternativeRoutes(
          network,
          selectedStartNodeId,
          nextState.targetHospital.nodeId,
          { simulationTime, blockedEdgeIds, corridorActive },
          3
        );
        setAlternativeRoutes(alternatives);
      }
    }
  }, [network, selectedStartNodeId, simulationTime, blockedEdgeIds, corridorActive]);

  // Play / Pause Toggle
  const handleTogglePlay = useCallback(() => {
    if (simulationState.status === 'IDLE') {
      handleDispatch();
    } else {
      setIsPlaying(prev => !prev);
    }
  }, [simulationState.status, handleDispatch]);

  // Reset Simulation
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    const initial = createInitialSimulationState();
    initial.startNodeId = selectedStartNodeId;
    const startNode = network.getNode(selectedStartNodeId);
    if (startNode) {
      initial.currentPosition = { lat: startNode.lat, lng: startNode.lng };
    }
    setSimulationState(initial);
  }, [network, selectedStartNodeId]);

  // Toggle Emergency Corridor
  const handleToggleCorridor = useCallback(() => {
    setCorridorActive(prev => {
      const next = !prev;
      // Re-evaluate routes dynamically when corridor toggles
      if (stateRef.current.status === 'EN_ROUTE') {
        const rerouted = handleDynamicReroute(stateRef.current, network, blockedRef.current, HOSPITALS, {
          simulationTime: simTimeRef.current,
          corridorActive: next
        });
        setSimulationState({
          ...rerouted,
          logs: [
            ...rerouted.logs,
            {
              id: `L_${Date.now()}_corr`,
              timestamp: simTimeRef.current,
              type: 'SYSTEM',
              message: next
                ? 'EMERGENCY CORRIDOR ACTIVATED: Traffic signals forced green. Speeds boosted 20%.'
                : 'Emergency corridor deactivated. Reverted to standard signal timings.'
            }
          ]
        });
      }
      return next;
    });
  }, [network]);

  // Block Road Immediately Ahead of Ambulance
  const handleBlockRoadAhead = useCallback(() => {
    if (simulationState.status !== 'EN_ROUTE') return;
    const { activeRoute, currentEdgeIndex } = simulationState;
    if (!activeRoute || !activeRoute.edges) return;

    // Pick upcoming edge (either next edge, or next-next edge)
    const upcomingIndex = Math.min(activeRoute.edges.length - 1, currentEdgeIndex + 1);
    const targetEdge = activeRoute.edges[upcomingIndex];
    if (!targetEdge) return;

    if (!blockedEdgeIds.includes(targetEdge.id)) {
      const newBlocked = [...blockedEdgeIds, targetEdge.id];
      setBlockedEdgeIds(newBlocked);

      const rerouted = handleDynamicReroute(simulationState, network, newBlocked, HOSPITALS, {
        simulationTime,
        corridorActive
      });

      setSimulationState({
        ...rerouted,
        logs: [
          ...rerouted.logs,
          {
            id: `L_${Date.now()}_inc`,
            timestamp: simulationTime,
            type: 'CRITICAL',
            message: `INCIDENT REPORTED: Road ${targetEdge.street || targetEdge.id} blocked directly ahead! Rerouting initiated.`
          }
        ]
      });
    }
  }, [simulationState, blockedEdgeIds, network, simulationTime, corridorActive]);

  // Generate Random City Incident
  const handleGenerateRandomIncident = useCallback(() => {
    const unblockedEdges = network.edges.filter(e => !blockedEdgeIds.includes(e.id));
    if (unblockedEdges.length === 0) return;

    const randomEdge = unblockedEdges[Math.floor(Math.random() * unblockedEdges.length)];
    const newBlocked = [...blockedEdgeIds, randomEdge.id];
    setBlockedEdgeIds(newBlocked);

    if (simulationState.status === 'EN_ROUTE') {
      const rerouted = handleDynamicReroute(simulationState, network, newBlocked, HOSPITALS, {
        simulationTime,
        corridorActive
      });
      setSimulationState({
        ...rerouted,
        logs: [
          ...rerouted.logs,
          {
            id: `L_${Date.now()}_rnd`,
            timestamp: simulationTime,
            type: 'CRITICAL',
            message: `RANDOM INCIDENT: ${randomEdge.street || randomEdge.id} closed due to road obstacle.`
          }
        ]
      });
    }
  }, [network, blockedEdgeIds, simulationState, simulationTime, corridorActive]);

  // Toggle Block on specific edge (via click on map or list)
  const handleToggleEdgeBlock = useCallback((edgeId) => {
    const isCurrentlyBlocked = blockedEdgeIds.includes(edgeId);
    const newBlocked = isCurrentlyBlocked
      ? blockedEdgeIds.filter(id => id !== edgeId)
      : [...blockedEdgeIds, edgeId];

    setBlockedEdgeIds(newBlocked);

    if (simulationState.status === 'EN_ROUTE') {
      const rerouted = handleDynamicReroute(simulationState, network, newBlocked, HOSPITALS, {
        simulationTime,
        corridorActive
      });
      const edge = network.getEdge(edgeId);
      setSimulationState({
        ...rerouted,
        logs: [
          ...rerouted.logs,
          {
            id: `L_${Date.now()}_toggle`,
            timestamp: simulationTime,
            type: isCurrentlyBlocked ? 'SYSTEM' : 'CRITICAL',
            message: isCurrentlyBlocked
              ? `ROAD OPENED: ${edge?.street || edgeId} cleared for transit.`
              : `ROAD CLOSED: Incident reported on ${edge?.street || edgeId}.`
          }
        ]
      });
    }
  }, [blockedEdgeIds, simulationState, network, simulationTime, corridorActive]);

  // Clear all active road blockages
  const handleClearAllIncidents = useCallback(() => {
    setBlockedEdgeIds([]);
    if (simulationState.status === 'EN_ROUTE') {
      const rerouted = handleDynamicReroute(simulationState, network, [], HOSPITALS, {
        simulationTime,
        corridorActive
      });
      setSimulationState({
        ...rerouted,
        logs: [
          ...rerouted.logs,
          {
            id: `L_${Date.now()}_clear`,
            timestamp: simulationTime,
            type: 'SYSTEM',
            message: 'All city road blockages cleared by municipal traffic control.'
          }
        ]
      });
    }
  }, [simulationState, network, simulationTime, corridorActive]);

  // Map Click Handler: Snaps click to nearest node and sets emergency origin
  const handleMapClick = useCallback((lat, lng) => {
    if (simulationState.status === 'EN_ROUTE') return;
    const { node, distanceKm } = network.findNearestNode(lat, lng);
    if (node) {
      setSelectedStartNodeId(node.id);
      setSimulationState(prev => ({
        ...prev,
        startNodeId: node.id,
        currentPosition: { lat: node.lat, lng: node.lng },
        logs: [
          ...prev.logs,
          {
            id: `L_${Date.now()}`,
            timestamp: simulationTime,
            type: 'SYSTEM',
            message: `Emergency origin location snapped to intersection: ${node.name} (${distanceKm.toFixed(2)} km from click point).`
          }
        ]
      }));
    }
  }, [network, simulationState.status, simulationTime]);

  // Preset Selection Handler
  const handleApplyPreset = useCallback((preset) => {
    setActivePresetId(preset.id);
    setSelectedStartNodeId(preset.nodeId);
    setSimulationTime(preset.defaultTime);
    setBlockedEdgeIds(preset.blockedRoads || []);

    const startNode = network.getNode(preset.nodeId);
    setIsPlaying(false);

    setSimulationState({
      ...createInitialSimulationState(),
      startNodeId: preset.nodeId,
      currentPosition: startNode ? { lat: startNode.lat, lng: startNode.lng } : null,
      logs: [
        {
          id: `L_${Date.now()}`,
          timestamp: preset.defaultTime,
          type: 'SYSTEM',
          message: `PRESET LOADED: "${preset.name}". Origin set to ${preset.nodeName}. ${preset.blockedRoads.length} road blocks applied.`
        }
      ]
    });
  }, [network]);

  // Apply Benchmark Scenario from comparison modal to live map
  const handleApplyScenarioToLive = useCallback((scenario) => {
    setSelectedStartNodeId(scenario.startNodeId);
    setSimulationTime(scenario.time);
    setBlockedEdgeIds(scenario.blockedEdgeIds);
    setCorridorActive(true);
    handleReset();
  }, [handleReset]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-dark-950 text-slate-100 select-none">
      {/* 1. Global Navigation Bar */}
      <Navbar
        simulationTime={simulationTime}
        corridorActive={corridorActive}
        onOpenComparison={() => setShowComparisonModal(true)}
        onOpenRoadmap={() => setShowRoadmapModal(true)}
        onReset={handleReset}
      />

      {/* Mobile Tab Navigation */}
      <div className="flex lg:hidden bg-dark-900 border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setMobileTab('controls')}
          className={`flex-1 py-2 text-center border-b-2 ${mobileTab === 'controls' ? 'border-red-500 text-red-400 bg-dark-850' : 'border-transparent text-slate-400'}`}
        >
          Controls
        </button>
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-center border-b-2 ${mobileTab === 'map' ? 'border-red-500 text-red-400 bg-dark-850' : 'border-transparent text-slate-400'}`}
        >
          Interactive Map
        </button>
        <button
          onClick={() => setMobileTab('telemetry')}
          className={`flex-1 py-2 text-center border-b-2 ${mobileTab === 'telemetry' ? 'border-red-500 text-red-400 bg-dark-850' : 'border-transparent text-slate-400'}`}
        >
          Telemetry &amp; Log
        </button>
      </div>

      {/* 2. Main 3-Column Workstation Layout */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3 relative">
        {/* Left Sidebar: Controls & Incidents */}
        <div className={`w-full lg:w-96 flex flex-col gap-3 shrink-0 h-full overflow-hidden ${
          mobileTab !== 'controls' ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="flex-1 overflow-hidden">
            <ControlPanel
              network={network}
              simulationState={simulationState}
              simulationTime={simulationTime}
              onTimeChange={setSimulationTime}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onReset={handleReset}
              speedMultiplier={speedMultiplier}
              onSpeedChange={setSpeedMultiplier}
              corridorActive={corridorActive}
              onToggleCorridor={handleToggleCorridor}
              onDispatch={handleDispatch}
              selectedStartNodeId={selectedStartNodeId}
              onSelectStartNode={setSelectedStartNodeId}
              onApplyPreset={handleApplyPreset}
              activePresetId={activePresetId}
            />
          </div>

          <div className="shrink-0">
            <IncidentControls
              network={network}
              simulationState={simulationState}
              blockedEdgeIds={blockedEdgeIds}
              onBlockRoadAhead={handleBlockRoadAhead}
              onGenerateRandomIncident={handleGenerateRandomIncident}
              onClearAllIncidents={handleClearAllIncidents}
              onToggleEdgeBlock={handleToggleEdgeBlock}
            />
          </div>
        </div>

        {/* Center: Full Interactive Leaflet Map */}
        <div className={`flex-1 h-full relative overflow-hidden rounded-2xl ${
          mobileTab !== 'map' ? 'hidden lg:block' : 'block'
        }`}>
          <MapView
            network={network}
            simulationState={simulationState}
            simulationTime={simulationTime}
            blockedEdgeIds={blockedEdgeIds}
            corridorActive={corridorActive}
            onMapClick={handleMapClick}
            onToggleEdgeBlock={handleToggleEdgeBlock}
            onSelectNode={setSelectedStartNodeId}
          />
          <Legend />
        </div>

        {/* Right Sidebar: Telemetry & Status Logs */}
        <div className={`w-full lg:w-96 flex flex-col gap-3 shrink-0 h-full overflow-hidden ${
          mobileTab !== 'telemetry' ? 'hidden lg:flex' : 'flex'
        }`}>
          <Dashboard
            simulationState={simulationState}
            corridorActive={corridorActive}
            onOpenExplain={() => setShowExplainModal(true)}
          />
        </div>
      </main>

      {/* 3. Modals */}
      <ExplainPanel
        isOpen={showExplainModal}
        onClose={() => setShowExplainModal(false)}
        simulationState={simulationState}
        alternativeRoutes={alternativeRoutes}
        blockedEdgeIds={blockedEdgeIds}
      />

      <ComparisonChart
        network={network}
        hospitals={HOSPITALS}
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        onApplyScenarioToLive={handleApplyScenarioToLive}
      />

      <RoadmapModal
        isOpen={showRoadmapModal}
        onClose={() => setShowRoadmapModal(false)}
      />
    </div>
  );
}
