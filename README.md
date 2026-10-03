# LIFELINE — Smart Ambulance Traffic Management
**Problem Statement WEB-PS-004 | Hackathon WEBX 2026**
**Geographic Deployment: Chennai Urban Sector (Vadapalani / Saligramam / Kodambakkam / Ashok Nagar / West Mambalam)**

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green.svg)](https://leafletjs.com/)
[![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-Tiles-lightgrey.svg)](https://www.openstreetmap.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Passing-brightgreen.svg)](https://vitest.dev/)

**LIFELINE** is a fully client-side emergency vehicle traffic management and dynamic corridor simulation platform. It simulates real urban street geography across the **Vadapalani / Saligramam / Kodambakkam / Ashok Nagar / West Mambalam** corridor in Chennai, India, dispatching an emergency ambulance, evaluating real-time BPR volume-delay congestion, dynamically rerouting around road blocks, and clearing a high-priority **Emergency Green Corridor**.

Everything runs 100% locally in the browser with **zero backend dependencies**, zero paid APIs, and standard free OpenStreetMap tiles.

---

## 🗺️ Real Chennai Urban Base Map & Road Network

- **Map Center**: `[13.0508214, 80.2106727]` (Vadapalani Junction / Metro Station)
- **Zoom**: `15` (min: `14`, max: `17`), locked with bounds `[[13.035, 80.190], [13.068, 80.232]]`.
- **Street Layout**:
  - **Arcot Road (East-West)**: Runs through Saligramam, Vadapalani, Vijaya Hospital, Puliyur, Power House, and Kodambakkam Rail Flyover (`N1`-`N8`).
  - **100 Feet Road / Jawaharlal Nehru Salai (North-South)**: Runs from Koyambedu approach through Vadapalani Flyover down to Ashok Nagar 11th Ave and Ashok Pillar (`N9`-`N12`).
  - **Kamarajar Salai**: Virugambakkam and Saligramam North bypass (`N13`-`N14`).
  - **PV Rajamannar Salai & K.K. Nagar**: Munusamy Salai, Double Tank Colony (`N15`-`N17`).
  - **Lakshmanaswamy Salai & Ashok Nagar**: K.K. Nagar Bus Depot, 4th Avenue, Ashok Pillar (`N18`-`N19`).
  - **Anna Main Road & West Mambalam**: ESI Hospital, MGR Nagar, Arya Gowda Road, Postal Colony, West Mambalam Station (`N20`-`N25`).
- **4 Real Hospitals**:
  1. **SIMS Hospital Vadapalani** (at `N4` - Level 1 Multi-Specialty & Trauma)
  2. **Vijaya Hospital & Heart Foundation** (at `N5` - Tertiary Cardiac & Acute Care)
  3. **Sooriya Hospital Saligramam** (at `N2` - Emergency & Acute Trauma)
  4. **Govt. ESI Hospital K.K. Nagar** (at `N20` - Govt Emergency & Trauma)
- **Debug Alignment Toggle**: Built-in "Node IDs (ON/OFF)" button renders `N1` to `N25` badges directly over intersections for alignment verification.

---

## 🚀 Quick Start & Local Run

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests (Vitest)
npm test

# 3. Start local development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Production Build & Static Deployment
```bash
npm run build
npm run preview
```
Deployable directly to Vercel, Netlify, or GitHub Pages.

---

## 🏛️ System Architecture

```
src/
├── data/
│   └── roadNetwork.js       # 25 real Chennai nodes, 45 bidirectional segments, 4 hospitals
├── engine/
│   ├── network.js           # Graph adjacency list, Haversine distances, spatial node snapping
│   ├── congestion.js        # BPR volume-delay equation, dual-peak demand curve, incident spillover
│   ├── routing.js           # Binary Min-Heap PQ, Dijkstra algorithm, K-alternative route penalty method
│   ├── corridor.js          # Emergency corridor preemption, green-wave signal clearance
│   ├── simulation.js        # 60fps interpolation tick engine, dynamic rerouting (>10% threshold)
│   └── metrics.js           # Deterministic benchmark engine: Static Baseline vs LIFELINE
└── components/
    ├── MapView.jsx          # Leaflet OpenStreetMap canvas, node debug badges, glowing corridor, ambulance
    ├── ControlPanel.jsx     # Dispatch button, speed multipliers (1x-10x), city clock, corridor switch
    ├── IncidentControls.jsx # Block road ahead, random incident generator, active incident manager
    ├── Dashboard.jsx        # Live telemetry (ETA, remaining distance, speed), real-time event logs
    ├── ExplainPanel.jsx     # Explainable AI: cost breakdown table, BPR factors, alternative route comparisons
    ├── ComparisonChart.jsx  # Side-by-side benchmark modal with visual SVG comparison charts
    ├── Legend.jsx           # Floating map legend (congestion tiers, corridor, hospitals, signals)
    └── RoadmapModal.jsx     # Future enterprise roadmap modal
```

---

## 🧠 Algorithmic Formulation

### 1. Custom Min-Heap Priority Queue & Dijkstra
Implemented from scratch in `src/engine/routing.js` using a binary min-heap (`MinBinaryHeap`):
$$\text{Cost}(e) = \text{TraversalTime}(e) + \text{IntersectionDelay}(e) - \text{CorridorBenefit}(e) + \text{BlockPenalty}(e)$$

- **Free-flow travel time**: $t_0 = \frac{\text{length\_km}}{\text{baseSpeedKmh}} \times 3600$
- **Congested travel time**: $t = \frac{\text{length\_km}}{\text{effectiveSpeedKmh}} \times 3600$
- **Signalized intersection delay**: $14\,\text{s}$ standard; reduced to $2\,\text{s}$ under active green-wave preemption.
- **Corridor Benefit**: Cleared traffic grants an additional $20\%$ speed boost.
- **Blocked Penalty**: $\infty$ (unpassable; forces alternative graph traversal).

### 2. Bureau of Public Roads (BPR) Volume-Delay Model
Calculates traffic friction in `src/engine/congestion.js`:
$$t = t_0 \left[1 + \alpha \left(\frac{V}{C}\right)^\beta\right]$$
Where $\alpha = 0.15$ and $\beta = 4.0$.

- **Volume ($V$)**: Derived from Chennai time-of-day peak curves (peaks at `08:00-10:00` and `17:00-19:00`) plus incident detour spillover from adjacent blocked segments.
- **Capacity ($C$)**: Dynamically computed based on lane count ($1\text{ to }4\text{ lanes}$) and bottleneck penalties.

### 3. Lowest-ETA Multi-Hospital Selection
Rather than selecting the nearest hospital by Euclidean or physical road distance, LIFELINE evaluates all hospitals via Dijkstra and routes to the hospital with the **absolute lowest arrival ETA**.

### 4. Dynamic Rerouting & Edge-Case Handling
- **Mid-Segment Blockage**: If a road is blocked while the ambulance is actively driving on it, the ambulance completes the current segment to the upcoming junction node before recalculating an optimal bypass.
- **Threshold Rerouting**: Reroutes when an ahead segment is blocked or when an alternative route becomes $>10\%$ faster.
- **Hospital Fallback**: If cascading incidents sever all routes to the target hospital, LIFELINE automatically diverts to the best alternative trauma center.

---

## 🧪 Preset Demonstration Scenarios (Chennai Sector)

1. **Arcot Road & 100ft Rd Peak Rush (08:45 AM)**:
   - High volume-to-capacity ($v/c > 1.35$) across Vadapalani Junction.
   - LIFELINE routes through higher-capacity corridors with green-wave preemption, saving **~38% travel time** vs static baseline.
2. **Vadapalani Flyover Mid-Route Block (14:30 PM)**:
   - Multi-car collision on 100 Feet Road approach blocks `E9` midway through transit.
   - Static baseline gets stuck in gridlock queue; LIFELINE instantly detects the closure and navigates an immediate dynamic bypass via Kumaran Colony.
3. **Ashok Pillar & Kodambakkam Cascading Blocks (18:00 PM)**:
   - Dual arterial closures (`E11`, `E30`) during evening monsoon rush. Demonstrates multi-incident resilience and alternative hospital evaluation.

---

## 📋 Hackathon Acceptance Checklist

- [x] Nodes and roads sit on real streets of the Chennai area (Vadapalani / Saligramam / Kodambakkam / Ashok Nagar).
- [x] 25 nodes / 45 edges / 4 real hospitals render correctly.
- [x] Dispatch picks the best hospital by lowest ETA and animates the ambulance.
- [x] Blocking a road mid-journey triggers a dynamic recompute and the ambulance continues along the bypass.
- [x] Corridor toggle visibly reduces travel time and lights ahead signals green.
- [x] Comparison dashboard shows time saved vs static baseline across 3 controlled scenarios.
- [x] Explain panel gives human-readable reasons, BPR factors, and alternative route comparison.
- [x] `npm run dev` and `npm run build` work with zero errors.

---

## ⚠️ Limitations & Disclaimer

- **Simulation Model**: All vehicle positions, driver detour behaviors, and traffic delays are computed client-side using mathematical models (BPR volume-delay curves and graph algorithms). It does not ingest live GPS telemetry or commercial traffic APIs.
- **Emergency Corridor Concept**: The emergency corridor is a **simulated conceptual model** demonstrating virtual signal preemption and priority lane clearance. It does not interface with physical municipal traffic signal hardware.
