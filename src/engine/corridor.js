/**
 * LIFELINE — Emergency Corridor Engine
 *
 * Implements virtual green-wave preemption and priority lane clearance.
 * Note: Conceptual simulation model — no physical traffic signal hardware is controlled.
 */

export const CORRIDOR_DISCLAIMER = "Simulated concept — no physical traffic-signal control.";

/**
 * Determine which edges ahead of the ambulance belong to the active priority corridor
 *
 * @param {Array} pathEdges - Array of edge objects along the active route
 * @param {number} currentEdgeIndex - Current edge index the ambulance is traversing
 * @param {number} lookaheadCount - How many segments ahead are preemptively cleared (default: all ahead)
 */
export function getAheadCorridorEdges(pathEdges, currentEdgeIndex = 0, lookaheadCount = 10) {
  if (!pathEdges || pathEdges.length === 0) return [];
  const startIndex = Math.max(0, currentEdgeIndex);
  const endIndex = Math.min(pathEdges.length, startIndex + lookaheadCount);
  return pathEdges.slice(startIndex, endIndex);
}

/**
 * Get active green-light signals ahead of the ambulance along the route
 */
export function getGreenWaveSignals(pathNodes, currentNodeIndex = 0, network = null) {
  if (!pathNodes || pathNodes.length === 0 || !network) return [];
  const aheadNodeIds = pathNodes.slice(Math.max(0, currentNodeIndex));
  return aheadNodeIds
    .map(nodeId => network.getNode(nodeId))
    .filter(node => node && node.hasSignal);
}

/**
 * Calculate the projected time and delay benefits of activating the emergency corridor
 */
export function evaluateCorridorImpact(routeCostWithoutCorridor, routeCostWithCorridor) {
  const timeSavedSec = Math.max(0, routeCostWithoutCorridor.totalTimeSec - routeCostWithCorridor.totalTimeSec);
  const percentSaved = routeCostWithoutCorridor.totalTimeSec > 0
    ? ((timeSavedSec / routeCostWithoutCorridor.totalTimeSec) * 100).toFixed(1)
    : 0;

  const signalDelaySavedSec = Math.max(0, routeCostWithoutCorridor.totalSignalDelaySec - routeCostWithCorridor.totalSignalDelaySec);

  return {
    timeSavedSec: parseFloat(timeSavedSec.toFixed(1)),
    percentSaved: parseFloat(percentSaved),
    signalDelaySavedSec: parseFloat(signalDelaySavedSec.toFixed(1)),
    disclaimer: CORRIDOR_DISCLAIMER
  };
}
