/**
 * LIFELINE — Network Graph Engine
 * Builds adjacency lists, node/edge lookups, and spatial operations.
 */

import { calculateDistanceKm } from '../data/roadNetwork.js';

export class RoadNetwork {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
    this.nodeMap = new Map();
    this.edgeMap = new Map();
    this.adjacency = new Map();

    this.init();
  }

  init() {
    // Populate node map
    for (const node of this.nodes) {
      this.nodeMap.set(node.id, { ...node });
      this.adjacency.set(node.id, []);
    }

    // Populate edge map and adjacency list (bidirectional)
    for (const edge of this.edges) {
      this.edgeMap.set(edge.id, { ...edge });

      // Forward direction
      if (this.adjacency.has(edge.from)) {
        this.adjacency.get(edge.from).push({
          targetNodeId: edge.to,
          edgeId: edge.id,
          edge: { ...edge }
        });
      }

      // Backward direction (bidirectional road)
      if (this.adjacency.has(edge.to)) {
        this.adjacency.get(edge.to).push({
          targetNodeId: edge.from,
          edgeId: edge.id,
          edge: { ...edge }
        });
      }
    }
  }

  getNode(nodeId) {
    return this.nodeMap.get(nodeId);
  }

  getEdge(edgeId) {
    return this.edgeMap.get(edgeId);
  }

  getNeighbors(nodeId) {
    return this.adjacency.get(nodeId) || [];
  }

  /**
   * Find the nearest node to a given lat/lng coordinate.
   * Snaps user map clicks to valid network intersections.
   */
  findNearestNode(lat, lng) {
    let nearestNode = null;
    let minDistance = Infinity;

    for (const node of this.nodes) {
      const d = calculateDistanceKm(lat, lng, node.lat, node.lng);
      if (d < minDistance) {
        minDistance = d;
        nearestNode = node;
      }
    }

    return {
      node: nearestNode,
      distanceKm: minDistance
    };
  }

  /**
   * Get all connected edges for a given node
   */
  getConnectedEdges(nodeId) {
    return this.edges.filter(e => e.from === nodeId || e.to === nodeId);
  }
}
