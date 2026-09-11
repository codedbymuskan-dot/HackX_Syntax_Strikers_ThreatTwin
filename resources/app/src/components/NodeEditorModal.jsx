import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { motion } from 'framer-motion';

export default function NodeEditorModal({ isOpen, onClose }) {
  const { network, addNode } = useSimulation();

  const [label, setLabel] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [type, setType] = useState('server');
  const [privilege, setPrivilege] = useState('user');
  const [criticality, setCriticality] = useState('medium');

  // Edge connection
  const [createEdge, setCreateEdge] = useState(true);
  const [targetId, setTargetId] = useState('');
  const [relationship, setRelationship] = useState('network-access');
  const [risk, setRisk] = useState('medium');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleLabelChange = (e) => {
    const val = e.target.value;
    setLabel(val);
    if (!nodeId || nodeId.startsWith(type)) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setNodeId(`${type}-${slug}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!label.trim() || !nodeId.trim()) {
      setError('Asset label and identifier are required.');
      return;
    }

    try {
      const newNode = {
        id: nodeId.trim(),
        label: label.trim(),
        type,
        privilege,
        criticality,
      };

      let newEdge = null;
      if (createEdge && targetId) {
        newEdge = {
          source: nodeId.trim(),
          target: targetId,
          relationship,
          risk,
        };
      }

      addNode(newNode, newEdge);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-overlay">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="node-modal glass-panel"
      >
        <div className="auth-header">
          <div>
            <h2 className="modal-heading">Provision Network Asset</h2>
            <p className="modal-subheading">Add infrastructure node & live telemetry edge to the digital twin</p>
          </div>
          <button className="auth-close-btn" onClick={onClose}>
            ?
          </button>
        </div>

        {error && <div className="auth-error-banner">?? {error}</div>}

        <form onSubmit={handleSubmit} className="node-modal-form">
          <div className="form-row-2">
            <div className="auth-field">
              <label>Asset Display Name</label>
              <input
                type="text"
                placeholder="e.g. Core Payment Proxy 02"
                value={label}
                onChange={handleLabelChange}
                required
              />
            </div>
            <div className="auth-field">
              <label>Unique Node ID</label>
              <input
                type="text"
                placeholder="e.g. server-payment-proxy-02"
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-3">
            <div className="auth-field">
              <label>Asset Architecture</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="server">??? Server Infrastructure</option>
                <option value="endpoint">?? Client Endpoint</option>
                <option value="cloud">?? Cloud / SaaS Resource</option>
                <option value="account">?? Identity / Service Account</option>
              </select>
            </div>

            <div className="auth-field">
              <label>Privilege Boundary</label>
              <select value={privilege} onChange={(e) => setPrivilege(e.target.value)}>
                <option value="user">User Privilege</option>
                <option value="admin">Administrator / Root</option>
                <option value="n/a">N/A (Managed Service)</option>
              </select>
            </div>

            <div className="auth-field">
              <label>Criticality Level</label>
              <select value={criticality} onChange={(e) => setCriticality(e.target.value)}>
                <option value="low">Low Impact</option>
                <option value="medium">Medium Tier</option>
                <option value="high">High Asset</option>
                <option value="critical">?? Mission Critical</option>
              </select>
            </div>
          </div>

          <div className="edge-provision-section">
            <div className="edge-checkbox-row">
              <input
                type="checkbox"
                id="createEdgeToggle"
                checked={createEdge}
                onChange={(e) => setCreateEdge(e.target.checked)}
              />
              <label htmlFor="createEdgeToggle">Connect to existing asset in network graph</label>
            </div>

            {createEdge && (
              <div className="form-row-3" style={{ marginTop: '8px' }}>
                <div className="auth-field">
                  <label>Target Connection</label>
                  <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required={createEdge}>
                    <option value=""> Select Target Node </option>
                    {network.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="auth-field">
                  <label>Relationship Type</label>
                  <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                    <option value="network-access">network-access</option>
                    <option value="admin-access">admin-access</option>
                    <option value="shared-credentials">shared-credentials</option>
                    <option value="trust-relationship">trust-relationship</option>
                    <option value="api-access">api-access</option>
                  </select>
                </div>

                <div className="auth-field">
                  <label>Edge Risk Weight</label>
                  <select value={risk} onChange={(e) => setRisk(e.target.value)}>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                    <option value="critical">Critical Risk</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              ? Provision Asset into Twin
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
