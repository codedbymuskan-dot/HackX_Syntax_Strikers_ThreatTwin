import { useState, useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext';
import NodeEditorModal from './NodeEditorModal';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_ICONS = {
  endpoint: '💻',
  server: '🖥️',
  cloud: '☁️',
  account: '👤',
};

const CRITICALITY_COLORS = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export default function Sidebar() {
  const {
    network,
    nodeMap,
    selectedNodeId,
    setSelectedNodeId,
    footholdNodeId,
    setCustomFoothold,
    deleteNode,
    addEdge,
  } = useSimulation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAddConn, setShowAddConn] = useState(false);
  const [targetConnId, setTargetConnId] = useState('');
  const [connRel, setConnRel] = useState('network-access');
  const [connRisk, setConnRisk] = useState('medium');

  // Filter nodes by search
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return network.nodes;
    const q = searchQuery.toLowerCase();
    return network.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q)
    );
  }, [network.nodes, searchQuery]);

  // Get selected node details
  const selectedNode = selectedNodeId ? nodeMap[selectedNodeId] : null;

  // Get connections for selected node
  const connections = useMemo(() => {
    if (!selectedNodeId) return [];
    return network.edges
      .filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
      .map((e) => {
        const otherId = e.source === selectedNodeId ? e.target : e.source;
        const otherNode = nodeMap[otherId];
        return {
          nodeId: otherId,
          label: otherNode?.label || otherId,
          relationship: e.relationship,
          risk: e.risk,
          direction: e.source === selectedNodeId ? 'outgoing' : 'incoming',
        };
      });
  }, [selectedNodeId, network.edges, nodeMap]);

  const handleCreateConnection = (e) => {
    e.preventDefault();
    if (!targetConnId || targetConnId === selectedNodeId) return;
    addEdge({
      source: selectedNodeId,
      target: targetConnId,
      relationship: connRel,
      risk: connRisk,
    });
    setShowAddConn(false);
    setTargetConnId('');
  };

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
      className="sidebar glass-panel"
    >
      <div className="sidebar-header">
        <div>
          <h2 className="sidebar-title">Network Assets</h2>
          <span className="sidebar-count">{network.nodes.length} nodes active</span>
        </div>
        <button
          className="btn-add-node"
          onClick={() => setIsAddModalOpen(true)}
          title="Provision new asset into network"
        >
          + Add Asset
        </button>
      </div>

      {/* Search */}
      <div className="search-container">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Selected Node Detail */}
      <AnimatePresence mode="wait">
        {selectedNode && (
          <motion.div
            key={selectedNodeId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="node-detail"
          >
            <div className="node-detail-header">
              <span className="node-type-icon">{TYPE_ICONS[selectedNode.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 className="node-detail-name">{selectedNode.label}</h3>
                <span className="node-id-sub">{selectedNode.id}</span>
              </div>
              <button
                className="btn-delete-node"
                onClick={() => {
                  if (window.confirm(`Decommission asset "${selectedNode.label}"? All connected edges will be removed.`)) {
                    deleteNode(selectedNode.id);
                  }
                }}
                title="Decommission asset from digital twin"
              >
                🗑️
              </button>
            </div>
            
            <div className="node-detail-props">
              <div className="prop-row">
                <span className="prop-label">Type</span>
                <span className="prop-value badge" style={{ backgroundColor: '#1e293b' }}>{selectedNode.type}</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Privilege</span>
                <span className="prop-value badge" style={{
                  backgroundColor: selectedNode.privilege === 'admin' ? '#7c3aed20' : '#1e293b',
                  color: selectedNode.privilege === 'admin' ? '#a78bfa' : '#94a3b8',
                }}>{selectedNode.privilege}</span>
              </div>
              <div className="prop-row">
                <span className="prop-label">Criticality</span>
                <span className="prop-value badge" style={{
                  backgroundColor: CRITICALITY_COLORS[selectedNode.criticality] + '20',
                  color: CRITICALITY_COLORS[selectedNode.criticality],
                }}>{selectedNode.criticality}</span>
              </div>
            </div>

            {/* Connections */}
            <div className="connections-section">
              <div className="connections-header-row">
                <h4 className="connections-title">Connections ({connections.length})</h4>
                <button
                  className="btn-conn-toggle"
                  onClick={() => setShowAddConn(!showAddConn)}
                >
                  {showAddConn ? '✕ Close' : '+ Link'}
                </button>
              </div>

              {showAddConn && (
                <form onSubmit={handleCreateConnection} className="add-conn-form">
                  <select
                    value={targetConnId}
                    onChange={(e) => setTargetConnId(e.target.value)}
                    required
                  >
                    <option value="">— Link to Target —</option>
                    {network.nodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                  </select>
                  <div className="add-conn-inputs">
                    <select value={connRel} onChange={(e) => setConnRel(e.target.value)}>
                      <option value="network-access">network-access</option>
                      <option value="admin-access">admin-access</option>
                      <option value="shared-credentials">shared-credentials</option>
                      <option value="trust-relationship">trust-relationship</option>
                      <option value="api-access">api-access</option>
                    </select>
                    <select value={connRisk} onChange={(e) => setConnRisk(e.target.value)}>
                      <option value="low">Low Risk</option>
                      <option value="medium">Med Risk</option>
                      <option value="high">High Risk</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '11px', padding: '4px' }}>
                    Connect Edge
                  </button>
                </form>
              )}

              <div className="connections-list">
                {connections.map((conn, i) => (
                  <div
                    key={i}
                    className="connection-item"
                    onClick={() => setSelectedNodeId(conn.nodeId)}
                  >
                    <span className="conn-direction">{conn.direction === 'outgoing' ? '→' : '←'}</span>
                    <span className="conn-label">{conn.label}</span>
                    <span className="conn-risk" style={{
                      color: CRITICALITY_COLORS[conn.risk],
                    }}>{conn.risk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Set as Foothold button */}
            <button
              className="btn btn-foothold"
              onClick={() => setCustomFoothold(selectedNodeId)}
              disabled={selectedNodeId === footholdNodeId}
            >
              {selectedNodeId === footholdNodeId ? '⚡ Current Foothold' : '⚡ Set as Foothold'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NodeEditorModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      {/* Node List */}
      <div className="node-list">
        {filteredNodes.map((node) => (
          <div
            key={node.id}
            className={`node-list-item ${node.id === selectedNodeId ? 'active' : ''} ${node.id === footholdNodeId ? 'foothold' : ''}`}
            onClick={() => setSelectedNodeId(node.id)}
          >
            <span className="node-list-icon">{TYPE_ICONS[node.type]}</span>
            <span className="node-list-label">{node.label}</span>
            <span
              className="node-list-criticality"
              style={{ color: CRITICALITY_COLORS[node.criticality] }}
            >
              ●
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
