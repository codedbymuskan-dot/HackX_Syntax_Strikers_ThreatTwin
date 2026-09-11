import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSimulation } from '../context/SimulationContext';

const NODE_COLORS = {
  endpoint: '#3b82f6',
  server: '#8b5cf6',
  cloud: '#14b8a6',
  account: '#f59e0b',
};

const CRITICALITY_SIZES = {
  low: 6,
  medium: 8,
  high: 10,
  critical: 14,
};

const CRITICALITY_GLOW = {
  low: 4,
  medium: 8,
  high: 12,
  critical: 20,
};

export default function GraphView() {
  const {
    network,
    nodeMap,
    selectedNodeId,
    setSelectedNodeId,
    footholdNodeId,
    animatingPath,
    animationStep,
    simulationRun,
    attackPaths,
    highlightedPathIndex,
    blastRadiusMode,
    blastRadius,
    blastRadiusOrigin,
    triggerBlastRadius,
  } = useSimulation();

  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [pulsePhase, setPulsePhase] = useState(0);

  // Breathing animation for pulse effects
  useEffect(() => {
    let frame;
    const animate = () => {
      setPulsePhase((prev) => (prev + 0.02) % (Math.PI * 2));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Configure D3 forces for optimal spacing and readability
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;
    
    // Spread nodes out so labels don't collide
    fg.d3Force('charge')?.strength(-220);
    fg.d3Force('link')?.distance(65);
    
    // Gentle centering
    if (fg.d3ReheatSimulation) {
      fg.d3ReheatSimulation();
    }
  }, []);

  // Build graph data for force-graph
  const graphData = useMemo(() => {
    const nodes = network.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      privilege: n.privilege,
      criticality: n.criticality,
    }));

    const links = network.edges.map((e, i) => ({
      source: e.source,
      target: e.target,
      relationship: e.relationship,
      risk: e.risk,
      id: `edge-${i}`,
    }));

    return { nodes, links };
  }, [network]);

  // Determine which nodes/edges are highlighted in attack simulation
  // When blastRadiusMode is ON, all attack path visuals are cleanly suppressed (Bug 2)
  // When highlightedPathIndex === -1, top 3 paths are shown simultaneously with tiered opacity (Feature 2)
  const { multiPathNodes, multiPathEdges } = useMemo(() => {
    if (blastRadiusMode || !simulationRun || attackPaths.length === 0) {
      return { multiPathNodes: new Map(), multiPathEdges: new Map() };
    }

    const nodeLevels = new Map(); // nodeId -> { color, opacity, level }
    const edgeLevels = new Map(); // edgeKey -> { color, opacity, width, level }

    const PATH_CONFIGS = [
      { color: '#ff6b35', stroke: '#ff6b35', opacity: 1.0, width: 3.5, pulse: true },   // Rank 1: Full-opacity vibrant orange
      { color: '#f59e0b', stroke: '#f59e0b', opacity: 0.75, width: 2.5, pulse: false }, // Rank 2: Amber
      { color: '#8b5cf6', stroke: '#8b5cf6', opacity: 0.55, width: 2.0, pulse: false }, // Rank 3: Violet
    ];

    if (highlightedPathIndex >= 0) {
      // Single isolated path view
      const pathObj = attackPaths[highlightedPathIndex] || animatingPath;
      if (pathObj) {
        const activeSlice = pathObj.path.slice(0, animationStep >= 0 ? animationStep + 1 : pathObj.path.length);
        activeSlice.forEach((nid) => {
          nodeLevels.set(nid, PATH_CONFIGS[0]);
        });
        for (let i = 0; i < activeSlice.length - 1; i++) {
          const cfg = PATH_CONFIGS[0];
          edgeLevels.set(`${activeSlice[i]}|${activeSlice[i + 1]}`, cfg);
          edgeLevels.set(`${activeSlice[i + 1]}|${activeSlice[i]}`, cfg);
        }
      }
    } else {
      // Multi-path overlay view: top 2-3 paths
      const pathsToOverlay = attackPaths.slice(0, 3);
      // Process in reverse order so top path takes precedence in node styling
      for (let rank = pathsToOverlay.length - 1; rank >= 0; rank--) {
        const p = pathsToOverlay[rank];
        const cfg = PATH_CONFIGS[rank];
        p.path.forEach((nid) => {
          nodeLevels.set(nid, cfg);
        });
        for (let i = 0; i < p.path.length - 1; i++) {
          edgeLevels.set(`${p.path[i]}|${p.path[i + 1]}`, cfg);
          edgeLevels.set(`${p.path[i + 1]}|${p.path[i]}`, cfg);
        }
      }
    }

    return { multiPathNodes: nodeLevels, multiPathEdges: edgeLevels };
  }, [blastRadiusMode, simulationRun, attackPaths, highlightedPathIndex, animatingPath, animationStep]);

  // Blast radius highlighted nodes
  const blastRadiusNodes = useMemo(() => {
    if (!blastRadiusMode || !blastRadius) return new Set();
    const set = new Set(blastRadius.reachableNodes);
    set.add(blastRadiusOrigin);
    return set;
  }, [blastRadiusMode, blastRadius, blastRadiusOrigin]);

  // Custom node rendering
  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const nodeData = nodeMap[node.id];
      if (!nodeData) return;

      // Guard: skip rendering if coordinates aren't computed yet
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

      const size = CRITICALITY_SIZES[nodeData.criticality] || 6;
      const color = nodeData.criticality === 'critical' ? '#ef4444' : (NODE_COLORS[nodeData.type] || '#666');
      const glowSize = CRITICALITY_GLOW[nodeData.criticality] || 4;

      const pathConfig = multiPathNodes.get(node.id);
      const isInPath = !blastRadiusMode && !!pathConfig;
      // Bug 2: Foothold marker is cleanly hidden when Blast Radius Mode is ON
      const isFoothold = !blastRadiusMode && (node.id === footholdNodeId);
      const isSelected = node.id === selectedNodeId;
      const isBlastHighlight = blastRadiusMode && blastRadiusNodes.has(node.id);
      const isBlastOrigin = blastRadiusMode && (node.id === blastRadiusOrigin);
      const isCritical = nodeData.criticality === 'critical';

      // Pulse calculation
      const pulse = Math.sin(pulsePhase * 3) * 0.3 + 0.7;

      ctx.save();

      // Outer glow
      if (isCritical || isInPath || isFoothold || isBlastHighlight) {
        const glowRadius = isCritical
          ? size + glowSize + (pulse * 8)
          : isInPath
          ? size + 12
          : isBlastHighlight
          ? size + 10
          : size + 8;
        
        const glowColor = isInPath
          ? pathConfig.color
          : isBlastOrigin
          ? '#22d3ee'
          : isBlastHighlight
          ? '#22d3ee'
          : color;
        
        const gradient = ctx.createRadialGradient(node.x, node.y, size * 0.5, node.x, node.y, glowRadius);
        gradient.addColorStop(0, glowColor + '60');
        gradient.addColorStop(0.6, glowColor + '20');
        gradient.addColorStop(1, glowColor + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Base circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fillStyle = isInPath
        ? pathConfig.color
        : isBlastOrigin
        ? '#22d3ee'
        : isBlastHighlight
        ? '#0891b2'
        : color;
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected
        ? '#ffffff'
        : isFoothold
        ? '#ff6b35'
        : (isInPath ? pathConfig.color : color + '80');
      ctx.lineWidth = isSelected ? 2.5 : (isFoothold || isInPath ? 2 : 1);
      ctx.stroke();

      // Inner highlight
      if (isInPath || isCritical) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff40';
        ctx.fill();
      }

      // Label - rendered crisply with smart LOD
      const fontSize = Math.max(11 / globalScale, 3.2);
      ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelText = nodeData.label;
      const textMetrics = ctx.measureText(labelText);
      const textWidth = textMetrics.width;
      const textHeight = fontSize * 1.2;

      // Soft pill backdrop for readability over links/other nodes
      ctx.fillStyle = 'rgba(10, 15, 30, 0.75)';
      ctx.beginPath();
      ctx.roundRect(
        node.x - textWidth / 2 - 4,
        node.y + size + 2,
        textWidth + 8,
        textHeight + 2,
        4
      );
      ctx.fill();

      // Text itself
      ctx.fillStyle = isInPath || isSelected ? '#ffffff' : '#cbd5e1';
      ctx.fillText(labelText, node.x, node.y + size + 3);

      // Foothold marker — only rendered in simulation mode, never in Blast Radius Mode (Bug 2)
      if (isFoothold) {
        ctx.font = `bold ${fontSize * 1.1}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = '#ff6b35';
        ctx.textBaseline = 'bottom';
        ctx.fillText('⚡ FOOTHOLD', node.x, node.y - size - 4);
      }

      ctx.restore();
    },
    [nodeMap, multiPathNodes, footholdNodeId, selectedNodeId, blastRadiusMode, blastRadiusNodes, blastRadiusOrigin, pulsePhase]
  );

  // Custom link rendering
  const linkCanvasObject = useCallback(
    (link, ctx) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const sourcePos = typeof link.source === 'object' ? link.source : null;
      const targetPos = typeof link.target === 'object' ? link.target : null;

      // Guard: skip rendering if positions aren't computed yet
      if (
        !sourcePos ||
        !targetPos ||
        !Number.isFinite(sourcePos.x) ||
        !Number.isFinite(sourcePos.y) ||
        !Number.isFinite(targetPos.x) ||
        !Number.isFinite(targetPos.y)
      ) return;
      const edgeKey1 = `${sourceId}|${targetId}`;
      
      const edgeConfig = multiPathEdges.get(edgeKey1);
      const isActive = !blastRadiusMode && !!edgeConfig;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);

      if (isActive) {
        // Active attack path — bright animated edge with tiered multi-path styling
        ctx.strokeStyle = edgeConfig.stroke;
        ctx.globalAlpha = edgeConfig.opacity;
        ctx.lineWidth = edgeConfig.width;
        ctx.shadowColor = edgeConfig.stroke;
        ctx.shadowBlur = edgeConfig.opacity * 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Traveling pulse dot for top path
        if (edgeConfig.pulse) {
          const pulsePos = (Math.sin(pulsePhase * 4) + 1) / 2;
          const px = sourcePos.x + (targetPos.x - sourcePos.x) * pulsePos;
          const py = sourcePos.y + (targetPos.y - sourcePos.y) * pulsePos;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      } else {
        // Inactive edge
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();
    },
    [multiPathEdges, blastRadiusMode, pulsePhase]
  );

  // Node click handler
  const handleNodeClick = useCallback(
    (node) => {
      setSelectedNodeId(node.id);
      if (blastRadiusMode) {
        triggerBlastRadius(node.id);
      }
    },
    [setSelectedNodeId, blastRadiusMode, triggerBlastRadius]
  );

  return (
    <div ref={containerRef} className="graph-container">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="transparent"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node, color, ctx) => {
          if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
          const size = CRITICALITY_SIZES[nodeMap[node.id]?.criticality] || 6;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 4, 0, Math.PI * 2);
          ctx.fill();
        }}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.3}
        warmupTicks={50}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
      />

      {/* Blast radius badge */}
      {blastRadiusMode && blastRadius && blastRadiusOrigin && (
        <div className="blast-badge">
          <span className="blast-badge-icon">◎</span>
          Reaches <strong>{blastRadius.totalCount}</strong> systems
          {blastRadius.criticalCount > 0 && (
            <>, including <strong className="blast-badge-critical">{blastRadius.criticalCount} critical</strong></>
          )}
        </div>
      )}
    </div>
  );
}
