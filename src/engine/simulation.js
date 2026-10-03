/**
 * LIFELINE — Simulation Engine (Real Road-Following Geometry)
 *
 * Implements:
 * 1. Continuous polyline generation by concatenating edge geometries in travel order
 *    with automatic direction reversal.
 * 2. Distance-based vehicle animation along real road curves (no straight-line cuts).
 * 3. Directional bearing rotation, intersection deceleration, and continuous reroute concatenation.
 * 4. Traveled vs Remaining polyline splitting at current vehicle distance.
 */

import { findShortestPath, findBestHospital, calculateEdgeCost } from './routing.js';
import { calculateDistanceKm } from '../data/roadNetwork.js';

export function calculateHeading(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function interpolatePosition(lat1, lon1, lat2, lon2, fraction) {
  return {
    lat: lat1 + (lat2 - lat1) * fraction,
    lng: lon1 + (lon2 - lon1) * fraction
  };
}

/**
 * Builds a continuous road-following polyline by concatenating edge geometries in travel order.
 * Automatically reverses geometries when an edge is traversed in reverse direction.
 */
export function buildContinuousRoute(route, network) {
  if (!route || !route.edges || route.edges.length === 0) {
    return {
      polyline: [],
      cumulativeDistances: [],
      edgeIntervals: [],
      totalDistanceKm: 0
    };
  }

  const polyline = [];
  const edgeIntervals = [];
  let runningDistanceKm = 0;

  for (let i = 0; i < route.edges.length; i++) {
    const edge = route.edges[i];
    const fromId = route.nodes[i];
    const toId = route.nodes[i + 1];
    const fromNode = network.getNode(fromId);
    const toNode = network.getNode(toId);

    // Get edge geometry or straight line fallback
    let rawCoords = edge.geometry && edge.geometry.length >= 2
      ? edge.geometry
      : [
          [fromNode.lat, fromNode.lng],
          [toNode.lat, toNode.lng]
        ];

    // Check travel direction: if traversing to -> from, reverse the geometry points
    let edgeCoords;
    if (edge.from === fromId && edge.to === toId) {
      edgeCoords = rawCoords.map(pt => [...pt]);
    } else if (edge.from === toId && edge.to === fromId) {
      edgeCoords = rawCoords.map(pt => [...pt]).reverse();
    } else {
      // Coordinate distance check
      const dStart = calculateDistanceKm(rawCoords[0][0], rawCoords[0][1], fromNode.lat, fromNode.lng);
      const dEnd = calculateDistanceKm(rawCoords[rawCoords.length - 1][0], rawCoords[rawCoords.length - 1][1], fromNode.lat, fromNode.lng);
      edgeCoords = dStart <= dEnd ? rawCoords.map(pt => [...pt]) : rawCoords.map(pt => [...pt]).reverse();
    }

    // Ensure edge endpoints strictly snap to nodes
    edgeCoords[0] = [fromNode.lat, fromNode.lng];
    edgeCoords[edgeCoords.length - 1] = [toNode.lat, toNode.lng];

    const edgeStartDist = runningDistanceKm;
    const startIndex = polyline.length > 0 ? polyline.length - 1 : 0;

    // Concatenate into single continuous polyline
    for (let j = 0; j < edgeCoords.length; j++) {
      if (j === 0 && polyline.length > 0) {
        // Skip first vertex to avoid duplicate junction point
        continue;
      }
      polyline.push(edgeCoords[j]);
    }

    const endIndex = polyline.length - 1;

    // Calculate edge length from actual polyline points
    let edgeLengthKm = 0;
    for (let k = startIndex; k < endIndex; k++) {
      edgeLengthKm += calculateDistanceKm(
        polyline[k][0], polyline[k][1],
        polyline[k + 1][0], polyline[k + 1][1]
      );
    }

    runningDistanceKm += edgeLengthKm;

    edgeIntervals.push({
      edgeIndex: i,
      edge,
      fromId,
      toId,
      startDistKm: edgeStartDist,
      endDistKm: runningDistanceKm,
      lengthKm: edgeLengthKm,
      startIndex,
      endIndex
    });
  }

  // Precompute cumulative distances along the polyline
  const cumulativeDistances = [0];
  let accDist = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    accDist += calculateDistanceKm(
      polyline[i][0], polyline[i][1],
      polyline[i + 1][0], polyline[i + 1][1]
    );
    cumulativeDistances.push(accDist);
  }

  return {
    polyline,
    cumulativeDistances,
    edgeIntervals,
    totalDistanceKm: parseFloat(accDist.toFixed(3))
  };
}

export function createInitialSimulationState() {
  return {
    status: 'IDLE', // IDLE | EN_ROUTE | REROUTING | ARRIVED | NO_ROUTE
    startNodeId: 'N1',
    targetHospital: null,
    targetHospitalNodeId: null,
    activeRoute: null,
    continuousRoute: null, // { polyline, cumulativeDistances, edgeIntervals, totalDistanceKm }
    traveledDistanceKm: 0,
    currentPosition: null, // { lat, lng }
    heading: 0,
    currentEdgeIndex: 0,
    currentSpeedKmh: 0,
    distanceRemainingKm: 0,
    etaSecondsRemaining: 0,
    totalElapsedSimSeconds: 0,
    routeChangesCount: 0,
    currentSegment: null,
    traveledPolyline: [],
    remainingPolyline: [],
    logs: [
      {
        id: 'L0',
        timestamp: '00:00',
        type: 'SYSTEM',
        message: 'LIFELINE Chennai Emergency Traffic Management initialized. Ready for dispatch.'
      }
    ]
  };
}

/**
 * Handle dispatch event: find best hospital by lowest ETA and initialize continuous road polyline
 */
export function dispatchAmbulance(network, startNodeId, hospitals, options = {}) {
  const startNode = network.getNode(startNodeId);
  if (!startNode) return null;

  const { bestHospital, bestRoute, evaluations } = findBestHospital(network, startNodeId, hospitals, options);

  if (!bestHospital || !bestRoute || !bestRoute.reachable) {
    return {
      status: 'NO_ROUTE',
      logs: [
        {
          id: `L_${Date.now()}`,
          timestamp: options.simulationTime || '12:00',
          type: 'ERROR',
          message: 'CRITICAL: No reachable hospital found from emergency location.'
        }
      ]
    };
  }

  const continuousRoute = buildContinuousRoute(bestRoute, network);
  const firstEdge = bestRoute.edges[0] || null;
  const initialPos = { lat: startNode.lat, lng: startNode.lng };

  let initialHeading = 0;
  if (continuousRoute.polyline.length >= 2) {
    initialHeading = calculateHeading(
      continuousRoute.polyline[0][0], continuousRoute.polyline[0][1],
      continuousRoute.polyline[1][0], continuousRoute.polyline[1][1]
    );
  }

  return {
    status: 'EN_ROUTE',
    startNodeId,
    targetHospital: bestHospital,
    targetHospitalNodeId: bestHospital.nodeId,
    activeRoute: bestRoute,
    continuousRoute,
    hospitalEvaluations: evaluations,
    traveledDistanceKm: 0,
    currentPosition: initialPos,
    heading: initialHeading,
    currentEdgeIndex: 0,
    currentSpeedKmh: firstEdge ? (bestRoute.edgeCostBreakdowns[0]?.effectiveSpeedKmh || 45) : 45,
    distanceRemainingKm: continuousRoute.totalDistanceKm,
    etaSecondsRemaining: bestRoute.totalTimeSec,
    totalElapsedSimSeconds: 0,
    routeChangesCount: 0,
    currentSegment: firstEdge,
    traveledPolyline: [continuousRoute.polyline[0]],
    remainingPolyline: continuousRoute.polyline,
    logs: [
      {
        id: `L_${Date.now()}_1`,
        timestamp: options.simulationTime || '12:00',
        type: 'DISPATCH',
        message: `Ambulance dispatched from ${startNode.name} to ${bestHospital.name}. Lowest ETA: ${Math.round(bestRoute.totalTimeSec)}s (${continuousRoute.totalDistanceKm} km along real road geometry).`
      }
    ]
  };
}

/**
 * Advance the simulation along real road geometry polyline
 */
export function tickSimulation(state, network, deltaSimSeconds, options = {}) {
  if (state.status !== 'EN_ROUTE' && state.status !== 'REROUTING') {
    return state;
  }

  const { continuousRoute, activeRoute, traveledDistanceKm } = state;
  if (!continuousRoute || !continuousRoute.polyline || continuousRoute.polyline.length < 2) {
    return state;
  }

  const totalDist = continuousRoute.totalDistanceKm;

  // Check if arrived at destination
  if (traveledDistanceKm >= totalDist) {
    const lastCoord = continuousRoute.polyline[continuousRoute.polyline.length - 1];
    return {
      ...state,
      status: 'ARRIVED',
      traveledDistanceKm: totalDist,
      distanceRemainingKm: 0,
      etaSecondsRemaining: 0,
      currentSpeedKmh: 0,
      currentPosition: { lat: lastCoord[0], lng: lastCoord[1] },
      traveledPolyline: continuousRoute.polyline,
      remainingPolyline: [],
      logs: [
        ...state.logs,
        {
          id: `L_${Date.now()}_arr`,
          timestamp: options.simulationTime || '12:00',
          type: 'SUCCESS',
          message: `Arrived at destination: ${state.targetHospital?.name}. Total mission time: ${Math.round(state.totalElapsedSimSeconds)}s.`
        }
      ]
    };
  }

  // Find which edge in activeRoute corresponds to current distance
  const currentInterval = continuousRoute.edgeIntervals.find(
    inv => traveledDistanceKm >= inv.startDistKm && traveledDistanceKm <= inv.endDistKm
  ) || continuousRoute.edgeIntervals[continuousRoute.edgeIntervals.length - 1];

  const currentEdgeIndex = currentInterval.edgeIndex;
  const currentEdge = currentInterval.edge;
  const costBreakdown = activeRoute.edgeCostBreakdowns[currentEdgeIndex] || {};

  let effectiveSpeedKmh = costBreakdown.effectiveSpeedKmh || currentEdge.baseSpeedKmh || 40;

  // Corridor priority boost: 20% faster
  if (options.corridorActive) {
    effectiveSpeedKmh *= 1.20;
  } else if (currentEdge.hasSignal) {
    // Slight deceleration when approaching signalized junction without corridor
    const distToEndOfEdge = currentInterval.endDistKm - traveledDistanceKm;
    if (distToEndOfEdge < 0.05) { // within 50m of signal
      effectiveSpeedKmh *= 0.85;
    }
  }

  const speedKmPerSec = effectiveSpeedKmh / 3600;
  const distanceAdvanceKm = speedKmPerSec * deltaSimSeconds;
  const newTraveledDistKm = Math.min(totalDist, traveledDistanceKm + distanceAdvanceKm);

  // Find exact position along polyline via cumulative distance lookup
  const poly = continuousRoute.polyline;
  const cumDist = continuousRoute.cumulativeDistances;

  let k = 0;
  while (k < cumDist.length - 2 && cumDist[k + 1] < newTraveledDistKm) {
    k++;
  }

  const segDist = cumDist[k + 1] - cumDist[k];
  const frac = segDist > 0 ? Math.min(1.0, Math.max(0.0, (newTraveledDistKm - cumDist[k]) / segDist)) : 0;
  const currentPos = interpolatePosition(
    poly[k][0], poly[k][1],
    poly[k + 1][0], poly[k + 1][1],
    frac
  );

  // Calculate bearing to next curve vertex
  const lookaheadIndex = Math.min(poly.length - 1, k + 1);
  const heading = calculateHeading(
    currentPos.lat, currentPos.lng,
    poly[lookaheadIndex][0], poly[lookaheadIndex][1]
  );

  // Split polyline at ambulance position into traveled (dimmed) and remaining (bright green)
  const traveledPolyline = [...poly.slice(0, k + 1), [currentPos.lat, currentPos.lng]];
  const remainingPolyline = [[currentPos.lat, currentPos.lng], ...poly.slice(k + 1)];

  // Remaining distance & ETA
  const remainingDistKm = Math.max(0, parseFloat((totalDist - newTraveledDistKm).toFixed(2)));
  const progressRatio = totalDist > 0 ? (newTraveledDistKm / totalDist) : 0;
  const remainingTimeSec = Math.max(0, parseFloat(((1 - progressRatio) * activeRoute.totalTimeSec).toFixed(1)));

  // Log edge transitions
  const newLogs = [...state.logs];
  if (currentEdgeIndex !== state.currentEdgeIndex) {
    const toNode = network.getNode(activeRoute.nodes[currentEdgeIndex]);
    if (toNode) {
      newLogs.push({
        id: `L_${Date.now()}_node`,
        timestamp: options.simulationTime || '12:00',
        type: 'JUNCTION',
        message: `Crossed junction: ${toNode.name}. Following ${currentEdge.street || currentEdge.id}.`
      });
    }
  }

  return {
    ...state,
    traveledDistanceKm: newTraveledDistKm,
    currentPosition: currentPos,
    heading,
    currentEdgeIndex,
    currentSpeedKmh: parseFloat(effectiveSpeedKmh.toFixed(1)),
    distanceRemainingKm: remainingDistKm,
    etaSecondsRemaining: remainingTimeSec,
    totalElapsedSimSeconds: state.totalElapsedSimSeconds + deltaSimSeconds,
    currentSegment: currentEdge,
    traveledPolyline,
    remainingPolyline,
    logs: newLogs
  };
}

/**
 * Handle dynamic road blockage or traffic incident.
 * Finishes the current edge up to the upcoming junction node, then recalculates
 * and concatenates the new road geometry without teleporting.
 */
export function handleDynamicReroute(state, network, blockedEdgeIds, hospitals, options = {}) {
  if (state.status !== 'EN_ROUTE' && state.status !== 'REROUTING') {
    return state;
  }

  const { activeRoute, currentEdgeIndex, targetHospital, continuousRoute, traveledDistanceKm } = state;
  if (!activeRoute) return state;

  // The ambulance will complete the current edge to reach the next junction node
  const nextJunctionNodeId = activeRoute.nodes[currentEdgeIndex + 1];
  if (!nextJunctionNodeId) return state;

  const remainingEdges = activeRoute.edges.slice(currentEdgeIndex + 1);
  const blockedSet = blockedEdgeIds instanceof Set ? blockedEdgeIds : new Set(blockedEdgeIds);
  const isRemainingPathBlocked = remainingEdges.some(e => blockedSet.has(e.id));

  // Compute new optimal path from upcoming junction node
  let newPathFromJunction = findShortestPath(network, nextJunctionNodeId, targetHospital.nodeId, {
    ...options,
    blockedEdgeIds
  });

  let selectedHospital = targetHospital;
  let rerouteReason = '';

  // If current hospital is no longer reachable, search other hospitals
  if (!newPathFromJunction.reachable) {
    const fallback = findBestHospital(network, nextJunctionNodeId, hospitals, {
      ...options,
      blockedEdgeIds
    });

    if (fallback.bestHospital && fallback.bestRoute && fallback.bestRoute.reachable) {
      selectedHospital = fallback.bestHospital;
      newPathFromJunction = fallback.bestRoute;
      rerouteReason = `Route to ${targetHospital.shortName} severed by incident! Diverting to ${selectedHospital.name}.`;
    } else {
      return {
        ...state,
        status: 'NO_ROUTE',
        logs: [
          ...state.logs,
          {
            id: `L_${Date.now()}_err`,
            timestamp: options.simulationTime || '12:00',
            type: 'CRITICAL',
            message: 'ALERT: All arterial paths to reachable hospitals are blocked by cascading incidents!'
          }
        ]
      };
    }
  }

  // Merge completed edges + current edge + new path edges
  // (currentEdgeIndex + 1) completed edges span (currentEdgeIndex + 2) nodes
  const completedNodes = activeRoute.nodes.slice(0, currentEdgeIndex + 2);
  const completedEdges = activeRoute.edges.slice(0, currentEdgeIndex + 1);
  const completedCosts = activeRoute.edgeCostBreakdowns.slice(0, currentEdgeIndex + 1);

  const mergedNodes = [...completedNodes, ...newPathFromJunction.nodes.slice(1)];
  const mergedEdges = [...completedEdges, ...newPathFromJunction.edges];
  const mergedCosts = [...completedCosts, ...newPathFromJunction.edgeCostBreakdowns];

  const updatedRoute = {
    ...activeRoute,
    nodes: mergedNodes,
    edges: mergedEdges,
    edgeCostBreakdowns: mergedCosts,
    targetNodeId: selectedHospital.nodeId
  };

  // Rebuild the continuous road polyline for the merged route
  const newContinuousRoute = buildContinuousRoute(updatedRoute, network);

  const reason = rerouteReason || (
    isRemainingPathBlocked
      ? 'Active route blocked by road incident ahead. Recalculated dynamic bypass.'
      : 'Faster road bypass detected.'
  );

  return {
    ...state,
    targetHospital: selectedHospital,
    targetHospitalNodeId: selectedHospital.nodeId,
    activeRoute: updatedRoute,
    continuousRoute: newContinuousRoute,
    routeChangesCount: state.routeChangesCount + 1,
    logs: [
      ...state.logs,
      {
        id: `L_${Date.now()}_reroute`,
        timestamp: options.simulationTime || '12:00',
        type: 'REROUTE',
        message: `DYNAMIC REROUTE #${state.routeChangesCount + 1}: ${reason}`
      }
    ]
  };
}
