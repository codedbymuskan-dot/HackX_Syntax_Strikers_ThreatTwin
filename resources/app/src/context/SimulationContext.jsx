import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import initialNetworkData from '../data/network.json';
import { findAttackPaths, computeBlastRadius, computeSecurityScore } from '../simulation/simulate.js';

const SimulationContext = createContext(null);

// Pre-written predictable drift events for demo safety
const DRIFT_EVENTS = [
  {
    id: 'drift-contractor-laptop',
    title: 'New Contractor Endpoint Connected',
    description: 'Third-party contractor connected an unmanaged laptop using shared contractor credentials.',
    node: {
      id: 'endpoint-contractor-03',
      type: 'endpoint',
      label: 'Contractor Laptop 03',
      privilege: 'user',
      criticality: 'low',
    },
    edges: [
      {
        source: 'endpoint-contractor-03',
        target: 'account-contractor-01',
        relationship: 'shared-credentials',
        risk: 'high',
      },
      {
        source: 'endpoint-contractor-03',
        target: 'server-app-01',
        relationship: 'network-access',
        risk: 'low',
      },
    ],
  },
  {
    id: 'drift-shadow-ftp',
    title: 'Shadow IT Legacy FTP Server',
    description: 'DevOps spun up an unvetted legacy FTP server with mutual trust to the corporate file server.',
    node: {
      id: 'server-legacy-ftp',
      type: 'server',
      label: 'Legacy FTP Server',
      privilege: 'user',
      criticality: 'high',
    },
    edges: [
      {
        source: 'server-app-01',
        target: 'server-legacy-ftp',
        relationship: 'network-access',
        risk: 'medium',
      },
      {
        source: 'server-legacy-ftp',
        target: 'server-file-01',
        relationship: 'trust-relationship',
        risk: 'high',
      },
    ],
  },
  {
    id: 'drift-rogue-dev-vm',
    title: 'Rogue Dev VM with CI Admin Tokens',
    description: 'A developer spun up a local container environment possessing direct API tokens into Build CI.',
    node: {
      id: 'endpoint-dev-shadow',
      type: 'endpoint',
      label: 'Rogue Dev VM',
      privilege: 'admin',
      criticality: 'medium',
    },
    edges: [
      {
        source: 'endpoint-dev-shadow',
        target: 'server-build-01',
        relationship: 'network-access',
        risk: 'critical',
      },
      {
        source: 'endpoint-dev-shadow',
        target: 'critical-source-repo',
        relationship: 'api-access',
        risk: 'critical',
      },
    ],
  },
  {
    id: 'drift-public-s3-leak',
    title: 'Unsecured Public Cloud Storage Bucket',
    description: 'Automated backup script inadvertently mirrored sensitive assets to an unauthenticated public bucket.',
    node: {
      id: 'cloud-unsecured-bucket',
      type: 'cloud',
      label: 'Public S3 Bucket',
      privilege: 'n/a',
      criticality: 'critical',
    },
    edges: [
      {
        source: 'server-backup-01',
        target: 'cloud-unsecured-bucket',
        relationship: 'network-access',
        risk: 'critical',
      },
      {
        source: 'cloud-unsecured-bucket',
        target: 'critical-customer-db',
        relationship: 'trust-relationship',
        risk: 'critical',
      },
    ],
  },
];

export function SimulationProvider({ children }) {
  // Live network state (supports continuous sync / drift)
  const [network, setNetwork] = useState(initialNetworkData);
  const [appliedDrifts, setAppliedDrifts] = useState([]);
  const [lastDriftMessage, setLastDriftMessage] = useState(null);

  // Core simulation state
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [footholdNodeId, setFootholdNodeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [attackPaths, setAttackPaths] = useState([]);
  const [previousPathCount, setPreviousPathCount] = useState(null);
  const [activeControls, setActiveControls] = useState([]);
  // highlightedPathIndex: -1 means multi-path overlay (top 3 paths shown), >= 0 isolates that single chain
  const [highlightedPathIndex, setHighlightedPathIndex] = useState(-1);
  const [simulationRun, setSimulationRun] = useState(false);
  const [animatingPath, setAnimatingPath] = useState(null);
  const [animationStep, setAnimationStep] = useState(-1);

  // Blast radius state
  const [blastRadiusMode, setBlastRadiusMode] = useState(false);
  const [blastRadius, setBlastRadius] = useState(null);
  const [blastRadiusOrigin, setBlastRadiusOrigin] = useState(null);

  // Dynamic nodeMap
  const nodeMap = useMemo(() => {
    const map = {};
    for (const node of network.nodes) {
      map[node.id] = node;
    }
    return map;
  }, [network]);

  // Dynamic Security Posture Score (Feature 1)
  const securityScore = useMemo(() => {
    return computeSecurityScore(network, activeControls);
  }, [network, activeControls]);

  // Select scenario from dropdown
  const selectScenario = useCallback((scenarioId) => {
    const scenario = network.scenarios.find((s) => s.id === scenarioId);
    setSelectedScenario(scenario || null);
    setFootholdNodeId(scenarioId);
    // Clear previous simulation
    setAttackPaths([]);
    setSimulationRun(false);
    setAnimatingPath(null);
    setAnimationStep(-1);
    setHighlightedPathIndex(-1);
    setPreviousPathCount(null);
  }, [network]);

  // Set custom foothold (from sidebar)
  const setCustomFoothold = useCallback((nodeId) => {
    setSelectedScenario({ id: nodeId, label: 'Custom', description: 'User-selected foothold' });
    setFootholdNodeId(nodeId);
    setAttackPaths([]);
    setSimulationRun(false);
    setAnimatingPath(null);
    setAnimationStep(-1);
    setHighlightedPathIndex(-1);
    setPreviousPathCount(null);
  }, []);

  // Run simulation
  const runSimulation = useCallback(() => {
    if (!footholdNodeId) return;
    
    // Store previous count for before/after comparison
    if (simulationRun) {
      setPreviousPathCount(attackPaths.length);
    }

    const paths = findAttackPaths(network, footholdNodeId, activeControls);
    setAttackPaths(paths);
    setSimulationRun(true);
    // Default to multi-path view (-1) so top 2-3 paths are overlaid simultaneously
    setHighlightedPathIndex(-1);

    // Start animation of top path
    if (paths.length > 0) {
      const topPath = paths[0];
      setAnimatingPath(topPath);
      setAnimationStep(0);

      // Animate hop-by-hop
      let step = 0;
      const interval = setInterval(() => {
        step++;
        if (step >= topPath.path.length) {
          clearInterval(interval);
          setAnimationStep(topPath.path.length - 1);
        } else {
          setAnimationStep(step);
        }
      }, 450);
    } else {
      setAnimatingPath(null);
      setAnimationStep(-1);
    }
  }, [footholdNodeId, activeControls, network, simulationRun, attackPaths.length]);

  // Reset everything back to base
  const resetSimulation = useCallback(() => {
    setAttackPaths([]);
    setSimulationRun(false);
    setAnimatingPath(null);
    setAnimationStep(-1);
    setHighlightedPathIndex(-1);
    setBlastRadius(null);
    setBlastRadiusOrigin(null);
    setPreviousPathCount(null);
  }, []);

  // Toggle a control and auto-re-run
  const toggleControl = useCallback((controlId) => {
    setActiveControls((prev) => {
      const newControls = prev.includes(controlId)
        ? prev.filter((c) => c !== controlId)
        : [...prev, controlId];
      
      // Auto re-run simulation with new controls if active
      if (footholdNodeId && simulationRun) {
        setPreviousPathCount(attackPaths.length);
        const paths = findAttackPaths(network, footholdNodeId, newControls);
        setAttackPaths(paths);
        
        if (paths.length > 0) {
          const topPath = paths[0];
          setAnimatingPath(topPath);
          setAnimationStep(topPath.path.length - 1);
        } else {
          setAnimatingPath(null);
          setAnimationStep(-1);
        }
      }
      
      return newControls;
    });
  }, [footholdNodeId, simulationRun, network, attackPaths.length]);

  // Highlight a specific path or toggle back to multi-path overlay (-1)
  const showPath = useCallback((index) => {
    if (index === highlightedPathIndex) {
      // Toggle back to multi-path view if clicked again
      setHighlightedPathIndex(-1);
      return;
    }
    if (index < -1 || index >= attackPaths.length) return;
    setHighlightedPathIndex(index);
    if (index >= 0) {
      const path = attackPaths[index];
      setAnimatingPath(path);
      setAnimationStep(path.path.length - 1);
    }
  }, [attackPaths, highlightedPathIndex]);

  // Bug 2 fix: Clean Blast Radius Mode Toggle
  const toggleBlastRadiusMode = useCallback(() => {
    setBlastRadiusMode((prev) => {
      const next = !prev;
      if (next) {
        // Clear any active blast radius selection when opening
        setBlastRadius(null);
        setBlastRadiusOrigin(null);
      } else {
        // Clean return to normal view
        setBlastRadius(null);
        setBlastRadiusOrigin(null);
      }
      return next;
    });
  }, []);

  // Compute blast radius for a node
  const triggerBlastRadius = useCallback((nodeId) => {
    if (!blastRadiusMode) return;
    const result = computeBlastRadius(network, nodeId, activeControls);
    setBlastRadius(result);
    setBlastRadiusOrigin(nodeId);
  }, [blastRadiusMode, network, activeControls]);

  // Feature 4: Simulate Environment Drift
  const triggerEnvironmentDrift = useCallback(() => {
    // Pick the next unapplied drift event
    const available = DRIFT_EVENTS.filter((d) => !appliedDrifts.includes(d.id));
    if (available.length === 0) {
      // All drifts applied, wrap around or notify
      setLastDriftMessage({ title: 'Network Fully Drifted', text: 'All 4 simulation drift events have already been applied to the digital twin.' });
      return;
    }

    const nextDrift = available[0];
    const updatedNodes = [...network.nodes, nextDrift.node];
    const updatedEdges = [...network.edges, ...nextDrift.edges];
    const updatedNetwork = {
      ...network,
      nodes: updatedNodes,
      edges: updatedEdges,
    };

    setNetwork(updatedNetwork);
    setAppliedDrifts((prev) => [...prev, nextDrift.id]);
    setLastDriftMessage({ title: nextDrift.title, text: nextDrift.description });

    // Auto re-run simulation if active
    if (footholdNodeId && simulationRun) {
      setPreviousPathCount(attackPaths.length);
      const paths = findAttackPaths(updatedNetwork, footholdNodeId, activeControls);
      setAttackPaths(paths);
      if (paths.length > 0) {
        setAnimatingPath(paths[0]);
        setAnimationStep(paths[0].path.length - 1);
      }
    }
  }, [appliedDrifts, network, footholdNodeId, simulationRun, attackPaths.length, activeControls]);

  // Enterprise Feature: Add Node & optional Edge
  const addNode = useCallback(
    (newNode, newEdge) => {
      setNetwork((prev) => {
        // Prevent duplicate node IDs
        if (prev.nodes.some((n) => n.id === newNode.id)) {
          throw new Error(`Node with ID "${newNode.id}" already exists.`);
        }
        const updatedNodes = [...prev.nodes, newNode];
        const updatedEdges = newEdge ? [...prev.edges, newEdge] : prev.edges;
        const updated = { ...prev, nodes: updatedNodes, edges: updatedEdges };

        // Auto re-run simulation if active
        if (footholdNodeId && simulationRun) {
          const paths = findAttackPaths(updated, footholdNodeId, activeControls);
          setAttackPaths(paths);
        }
        return updated;
      });
      setSelectedNodeId(newNode.id);
    },
    [footholdNodeId, simulationRun, activeControls]
  );

  // Enterprise Feature: Delete Node & cascade delete all connected edges
  const deleteNode = useCallback(
    (nodeId) => {
      setNetwork((prev) => {
        const updatedNodes = prev.nodes.filter((n) => n.id !== nodeId);
        const updatedEdges = prev.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        );
        const updated = { ...prev, nodes: updatedNodes, edges: updatedEdges };

        // If deleted node was the active foothold, clear simulation
        if (footholdNodeId === nodeId) {
          setFootholdNodeId(null);
          setSelectedScenario(null);
          setAttackPaths([]);
          setSimulationRun(false);
        } else if (footholdNodeId && simulationRun) {
          const paths = findAttackPaths(updated, footholdNodeId, activeControls);
          setAttackPaths(paths);
        }
        return updated;
      });

      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      if (blastRadiusOrigin === nodeId) {
        setBlastRadius(null);
        setBlastRadiusOrigin(null);
      }
    },
    [footholdNodeId, selectedNodeId, blastRadiusOrigin, simulationRun, activeControls]
  );

  // Enterprise Feature: Add Edge between two existing nodes
  const addEdge = useCallback(
    (edgeData) => {
      setNetwork((prev) => {
        const updatedEdges = [...prev.edges, edgeData];
        const updated = { ...prev, edges: updatedEdges };
        if (footholdNodeId && simulationRun) {
          const paths = findAttackPaths(updated, footholdNodeId, activeControls);
          setAttackPaths(paths);
        }
        return updated;
      });
    },
    [footholdNodeId, simulationRun, activeControls]
  );

  const value = {
    // Data & Live Drift
    network,
    nodeMap,
    appliedDrifts,
    lastDriftMessage,
    triggerEnvironmentDrift,
    // Enterprise Node/Edge Management
    addNode,
    deleteNode,
    addEdge,
    // Scenario
    selectedScenario,
    footholdNodeId,
    selectScenario,
    setCustomFoothold,
    // Node selection
    selectedNodeId,
    setSelectedNodeId,
    // Simulation & Multi-path
    attackPaths,
    previousPathCount,
    simulationRun,
    runSimulation,
    resetSimulation,
    highlightedPathIndex,
    setHighlightedPathIndex,
    showPath,
    animatingPath,
    animationStep,
    // Security Posture Score
    securityScore,
    // Controls
    activeControls,
    toggleControl,
    // Blast radius
    blastRadiusMode,
    setBlastRadiusMode,
    toggleBlastRadiusMode,
    blastRadius,
    blastRadiusOrigin,
    triggerBlastRadius,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
