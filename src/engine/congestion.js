/**
 * LIFELINE — Congestion Engine (BPR Volume-Delay Function)
 *
 * Implements the US Bureau of Public Roads (BPR) formulation:
 * t = t0 * [1 + alpha * (v / c)^beta]
 * where alpha = 0.15, beta = 4.0
 *
 * Evaluates time-of-day demand curves (peaks 8-10h & 17-19h),
 * lane capacity bottlenecks, and incident diversion spillover.
 */

/**
 * Convert time string "HH:MM" or hour float into decimal hours (0.0 to 24.0)
 */
export function parseTimeToDecimal(timeInput) {
  if (typeof timeInput === 'number') return timeInput;
  if (!timeInput) return 12.0;
  const [h, m] = timeInput.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

/**
 * Format decimal hours back to "HH:MM"
 */
export function formatDecimalTime(decimalHours) {
  const h = Math.floor(decimalHours) % 24;
  const m = Math.floor((decimalHours - Math.floor(decimalHours)) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Time-of-day demand factor (0.0 to 1.0+)
 * Dual-peak model:
 * Peak 1: 08:00 - 10:00 (Center ~ 08:45)
 * Peak 2: 17:00 - 19:00 (Center ~ 18:00)
 */
export function getPeakDemandFactor(hour) {
  // Morning Peak (gaussian bell curve centered at 8.75)
  const morningDist = Math.abs(hour - 8.75);
  const morningFactor = Math.exp(-Math.pow(morningDist / 0.9, 2));

  // Evening Peak (gaussian bell curve centered at 17.75)
  const eveningDist = Math.abs(hour - 17.75);
  const eveningFactor = Math.exp(-Math.pow(eveningDist / 1.1, 2));

  // Base off-peak demand curve
  let baseDemand = 0.25;
  if (hour >= 6 && hour <= 21) {
    baseDemand = 0.35 + 0.15 * Math.sin(((hour - 6) / 15) * Math.PI);
  }

  // Combine components with scale
  const totalDemand = baseDemand + (0.65 * morningFactor) + (0.75 * eveningFactor);
  return Math.min(1.5, Math.max(0.15, totalDemand));
}

/**
 * Determine if current time falls within official peak hours
 */
export function isPeakHour(hour) {
  return (hour >= 7.8 && hour <= 10.2) || (hour >= 16.8 && hour <= 19.3);
}

/**
 * Calculate Bureau of Public Roads (BPR) travel time multiplier and metadata
 *
 * @param {Object} edge - Edge definition { id, from, to, lanes, baseSpeedKmh, hasSignal, blocked }
 * @param {number|string} simulationTime - Current simulation time "HH:MM" or decimal hour
 * @param {Set|Array} blockedEdgeIds - Set or array of currently blocked edge IDs
 * @param {RoadNetwork} network - Graph instance for checking adjacent incident spillover
 */
export function calculateSegmentCongestion(edge, simulationTime, blockedEdgeIds = new Set(), network = null) {
  const blockedSet = blockedEdgeIds instanceof Set ? blockedEdgeIds : new Set(blockedEdgeIds);

  // If road is completely blocked, cost is infinite
  if (edge.blocked || blockedSet.has(edge.id)) {
    return {
      congestionFactor: Infinity,
      effectiveSpeedKmh: 0,
      confidence: 1.0,
      isBlocked: true,
      volumeToCapacity: 99.0,
      contributingFactors: [
        { name: 'Road Incident Blockage', impact: '+Infinity' }
      ]
    };
  }

  const hour = parseTimeToDecimal(simulationTime);
  const peakFactor = getPeakDemandFactor(hour);
  const contributingFactors = [];

  // Corridor demand and lane capacity
  // Corridor traffic demand depends on city-wide peak factor
  const baseCorridorDemand = 750 * peakFactor;
  // Road capacity increases with lanes, but single lanes have lower efficiency due to lack of passing
  const laneCapacity = edge.lanes === 1 ? 600 : edge.lanes * 700;
  let totalVolume = baseCorridorDemand;

  // Contributing factor: Peak hour
  if (isPeakHour(hour)) {
    const peakImpact = (peakFactor - 0.45).toFixed(2);
    contributingFactors.push({
      name: hour < 12 ? 'Morning Rush Peak (08:00-10:00)' : 'Evening Rush Peak (17:00-19:00)',
      impact: `+${peakImpact} v/c`
    });
  }

  // Contributing factor: Lane capacity restriction
  if (edge.lanes <= 2) {
    const bottleneckBonus = edge.lanes === 1 ? 0.35 : 0.15;
    totalVolume *= (1 + bottleneckBonus);
    contributingFactors.push({
      name: `Narrow Choke Point (${edge.lanes} Lane${edge.lanes === 1 ? '' : 's'})`,
      impact: `+${bottleneckBonus.toFixed(2)} bottleneck delay`
    });
  }

  // Spillover from adjacent blocked roads
  let spilloverBonus = 0;
  if (network && blockedSet.size > 0) {
    const fromIncidentNeighbors = (network.adjacency.get(edge.from) || [])
      .filter(n => blockedSet.has(n.edgeId));
    const toIncidentNeighbors = (network.adjacency.get(edge.to) || [])
      .filter(n => blockedSet.has(n.edgeId));

    const adjacentBlocks = fromIncidentNeighbors.length + toIncidentNeighbors.length;
    if (adjacentBlocks > 0) {
      spilloverBonus = 0.28 * Math.min(2, adjacentBlocks);
      totalVolume += spilloverBonus * laneCapacity;
      contributingFactors.push({
        name: `Incident Spillover (${adjacentBlocks} nearby block${adjacentBlocks > 1 ? 's' : ''})`,
        impact: `+${spilloverBonus.toFixed(2)} detour traffic`
      });
    }
  }

  // Signal delay factor
  if (edge.hasSignal) {
    contributingFactors.push({
      name: 'Signalized Arterial Cycle',
      impact: '+12s cycle delay'
    });
  }

  // BPR Volume-to-Capacity ratio (v / c)
  const vOverC = Math.max(0.1, totalVolume / laneCapacity);

  // Standard BPR formula: CF = 1 + 0.15 * (v/c)^4
  const alpha = 0.15;
  const beta = 4.0;
  const rawCongestionFactor = 1.0 + alpha * Math.pow(vOverC, beta);

  // Bound congestion factor realistically (1.0 up to 4.5x delay in extreme jams)
  const congestionFactor = Math.min(4.5, Math.max(1.0, parseFloat(rawCongestionFactor.toFixed(3))));
  const effectiveSpeedKmh = Math.max(8, parseFloat((edge.baseSpeedKmh / congestionFactor).toFixed(1)));

  // Calculate dynamic sensor confidence (decreases slightly under heavy volatile spillover)
  let confidence = 0.95;
  if (spilloverBonus > 0) confidence -= 0.08;
  if (vOverC > 1.2) confidence -= 0.07;
  confidence = Math.max(0.65, Math.min(0.99, parseFloat(confidence.toFixed(2))));

  return {
    congestionFactor,
    effectiveSpeedKmh,
    confidence,
    isBlocked: false,
    volumeToCapacity: parseFloat(vOverC.toFixed(2)),
    contributingFactors
  };
}

/**
 * Get congestion severity color and label
 */
export function getCongestionStyle(congestionFactor, isBlocked = false) {
  if (isBlocked) {
    return {
      level: 'BLOCKED',
      color: '#ef4444',
      strokeDasharray: '6, 8',
      textColor: 'text-red-500',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500'
    };
  }
  if (congestionFactor < 1.25) {
    return {
      level: 'FLOWING',
      color: '#22c55e',
      strokeDasharray: null,
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500'
    };
  }
  if (congestionFactor < 1.7) {
    return {
      level: 'MODERATE',
      color: '#eab308',
      strokeDasharray: null,
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500'
    };
  }
  if (congestionFactor < 2.3) {
    return {
      level: 'HEAVY',
      color: '#f97316',
      strokeDasharray: null,
      textColor: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500'
    };
  }
  return {
    level: 'SEVERE',
    color: '#dc2626',
    strokeDasharray: null,
    textColor: 'text-red-400',
    bgColor: 'bg-red-600/20',
    borderColor: 'border-red-600'
  };
}
