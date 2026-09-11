/**
 * simulate.js — Attack Path Simulation Engine
 * 
 * Pure, framework-agnostic BFS traversal that finds all attack paths
 * from a compromised foothold to critical assets in a network graph.
 * No React, no DOM, no side effects — just graph math.
 */

const RISK_WEIGHTS = { low: 1, medium: 3, high: 6, critical: 10 };

/**
 * Build an adjacency list from the network edges.
 * Treats the graph as DIRECTED — each edge goes source → target.
 * Also builds reverse edges so attacker can traverse in either direction
 * (realistic: if A trusts B, compromising A gives access along that trust).
 */
function buildAdjacency(nodes, edges) {
  const adj = {};
  for (const node of nodes) {
    adj[node.id] = [];
  }
  for (const edge of edges) {
    adj[edge.source] = adj[edge.source] || [];
    adj[edge.target] = adj[edge.target] || [];
    // Forward edge
    adj[edge.source].push({ ...edge, direction: 'forward' });
    // Reverse edge (attacker can traverse trust relationships both ways)
    adj[edge.target].push({
      ...edge,
      source: edge.target,
      target: edge.source,
      direction: 'reverse',
    });
  }
  return adj;
}

/**
 * Determine if an edge can be traversed given the attacker's current privilege.
 * 
 * Rules from spec:
 * - shared-credentials | trust-relationship → always traversable
 * - admin-access | api-access → only if attacker has "admin" privilege
 * - network-access → always traversable (but doesn't grant escalation)
 */
function canTraverse(edge, currentPrivilege) {
  const rel = edge.relationship;
  if (rel === 'shared-credentials' || rel === 'trust-relationship') return true;
  if (rel === 'admin-access' || rel === 'api-access') return currentPrivilege === 'admin';
  if (rel === 'network-access') return true;
  return false;
}

/**
 * Determine the attacker's new privilege after reaching a node.
 * - If the node has privilege "admin", attacker gets admin
 * - network-access edges don't grant escalation
 * - Otherwise, keep current privilege
 */
function getNewPrivilege(currentPrivilege, targetNode, edgeRelationship) {
  if (edgeRelationship === 'network-access') return currentPrivilege;
  if (targetNode.privilege === 'admin') return 'admin';
  return currentPrivilege;
}

/**
 * Apply active controls by filtering/blocking edges BEFORE BFS.
 * 
 * Controls:
 * - "mfa-admin-server": blocks admin-access edges touching the admin server
 * - "segment-network": blocks network-access from endpoints to servers
 * - "revoke-shared-admin": blocks shared-credentials on admin accounts
 */
function applyControls(edges, nodes, controls) {
  if (!controls || controls.length === 0) return edges;

  const nodeMap = {};
  for (const node of nodes) {
    nodeMap[node.id] = node;
  }

  return edges.filter((edge) => {
    for (const control of controls) {
      if (control === 'mfa-admin-server') {
        // Block admin-access edges touching any node with id containing "admin" that is a server
        const sourceNode = nodeMap[edge.source];
        const targetNode = nodeMap[edge.target];
        if (edge.relationship === 'admin-access') {
          if (
            (sourceNode && sourceNode.type === 'server' && sourceNode.id.includes('admin')) ||
            (targetNode && targetNode.type === 'server' && targetNode.id.includes('admin'))
          ) {
            return false;
          }
        }
      }

      if (control === 'segment-network') {
        // Block network-access from endpoint nodes to server nodes
        const sourceNode = nodeMap[edge.source];
        const targetNode = nodeMap[edge.target];
        if (edge.relationship === 'network-access') {
          if (
            (sourceNode && sourceNode.type === 'endpoint' && targetNode && (targetNode.type === 'server' || targetNode.criticality === 'critical')) ||
            (targetNode && targetNode.type === 'endpoint' && sourceNode && (sourceNode.type === 'server' || sourceNode.criticality === 'critical'))
          ) {
            return false;
          }
        }
      }

      if (control === 'revoke-shared-admin') {
        // Block shared-credentials edges connected to admin accounts
        const sourceNode = nodeMap[edge.source];
        const targetNode = nodeMap[edge.target];
        if (edge.relationship === 'shared-credentials') {
          if (
            (sourceNode && sourceNode.type === 'account' && sourceNode.privilege === 'admin') ||
            (targetNode && targetNode.type === 'account' && targetNode.privilege === 'admin')
          ) {
            return false;
          }
        }
      }
    }
    return true;
  });
}

/**
 * findAttackPaths — the main algorithm.
 * 
 * BFS from startNodeId, tracking privilege escalation.
 * Records every path that reaches a node with criticality "critical".
 * Returns paths sorted by riskScore desc, hopCount asc.
 * 
 * @param {{ nodes: Array, edges: Array }} network - parsed network.json
 * @param {string} startNodeId - the compromised foothold node
 * @param {string[]} controls - active hypothetical fixes
 * @returns {{ path: string[], hopCount: number, targetLabel: string, riskScore: number }[]}
 */
export function findAttackPaths(network, startNodeId, controls = []) {
  const { nodes, edges } = network;

  // Node lookup map
  const nodeMap = {};
  for (const node of nodes) {
    nodeMap[node.id] = node;
  }

  const startNode = nodeMap[startNodeId];
  if (!startNode) return [];

  // Apply controls BEFORE traversal
  const filteredEdges = applyControls(edges, nodes, controls);
  const adj = buildAdjacency(nodes, filteredEdges);

  // BFS state: each queue entry tracks the full path and current privilege
  const attackPaths = [];
  const queue = [
    {
      nodeId: startNodeId,
      path: [startNodeId],
      privilege: startNode.privilege === 'admin' ? 'admin' : 'user',
      edgeRisks: [],
    },
  ];

  // Track visited states: (nodeId, privilege) to avoid infinite loops
  // but allow revisiting with higher privilege
  const visited = new Set();
  visited.add(`${startNodeId}|${startNode.privilege === 'admin' ? 'admin' : 'user'}`);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = adj[current.nodeId] || [];

    for (const edge of neighbors) {
      const targetId = edge.target;
      const targetNode = nodeMap[targetId];
      if (!targetNode) continue;

      // Check traversability
      if (!canTraverse(edge, current.privilege)) continue;

      // Don't revisit nodes already in this path (prevent cycles)
      if (current.path.includes(targetId)) continue;

      // Calculate new privilege
      const newPrivilege = getNewPrivilege(current.privilege, targetNode, edge.relationship);
      const stateKey = `${targetId}|${newPrivilege}`;

      // Skip if we've already visited this node with this privilege level
      if (visited.has(stateKey)) continue;
      visited.add(stateKey);

      const newPath = [...current.path, targetId];
      const newEdgeRisks = [...current.edgeRisks, edge.risk];

      // If we reached a critical asset, record this attack chain
      if (targetNode.criticality === 'critical') {
        const riskScore = newEdgeRisks.reduce(
          (sum, r) => sum + (RISK_WEIGHTS[r] || 0),
          0
        );
        attackPaths.push({
          path: newPath,
          hopCount: newPath.length - 1,
          targetLabel: targetNode.label,
          targetId: targetId,
          riskScore,
        });
      }

      // Continue exploring from this node (don't stop at first critical hit)
      queue.push({
        nodeId: targetId,
        path: newPath,
        privilege: newPrivilege,
        edgeRisks: newEdgeRisks,
      });
    }
  }

  // Sort: riskScore DESC, then hopCount ASC
  attackPaths.sort((a, b) => {
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    return a.hopCount - b.hopCount;
  });

  return attackPaths;
}

/**
 * computeSecurityScore — calculates network-wide Security Posture Score (0–100).
 * 
 * Runs attack path evaluation across all entrypoint nodes (endpoints and accounts)
 * against currently active controls.
 * Higher exposure and more critical chains lower the score.
 * Activating controls blocks paths and raises the posture score.
 * 
 * @param {{ nodes: Array, edges: Array }} network
 * @param {string[]} controls
 * @returns {{ score: number, totalChains: number, status: string, color: string }}
 */
export function computeSecurityScore(network, controls = []) {
  const { nodes } = network;
  const entryNodes = nodes.filter((n) => n.type === 'endpoint' || n.type === 'account');
  let totalPaths = 0;
  let totalWeightedRisk = 0;

  for (const node of entryNodes) {
    const paths = findAttackPaths(network, node.id, controls);
    totalPaths += paths.length;
    for (const p of paths) {
      const severity = p.riskScore * (1 / Math.max(p.hopCount, 1));
      totalWeightedRisk += severity;
    }
  }

  // Baseline at 0 controls has totalWeightedRisk ~ 555
  // Score scales from ~26 (red) up to ~88+ (green) as controls harden the network
  const exposureRatio = totalWeightedRisk / 600;
  const score = Math.max(15, Math.min(98, Math.round(100 - exposureRatio * 80)));

  let status = 'Critical Exposure';
  let color = '#ef4444';
  if (score >= 70) {
    status = 'Hardened';
    color = '#22c55e';
  } else if (score >= 40) {
    status = 'Moderate Risk';
    color = '#f59e0b';
  }

  return {
    score,
    totalChains: totalPaths,
    status,
    color,
  };
}

/**
 * Build an adjacency list specifically for blast radius propagation.
 * Respects edge directionality:
 * - Forward edges always traversable (if permissions match).
 * - Only trust-relationship and shared-credentials can be traversed bidirectionally.
 * - network-access and admin/api access are directional and cannot be traversed in reverse
 *   from a server backwards into a client endpoint.
 */
function buildBlastRadiusAdjacency(nodes, edges) {
  const adj = {};
  for (const node of nodes) {
    adj[node.id] = [];
  }
  for (const edge of edges) {
    adj[edge.source] = adj[edge.source] || [];
    adj[edge.source].push({ ...edge, direction: 'forward' });

    // Only mutual trust relationships and shared credentials can be leveraged bidirectionally
    if (edge.relationship === 'trust-relationship' || edge.relationship === 'shared-credentials') {
      adj[edge.target] = adj[edge.target] || [];
      adj[edge.target].push({
        ...edge,
        source: edge.target,
        target: edge.source,
        direction: 'reverse',
      });
    }
  }
  return adj;
}

/**
 * computeBlastRadius — calculates full reach from a specified node.
 * 
 * Performs a fresh BFS starting from the node's actual privilege level,
 * evaluating realistic directional compromise propagation across the network.
 * 
 * @param {{ nodes: Array, edges: Array }} network
 * @param {string} startNodeId
 * @param {string[]} controls
 * @returns {{ reachableNodes: string[], criticalCount: number, totalCount: number }}
 */
export function computeBlastRadius(network, startNodeId, controls = []) {
  const { nodes, edges } = network;

  const nodeMap = {};
  for (const node of nodes) {
    nodeMap[node.id] = node;
  }

  const startNode = nodeMap[startNodeId];
  if (!startNode) return { reachableNodes: [], criticalCount: 0, totalCount: 0 };

  const filteredEdges = applyControls(edges, nodes, controls);
  const adj = buildBlastRadiusAdjacency(nodes, filteredEdges);

  // Track (nodeId, privilege) to allow revisiting when privilege escalates
  const visitedStates = new Set();
  const reachedNodes = new Set();

  const initialPrivilege = startNode.privilege === 'admin' ? 'admin' : 'user';
  visitedStates.add(`${startNodeId}|${initialPrivilege}`);

  const queue = [
    {
      nodeId: startNodeId,
      privilege: initialPrivilege,
    },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = adj[current.nodeId] || [];

    for (const edge of neighbors) {
      const targetId = edge.target;
      const targetNode = nodeMap[targetId];
      if (!targetNode) continue;

      if (!canTraverse(edge, current.privilege)) continue;

      const newPrivilege = getNewPrivilege(current.privilege, targetNode, edge.relationship);
      const stateKey = `${targetId}|${newPrivilege}`;

      if (visitedStates.has(stateKey)) continue;
      visitedStates.add(stateKey);

      if (targetId !== startNodeId) {
        reachedNodes.add(targetId);
      }

      queue.push({ nodeId: targetId, privilege: newPrivilege });
    }
  }

  const reachableNodes = Array.from(reachedNodes);
  const criticalCount = reachableNodes.filter(
    (id) => nodeMap[id] && nodeMap[id].criticality === 'critical'
  ).length;

  return {
    reachableNodes,
    criticalCount,
    totalCount: reachableNodes.length,
  };
}
