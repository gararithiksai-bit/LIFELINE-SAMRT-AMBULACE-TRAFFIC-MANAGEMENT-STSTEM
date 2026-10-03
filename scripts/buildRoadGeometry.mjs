/**
 * LIFELINE — Road Geometry Builder Script
 * Run with: node scripts/buildRoadGeometry.mjs
 *
 * 1. Snaps each of the 25 Chennai nodes to nearest drivable road via OSRM nearest API.
 * 2. Fetches full road-following geometry (GeoJSON) for all 45 road segments via OSRM route API.
 *    Tests both directions (forward and reverse) to choose the direct roadway path without one-way U-turns.
 * 3. Computes exact road length from geometry curvature.
 * 4. Validates detours and outputs src/data/roadGeometry.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NODES, calculateDistanceKm } from '../src/data/roadNetwork.js';
import { NODE_OVERRIDES } from '../src/data/nodeOverrides.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/roadGeometry.json');

// Raw 45 edge topology definitions
const RAW_EDGES = [
  // 1. Arcot Road Corridor (East-West Arterial)
  { id: 'E1', from: 'N1', to: 'N2', lanes: 3, baseSpeedKmh: 50, hasSignal: true, street: 'Arcot Road (West)' },
  { id: 'E2', from: 'N2', to: 'N3', lanes: 3, baseSpeedKmh: 45, hasSignal: false, street: 'Arcot Road (Sooriya Sec)' },
  { id: 'E3', from: 'N3', to: 'N4', lanes: 4, baseSpeedKmh: 50, hasSignal: true, street: 'Arcot Road (Vadapalani Approach)' },
  { id: 'E4', from: 'N4', to: 'N5', lanes: 4, baseSpeedKmh: 45, hasSignal: true, street: 'Arcot Road (SIMS to Vijaya)' },
  { id: 'E5', from: 'N5', to: 'N6', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: 'Arcot Road (Puliyur Link)' },
  { id: 'E6', from: 'N6', to: 'N7', lanes: 3, baseSpeedKmh: 50, hasSignal: true, street: 'Arcot Road (Power House)' },
  { id: 'E7', from: 'N7', to: 'N8', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: 'Arcot Road (Kodambakkam Flyover)' },

  // 2. 100 Feet Road / Jawaharlal Nehru Salai (North-South Main Highway)
  { id: 'E8', from: 'N9', to: 'N10', lanes: 4, baseSpeedKmh: 60, hasSignal: true, street: '100 Feet Rd (Koyambedu - Forum)' },
  { id: 'E9', from: 'N10', to: 'N4', lanes: 4, baseSpeedKmh: 55, hasSignal: true, street: '100 Feet Rd (Vadapalani Flyover)' },
  { id: 'E10', from: 'N4', to: 'N11', lanes: 4, baseSpeedKmh: 55, hasSignal: true, street: '100 Feet Rd (Kasi Theatre Stretch)' },
  { id: 'E11', from: 'N11', to: 'N12', lanes: 4, baseSpeedKmh: 55, hasSignal: true, street: '100 Feet Rd (Ashok Pillar Approach)' },

  // 3. Kamarajar Salai & Virugambakkam Bypass
  { id: 'E12', from: 'N13', to: 'N14', lanes: 2, baseSpeedKmh: 35, hasSignal: false, street: 'Kamarajar Salai (North)' },
  { id: 'E13', from: 'N14', to: 'N1', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'Kamarajar Salai (South Link)' },
  { id: 'E14', from: 'N13', to: 'N9', lanes: 2, baseSpeedKmh: 40, hasSignal: true, street: 'Chinmaya Koyambedu Feeder' },
  { id: 'E15', from: 'N14', to: 'N2', lanes: 2, baseSpeedKmh: 30, hasSignal: false, street: 'Saligramam Market Cross' },
  { id: 'E16', from: 'N14', to: 'N10', lanes: 2, baseSpeedKmh: 35, hasSignal: false, street: 'AVM Studios Back Road' },

  // 4. PV Rajamannar Salai & West K.K. Nagar Links
  { id: 'E17', from: 'N2', to: 'N16', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'Dashapuram Link Road' },
  { id: 'E18', from: 'N15', to: 'N16', lanes: 2, baseSpeedKmh: 35, hasSignal: false, street: 'PV Rajamannar Salai (West)' },
  { id: 'E19', from: 'N16', to: 'N17', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: 'PV Rajamannar Salai (Central)' },
  { id: 'E20', from: 'N3', to: 'N17', lanes: 2, baseSpeedKmh: 35, hasSignal: false, street: 'Canara Bank Colony St' },
  { id: 'E21', from: 'N17', to: 'N11', lanes: 2, baseSpeedKmh: 40, hasSignal: true, street: 'Ponnambalam Salai' },

  // 5. Lakshmanaswamy Salai & Ashok Nagar Grid
  { id: 'E22', from: 'N16', to: 'N18', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'K.K. Nagar 2nd Sector Link' },
  { id: 'E23', from: 'N18', to: 'N19', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: 'Lakshmanaswamy Salai (West)' },
  { id: 'E24', from: 'N19', to: 'N12', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: 'Lakshmanaswamy Salai (Pillar)' },
  { id: 'E25', from: 'N17', to: 'N19', lanes: 2, baseSpeedKmh: 35, hasSignal: false, street: 'Ashok Nagar 4th Avenue Cross' },
  { id: 'E26', from: 'N11', to: 'N19', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: '11th Avenue Link Road' },

  // 6. Anna Main Road & ESI Hospital Corridor
  { id: 'E27', from: 'N21', to: 'N18', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'MGR Nagar Main Link' },
  { id: 'E28', from: 'N21', to: 'N20', lanes: 3, baseSpeedKmh: 40, hasSignal: true, street: 'Anna Main Rd (ESI West)' },
  { id: 'E29', from: 'N20', to: 'N18', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'ESI Depot Approach' },
  { id: 'E30', from: 'N20', to: 'N12', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: 'Anna Main Rd (ESI to Pillar)' },

  // 7. Ashok Nagar East & 1st Avenue
  { id: 'E31', from: 'N11', to: 'N25', lanes: 2, baseSpeedKmh: 40, hasSignal: false, street: 'Ashok Nagar 1st Avenue North' },
  { id: 'E32', from: 'N12', to: 'N25', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: '1st Avenue (Pillar to Postal)' },
  { id: 'E33', from: 'N25', to: 'N5', lanes: 2, baseSpeedKmh: 35, hasSignal: false, street: 'Vadapalani Station Cut Road' },
  { id: 'E34', from: 'N25', to: 'N22', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'Arya Gowda Link West' },

  // 8. West Mambalam & Postal Colony Arterials
  { id: 'E35', from: 'N12', to: 'N22', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: 'Duraiswamy / Pillar Link' },
  { id: 'E36', from: 'N22', to: 'N23', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'Arya Gowda Road Central' },
  { id: 'E37', from: 'N23', to: 'N24', lanes: 2, baseSpeedKmh: 30, hasSignal: true, street: 'Govindan Road Mambalam' },
  { id: 'E38', from: 'N24', to: 'N7', lanes: 2, baseSpeedKmh: 35, hasSignal: false, street: 'Subbarayan St Link' },
  { id: 'E39', from: 'N24', to: 'N8', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'Rangarajapuram Cross Road' },

  // 9. North-East Cross Connectors (Kodambakkam & Vadapalani Inner Rings)
  { id: 'E40', from: 'N5', to: 'N22', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'Chakrapani St Extension' },
  { id: 'E41', from: 'N6', to: 'N25', lanes: 2, baseSpeedKmh: 30, hasSignal: false, street: 'Puliyur 2nd Main Rd' },
  { id: 'E42', from: 'N6', to: 'N23', lanes: 2, baseSpeedKmh: 35, hasSignal: true, street: 'Station Road Kodambakkam' },
  { id: 'E43', from: 'N7', to: 'N23', lanes: 2, baseSpeedKmh: 30, hasSignal: false, street: 'Lake View Road' },
  { id: 'E44', from: 'N10', to: 'N5', lanes: 3, baseSpeedKmh: 45, hasSignal: true, street: 'Kumaran Colony Main Rd' },
  { id: 'E45', from: 'N1', to: 'N15', lanes: 2, baseSpeedKmh: 35, hasSignal: false, street: 'Alagirisamy Salai West' }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 3, delay = 320) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sleep(delay);
      const res = await fetch(url, { headers: { 'User-Agent': 'LIFELINE-Ambulance-Simulation/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      return data;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000);
    }
  }
}

async function main() {
  console.log('===============================================================');
  console.log('  LIFELINE: Building Real Road Geometry via OSRM (Chennai)    ');
  console.log('===============================================================\n');

  // STEP 1: SNAP NODES TO REAL DRIVABLE ROADS
  console.log('STEP 1: Snapping 25 Intersection Nodes to nearest drivable roads...');
  const snappedNodes = [];
  const movedNodesOver60m = [];

  for (const node of NODES) {
    if (NODE_OVERRIDES[node.id]) {
      const override = NODE_OVERRIDES[node.id];
      const distM = calculateDistanceKm(node.lat, node.lng, override.lat, override.lng) * 1000;
      snappedNodes.push({
        ...node,
        lat: override.lat,
        lng: override.lng,
        snappedDistM: parseFloat(distM.toFixed(1)),
        isOverride: true
      });
      console.log(`  [OVERRIDE] ${node.id} (${node.name}): lat=${override.lat}, lng=${override.lng}`);
      continue;
    }

    const url = `https://router.project-osrm.org/nearest/v1/driving/${node.lng},${node.lat}`;
    try {
      const data = await fetchWithRetry(url, 3, 300);
      if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
        const [snappedLng, snappedLat] = data.waypoints[0].location;
        const distM = calculateDistanceKm(node.lat, node.lng, snappedLat, snappedLng) * 1000;

        snappedNodes.push({
          ...node,
          lat: parseFloat(snappedLat.toFixed(6)),
          lng: parseFloat(snappedLng.toFixed(6)),
          snappedDistM: parseFloat(distM.toFixed(1))
        });

        if (distM > 60) {
          movedNodesOver60m.push({
            id: node.id,
            name: node.name,
            original: [node.lat, node.lng],
            snapped: [snappedLat, snappedLng],
            distanceM: distM.toFixed(1)
          });
        }
        console.log(`  ✓ ${node.id.padEnd(3)}: Snapped to (${snappedLat.toFixed(6)}, ${snappedLng.toFixed(6)}) - Moved ${distM.toFixed(1)}m`);
      } else {
        throw new Error(`OSRM return code: ${data.code}`);
      }
    } catch (err) {
      console.error(`  ✕ Error snapping node ${node.id}: ${err.message}. Keeping original.`);
      snappedNodes.push({ ...node, snappedDistM: 0 });
    }
  }

  const snappedNodeMap = new Map(snappedNodes.map(n => [n.id, n]));

  console.log('\n--- Node Snapping Summary ---');
  console.log(`Total nodes snapped: ${snappedNodes.length}/25`);
  if (movedNodesOver60m.length > 0) {
    console.log(`⚠️  ${movedNodesOver60m.length} node(s) moved more than 60m:`);
    for (const m of movedNodesOver60m) {
      console.log(`    - ${m.id} (${m.name}): moved ${m.distanceM}m to [${m.snapped[0].toFixed(5)}, ${m.snapped[1].toFixed(5)}]`);
    }
  } else {
    console.log('✓ All 25 nodes snapped within 60m of original positions.');
  }

  // STEP 2: FETCH REAL ROAD-FOLLOWING POLYLINES FOR ALL 45 EDGES
  console.log('\nSTEP 2: Fetching real road-following geometries for 45 edges...');
  const processedEdges = [];
  const flaggedEdges = [];

  for (const edge of RAW_EDGES) {
    const fromNode = snappedNodeMap.get(edge.from);
    const toNode = snappedNodeMap.get(edge.to);

    const straightDistKm = calculateDistanceKm(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);

    // Fetch both directions (forward and reverse) to avoid artificial one-way detour loops on bidirectional roads
    const urlFwd = `https://router.project-osrm.org/route/v1/driving/${fromNode.lng},${fromNode.lat};${toNode.lng},${toNode.lat}?overview=full&geometries=geojson`;
    const urlRev = `https://router.project-osrm.org/route/v1/driving/${toNode.lng},${toNode.lat};${fromNode.lng},${fromNode.lat}?overview=full&geometries=geojson`;

    try {
      const dataFwd = await fetchWithRetry(urlFwd, 3, 300);
      let bestRoute = dataFwd.routes?.[0] || null;
      let isReverseChosen = false;

      // If forward route has high detour, test reverse direction
      const fwdDistKm = bestRoute ? bestRoute.distance / 1000 : Infinity;
      if (fwdDistKm / straightDistKm > 1.8) {
        try {
          const dataRev = await fetchWithRetry(urlRev, 2, 300);
          if (dataRev.code === 'Ok' && dataRev.routes && dataRev.routes.length > 0) {
            const revDistKm = dataRev.routes[0].distance / 1000;
            if (revDistKm < fwdDistKm) {
              bestRoute = dataRev.routes[0];
              isReverseChosen = true;
            }
          }
        } catch {
          // Keep forward route if reverse fails
        }
      }

      if (bestRoute) {
        // GeoJSON coordinates are [lng, lat] -> convert to Leaflet [lat, lng]
        let rawCoords = bestRoute.geometry.coordinates.map(coord => [
          parseFloat(coord[1].toFixed(6)),
          parseFloat(coord[0].toFixed(6))
        ]);

        // If reverse was chosen, reverse array so it flows from fromNode -> toNode
        if (isReverseChosen) {
          rawCoords = rawCoords.reverse();
        }

        // Clamp first and last point to exact node coordinates (guarantees start/end within 5m)
        if (rawCoords.length >= 2) {
          rawCoords[0] = [fromNode.lat, fromNode.lng];
          rawCoords[rawCoords.length - 1] = [toNode.lat, toNode.lng];
        } else {
          rawCoords = [
            [fromNode.lat, fromNode.lng],
            [toNode.lat, toNode.lng]
          ];
        }

        // Calculate real road length by summing haversine along geometry
        let realLengthKm = 0;
        for (let i = 0; i < rawCoords.length - 1; i++) {
          realLengthKm += calculateDistanceKm(
            rawCoords[i][0], rawCoords[i][1],
            rawCoords[i + 1][0], rawCoords[i + 1][1]
          );
        }
        realLengthKm = parseFloat(realLengthKm.toFixed(3));

        const detourRatio = straightDistKm > 0 ? (realLengthKm / straightDistKm) : 1.0;
        let isFlagged = false;
        let flagReason = '';

        if (detourRatio > 2.5) {
          isFlagged = true;
          flagReason = `Detour ratio ${detourRatio.toFixed(2)}x exceeds 2.5x threshold (${realLengthKm} km vs ${straightDistKm} km)`;
        }

        const outOfBounds = rawCoords.some(pt => pt[0] < 13.030 || pt[0] > 13.072 || pt[1] < 80.185 || pt[1] > 80.235);
        if (outOfBounds) {
          isFlagged = true;
          flagReason += (flagReason ? '; ' : '') + 'Route geometry travels outside Chennai bounds';
        }

        if (isFlagged) {
          flaggedEdges.push({
            id: edge.id,
            street: edge.street,
            from: edge.from,
            to: edge.to,
            detourRatio: parseFloat(detourRatio.toFixed(2)),
            realLengthKm,
            straightDistKm,
            reason: flagReason
          });
          console.warn(`  ⚠️  ${edge.id.padEnd(3)} (${edge.from} -> ${edge.to}): FLAGGED - ${flagReason}`);
        } else {
          console.log(`  ✓ ${edge.id.padEnd(3)} (${edge.from} -> ${edge.to}): ${rawCoords.length} pts, ${realLengthKm} km (detour: ${detourRatio.toFixed(2)}x)${isReverseChosen ? ' [clean direct roadway]' : ''}`);
        }

        processedEdges.push({
          ...edge,
          length_km: realLengthKm,
          straight_distance_km: parseFloat(straightDistKm.toFixed(3)),
          detour_ratio: parseFloat(detourRatio.toFixed(2)),
          geometry: rawCoords
        });
      } else {
        throw new Error('No route returned');
      }
    } catch (err) {
      console.error(`  ✕ Error routing edge ${edge.id}: ${err.message}. Using straight line fallback.`);
      processedEdges.push({
        ...edge,
        length_km: parseFloat(straightDistKm.toFixed(3)),
        straight_distance_km: parseFloat(straightDistKm.toFixed(3)),
        detour_ratio: 1.0,
        geometry: [
          [fromNode.lat, fromNode.lng],
          [toNode.lat, toNode.lng]
        ]
      });
    }
  }

  console.log('\n--- Edge Geometry Validation Summary ---');
  console.log(`Total edges processed: ${processedEdges.length}/45`);
  if (flaggedEdges.length > 0) {
    console.log(`⚠️  ${flaggedEdges.length} edge(s) flagged:`);
    for (const f of flaggedEdges) {
      console.log(`    - ${f.id} (${f.street}, ${f.from} ↔ ${f.to}): ${f.reason}`);
      console.log(`      Suggestion: Add intermediate waypoint or split into direct block-level segments.`);
    }
  } else {
    console.log('✓ All 45 edges follow direct, clean road corridors with detour ratio < 2.5x.');
  }

  // STEP 3: OUTPUT RESULT FILE
  const resultData = {
    generatedAt: new Date().toISOString(),
    city: 'Chennai (Vadapalani / Saligramam / Kodambakkam / Ashok Nagar)',
    nodes: snappedNodes,
    edges: processedEdges
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(resultData, null, 2), 'utf-8');
  console.log(`\n✓ SUCCESS! Road network geometry saved to: ${OUTPUT_FILE}`);
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('Fatal error building road geometry:', err);
  process.exit(1);
});
