/**
 * LIFELINE — Road Network Data: Chennai Urban Sector
 * Vadapalani / Saligramam / Kodambakkam / T. Nagar / West Mambalam / Ashok Nagar
 *
 * Loads snapped node coordinates and real road-following polylines from roadGeometry.json
 */

import roadGeometry from './roadGeometry.json';

// Haversine formula to compute accurate road lengths in km
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(3));
}

export const HOSPITALS = [
  {
    id: 'H1',
    nodeId: 'N4',
    name: 'SIMS Hospital Vadapalani',
    shortName: 'SIMS Hospital (Level 1 Trauma)',
    icuBeds: 35,
    specialty: 'Multi-Specialty & Cardiac ICU',
    color: '#ef4444'
  },
  {
    id: 'H2',
    nodeId: 'N5',
    name: 'Vijaya Hospital & Health Centre',
    shortName: 'Vijaya Hospital',
    icuBeds: 28,
    specialty: 'Heart & Critical Care Center',
    color: '#06b6d4'
  },
  {
    id: 'H3',
    nodeId: 'N2',
    name: 'Sooriya Hospital Saligramam',
    shortName: 'Sooriya Hospital',
    icuBeds: 18,
    specialty: 'Acute Emergency & Trauma',
    color: '#8b5cf6'
  },
  {
    id: 'H4',
    nodeId: 'N20',
    name: 'Govt. ESI Hospital K.K. Nagar',
    shortName: 'ESI Hospital K.K. Nagar',
    icuBeds: 22,
    specialty: 'Govt. Acute Emergency & Burns',
    color: '#10b981'
  }
];

// Snapped 25 nodes on real Chennai roads
export const NODES = roadGeometry.nodes;

// Processed 45 edges with real road geometry polylines
export const EDGES = roadGeometry.edges.map(e => ({
  ...e,
  blocked: false
}));

// Preset Emergency Scenarios (Snapped to real road nodes)
export const PRESET_INCIDENTS = [
  {
    id: 'P1',
    name: 'Vadapalani Metro Hub Gridlock & Collision',
    nodeId: 'N1',
    nodeName: 'Arcot Rd / Chinmaya Nagar Jn',
    suggestedHospitalId: 'H1',
    description: 'Multi-vehicle collision on Arcot Road during morning rush hour near SIMS Hospital.',
    defaultTime: '08:45',
    blockedRoads: ['E3', 'E4'] // Vadapalani approach blocked
  },
  {
    id: 'P2',
    name: 'Ashok Pillar Heavy Monsoon Waterlogging',
    nodeId: 'N21',
    nodeName: 'Anna Main Rd / MGR Nagar Jn',
    suggestedHospitalId: 'H4',
    description: 'Waterlogged intersection near Ashok Pillar and ESI Hospital, forcing emergency detour.',
    defaultTime: '18:15',
    blockedRoads: ['E11', 'E30']
  },
  {
    id: 'P3',
    name: 'Kodambakkam Railway Station Critical Emergency',
    nodeId: 'N8',
    nodeName: 'Kodambakkam Station Flyover',
    suggestedHospitalId: 'H2',
    description: 'Cardiac emergency at Kodambakkam station requiring immediate green-wave to Vijaya Hospital.',
    defaultTime: '12:30',
    blockedRoads: []
  },
  {
    id: 'P4',
    name: 'Saligramam Market Fire Obstacle',
    nodeId: 'N14',
    nodeName: 'Kamarajar Salai / Saligramam Mkt',
    suggestedHospitalId: 'H3',
    description: 'Commercial fire on Kamarajar Salai blocking arterial connection to Sooriya Hospital.',
    defaultTime: '17:30',
    blockedRoads: ['E13', 'E15']
  }
];
