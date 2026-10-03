/**
 * LIFELINE — Routing Engine (Dijkstra + Min-Heap Priority Queue)
 *
 * Implements:
 * 1. Binary Min-Heap Priority Queue from scratch.
 * 2. Multi-factor Dijkstra cost function (travel time in seconds, signals, corridor benefit).
 * 3. K-alternative routes via edge penalty method for decision explainability.
 * 4. Multi-hospital evaluator to select the optimal destination by lowest ETA.
 */

import { calculateSegmentCongestion } from './congestion.js';

/**
 * Custom Binary Min-Heap Priority Queue
 */
export class MinBinaryHeap {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  insert(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return min;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority < this.heap[parentIndex].priority) {
        this._swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  _bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      let leftChild = 2 * index + 1;
      let rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].priority < this.heap[smallest].priority) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].priority < this.heap[smallest].priority) {
        smallest = rightChild;
      }

      if (smallest !== index) {
        this._swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

/**
 * Calculate the exact travel time cost of traversing an edge
 *
 * Edge Cost = Travel Time (sec)
 *           = (Length / (BaseSpeed / CongestionFactor)) + IntersectionDelay + BlockPenalty - CorridorBenefit
 */
export function calculateEdgeCost(edge, options = {}) {
  const {
    simulationTime = '12:00',
    blockedEdgeIds = new Set(),
    network = null,
    corridorActive = false,
    penalties = new Map() // edgeId -> penaltyMultiplier (for k-shortest alternatives)
  } = options;

  const blockedSet = blockedEdgeIds instanceof Set ? blockedEdgeIds : new Set(blockedEdgeIds);

  // If blocked, travel time is infinite
  if (edge.blocked || blockedSet.has(edge.id)) {
    return {
      travelTimeSec: Infinity,
      freeFlowTimeSec: Infinity,
      signalDelaySec: 0,
      corridorDiscountSec: 0,
      effectiveSpeedKmh: 0,
      congestionFactor: Infinity,
      isBlocked: true,
      lengthKm: edge.length_km
    };
  }

  // Calculate congestion factor via BPR engine
  const congestion = calculateSegmentCongestion(edge, simulationTime, blockedSet, network);
  const congestionFactor = congestion.congestionFactor;
  const effectiveSpeedKmh = Math.max(8, edge.baseSpeedKmh / congestionFactor);

  // Traversal time in seconds = (km / (km/h)) * 3600
  const freeFlowTimeSec = (edge.length_km / edge.baseSpeedKmh) * 3600;
  let traversalTimeSec = (edge.length_km / effectiveSpeedKmh) * 3600;

  // Signalized intersection delay (seconds)
  // Normal signal: 14s avg delay; Corridor active: green wave reduces signal delay to 2s
  let signalDelaySec = 0;
  if (edge.hasSignal) {
    signalDelaySec = corridorActive ? 2 : 14;
  } else {
    signalDelaySec = corridorActive ? 0 : 3;
  }

  // Emergency Corridor Priority Benefit:
  // Vehicles yield, road clearing allows 20% speed boost over congested baseline
  let corridorDiscountSec = 0;
  if (corridorActive) {
    corridorDiscountSec = traversalTimeSec * 0.20;
    traversalTimeSec = Math.max(traversalTimeSec * 0.80, (edge.length_km / (edge.baseSpeedKmh * 1.15)) * 3600);
  }

  // Apply any routing penalties for alternative path generation
  const penaltyMultiplier = penalties.get(edge.id) || 1.0;
  let totalCostSec = (traversalTimeSec + signalDelaySec) * penaltyMultiplier;

  return {
    travelTimeSec: parseFloat(totalCostSec.toFixed(2)),
    baseTraversalSec: parseFloat(traversalTimeSec.toFixed(2)),
    freeFlowTimeSec: parseFloat(freeFlowTimeSec.toFixed(2)),
    signalDelaySec: parseFloat(signalDelaySec.toFixed(2)),
    corridorDiscountSec: parseFloat(corridorDiscountSec.toFixed(2)),
    effectiveSpeedKmh: parseFloat(effectiveSpeedKmh.toFixed(1)),
    congestionFactor,
    confidence: congestion.confidence,
    contributingFactors: congestion.contributingFactors,
    isBlocked: false,
    lengthKm: edge.length_km,
    street: edge.street || edge.id
  };
}

/**
 * Dijkstra shortest-time path algorithm
 *
 * @param {RoadNetwork} network
 * @param {string} startNodeId
 * @param {string} targetNodeId
 * @param {Object} options - { simulationTime, blockedEdgeIds, corridorActive, penalties }
 */
export function findShortestPath(network, startNodeId, targetNodeId, options = {}) {
  const distances = new Map();
  const previous = new Map();
  const edgeUsed = new Map();
  const costBreakdown = new Map();
  const pq = new MinBinaryHeap();

  // Initialize nodes
  for (const node of network.nodes) {
    distances.set(node.id, Infinity);
  }

  distances.set(startNodeId, 0);
  pq.insert({ nodeId: startNodeId, priority: 0 });

  while (!pq.isEmpty()) {
    const { nodeId: currentId, priority: currentDist } = pq.extractMin();

    if (currentDist > distances.get(currentId)) continue;
    if (currentId === targetNodeId) break;

    const neighbors = network.getNeighbors(currentId);
    for (const neighbor of neighbors) {
      const edge = network.getEdge(neighbor.edgeId);
      const costInfo = calculateEdgeCost(edge, { ...options, network });

      if (costInfo.isBlocked || costInfo.travelTimeSec === Infinity) continue;

      const altDistance = currentDist + costInfo.travelTimeSec;

      if (altDistance < distances.get(neighbor.targetNodeId)) {
        distances.set(neighbor.targetNodeId, altDistance);
        previous.set(neighbor.targetNodeId, currentId);
        edgeUsed.set(neighbor.targetNodeId, edge);
        costBreakdown.set(neighbor.targetNodeId, costInfo);

        pq.insert({
          nodeId: neighbor.targetNodeId,
          priority: altDistance
        });
      }
    }
  }

  // Check if target is unreachable
  if (distances.get(targetNodeId) === Infinity || !previous.has(targetNodeId) && startNodeId !== targetNodeId) {
    return {
      reachable: false,
      nodes: [],
      edges: [],
      edgeCostBreakdowns: [],
      totalTimeSec: Infinity,
      totalDistanceKm: 0,
      startNodeId,
      targetNodeId
    };
  }

  // Reconstruct path backwards
  const pathNodes = [];
  const pathEdges = [];
  const edgeCostBreakdowns = [];
  let curr = targetNodeId;

  while (curr !== startNodeId) {
    pathNodes.unshift(curr);
    const edge = edgeUsed.get(curr);
    if (edge) {
      pathEdges.unshift(edge);
      edgeCostBreakdowns.unshift(costBreakdown.get(curr));
    }
    curr = previous.get(curr);
  }
  pathNodes.unshift(startNodeId);

  // Compute aggregated stats
  let totalDistanceKm = 0;
  let totalSignalDelaySec = 0;
  let totalFreeFlowSec = 0;
  let totalCorridorDiscountSec = 0;

  for (const c of edgeCostBreakdowns) {
    totalDistanceKm += c.lengthKm;
    totalSignalDelaySec += c.signalDelaySec;
    totalFreeFlowSec += c.freeFlowTimeSec;
    totalCorridorDiscountSec += c.corridorDiscountSec;
  }

  return {
    reachable: true,
    nodes: pathNodes,
    edges: pathEdges,
    edgeCostBreakdowns,
    totalTimeSec: parseFloat(distances.get(targetNodeId).toFixed(1)),
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    totalSignalDelaySec: parseFloat(totalSignalDelaySec.toFixed(1)),
    totalFreeFlowSec: parseFloat(totalFreeFlowSec.toFixed(1)),
    totalCorridorDiscountSec: parseFloat(totalCorridorDiscountSec.toFixed(1)),
    startNodeId,
    targetNodeId
  };
}

/**
 * Generate Top 2-3 Alternative Routes for Explainability
 * Uses edge penalty method to find diverse alternative paths.
 */
export function findAlternativeRoutes(network, startNodeId, targetNodeId, options = {}, k = 3) {
  const routes = [];
  const penalties = new Map();

  // Primary optimal route
  const primaryRoute = findShortestPath(network, startNodeId, targetNodeId, { ...options, penalties });
  if (!primaryRoute.reachable) return [];
  routes.push({
    ...primaryRoute,
    label: 'Primary Optimal Route',
    penaltyFactor: 1.0,
    timeDeltaSec: 0,
    reason: 'Selected by LIFELINE: lowest estimated arrival time (ETA).'
  });

  // Generate k - 1 alternatives
  for (let i = 1; i < k; i++) {
    // Penalize edges from all previous routes
    const previousRoute = routes[i - 1];
    for (const edge of previousRoute.edges) {
      const currentPenalty = penalties.get(edge.id) || 1.0;
      penalties.set(edge.id, currentPenalty + 0.65); // Add 65% cost penalty
    }

    const altRoute = findShortestPath(network, startNodeId, targetNodeId, { ...options, penalties });
    if (!altRoute.reachable) break;

    // Check if this route is substantially distinct from existing routes
    const edgeKey = altRoute.edges.map(e => e.id).join(',');
    const isDuplicate = routes.some(r => r.edges.map(e => e.id).join(',') === edgeKey);

    if (!isDuplicate) {
      // Recompute true cost of alternative route without penalties
      const trueCostInfo = computeRouteCost(network, altRoute.nodes, options);
      const timeDelta = parseFloat((trueCostInfo.totalTimeSec - primaryRoute.totalTimeSec).toFixed(1));

      // Synthesize explainability reason
      let reason = `+${timeDelta}s slower`;
      if (trueCostInfo.maxCongestionFactor > 1.8) {
        reason += ` due to severe bottleneck on ${trueCostInfo.worstEdgeName}`;
      } else if (trueCostInfo.totalSignalDelaySec > primaryRoute.totalSignalDelaySec + 10) {
        reason += ` due to +${Math.round(trueCostInfo.totalSignalDelaySec - primaryRoute.totalSignalDelaySec)}s signal delays`;
      } else {
        reason += ` due to ${parseFloat((trueCostInfo.totalDistanceKm - primaryRoute.totalDistanceKm).toFixed(1))}km longer detour`;
      }

      routes.push({
        ...altRoute,
        totalTimeSec: trueCostInfo.totalTimeSec,
        edgeCostBreakdowns: trueCostInfo.edgeCostBreakdowns,
        label: `Alternative Route ${String.fromCharCode(65 + i)}`,
        penaltyFactor: 1.0 + (i * 0.65),
        timeDeltaSec: timeDelta,
        reason
      });
    }
  }

  return routes;
}

/**
 * Recompute the unpenalized true cost of a fixed path
 */
export function computeRouteCost(network, pathNodes, options = {}) {
  let totalTimeSec = 0;
  let totalDistanceKm = 0;
  let totalSignalDelaySec = 0;
  let maxCongestionFactor = 1.0;
  let worstEdgeName = '';
  const edgeCostBreakdowns = [];

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const fromId = pathNodes[i];
    const toId = pathNodes[i + 1];
    const neighbor = (network.adjacency.get(fromId) || []).find(n => n.targetNodeId === toId);

    if (neighbor) {
      const edge = network.getEdge(neighbor.edgeId);
      const cost = calculateEdgeCost(edge, { ...options, penalties: new Map() });
      edgeCostBreakdowns.push(cost);
      totalTimeSec += cost.travelTimeSec;
      totalDistanceKm += cost.lengthKm;
      totalSignalDelaySec += cost.signalDelaySec;

      if (cost.congestionFactor > maxCongestionFactor) {
        maxCongestionFactor = cost.congestionFactor;
        worstEdgeName = edge.street || edge.id;
      }
    }
  }

  return {
    totalTimeSec: parseFloat(totalTimeSec.toFixed(1)),
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    totalSignalDelaySec: parseFloat(totalSignalDelaySec.toFixed(1)),
    maxCongestionFactor,
    worstEdgeName,
    edgeCostBreakdowns
  };
}

/**
 * Multi-Hospital Evaluator
 * Evaluates all reachable hospitals and selects the one with the lowest ETA.
 */
export function findBestHospital(network, startNodeId, hospitals, options = {}) {
  const evaluations = [];

  for (const hospital of hospitals) {
    const route = findShortestPath(network, startNodeId, hospital.nodeId, options);
    evaluations.push({
      hospital,
      route,
      etaSec: route.reachable ? route.totalTimeSec : Infinity,
      distanceKm: route.reachable ? route.totalDistanceKm : Infinity,
      isReachable: route.reachable
    });
  }

  // Sort by ETA ascending (lowest travel time first)
  evaluations.sort((a, b) => a.etaSec - b.etaSec);

  const bestReachable = evaluations.find(e => e.isReachable && e.etaSec < Infinity);

  return {
    bestHospital: bestReachable ? bestReachable.hospital : null,
    bestRoute: bestReachable ? bestReachable.route : null,
    evaluations
  };
}
