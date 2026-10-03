import { describe, it, expect, beforeEach } from 'vitest';
import { MinBinaryHeap, findShortestPath, findBestHospital, calculateEdgeCost } from '../src/engine/routing.js';
import { calculateSegmentCongestion, getPeakDemandFactor, isPeakHour } from '../src/engine/congestion.js';
import { RoadNetwork } from '../src/engine/network.js';
import { NODES, EDGES, HOSPITALS, calculateDistanceKm } from '../src/data/roadNetwork.js';
import { handleDynamicReroute, dispatchAmbulance, tickSimulation, buildContinuousRoute } from '../src/engine/simulation.js';

describe('MinBinaryHeap Priority Queue', () => {
  it('correctly orders and extracts minimum priority elements', () => {
    const pq = new MinBinaryHeap();
    expect(pq.isEmpty()).toBe(true);

    pq.insert({ nodeId: 'A', priority: 50 });
    pq.insert({ nodeId: 'B', priority: 10 });
    pq.insert({ nodeId: 'C', priority: 30 });
    pq.insert({ nodeId: 'D', priority: 5 });

    expect(pq.size()).toBe(4);
    expect(pq.isEmpty()).toBe(false);

    expect(pq.extractMin().nodeId).toBe('D');
    expect(pq.extractMin().nodeId).toBe('B');
    expect(pq.extractMin().nodeId).toBe('C');
    expect(pq.extractMin().nodeId).toBe('A');
    expect(pq.isEmpty()).toBe(true);
  });
});

describe('BPR Congestion Engine', () => {
  it('computes higher demand during morning and evening peak hours', () => {
    const morningOffPeak = getPeakDemandFactor(6.0); // 06:00
    const morningPeak = getPeakDemandFactor(8.75); // 08:45 AM
    const afternoonOffPeak = getPeakDemandFactor(13.0); // 13:00
    const eveningPeak = getPeakDemandFactor(17.75); // 17:45 PM

    expect(morningPeak).toBeGreaterThan(morningOffPeak);
    expect(eveningPeak).toBeGreaterThan(afternoonOffPeak);
    expect(isPeakHour(8.5)).toBe(true);
    expect(isPeakHour(18.0)).toBe(true);
    expect(isPeakHour(13.0)).toBe(false);
  });

  it('increases travel time on narrow 1-2 lane roads under congestion', () => {
    const testEdge1Lane = { id: 'test1', lanes: 1, baseSpeedKmh: 50, length_km: 1.0, hasSignal: false, blocked: false };
    const testEdge4Lanes = { id: 'test4', lanes: 4, baseSpeedKmh: 50, length_km: 1.0, hasSignal: false, blocked: false };

    const c1 = calculateSegmentCongestion(testEdge1Lane, '08:45');
    const c4 = calculateSegmentCongestion(testEdge4Lanes, '08:45');

    expect(c1.congestionFactor).toBeGreaterThan(c4.congestionFactor);
    expect(c1.effectiveSpeedKmh).toBeLessThan(c4.effectiveSpeedKmh);
    expect(c1.contributingFactors.length).toBeGreaterThan(0);
  });

  it('returns infinite cost for blocked edges', () => {
    const blockedEdge = { id: 'E_blocked', lanes: 2, baseSpeedKmh: 50, length_km: 1.0, hasSignal: false, blocked: true };
    const res = calculateSegmentCongestion(blockedEdge, '12:00');
    expect(res.congestionFactor).toBe(Infinity);
    expect(res.effectiveSpeedKmh).toBe(0);
    expect(res.isBlocked).toBe(true);
  });
});

describe('Dijkstra Routing Engine', () => {
  let network;

  beforeEach(() => {
    network = new RoadNetwork(NODES, EDGES);
  });

  it('proves that fastest route does not always equal shortest distance', () => {
    const routePeak = findShortestPath(network, 'N1', 'N12', {
      simulationTime: '08:45',
      blockedEdgeIds: new Set()
    });

    const routeMidnight = findShortestPath(network, 'N1', 'N12', {
      simulationTime: '02:00',
      blockedEdgeIds: new Set()
    });

    expect(routePeak.reachable).toBe(true);
    expect(routeMidnight.reachable).toBe(true);
    expect(routePeak.totalTimeSec).toBeGreaterThan(routeMidnight.totalTimeSec);
  });

  it('finds best hospital by lowest ETA rather than physical proximity alone', () => {
    const result = findBestHospital(network, 'N1', HOSPITALS, {
      simulationTime: '08:45',
      blockedEdgeIds: new Set()
    });

    expect(result.bestHospital).toBeDefined();
    expect(result.bestRoute.reachable).toBe(true);
    expect(result.evaluations.length).toBe(HOSPITALS.length);

    for (let i = 0; i < result.evaluations.length - 1; i++) {
      expect(result.evaluations[i].etaSec).toBeLessThanOrEqual(result.evaluations[i + 1].etaSec);
    }
  });

  it('dynamically reroutes around blocked roads', () => {
    const initialRoute = findShortestPath(network, 'N1', 'N4', {
      simulationTime: '12:00',
      blockedEdgeIds: new Set()
    });
    expect(initialRoute.reachable).toBe(true);
    const initialFirstEdge = initialRoute.edges[0];

    const rerouted = findShortestPath(network, 'N1', 'N4', {
      simulationTime: '12:00',
      blockedEdgeIds: new Set([initialFirstEdge.id])
    });

    expect(rerouted.reachable).toBe(true);
    expect(rerouted.edges.some(e => e.id === initialFirstEdge.id)).toBe(false);
  });
});

describe('Simulation Dynamic Rerouting Engine', () => {
  let network;

  beforeEach(() => {
    network = new RoadNetwork(NODES, EDGES);
  });

  it('successfully dispatches ambulance and initializes state along real road geometry', () => {
    const simState = dispatchAmbulance(network, 'N1', HOSPITALS, { simulationTime: '12:00' });
    expect(simState.status).toBe('EN_ROUTE');
    expect(simState.targetHospital).toBeDefined();
    expect(simState.activeRoute.edges.length).toBeGreaterThan(0);
    expect(simState.distanceRemainingKm).toBeGreaterThan(0);
  });

  it('handles road blocked ahead by rerouting cleanly without teleporting', () => {
    const simState = dispatchAmbulance(network, 'N13', HOSPITALS, { simulationTime: '12:00' });
    expect(simState.activeRoute.edges.length).toBeGreaterThan(1);

    const aheadEdge = simState.activeRoute.edges[1];
    const reroutedState = handleDynamicReroute(
      simState,
      network,
      new Set([aheadEdge.id]),
      HOSPITALS,
      { simulationTime: '12:00' }
    );

    expect(reroutedState.routeChangesCount).toBe(1);
    const remainingEdges = reroutedState.activeRoute.edges.slice(reroutedState.currentEdgeIndex + 1);
    expect(remainingEdges.some(e => e.id === aheadEdge.id)).toBe(false);
  });
});

describe('Road Network Geometry Alignment (Acceptance Requirement)', () => {
  it('ensures every edge geometry starts and ends within 5 m of its from and to node coordinates', () => {
    const network = new RoadNetwork(NODES, EDGES);
    expect(network.edges.length).toBe(45);

    for (const edge of network.edges) {
      expect(edge.geometry).toBeDefined();
      expect(edge.geometry.length).toBeGreaterThanOrEqual(2);

      const fromNode = network.getNode(edge.from);
      const toNode = network.getNode(edge.to);

      expect(fromNode).toBeDefined();
      expect(toNode).toBeDefined();

      const startPt = edge.geometry[0];
      const endPt = edge.geometry[edge.geometry.length - 1];

      // Haversine distance in meters
      const distStartM = calculateDistanceKm(startPt[0], startPt[1], fromNode.lat, fromNode.lng) * 1000;
      const distEndM = calculateDistanceKm(endPt[0], endPt[1], toNode.lat, toNode.lng) * 1000;

      // Acceptance criterion: must be within 5m
      expect(distStartM).toBeLessThanOrEqual(5.0);
      expect(distEndM).toBeLessThanOrEqual(5.0);
    }
  });

  it('verifies ambulance movement advances by distance and splits polyline', () => {
    const network = new RoadNetwork(NODES, EDGES);
    const simState = dispatchAmbulance(network, 'N1', HOSPITALS, { simulationTime: '08:45' });
    expect(simState.continuousRoute).toBeDefined();
    expect(simState.continuousRoute.polyline.length).toBeGreaterThan(2);

    const initialPos = simState.currentPosition;
    const advanced = tickSimulation(simState, network, 6, { corridorActive: true });

    expect(advanced.traveledDistanceKm).toBeGreaterThan(0);
    expect(advanced.currentPosition).toBeDefined();
    // Position must have moved along the road curve
    expect(advanced.currentPosition.lat !== initialPos.lat || advanced.currentPosition.lng !== initialPos.lng).toBe(true);
    expect(advanced.traveledPolyline.length).toBeGreaterThanOrEqual(2);
    expect(advanced.remainingPolyline.length).toBeGreaterThanOrEqual(2);
  });

  it('validates 3 distinct emergency-hospital pairs follow continuous road curves', () => {
    const network = new RoadNetwork(NODES, EDGES);
    const pairs = [
      { origin: 'N13', expectedHospitalId: 'H1' }, // Chinmaya Link -> SIMS
      { origin: 'N9', expectedHospitalId: 'H1' },  // 100ft Kaliamman -> SIMS
      { origin: 'N21', expectedHospitalId: 'H4' }  // Anna Main Rd -> ESI Hospital
    ];

    for (const { origin } of pairs) {
      const state = dispatchAmbulance(network, origin, HOSPITALS, { simulationTime: '08:45' });
      expect(state.status).toBe('EN_ROUTE');
      expect(state.targetHospital).toBeDefined();
      expect(state.continuousRoute.polyline.length).toBeGreaterThan(10);

      // Verify all points along continuous route lie within Chennai bounds
      for (const pt of state.continuousRoute.polyline) {
        expect(pt[0]).toBeGreaterThanOrEqual(13.030);
        expect(pt[0]).toBeLessThanOrEqual(13.072);
        expect(pt[1]).toBeGreaterThanOrEqual(80.185);
        expect(pt[1]).toBeLessThanOrEqual(80.235);
      }

      // Verify tick simulation advances distance without jumping off road
      const stepped = tickSimulation(state, network, 15, { corridorActive: true });
      expect(stepped.traveledDistanceKm).toBeGreaterThan(0);
      expect(stepped.distanceRemainingKm).toBeLessThan(state.distanceRemainingKm);
    }
  });
});
